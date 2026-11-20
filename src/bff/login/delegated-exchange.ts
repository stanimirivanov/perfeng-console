import { Effect, Option, Semaphore } from 'effect';
import type { Scope } from 'effect';
import { createClientAssertion } from './client-assertion.ts';
import { createTokenPost } from './token-post.ts';
import { decodeDelegatedTokens } from './token-response.ts';
import { delegateOnce } from './delegated-exchange.operation.ts';
import type { DelegatedExchange, DelegatedExchangeConfig, DelegatedExchangeResult } from './delegated-exchange-contracts.ts';

/** Acquire an unmounted private delegate owner; callers own execution and interruption.
 *
 * @param config - Trusted delegate signing key and fixed token-transport configuration, captured at factory call.
 * @param now - Epoch milliseconds for assertion issuance and source-expiry/dispatch observations.
 * @returns A scoped acquisition Effect. Signer/transport configuration errors enter its Error channel on execution;
 * successful exchange methods build lazy, one-shot Effects whose candidate credentials remain server-only.
 */
export function makeDelegatedExchange(config: DelegatedExchangeConfig, now = Date.now): Effect.Effect<DelegatedExchange, Error, Scope.Scope> {
  const captured = { ...config };
  return Effect.gen(function* () {
    const scope = yield* Effect.scope;
    let active = true;
    const isActive = () => active && scope.state._tag !== 'Closed';
    const signer = yield* Effect.acquireRelease(
      Effect.try({ try: () => createClientAssertion({ issuer: captured.issuer, clientId: 'perfeng-console-delegate', privateKeyPem: captured.privateKeyPem }, now), catch: () => new Error('Invalid delegated exchange configuration') }),
      owner => Effect.sync(() => { active = false; owner.stop(); }),
    );
    const wire = yield* Effect.try({ try: () => createTokenPost(captured), catch: () => new Error('Invalid delegated exchange configuration') });
    const callers = Semaphore.makeUnsafe(32);
    const dependencies = { active: isActive, now, issue: signer.issue, post: wire.post, decode: decodeDelegatedTokens };
    return {
      exchange(sourceToken, sourceValidUntilMs) {
        const operation = delegateOnce(dependencies, sourceToken, sourceValidUntilMs);
        return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): DelegatedExchangeResult => ({ ok: false, reason: 'unavailable' })));
      },
      stop() { active = false; signer.stop(); },
    };
  });
}
