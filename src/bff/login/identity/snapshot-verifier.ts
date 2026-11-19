import { Effect, Option, Semaphore } from 'effect';
import { makeEpochReader } from './epoch.ts';
import { verifyCodePair } from './code-pair.ts';
import type { SnapshotVerificationInput, SnapshotVerificationResult, SnapshotVerifier, SnapshotVerifierConfig } from './snapshot-contracts.ts';

const MAX_ACTIVE_VERIFICATIONS = 32;
const DEADLINE_MS = 3000;
const KEY_FRESHNESS_MS = 300000;

/** Acquire one private verifier lifetime; only composition executes the returned Effects.
 * Crypto cannot always be aborted, so closed/interrupted owners cannot publish its late result.
 */
export function makeSnapshotVerifier(config: SnapshotVerifierConfig) {
  const { issuer, now = Date.now } = config;
  return Effect.gen(function* () {
    const ownerScope = yield* Effect.scope;
    const limit = Semaphore.makeUnsafe(MAX_ACTIVE_VERIFICATIONS);
    let closed = false;
    const isClosed = () => closed || ownerScope.state._tag === 'Closed';
    let outstandingCrypto = 0;
    const clock = makeEpochReader(now);
    yield* Effect.addFinalizer(() => Effect.sync(() => { closed = true; }));
    const verifier: SnapshotVerifier = {
      verify(input) {
        // Snapshot before returning lazy work, so mutation cannot substitute its evidence.
        let captured: SnapshotVerificationInput | undefined;
        try { captured = structuredClone(input); } catch { /* Refuse without logging credentials. */ }
        const request = captured;
        const operation = Effect.gen(function* () {
          if (isClosed()) return yield* Effect.interrupt;
          if (!request) return { ok: false as const, reason: 'invalid_pair' as const };
          const before = clock();
          if (before === undefined) return { ok: false as const, reason: 'unavailable' as const };
          const result = yield* Effect.tryPromise({
            try: async () => {
              // Interruption releases the Effect permit, but cannot cancel WebCrypto.
              // Charge its native work until settlement so cancelled callers cannot bypass the cap.
              if (outstandingCrypto >= MAX_ACTIVE_VERIFICATIONS) return { ok: false as const, reason: 'unavailable' as const };
              outstandingCrypto++;
              try {
                return await verifyCodePair({ ...request, issuer, nowMs: before });
              } finally {
                outstandingCrypto--;
              }
            },
            catch: () => ({ ok: false as const, reason: 'unavailable' as const }),
          }).pipe(Effect.catch(() => Effect.succeed({ ok: false as const, reason: 'unavailable' as const })));
          yield* Effect.yieldNow;
          if (isClosed()) return yield* Effect.interrupt;
          const finished = clock();
          if (finished === undefined || (request.snapshot && finished - request.snapshot.fetchedAtMs > KEY_FRESHNESS_MS))
            return { ok: false as const, reason: 'unavailable' as const };
          if (result.ok && result.validUntilMs <= finished) return { ok: false as const, reason: 'invalid_pair' as const };
          return result;
        }).pipe(
          Effect.timeoutOption(DEADLINE_MS),
          Effect.map(result => Option.getOrElse(result, (): SnapshotVerificationResult => ({ ok: false, reason: 'deadline' }))),
        );
        return Effect.map(limit.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): SnapshotVerificationResult => ({ ok: false, reason: 'unavailable' })));
      },
    };
    return verifier;
  });
}
