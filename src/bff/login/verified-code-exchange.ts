import { Effect, Option, Semaphore } from 'effect';
import type { Scope } from 'effect';
import { createCodeExchange } from './code-exchange.ts';
import { makeCodePairVerifier } from './identity/resolved-pair-verifier.ts';
import { verifyConsumedExchange } from './verified-exchange.operation.ts';
import type { VerifiedCodeExchange, VerifiedCodeExchangeConfig, VerifiedCodeExchangeResult } from './verified-exchange-contracts.ts';
export type { VerifiedCodeExchange, VerifiedCodeExchangeConfig, VerifiedCodeExchangeResult } from './verified-exchange-contracts.ts';

/** Acquire an unmounted private login owner; callers own request execution/interruption. */
export function makeVerifiedCodeExchange(config: VerifiedCodeExchangeConfig, now = Date.now): Effect.Effect<VerifiedCodeExchange, Error, Scope.Scope> {
  const captured = { ...config };
  return Effect.gen(function* () {
    const ownerScope = yield* Effect.scope;
    let active = true;
    const isActive = () => active && ownerScope.state._tag !== 'Closed';
    const exchange = yield* Effect.acquireRelease(
      Effect.try({ try: () => createCodeExchange(captured, now), catch: () => new Error('Invalid verified code exchange configuration') }),
      owner => Effect.sync(() => { active = false; owner.stop(); }),
    );
    const verifier = yield* makeCodePairVerifier({ ...captured, now });
    const callers = Semaphore.makeUnsafe(32);
    const deps = { issuer: captured.issuer, exchange: exchange.complete, verify: verifier.verify, active: isActive, now };
    return {
      begin: (intent: unknown) => isActive() ? exchange.begin(intent) : undefined,
      complete(target: string, cookies: readonly string[]) {
        const operation = verifyConsumedExchange(deps, target, [...cookies]);
        return Effect.map(callers.withPermitsIfAvailable(1)(operation), result => Option.getOrElse(result, (): VerifiedCodeExchangeResult => ({ ok: false, reason: 'unavailable' })));
      },
      stop() { active = false; exchange.stop(); },
    };
  });
}
