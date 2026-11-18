import { maxHeaderSize } from 'node:http';
import { X509Certificate } from 'node:crypto';
import { Data, Effect, Stream } from 'effect';
import { HttpClient, withScope } from 'effect/http/HttpClient';
import { get as getRequest, setHeader } from 'effect/http/HttpClientRequest';
import { layerNodeHttpOptions } from '@effect/platform-node/NodeHttpClient';
import { NodeHttpIncomingMessage } from '@effect/platform-node/NodeHttpIncomingMessage';

import type { SigningKeyResult, SigningKeyGetConfig, SigningKeyGet } from './signing-key-contracts.ts';
type Failure = Extract<SigningKeyResult, { ok: false; }>['reason'];

class SigningKeyFailure extends Data.TaggedError('SigningKeyFailure')<{ readonly reason: Failure; }> {}
const fail = (reason: SigningKeyFailure['reason']) => Effect.fail(new SigningKeyFailure({ reason }));

function admitted(config: SigningKeyGetConfig) {
  try {
    if (!Number.isInteger(maxHeaderSize) || maxHeaderSize < 1 || maxHeaderSize > 16_384) throw new Error();
    const issuer = new URL(config.issuer);
    const deadlineMs = config.deadlineMs ?? 3000;
    const maxResponseBytes = config.maxResponseBytes ?? 65_536;
    if (config.issuer.length > 1024 || issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash ||
        issuer.href !== config.issuer || !/^\/realms\/[A-Za-z0-9_-]{1,128}$/.test(issuer.pathname) ||
        typeof config.ca !== 'string' || config.ca.length > 16_384 ||
        !/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----(?:\r?\n)?$/.test(config.ca) || !new X509Certificate(config.ca).ca ||
        !Number.isInteger(deadlineMs) || deadlineMs < 50 || deadlineMs > 3000 ||
        !Number.isInteger(maxResponseBytes) || maxResponseBytes < 256 || maxResponseBytes > 65_536) throw new Error();
    return { endpoint: config.issuer + '/protocol/openid-connect/certs', ca: config.ca, deadlineMs, maxResponseBytes };
  } catch { throw new Error('Invalid signing-key transport configuration'); }
}

/** Private lazy GET of one configured Keycloak certs endpoint.
 * Returned text is untrusted wire evidence, not parsed/admitted signing keys.
 * The caller owns Effect execution/interruption; no resolver/cache/retry is installed.
 */
export function createSigningKeyGet(config: SigningKeyGetConfig): SigningKeyGet {
  const { endpoint, ca, deadlineMs, maxResponseBytes } = admitted(config);
  const layer = layerNodeHttpOptions({ ca, minVersion: 'TLSv1.2', rejectUnauthorized: true, keepAlive: false });
  return {
    get(): Effect.Effect<SigningKeyResult, unknown> {
      return Effect.scoped(Effect.gen(function* () {
        const client = withScope(yield* HttpClient);
        const request = getRequest(endpoint).pipe(setHeader('accept', 'application/json'));
        const response = yield* client.execute(request);
        // Refusal bodies may contain provider diagnostics. Never read or echo them.
        if ([401, 403].includes(response.status)) return yield* fail('unavailable');
        if (response.status === 429 || response.status >= 500) return yield* fail('unavailable');
        if (response.status !== 200 || !(response instanceof NodeHttpIncomingMessage)) return yield* fail('invalid_response');
        // Refuse excessive header counts before relying on duplicate cardinality.
        if (response.source.rawHeaders.length > 256) return yield* fail('invalid_response');
        const headers = response.source.headersDistinct;
        if (headers['content-type']?.length !== 1 || headers['content-type'][0]?.split(';')[0]?.trim().toLowerCase() !== 'application/json' ||
            headers['content-encoding']) return yield* fail('invalid_response');
        const lengths = headers['content-length'];
        if (lengths && (lengths.length !== 1 || !/^\d+$/.test(lengths[0]!) || Number(lengths[0]) > maxResponseBytes)) return yield* fail('invalid_response');
        let size = 0;
        const chunks: Uint8Array[] = [];
        yield* Stream.runForEach(response.stream, chunk => {
          size += chunk.byteLength;
          if (size > maxResponseBytes) return fail('invalid_response');
          chunks.push(chunk);
          return Effect.void;
        });
        if (size === 0) return yield* fail('invalid_response');
        const body = yield* Effect.try({ try: () => new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)), catch: () => new SigningKeyFailure({ reason: 'invalid_response' }) });
        return { ok: true as const, stage: 'unverified-jwks' as const, body };
      })).pipe(Effect.provide(layer), Effect.timeout(deadlineMs),Effect.catchTag('TimeoutError', () => fail('deadline')),Effect.catchTag('HttpClientError', () => fail('unavailable')),Effect.catchTag('SigningKeyFailure', error => Effect.succeed({ ok: false as const, reason: error.reason })));
    },
  };
}
