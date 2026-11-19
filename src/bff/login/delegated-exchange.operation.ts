import { Effect } from 'effect';
import type { DelegatedExchangeDependencies, DelegatedExchangeResult } from './delegated-exchange-contracts.ts';

const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Construct one private attempt, not a retryable operation or verified delegated identity.
 * A server custody owner must supply the initial credential and its verified usable expiry.
 */
export function delegateOnce(deps: DelegatedExchangeDependencies, sourceToken: string, sourceValidUntilMs: number): Effect.Effect<DelegatedExchangeResult, unknown> {
  let consumed = false;
  return Effect.gen(function* () {
    if (consumed) return { ok: false as const, reason: 'unavailable' as const };
    // Consume before any asynchronous work; uncertain POSTs must never be replayed.
    consumed = true;
    const refused = (reason: Extract<DelegatedExchangeResult, { ok: false; }>['reason']): DelegatedExchangeResult => ({ ok: false, reason });
    if (!deps.active()) return refused('unavailable');
    let started: number;
    try { started = deps.now(); } catch { return refused('unavailable'); }
    if (!instant(started)) return refused('unavailable');
    if (!instant(sourceValidUntilMs) || sourceValidUntilMs <= started || sourceValidUntilMs - started > 300000 ||
        typeof sourceToken !== 'string' || sourceToken.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(sourceToken)) return refused('invalid_input');
    const assertion = deps.issue();
    if (!assertion || assertion.client_id !== 'perfeng-console-delegate' || assertion.client_assertion_type !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer' || !assertion.client_assertion || !deps.active()) return refused('unavailable');
    // Signing is synchronous work, but can cross source expiry or a clock regression.
    let dispatch: number;
    try { dispatch = deps.now(); } catch { return refused('unavailable'); }
    if (!instant(dispatch) || dispatch < started || dispatch >= sourceValidUntilMs || !deps.active()) return refused('unavailable');
    const form = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: sourceToken, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token', requested_token_type: 'urn:ietf:params:oauth:token-type:access_token', audience: 'perfeng-control-plane', client_id: assertion.client_id, client_assertion_type: assertion.client_assertion_type, client_assertion: assertion.client_assertion }).toString();
    const response = yield* deps.post(form);
    yield* Effect.yieldNow;
    let finished: number;
    try { finished = deps.now(); } catch { return refused('unavailable'); }
    // Dispatch is the latest accepted clock observation; start remains the response lifetime anchor.
    if (!deps.active() || !instant(finished) || finished < dispatch || finished >= sourceValidUntilMs) return refused('unavailable');
    if (!response.ok) return refused(response.reason);
    const decoded = deps.decode(response.body);
    if (!decoded.ok) return refused(decoded.reason);
    return { ok: true as const, candidates: { stage: 'unverified-delegated' as const, accessToken: decoded.candidates.accessToken, expiresIn: decoded.candidates.expiresIn }, requestStartedAtMs: started };
  });
}
