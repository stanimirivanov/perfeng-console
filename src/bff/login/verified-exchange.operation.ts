import { Effect } from 'effect';
import type { VerifiedCodeExchangeResult, VerifiedExchangeDependencies } from './verified-exchange-contracts.ts';
import type { CodePairRequest } from './identity/snapshot-contracts.ts';
import type { LoginReturnIntent } from './login-contracts.ts';

const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Own the consumed response through verification; never return its credentials or restore its state. */
export function verifyConsumedExchange(deps: VerifiedExchangeDependencies, target: string, cookies: readonly string[]): Effect.Effect<VerifiedCodeExchangeResult, unknown> {
  return Effect.gen(function* () {
    if (!deps.active()) return { ok: false as const, reason: 'unavailable' as const };
    const response = yield* deps.exchange(target, cookies);
    if (!response.ok) return { ok: false as const, reason: response.reason, ...(response.clearCookie === undefined ? {} : { clearCookie: response.clearCookie }) };
    const clearCookie = response.clearCookie;
    const refused = (reason: 'unavailable' | 'invalid_pair' | 'deadline') => ({ ok: false as const, reason, clearCookie });
    // Project primitives before the next await; neither token claims nor a verifier can supply navigation context.
    const request: CodePairRequest = {
      nonce: response.nonce,
      requestStartedAtMs: response.requestStartedAtMs,
      candidates: { stage: 'unverified-code', idToken: response.candidates.idToken, accessToken: response.candidates.accessToken, expiresIn: response.candidates.expiresIn },
    };
    const intent: LoginReturnIntent = response.returnIntent.kind === 'run' ? { kind: 'run', runId: response.returnIntent.runId } : { kind: 'home' };
    if (!deps.active()) return refused('unavailable');
    const result = yield* deps.verify(request);
    yield* Effect.yieldNow;
    if (!deps.active()) return refused('unavailable');
    let finished: number;
    try { finished = deps.now(); } catch { return refused('unavailable'); }
    if (!instant(finished) || finished < request.requestStartedAtMs) return refused('unavailable');
    if (!result.ok) return refused(result.reason);
    if (result.issuer !== deps.issuer || result.validUntilMs <= finished) return refused('invalid_pair');
    return { ok: true as const, stage: 'verified-code-observation' as const, issuer: result.issuer, subject: result.subject, validUntilMs: result.validUntilMs, returnIntent: intent, clearCookie };
  });
}
