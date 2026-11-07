import { Data, Effect, Stream } from 'effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as NodeHttpClient from '@effect/platform-node/NodeHttpClient';
import { NodeHttpIncomingMessage } from '@effect/platform-node/NodeHttpIncomingMessage';
import { loadUpstreamConfig } from '../../../src/bff/config.ts';
import type { UpstreamConfig } from '../../../src/bff/config.ts';
import type { operations } from '../../../src/generated/run.ts';
import { run_Run, run_RunId } from '../../../src/generated/validators.mjs';

type Run = operations['getRun']['responses'][200]['content']['application/json'];
type Failure = 'invalid_input' | 'not_found' | 'forbidden' | 'unavailable' | 'invalid_response' | 'deadline' | 'aborted';
type RunResult = { ok: true; run: Run } | { ok: false; reason: Failure };
class TransportFailure extends Data.TaggedError('TransportFailure')<{ readonly reason: Failure }> {}
function isRun(value: unknown): value is Run { return run_Run(value); }
const fail = (reason: Failure) => Effect.fail(new TransportFailure({ reason }));

/** Isolated qualification candidate; retains existing config and generated validation. */
export function createRunTransport(config: UpstreamConfig) {
  const { origin, token, ca, deadlineMs, maxResponseBytes } = loadUpstreamConfig(config);
  const layer = NodeHttpClient.layerNodeHttpOptions({ ca, minVersion: 'TLSv1.2', rejectUnauthorized: true, keepAlive: false });
  function read(runId: string) {
    return Effect.scoped(Effect.gen(function* () {
      const client = HttpClient.withScope(yield* HttpClient.HttpClient);
      const response = yield* client.get(new URL('/v1/runs/' + encodeURIComponent(runId), origin).href, {
        headers: { authorization: 'Bearer ' + token, accept: 'application/json' },
      });
      // Provider bodies can contain secrets; classify errors without reading them.
      if (response.status === 404) return yield* fail('not_found');
      if (response.status === 401 || response.status === 403) return yield* fail('forbidden');
      if (response.status === 429 || response.status >= 500) return yield* fail('unavailable');
      if (response.status !== 200) return yield* fail('invalid_response');
      // Normalized headers lose duplicate cardinality. Require the pinned Node source.
      if (!(response instanceof NodeHttpIncomingMessage)) return yield* fail('invalid_response');
      const headers = response.source.headersDistinct;
      const media = headers['content-type'];
      if (media?.length !== 1 || media[0]?.split(';')[0]?.trim().toLowerCase() !== 'application/json' ||
        headers['content-encoding']) return yield* fail('invalid_response');
      let length = 0;
      const chunks: Uint8Array[] = [];
      yield* Stream.runForEach(response.stream, chunk => {
        length += chunk.byteLength;
        // Bound retained bytes while streaming; scoped failure closes the response.
        if (length > maxResponseBytes) return fail('invalid_response');
        chunks.push(chunk);
        return Effect.void;
      });
      return yield* Effect.try({
        try: (): RunResult => {
          const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length)));
          return isRun(value) && value.id === runId ? { ok: true, run: value } : { ok: false, reason: 'invalid_response' };
        },
        catch: () => new TransportFailure({ reason: 'invalid_response' }),
      });
    })).pipe(
      Effect.provide(layer),
      // This encloses headers, stream consumption and resource finalizers, not just dispatch.
      Effect.timeout(deadlineMs),
      Effect.catchTag('TimeoutError', () => fail('deadline')),
      Effect.catchTag('HttpClientError', () => fail('unavailable')),
      Effect.catchTag('TransportFailure', error => Effect.succeed({ ok: false as const, reason: error.reason })),
    );
  }
  return {
    async getRun(runId: string, signal?: AbortSignal): Promise<RunResult> {
      if (!run_RunId(runId)) return { ok: false, reason: 'invalid_input' };
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      try { return await Effect.runPromise(read(runId), { signal }); }
      catch { return { ok: false, reason: signal?.aborted ? 'aborted' : 'unavailable' }; }
    },
  };
}
