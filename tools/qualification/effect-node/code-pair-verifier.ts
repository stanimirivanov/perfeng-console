import { Effect, Option, Semaphore } from 'effect';
import type { SigningKeyResolution } from './signing-key-resolver.ts';
import { makeSigningKeyResolver } from './signing-key-resolver.ts';
import type { SigningKeySourceConfig } from './signing-key-source.ts';
import { codePairKeyIds, makeSnapshotVerifier } from '../identity-jwt/public-api.ts';
import type { CodePairRequest, CodePairResult } from '../identity-jwt/public-api.ts';

export type ResolvedCodePairResult = CodePairResult | {
  readonly ok: false;
  readonly reason: 'deadline';
};

/** Isolated fixed-issuer key/crypto composition, never session or enrollment authority. */
export function makeCodePairVerifier(config: SigningKeySourceConfig) {
  const { issuer, ca, deadlineMs, maxResponseBytes, now = Date.now } = config;
  return Effect.gen(function* () {
    let highWater = -1;
    let closed = false;
    const callers = Semaphore.makeUnsafe(32);
    function clock() {
      const value = now();
      if (!Number.isSafeInteger(value) || value < 0 || Number.isNaN(new Date(value).getTime()) || value < highWater) throw new Error('invalid_clock');
      highWater = value;
      return value;
    }
    function observe() { try { return clock(); } catch { return undefined; } }
    const snapshotVerifier = yield* makeSnapshotVerifier({ issuer, now: clock });
    const resolver = yield* makeSigningKeyResolver({ issuer, ca, ...(deadlineMs === undefined ? {} : { deadlineMs }), ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }), now: clock });
    yield* Effect.addFinalizer(() => Effect.sync(() => { closed = true; }));
    return {
      verify(input: CodePairRequest): Effect.Effect<ResolvedCodePairResult, unknown> {
        let captured: CodePairRequest | undefined;
        try { captured = structuredClone(input); } catch { /* Refused below; no diagnostics or credentials escape. */ }
        const request = captured;
        const operation = Effect.gen(function* () {
          if (closed) return yield* Effect.interrupt;
          if (!request) return { ok: false as const, reason: 'invalid_pair' as const };
          const before = observe();
          if (before === undefined) return { ok: false as const, reason: 'unavailable' as const };
          const selected = codePairKeyIds(request, before);
          if (!selected.ok) return selected;
          const keys: Extract<SigningKeyResolution, { readonly ok: true; }>['key'][] = [];
          let fetchedAtMs = Infinity;
          for (const kid of new Set([selected.idKid, selected.accessKid])) {
            const resolved = yield* resolver.resolveKey(kid);
            if (!resolved.ok) return { ok: false as const, reason: resolved.reason === 'deadline' ? 'deadline' as const : resolved.reason === 'unknown_key' || resolved.reason === 'invalid_key_id' ? 'invalid_pair' as const : 'unavailable' as const };
            if (resolved.issuer !== issuer || resolved.key.kid !== kid) return { ok: false as const, reason: 'unavailable' as const };
            keys.push(resolved.key);
            fetchedAtMs = Math.min(fetchedAtMs, resolved.fetchedAtMs);
          }
          const verifiedAt = observe();
          if (verifiedAt === undefined) return { ok: false as const, reason: 'unavailable' as const };
          const result = yield* snapshotVerifier.verify({ ...request, snapshot: { fetchedAtMs, keys } });
          yield* Effect.yieldNow;
          if (closed) return yield* Effect.interrupt;
          const finished = observe();
          if (finished === undefined || finished - fetchedAtMs > 300000) return { ok: false as const, reason: 'unavailable' as const };
          if (result.ok && result.validUntilMs <= finished) return { ok: false as const, reason: 'invalid_pair' as const };
          return result;
        }).pipe(Effect.timeoutOption(3000), Effect.map(result => Option.getOrElse(result, (): ResolvedCodePairResult => ({ ok: false, reason: 'deadline' }))));
        return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): ResolvedCodePairResult => ({ ok: false, reason: 'unavailable' })));
      },
    };
  });
}
