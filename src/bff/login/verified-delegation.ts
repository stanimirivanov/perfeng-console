import { Effect, Option, Semaphore } from 'effect';
import type { Scope } from 'effect';
import { makeDelegatedExchange } from './delegated-exchange.ts';
import { makeDelegatedVerifier } from './identity/resolved-delegated-verifier.ts';
import { verifyDelegation } from './verified-delegation.operation.ts';
import type { VerifiedDelegation, VerifiedDelegationConfig, VerifiedDelegationResult } from './verified-delegation-contracts.ts';

/** Acquire private verified delegation; neither its context nor its result authorizes a session.
 *
 * @param config - Trusted delegate key, fixed transport and key-source configuration, captured at factory call.
 * @param now - Epoch milliseconds for signing, original-credential expiry and verified observations.
 * @returns A scoped acquisition Effect, propagating delegate construction errors through its Error channel on execution.
 * The acquired delegate builds lazy work from server-owned initial-token custody and returns minimal observations.
 */
export function makeVerifiedDelegation(config: VerifiedDelegationConfig, now = Date.now): Effect.Effect<VerifiedDelegation, Error, Scope.Scope> {
  const captured = { ...config };
  return Effect.gen(function* () {
    const scope = yield* Effect.scope;
    let active = true;
    const isActive = () => active && scope.state._tag !== 'Closed';
    const wire = yield* makeDelegatedExchange(captured, now);
    const verifier = yield* makeDelegatedVerifier({ ...captured, now });
    yield* Effect.addFinalizer(() => Effect.sync(() => { active = false; wire.stop(); }));
    const callers = Semaphore.makeUnsafe(32);
    const deps = { issuer: captured.issuer, active: isActive, now, exchange: wire.exchange, verify: verifier.verify };
    return {
      delegate: input => {
        const operation = verifyDelegation(deps, input);
        return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): VerifiedDelegationResult => ({ ok: false, reason: 'unavailable' })));
      },
      stop() { active = false; wire.stop(); },
    };
  });
}
