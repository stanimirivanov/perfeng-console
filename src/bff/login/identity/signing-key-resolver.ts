import { Effect, Fiber, Option, ScopedCache, Semaphore } from 'effect';
import { makeSnapshotStore } from './signing-key-store.ts';
import { KEY_SNAPSHOT_MAX_AGE_MS } from './key-policy.ts';
import type { Scope } from 'effect';
import type { SourceResult, SigningKeySourceConfig, SigningKeyResolution, SigningKeyResolver } from './signing-key-contracts.ts';

class RefreshRateLimited extends Error { readonly _tag = 'RefreshRateLimited'; }
const REFRESH_INTERVAL_MS = 1000;
const NEGATIVE_AGE_MS = 30000;
const NEGATIVE_CAPACITY = 32;

/** Private resolver; only authoritative admitted misses enter bounded negative state. */
export function makeSigningKeyResolver(config: SigningKeySourceConfig): Effect.Effect<SigningKeyResolver, never, Scope.Scope> {
  // Capture configuration now; each execution below acquires independent policy state.
  const captured = { ...config };
  return Effect.gen(function* () {
    let lastStart = -Infinity;
    let closed = false;
    const negative = new Map<string, number>();
    function refuseInvalidClock() {
      // Negative knowledge is trustworthy only while clock observations remain valid.
      negative.clear();
      return { ok: false as const, reason: 'invalid_clock' as const };
    }
    function recordNegative(kid: string, now: number): void {
      for (const [name, missedAt] of negative) {
        if (now - missedAt > NEGATIVE_AGE_MS) negative.delete(name);
      }
      negative.delete(kid);
      if (negative.size >= NEGATIVE_CAPACITY) {
        const oldest = negative.keys().next().value;
        if (oldest !== undefined) negative.delete(oldest);
      }
      negative.set(kid, now);
    }
    const wire = Semaphore.makeUnsafe(1);
    const readers = Semaphore.makeUnsafe(32);
    const store = yield* makeSnapshotStore(captured, (load, observe) => {
      const guarded = Effect.gen(function* () {
        const now = observe();
        if (now === undefined) return { ok: false as const, reason: 'invalid_clock' as const };
        if (now - lastStart < REFRESH_INTERVAL_MS) return yield* Effect.fail(new RefreshRateLimited());
        // Reserve before dispatch, including requests that fail or get interrupted.
        lastStart = now;
        return yield* load;
      });
      return Effect.map(wire.withPermitsIfAvailable(1)(guarded), result => Option.getOrElse(result, (): SourceResult => ({ ok: false, reason: 'unavailable' })));
    });
    const refresh = yield* ScopedCache.makeWith({
      lookup: () => Effect.flatMap(Effect.forkScoped(store.refreshSnapshot()), Fiber.join),
      capacity: 1,
      timeToLive: () => 0,
    });
    yield* Effect.addFinalizer(() => Effect.sync(() => {
      closed = true;
      negative.clear();
    }));
    return {
      resolveKey(kid: unknown): Effect.Effect<SigningKeyResolution, unknown> {
        const operation = Effect.gen(function* () {
          if (closed) return yield* Effect.interrupt;
          if (typeof kid !== 'string' || kid.length < 1 || kid.length > 128) return { ok: false as const, reason: 'invalid_key_id' as const };
          const result = yield* store.readSnapshot();
          if (!result.ok) {
            if (result.reason === 'invalid_clock') return refuseInvalidClock();
            return result;
          }
          let now = yield* store.readTime;
          if (now === undefined) return refuseInvalidClock();
          if (now - result.snapshot.fetchedAtMs > KEY_SNAPSHOT_MAX_AGE_MS) return { ok: false as const, reason: 'unavailable' as const };
          const known = result.snapshot.keys.find(key => key.kid === kid);
          if (known) return { ok: true as const, issuer: result.snapshot.issuer, fetchedAtMs: result.snapshot.fetchedAtMs, key: known };
          const missedAt = negative.get(kid);
          if (missedAt !== undefined && now - missedAt <= NEGATIVE_AGE_MS) return { ok: false as const, reason: 'unknown_key' as const };
          // All callers use the same refresh entry; the load gate reserves rate/wire
          // authority once, and publication occurs only after successful admission.
          const refreshed = yield* ScopedCache.get(refresh, 'issuer').pipe(Effect.catchIf(error => error instanceof RefreshRateLimited, () => Effect.succeed({ ok: false as const, reason: 'unknown_key' as const })));
          if (!refreshed.ok) {
            if (refreshed.reason === 'invalid_clock') return refuseInvalidClock();
            return refreshed;
          }
          yield* Effect.yieldNow;
          if (closed) return yield* Effect.interrupt;
          now = yield* store.readTime;
          if (now === undefined) return refuseInvalidClock();
          if (now - refreshed.snapshot.fetchedAtMs > KEY_SNAPSHOT_MAX_AGE_MS) return { ok: false as const, reason: 'unavailable' as const };
          const found = refreshed.snapshot.keys.find(key => key.kid === kid);
          if (found) return { ok: true as const, issuer: refreshed.snapshot.issuer, fetchedAtMs: refreshed.snapshot.fetchedAtMs, key: found };
          recordNegative(kid, now);
          return { ok: false as const, reason: 'unknown_key' as const };
        }).pipe(Effect.catchIf(error => error instanceof RefreshRateLimited, () => Effect.succeed({ ok: false as const, reason: 'unavailable' as const })), Effect.timeoutOption(3000), Effect.map(result => Option.getOrElse(result, (): SigningKeyResolution => ({ ok: false, reason: 'deadline' }))));
        return Effect.map(readers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): SigningKeyResolution => ({ ok: false, reason: 'unavailable' })));
      },
    };
  });
}
