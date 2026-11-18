import { createHash } from 'node:crypto';
import { tokenKeyId, verifyTokenProfile } from './token-profile.ts';
import type { CodePairRequest, CodePairVerificationInput, CodePairResult } from './snapshot-contracts.ts';
export type { CodePairRequest, CodePairResult } from './snapshot-contracts.ts';

const invalid = (): CodePairResult => ({ ok: false, reason: 'invalid_pair' });
const safeInstant = (value: number): boolean => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

function validContext(input: CodePairRequest, nowMs: number): boolean {
  const { nonce, requestStartedAtMs, candidates } = input;
  if (!safeInstant(nowMs) || !safeInstant(requestStartedAtMs) || requestStartedAtMs > nowMs ||
      typeof nonce !== 'string' || !nonce || nonce.length > 256 || candidates.stage !== 'unverified-code' ||
      !Number.isSafeInteger(candidates.expiresIn) || candidates.expiresIn < 1 || candidates.expiresIn > 300) return false;
  const end = requestStartedAtMs + candidates.expiresIn * 1000;
  return Number.isSafeInteger(end) && end > nowMs;
}

/** Strict no-I/O preflight; selectors remain untrusted and never select an origin. */
export function codePairKeyIds(input: CodePairRequest, nowMs: number): {
  readonly ok: true;
  readonly idKid: string;
  readonly accessKid: string;
} | {
  readonly ok: false;
  readonly reason: 'invalid_pair';
} {
  try {
    if (!validContext(input, nowMs)) return { ok: false, reason: 'invalid_pair' };
    return { ok: true, idKid: tokenKeyId(input.candidates.idToken), accessKid: tokenKeyId(input.candidates.accessToken) };
  } catch { return { ok: false, reason: 'invalid_pair' }; }
}

/** Qualify a code-response observation at its captured instant, never create a session.
 * Nonce/POST context must come from a trusted consumed handoff; this primitive does not consume one.
 * Matching subjects/freshness do not cryptographically prove an exact common token response.
 */
export async function verifyCodePair(input: CodePairVerificationInput): Promise<CodePairResult> {
  try {
    // Own both credentials, both clock observations and all trusted key/config data before awaits.
    const captured = structuredClone(input);
    const { issuer, nonce, requestStartedAtMs, nowMs, snapshot, candidates } = captured;
    if (!validContext(captured, nowMs)) return invalid();
    const responseEnd = requestStartedAtMs + candidates.expiresIn * 1000;
    const id = await verifyTokenProfile(candidates.idToken, { issuer, nonce, nowMs, snapshot, profile: 'id' });
    if (!id.ok) return { ok: false, reason: id.reason === 'unavailable' ? 'unavailable' : 'invalid_pair' };
    const access = await verifyTokenProfile(candidates.accessToken, { issuer, nowMs, snapshot, profile: 'initial-access' });
    if (!access.ok) return { ok: false, reason: access.reason === 'unavailable' ? 'unavailable' : 'invalid_pair' };
    if (id.issuer !== access.issuer || id.subject !== access.subject) return invalid();
    // RS256 at_hash is the base64url left half of SHA-256 over exact ASCII token bytes.
    // Its absence is permitted for this code-flow profile, never common-response proof.
    if (id.accessTokenHash !== undefined) {
      const expected = createHash('sha256').update(candidates.accessToken, 'ascii').digest().subarray(0, 16).toString('base64url');
      if (typeof id.accessTokenHash !== 'string' || id.accessTokenHash !== expected) return invalid();
    }
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
