import { Effect } from 'effect';
import type { Scope } from 'effect';
import { makeSigningKeyResolver } from './signing-key-resolver.ts';
import { makeDelegatedSnapshotVerifier } from './delegated-snapshot-verifier.ts';
import { tokenKeyId } from './token-profile.ts';
import { makeResolvedDelegatedOperation } from './resolved-delegated.operation.ts';
import type { SigningKeySourceConfig } from './signing-key-contracts.ts';
import type { DelegatedVerifier } from './snapshot-contracts.ts';
export type { DelegatedSnapshotResult as ResolvedDelegatedResult } from './snapshot-contracts.ts';

/** Compose one configured resolver/crypto lifetime without executing another runtime. */
export function makeDelegatedVerifier(config: SigningKeySourceConfig): Effect.Effect<DelegatedVerifier, never, Scope.Scope> {
  const { issuer, ca, deadlineMs, maxResponseBytes, now = Date.now } = config;
  return Effect.gen(function* () {
    const ownerScope = yield* Effect.scope;
    let highWater = -1;
    let closed = false;
    function clock(): number {
      const value = now();
      if (!Number.isSafeInteger(value) || value < 0 || Number.isNaN(new Date(value).getTime()) || value < highWater) throw new Error('invalid_clock');
      highWater = value;
      return value;
    }
    const snapshot = yield* makeDelegatedSnapshotVerifier({ issuer, now: clock });
    const resolver = yield* makeSigningKeyResolver({ issuer, ca, ...(deadlineMs === undefined ? {} : { deadlineMs }), ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }), now: clock });
    yield* Effect.addFinalizer(() => Effect.sync(() => { closed = true; }));
    return makeResolvedDelegatedOperation({ issuer, active: () => !closed && ownerScope.state._tag !== 'Closed', now: () => { try { return clock(); } catch { return undefined; } }, selectKey: token => { try { return tokenKeyId(token); } catch { return undefined; } }, resolveKey: resolver.resolveKey, verifySnapshot: snapshot.verify });
  });
}
