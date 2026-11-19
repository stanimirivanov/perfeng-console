import { Effect, Option, Semaphore } from 'effect';
import type { DelegatedRequest, DelegatedVerifier, DelegatedSnapshotVerifier, DelegatedSnapshotResult } from './snapshot-contracts.ts';
import type { SigningKeyResolver } from './signing-key-contracts.ts';

/** Operation-owned ports: untrusted selectors never choose issuer or transport. */
export interface ResolvedDelegatedDependencies {
  readonly issuer: string;
  readonly now: () => number | undefined;
  readonly active: () => boolean;
  readonly selectKey: (token: unknown) => string | undefined;
  readonly resolveKey: SigningKeyResolver['resolveKey'];
  readonly verifySnapshot: DelegatedSnapshotVerifier['verify'];
}
const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Bound resolution plus scoped crypto as one private verification operation. */
export function makeResolvedDelegatedOperation(deps: ResolvedDelegatedDependencies): DelegatedVerifier {
  const callers = Semaphore.makeUnsafe(32);
  return {
    verify(input) {
      let captured: DelegatedRequest | undefined;
      try { captured = structuredClone(input); } catch { /* Never expose credential diagnostics. */ }
      const request = captured;
      const operation = Effect.gen(function* () {
        if (!deps.active()) return yield* Effect.interrupt;
        if (!request) return { ok: false as const, reason: 'invalid_token' as const };
        const before = deps.now();
        if (before === undefined || !instant(before)) return { ok: false as const, reason: 'unavailable' as const };
        const end = request.requestStartedAtMs + request.expiresIn * 1000;
        if (typeof request.subject !== 'string' || !request.subject || request.subject.length > 256 || /[\x00-\x20\x7f]/.test(request.subject) ||
            !instant(request.requestStartedAtMs) || request.requestStartedAtMs > before || !Number.isSafeInteger(request.expiresIn) || request.expiresIn < 1 || request.expiresIn > 300 || !Number.isSafeInteger(end) || end <= before)
          return { ok: false as const, reason: 'invalid_token' as const };
        const kid = deps.selectKey(request.token);
        if (!kid) return { ok: false as const, reason: 'invalid_token' as const };
        const resolved = yield* deps.resolveKey(kid);
        if (!resolved.ok) return { ok: false as const, reason: resolved.reason === 'deadline' ? 'deadline' as const : resolved.reason === 'unknown_key' || resolved.reason === 'invalid_key_id' ? 'invalid_token' as const : 'unavailable' as const };
        if (resolved.issuer !== deps.issuer || resolved.key.kid !== kid) return { ok: false as const, reason: 'unavailable' as const };
        const result = yield* deps.verifySnapshot({ ...request, snapshot: { fetchedAtMs: resolved.fetchedAtMs, keys: [resolved.key] } });
        yield* Effect.yieldNow;
        if (!deps.active()) return yield* Effect.interrupt;
        const finished = deps.now();
        if (finished === undefined || !instant(finished) || finished < before || finished - resolved.fetchedAtMs > 300000) return { ok: false as const, reason: 'unavailable' as const };
        if (result.ok && (result.issuer !== deps.issuer || result.subject !== request.subject || result.validUntilMs <= finished)) return { ok: false as const, reason: 'invalid_token' as const };
        return result;
      }).pipe(Effect.timeoutOption(3000), Effect.map(result => Option.getOrElse(result, (): DelegatedSnapshotResult => ({ ok: false, reason: 'deadline' }))));
      return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): DelegatedSnapshotResult => ({ ok: false, reason: 'unavailable' })));
    },
  };
}
