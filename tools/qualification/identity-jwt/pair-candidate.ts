import { verifyTokenProfile } from './candidate.ts';
import type { QualificationInput } from './candidate.ts';

/** Fixture-owned structural input; it is not admission of a production callback adapter. */
export interface CodePairQualificationInput {
  readonly issuer: string;
  readonly nonce: string;
  readonly requestStartedAtMs: number;
  readonly nowMs: number;
  readonly snapshot: QualificationInput['snapshot'];
  readonly candidates: {
    readonly stage: 'unverified-code';
    readonly idToken: string;
    readonly accessToken: string;
    readonly expiresIn: number;
  };
}
type PairResult = {
  readonly ok: true;
  readonly issuer: string;
  readonly subject: string;
  readonly validUntilMs: number;
} | {
  readonly ok: false;
  readonly reason: 'invalid_pair' | 'unavailable';
};
const invalid = (): PairResult => ({ ok: false, reason: 'invalid_pair' });
const safeInstant = (value: number): boolean => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Qualify a code-response observation at its captured instant, never create a session.
 * Nonce/POST context must come from a trusted consumed handoff; this fixture does not consume one.
 * Matching subjects/freshness do not cryptographically prove an exact common token response.
 */
export async function verifyCodePair(input: CodePairQualificationInput): Promise<PairResult> {
  try {
    // Own both credentials, both clock observations and all trusted key/config data before awaits.
    const captured = structuredClone(input);
    const { issuer, nonce, requestStartedAtMs, nowMs, snapshot, candidates } = captured;
    if (!safeInstant(nowMs) || !safeInstant(requestStartedAtMs) || requestStartedAtMs > nowMs ||
        typeof nonce !== 'string' || !nonce || nonce.length > 256 || candidates.stage !== 'unverified-code' ||
        !Number.isSafeInteger(candidates.expiresIn) || candidates.expiresIn < 1 || candidates.expiresIn > 300) return invalid();
    const responseEnd = requestStartedAtMs + candidates.expiresIn * 1000;
    if (!Number.isSafeInteger(responseEnd) || responseEnd <= nowMs) return invalid();
    const id = await verifyTokenProfile(candidates.idToken, { issuer, nonce, nowMs, snapshot, profile: 'id' });
    if (!id.ok) return { ok: false, reason: id.reason === 'unavailable' ? 'unavailable' : 'invalid_pair' };
    const access = await verifyTokenProfile(candidates.accessToken, { issuer, nowMs, snapshot, profile: 'initial-access' });
    if (!access.ok) return { ok: false, reason: access.reason === 'unavailable' ? 'unavailable' : 'invalid_pair' };
    if (id.issuer !== access.issuer || id.subject !== access.subject) return invalid();
    for (const verified of [id, access]) {
      // Conservative code-response profile, not a generic OIDC auth_time requirement.
      // NumericDate seconds are compared as exact milliseconds; fractional POST times may tighten tolerance.
      if (!safeInstant(verified.issuedAtMs) || !safeInstant(verified.expiresAtMs) ||
          verified.issuedAtMs < requestStartedAtMs - 30_000 ||
          (verified.notBeforeMs !== undefined && (!safeInstant(verified.notBeforeMs) || verified.notBeforeMs > nowMs))) return invalid();
    }
    const validUntilMs = Math.min(id.expiresAtMs, access.expiresAtMs, responseEnd);
    // Signature-verifier clock tolerance never extends usable credential lifetime.
    if (validUntilMs <= nowMs) return invalid();
    return { ok: true, issuer: id.issuer, subject: id.subject, validUntilMs };
  } catch { return invalid(); }
}
