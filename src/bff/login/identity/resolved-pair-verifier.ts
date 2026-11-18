import { Effect } from 'effect';
import type { Scope } from 'effect';
import { makeSigningKeyResolver } from './signing-key-resolver.ts';
import { makeSnapshotVerifier } from './snapshot-verifier.ts';
import { codePairKeyIds } from './code-pair.ts';
import { makeResolvedPairOperation } from './resolved-pair.operation.ts';
import type { SigningKeySourceConfig } from './signing-key-contracts.ts';
import type { CodePairVerifier } from './snapshot-contracts.ts';
export type { SnapshotVerificationResult as ResolvedCodePairResult } from './snapshot-contracts.ts';

/** Compose one configured resolver/crypto lifetime without executing another runtime. */
export function makeCodePairVerifier(config: SigningKeySourceConfig): Effect.Effect<CodePairVerifier, never, Scope.Scope> {
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
    const snapshot = yield* makeSnapshotVerifier({ issuer, now: clock });
    const resolver = yield* makeSigningKeyResolver({ issuer, ca, ...(deadlineMs === undefined ? {} : { deadlineMs }), ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }), now: clock });
    yield* Effect.addFinalizer(() => Effect.sync(() => { closed = true; }));
    return makeResolvedPairOperation({ issuer, active: () => !closed && ownerScope.state._tag !== 'Closed', now: () => { try { return clock(); } catch { return undefined; } }, selectKeys: codePairKeyIds, resolveKey: resolver.resolveKey, verifySnapshot: snapshot.verify });
  });
}
