import { Effect, Option, Semaphore } from 'effect';
import type { CodePairRequest, CodePairKeySelection, CodePairVerifier, SnapshotVerifier, SnapshotVerificationResult, PublicSigningKey } from './snapshot-contracts.ts';
import type { SigningKeyResolver } from './signing-key-contracts.ts';

/** Operation-owned ports; selectors cannot select an issuer or transport. */
export interface ResolvedPairDependencies {
  readonly issuer: string;
  readonly now: () => number | undefined;
  readonly active: () => boolean;
  readonly selectKeys: (request: CodePairRequest, nowMs: number) => CodePairKeySelection;
  readonly resolveKey: SigningKeyResolver['resolveKey'];
  readonly verifySnapshot: SnapshotVerifier['verify'];
}

/** Preserve the qualified three-second whole-verification budget and reader cap. */
export function makeResolvedPairOperation(deps: ResolvedPairDependencies): CodePairVerifier {
  const callers = Semaphore.makeUnsafe(32);
  return {
    verify(input) {
      let captured: CodePairRequest | undefined;
      try { captured = structuredClone(input); } catch { /* Refuse without credential diagnostics. */ }
      const request = captured;
      const operation = Effect.gen(function* () {
        if (!deps.active()) return yield* Effect.interrupt;
        if (!request) return { ok: false as const, reason: 'invalid_pair' as const };
        const before = deps.now();
        if (before === undefined) return { ok: false as const, reason: 'unavailable' as const };
        const selected = deps.selectKeys(request, before);
        if (!selected.ok) return selected;
        const keys: PublicSigningKey[] = [];
        let fetchedAtMs = Infinity;
        for (const kid of new Set([selected.idKid, selected.accessKid])) {
          const resolved = yield* deps.resolveKey(kid);
          if (!resolved.ok) return { ok: false as const, reason: resolved.reason === 'deadline' ? 'deadline' as const : resolved.reason === 'unknown_key' || resolved.reason === 'invalid_key_id' ? 'invalid_pair' as const : 'unavailable' as const };
          if (resolved.issuer !== deps.issuer || resolved.key.kid !== kid) return { ok: false as const, reason: 'unavailable' as const };
          keys.push(resolved.key);
          fetchedAtMs = Math.min(fetchedAtMs, resolved.fetchedAtMs);
        }
        const verifiedAt = deps.now();
        if (verifiedAt === undefined) return { ok: false as const, reason: 'unavailable' as const };
        const result = yield* deps.verifySnapshot({ ...request, snapshot: { fetchedAtMs, keys } });
        yield* Effect.yieldNow;
        if (!deps.active()) return yield* Effect.interrupt;
        const finished = deps.now();
        if (finished === undefined || finished - fetchedAtMs > 300000) return { ok: false as const, reason: 'unavailable' as const };
        if (result.ok && result.validUntilMs <= finished) return { ok: false as const, reason: 'invalid_pair' as const };
        return result;
      }).pipe(Effect.timeoutOption(3000), Effect.map(result => Option.getOrElse(result, (): SnapshotVerificationResult => ({ ok: false, reason: 'deadline' }))));
      return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): SnapshotVerificationResult => ({ ok: false, reason: 'unavailable' })));
    },
  };
}
