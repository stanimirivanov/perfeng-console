import { request } from 'node:https';
import type { operations } from '../generated/run.ts';
import { run_Run, run_RunId } from '../generated/validators.mjs';
import { loadUpstreamConfig } from './config.ts';
import type { UpstreamConfig } from './config.ts';

type IncomingMessage = Parameters<NonNullable<Parameters<typeof request>[2]>>[0];
type Run = operations['getRun']['responses'][200]['content']['application/json'];
type Failure = 'invalid_input' | 'not_found' | 'forbidden' | 'unavailable' | 'invalid_response' | 'deadline' | 'aborted';
type RunResult = { ok: true; run: Run } | { ok: false; reason: Failure };

const fail = (reason: Failure): RunResult => ({ ok: false, reason });

function isRun(value: unknown): value is Run {
  return run_Run(value);
}

export function createRunTransport(config: UpstreamConfig) {
  const { origin, token, ca, deadlineMs, maxResponseBytes } = loadUpstreamConfig(config);

  async function getRun(runId: string, callerSignal?: AbortSignal): Promise<RunResult> {
    if (!run_RunId(runId)) return fail('invalid_input');
    if (callerSignal?.aborted) return fail('aborted');
    const deadline = AbortSignal.timeout(deadlineMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline;
    let response: IncomingMessage | undefined;
    try {
      const destination = new URL('/v1/runs/' + encodeURIComponent(runId), origin);
      response = await new Promise<IncomingMessage>((resolve, reject) => {
        const outgoing = request(destination, {
          method: 'GET',
          agent: false,
          ca,
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true,
          signal,
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        }, resolve);
        outgoing.once('error', reject);
        outgoing.end();
      });

      // Never consume provider error bodies or redirect targets.
      const status = response.statusCode;
      if (status === 404) return fail('not_found');
      if (status === 401 || status === 403) return fail('forbidden');
      if (status === 429 || (status !== undefined && status >= 500)) return fail('unavailable');
      const media = response.headersDistinct['content-type'];
      if (status !== 200 || media?.length !== 1 ||
          media[0]?.split(';')[0]?.trim().toLowerCase() !== 'application/json' ||
          response.headersDistinct['content-encoding']) {
        return fail('invalid_response');
      }

      let length = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of response as AsyncIterable<Buffer>) {
        length += chunk.length;
        if (length > maxResponseBytes) return fail('invalid_response');
        chunks.push(chunk);
      }
      signal.throwIfAborted();
      try {
        const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length)));
        return isRun(value) && value.id === runId ? { ok: true, run: value } : fail('invalid_response');
      } catch {
        return fail('invalid_response');
      }
    } catch {
      if (signal.aborted) return fail(deadline.aborted && signal.reason === deadline.reason ? 'deadline' : 'aborted');
      return fail('unavailable');
    } finally {
      response?.destroy();
    }
  }

  return { getRun };
}
