import { Effect } from 'effect';
import { createSigningKeyGet } from './signing-key-get.ts';
import type { SigningKeyGetConfig } from './signing-key-get.ts';
import { admitSigningKeys } from '../identity-jwt/public-api.ts';
import type { SigningKeySnapshot } from '../identity-jwt/public-api.ts';

export interface SigningKeySourceConfig extends SigningKeyGetConfig {
  readonly now?: () => number;
}
type Result = {
  readonly ok: true;
  readonly snapshot: SigningKeySnapshot;
} | {
  readonly ok: false;
  readonly reason: 'invalid_clock' | 'invalid_jwks' | 'invalid_response' | 'unavailable' | 'deadline';
};

/** Isolated real-wire composition; configured provenance never comes from response JSON. */
export function createSigningKeySource(config: SigningKeySourceConfig) {
  const { issuer, ca, deadlineMs, maxResponseBytes, now = Date.now } = config;
  const wire = createSigningKeyGet({ issuer, ca, ...(deadlineMs === undefined ? {} : { deadlineMs }), ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }) });
  function observe() {
    try {
      const value = now();
      return Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime()) ? value : undefined;
    } catch { return undefined; }
  }
  return {
    load(): Effect.Effect<Result, unknown> {
      return Effect.scoped(Effect.gen(function* () {
        const started = yield* Effect.sync(observe);
        if (started === undefined) return { ok: false as const, reason: 'invalid_clock' as const };
        const response = yield* wire.get();
        if (!response.ok) return response;
        const finished = yield* Effect.sync(observe);
        if (finished === undefined || finished < started || finished - started > 300000) return { ok: false as const, reason: 'invalid_clock' as const };
        // Decoder owns data admission; this closure owns the issuer and retrieval clock association.
        const admitted = admitSigningKeys({ issuer, retrievalStartedAtMs: started, nowMs: finished, wire: response });
        // Give pending interruption a boundary before publishing an admitted observation.
        yield* Effect.yieldNow;
        return admitted;
      }));
    },
  };
}
