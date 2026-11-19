import { Effect } from 'effect';
import type { LoginDelegationDependencies, LoginDelegationResult } from './login-delegation-contracts.ts';
import type { CodePairRequest } from './identity/snapshot-contracts.ts';

const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Keep exact consumed response custody through signed pair proof and delegation; never release credentials. */
export function consumeLoginDelegation(deps: LoginDelegationDependencies, target: string, cookies: readonly string[]): Effect.Effect<LoginDelegationResult, unknown> {
  return Effect.gen(function* () {
    if (!deps.active()) return { ok: false as const, reason: 'unavailable' as const };
    const response = yield* deps.exchange(target, cookies);
    if (!response.ok) return { ok: false as const, reason: response.reason, ...(response.clearCookie === undefined ? {} : { clearCookie: response.clearCookie }) };
    const clearCookie = response.clearCookie;
    const refused = (reason: 'unavailable' | 'invalid_pair' | 'invalid_token'): LoginDelegationResult => ({ ok: false, reason, clearCookie });
    // Own primitive credential/context values before either verifier can suspend.
    const request: CodePairRequest = { nonce: response.nonce, requestStartedAtMs: response.requestStartedAtMs, candidates: { stage: 'unverified-code', idToken: response.candidates.idToken, accessToken: response.candidates.accessToken, expiresIn: response.candidates.expiresIn } };
    const initialAccessToken = request.candidates.accessToken;
    const returnIntent = response.returnIntent.kind === 'run' ? { kind: 'run' as const, runId: response.returnIntent.runId } : { kind: 'home' as const };
    let highWater = request.requestStartedAtMs;
    function clock() {
      try {
        const value = deps.now();
        if (!instant(value) || value < highWater) return;
        highWater = value;
        return value;
      } catch { return; }
    }
    if (!deps.active() || clock() === undefined) return refused('unavailable');
    const pair = yield* deps.verifyPair(request);
    yield* Effect.yieldNow;
    const verifiedAt = clock();
    if (!deps.active() || verifiedAt === undefined) return refused('unavailable');
    if (!pair.ok) return { ok: false as const, reason: pair.reason, clearCookie };
    if (pair.issuer !== deps.issuer || !instant(pair.validUntilMs) || pair.validUntilMs <= verifiedAt) return refused('invalid_pair');
    const originalSubject = pair.subject;
    const originalUntilMs = pair.validUntilMs;
    const originalIssuer = deps.issuer;
    const original = { issuer: originalIssuer, subject: originalSubject, accessToken: initialAccessToken, validUntilMs: originalUntilMs };
    const delegated = yield* deps.delegate(original);
    yield* Effect.yieldNow;
    const finished = clock();
    if (!deps.active() || finished === undefined || finished >= originalUntilMs) return refused('unavailable');
    if (!delegated.ok) return { ok: false as const, reason: delegated.reason, clearCookie };
    if (delegated.issuer !== originalIssuer || delegated.subject !== originalSubject || !instant(delegated.validUntilMs) || delegated.validUntilMs <= finished) return refused('invalid_token');
    return { ok: true as const, stage: 'verified-login-delegation' as const, issuer: originalIssuer, subject: originalSubject, validUntilMs: Math.min(originalUntilMs, delegated.validUntilMs), returnIntent, clearCookie };
  });
}
