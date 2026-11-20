import { Effect, Exit, Fiber, Option, ScopedCache, Semaphore } from 'effect';
import type { Scope } from 'effect';
import { createSigningKeySource } from './signing-key-source.ts';
import { KEY_SNAPSHOT_MAX_AGE_MS } from './key-policy.ts';
import type { SigningKeySourceConfig, SourceResult, SnapshotStore, SnapshotLoadGate } from './signing-key-contracts.ts';

const MAX_READERS = 32;

/** Owner-local immutable snapshot storage; only the source constructs network authority. */
export function makeSnapshotStore(config: SigningKeySourceConfig, gate: SnapshotLoadGate = load => load): Effect.Effect<SnapshotStore, never, Scope.Scope> {
  // Capture caller-owned configuration before any asynchronous construction.
  const { issuer, ca, deadlineMs, maxResponseBytes, now = Date.now } = config;
  return Effect.gen(function* () {
    let highWater = -1;
    function clock(): number {
      const value = now();
      if (!Number.isSafeInteger(value) || value < 0 || Number.isNaN(new Date(value).getTime()) || value < highWater) throw new Error('invalid_clock');
      highWater = value;
      return value;
    }
    function observe() {
      try { return clock(); } catch { return undefined; }
    }
    const source = createSigningKeySource({ issuer, ca, ...(deadlineMs === undefined ? {} : { deadlineMs }), ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }), now: clock });
    const load = gate(source.load(), observe);
    const cache = yield* ScopedCache.makeWith({
      // The lookup fiber itself is detached by ScopedCache; attach the actual
      // wire operation to the entry scope so owner shutdown interrupts it too.
      lookup: () => Effect.flatMap(Effect.forkScoped(load), Fiber.join),
      capacity: 1,
      // Completion-relative TTL is a second bound, never the freshness authority.
      timeToLive: exit => Exit.isSuccess(exit) && exit.value.ok ? KEY_SNAPSHOT_MAX_AGE_MS : 0,
    });
    const readers = Semaphore.makeUnsafe(MAX_READERS);
    let closed = false;
    yield* Effect.addFinalizer(() => Effect.sync(() => { closed = true; }));
    return {
      readTime: Effect.gen(function* () {
        const readAt = observe();
        if (readAt === undefined) yield* ScopedCache.invalidateAll(cache);
        return readAt;
      }),
      refreshSnapshot(): Effect.Effect<SourceResult, unknown> {
        return Effect.gen(function* () {
          if (closed) return yield* Effect.interrupt;
          const result = yield* load;
          yield* Effect.yieldNow;
          if (closed) return yield* Effect.interrupt;
          if (result.ok) {
            const now = observe();
            if (now === undefined) {
              yield* ScopedCache.invalidateAll(cache);
              return { ok: false as const, reason: 'invalid_clock' as const };
            }
            if (now - result.snapshot.fetchedAtMs > KEY_SNAPSHOT_MAX_AGE_MS) return { ok: false as const, reason: 'unavailable' as const };
            yield* ScopedCache.set(cache, 'issuer', result);
          }
          return result;
        });
      },
      readSnapshot(): Effect.Effect<SourceResult, unknown> {
        const read = Effect.gen(function* () {
          if (closed) return yield* Effect.interrupt;
          const before = yield* Effect.sync(observe);
          if (before === undefined) {
            yield* ScopedCache.invalidateAll(cache);
            return { ok: false as const, reason: 'invalid_clock' as const };
          }
          // Inspect completed values only: awaiting a pending refusal here would
          // make the subsequent get perform an unintended second retrieval.
          const previous = yield* ScopedCache.getSuccess(cache, 'issuer');
          if (Option.isSome(previous) && previous.value.ok && before - previous.value.snapshot.fetchedAtMs > KEY_SNAPSHOT_MAX_AGE_MS) {
            yield* ScopedCache.invalidateWhen(cache, 'issuer', value => value === previous.value);
          }
          const result = yield* ScopedCache.get(cache, 'issuer');
          yield* Effect.yieldNow;
          if (closed) return yield* Effect.interrupt;
          const after = yield* Effect.sync(observe);
          if (after === undefined) {
            yield* ScopedCache.invalidateAll(cache);
            return { ok: false as const, reason: 'invalid_clock' as const };
          }
          if (result.ok && after - result.snapshot.fetchedAtMs > KEY_SNAPSHOT_MAX_AGE_MS) {
            yield* ScopedCache.invalidateWhen(cache, 'issuer', value => value === result);
            return { ok: false as const, reason: 'unavailable' as const };
          }
          return result;
        });
        return Effect.map(readers.withPermitsIfAvailable(1)(read), result => Option.getOrElse(result, (): SourceResult => ({ ok: false, reason: 'unavailable' })));
      },
    };
  }) satisfies Effect.Effect<unknown, never, Scope.Scope>;
}
