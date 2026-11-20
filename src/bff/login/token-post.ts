import { maxHeaderSize } from 'node:http';
import { X509Certificate } from 'node:crypto';
import { Data, Effect } from 'effect';
import { readBoundedUtf8 } from '../transport/bounded-body.ts';
import * as HttpClient from 'effect/http/HttpClient';
import * as Request from 'effect/http/HttpClientRequest';
import * as NodeHttpClient from '@effect/platform-node/NodeHttpClient';
import { NodeHttpIncomingMessage } from '@effect/platform-node/NodeHttpIncomingMessage';

import type { TokenPostReason, TokenPostResult } from './login-contracts.ts';
export type { TokenPostReason, TokenPostResult } from './login-contracts.ts';

class TokenPostFailure extends Data.TaggedError('TokenPostFailure')<{ readonly reason: TokenPostReason; }> {}
const fail = (reason: TokenPostFailure['reason']) => Effect.fail(new TokenPostFailure({ reason }));

/** Trusted server configuration; no request can supply a destination or CA. */
export interface TokenPostConfig {
  issuer: string;
  ca: string;
  deadlineMs?: number;
  maxResponseBytes?: number;
}

function admitted(config: TokenPostConfig) {
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
    return { endpoint: config.issuer + '/protocol/openid-connect/token', ca: config.ca, deadlineMs, maxResponseBytes };
  } catch { throw new Error('Invalid token transport configuration'); }
}

/** Lazy scoped POST primitive, not an OAuth grant or token-validation operation.
 * Form and returned text are server-only secrets. The caller owns Effect
 * execution/cancellation and must never automatically replay an uncertain POST.
 *
 * @param config - Trusted fixed issuer, CA and optional byte/deadline bounds; validated immediately.
 * @returns A server-only adapter whose post method builds lazy, caller-executed scoped work.
 * @throws Error synchronously when transport configuration fails admission, before any POST Effect exists.
 */
export function createTokenPost(config: TokenPostConfig) {
  const { endpoint, ca, deadlineMs, maxResponseBytes } = admitted(config);
  const layer = NodeHttpClient.layerNodeHttpOptions({ ca, minVersion: 'TLSv1.2', rejectUnauthorized: true, keepAlive: false });
  return {
    post(form: string): Effect.Effect<TokenPostResult, unknown> {
      return Effect.scoped(Effect.gen(function* () {
        if (!form || form.length > 16_384 || !/^[\x21-\x7e]+$/.test(form)) return yield* fail('invalid_input');
        const client = HttpClient.withScope(yield* HttpClient.HttpClient);
        const request = Request.post(endpoint).pipe(Request.bodyText(form, 'application/x-www-form-urlencoded'), Request.setHeader('accept', 'application/json'));
        const response = yield* client.execute(request);
        // Refusal bodies may contain codes/assertions. Never read or echo them.
        if ([400, 401, 403].includes(response.status)) return yield* fail('denied');
        if (response.status === 429 || response.status >= 500) return yield* fail('unavailable');
        if (response.status !== 200 || !(response instanceof NodeHttpIncomingMessage)) return yield* fail('invalid_response');
        // Refuse excessive header counts before relying on duplicate cardinality.
        if (response.source.rawHeaders.length > 256) return yield* fail('invalid_response');
        const headers = response.source.headersDistinct;
        if (headers['content-type']?.length !== 1 || headers['content-type'][0]?.split(';')[0]?.trim().toLowerCase() !== 'application/json' ||
            headers['content-encoding'] || headers['cache-control']?.length !== 1 || !headers['cache-control'][0]?.toLowerCase().split(',').map(value => value.trim()).includes('no-store') ||
            headers.pragma?.length !== 1 || headers.pragma[0]?.trim().toLowerCase() !== 'no-cache') return yield* fail('invalid_response');
        const lengths = headers['content-length'];
        if (lengths && (lengths.length !== 1 || !/^\d+$/.test(lengths[0]!) || Number(lengths[0]) > maxResponseBytes)) return yield* fail('invalid_response');
        const body = yield* readBoundedUtf8(response.stream, maxResponseBytes).pipe(
          Effect.catchTag('InvalidResponseBody', () => fail('invalid_response')),
        );
        return { ok: true as const, body };
      })).pipe(Effect.provide(layer), Effect.timeout(deadlineMs),Effect.catchTag('TimeoutError', () => fail('deadline')),Effect.catchTag('HttpClientError', () => fail('unavailable')),Effect.catchTag('TokenPostFailure', error => Effect.succeed({ ok: false as const, reason: error.reason })));
    },
  };
}
