import { Effect } from 'effect';
import type { InitialDelegationContext, VerifiedDelegationDependencies, VerifiedDelegationResult } from './verified-delegation-contracts.ts';

const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Retain credentials privately through one exchange and release only original-human observation. */
export function verifyDelegation(deps: VerifiedDelegationDependencies, input: InitialDelegationContext): Effect.Effect<VerifiedDelegationResult, unknown> {
  let captured: InitialDelegationContext | undefined;
  try { captured = structuredClone(input); } catch { /* Never serialize private context on refusal. */ }
  const source = captured;
  let consumed = false;
  return Effect.gen(function* () {
    const refused = (reason: 'unavailable' | 'invalid_input' | 'invalid_token'): VerifiedDelegationResult => ({ ok: false, reason });
    if (consumed || !deps.active()) return refused('unavailable');
    consumed = true;
    let highWater = -1;
    function clock() {
      try {
        const value = deps.now();
        if (!instant(value) || value < highWater) return;
        highWater = value;
        return value;
      } catch { return; }
    }
    const started = clock();
    if (started === undefined) return refused('unavailable');
    if (!source || source.issuer !== deps.issuer || typeof source.subject !== 'string' || !source.subject || source.subject.length > 256 || /[\x00-\x20\x7f]/.test(source.subject) ||
        !instant(source.validUntilMs) || source.validUntilMs <= started || source.validUntilMs - started > 300000) return refused('invalid_input');
    const response = yield* deps.exchange(source.accessToken, source.validUntilMs);
    yield* Effect.yieldNow;
    const exchanged = clock();
    if (!deps.active() || exchanged === undefined || exchanged >= source.validUntilMs) return refused('unavailable');
    if (!response.ok) return { ok: false as const, reason: response.reason };
    const verified = yield* deps.verify({ token: response.candidates.accessToken, subject: source.subject, requestStartedAtMs: response.requestStartedAtMs, expiresIn: response.candidates.expiresIn });
    yield* Effect.yieldNow;
    const finished = clock();
    if (!deps.active() || finished === undefined || finished >= source.validUntilMs) return refused('unavailable');
    if (!verified.ok) return { ok: false as const, reason: verified.reason };
    if (verified.issuer !== deps.issuer || verified.subject !== source.subject || verified.validUntilMs <= finished) return refused('invalid_token');
    return { ok: true as const, stage: 'verified-delegated-observation' as const, issuer: deps.issuer, subject: source.subject, validUntilMs: Math.min(source.validUntilMs, verified.validUntilMs) };
  });
}
