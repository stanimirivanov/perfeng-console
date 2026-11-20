import { Effect, Option, Semaphore } from 'effect';
import type { Scope } from 'effect';
import { createCodeExchange } from './code-exchange.ts';
import { makeCodePairVerifier } from './identity/resolved-pair-verifier.ts';
import { makeVerifiedDelegation } from './verified-delegation.ts';
import { consumeLoginDelegation } from './login-delegation.operation.ts';
import type { LoginDelegation, LoginDelegationConfig, LoginDelegationResult } from './login-delegation-contracts.ts';

/** Unmounted consumed-login custody owner; creates no authenticated session or service grant.
 *
 * @param config - Trusted fixed issuer/transport and separate login/delegate keys, captured at factory call.
 * @param now - Epoch milliseconds for signing, verification and source-expiry fences; protocol time stays separate.
 * @returns A scoped acquisition Effect. Login/delegate construction errors enter its Error channel on execution;
 * complete retains credential custody through verification and returns minimal observations plus server-only cookie instructions.
 */
export function makeLoginDelegation(config: LoginDelegationConfig, now = Date.now): Effect.Effect<LoginDelegation, Error, Scope.Scope> {
  const { loginPrivateKeyPem, delegatePrivateKeyPem, ...captured } = { ...config };
  return Effect.gen(function* () {
    const scope = yield* Effect.scope;
    let active = true;
    const isActive = () => active && scope.state._tag !== 'Closed';
    const exchange = yield* Effect.acquireRelease(
      Effect.try({ try: () => createCodeExchange({ ...captured, privateKeyPem: loginPrivateKeyPem }, now), catch: () => new Error('Invalid login delegation configuration') }),
      owner => Effect.sync(() => { active = false; owner.stop(); }),
    );
    const verifier = yield* makeCodePairVerifier({ ...captured, now });
    const delegation = yield* makeVerifiedDelegation({ ...captured, privateKeyPem: delegatePrivateKeyPem }, now);
    yield* Effect.addFinalizer(() => Effect.sync(() => { active = false; exchange.stop(); delegation.stop(); }));
    const callers = Semaphore.makeUnsafe(32);
    const deps = { issuer: captured.issuer, active: isActive, now, exchange: exchange.complete, verifyPair: verifier.verify, delegate: delegation.delegate };
    return {
      begin: intent => isActive() ? exchange.begin(intent) : undefined,
      complete(target, cookies) {
        const operation = consumeLoginDelegation(deps, target, [...cookies]);
        return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): LoginDelegationResult => ({ ok: false, reason: 'unavailable' })));
      },
      stop() { active = false; exchange.stop(); delegation.stop(); },
    };
  });
}
