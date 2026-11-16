import { importJWK, jwtVerify } from 'jose';
import type { JWK } from 'jose';
import { strictJsonObject } from './strict-json.ts';
import { publicSigningKey } from './signing-key.ts';

export interface QualificationInput {
  readonly issuer: string;
  readonly profile: 'id' | 'initial-access';
  readonly nonce?: string | undefined;
  readonly nowMs: number;
  readonly snapshot: {
    readonly fetchedAtMs: number;
    readonly keys: readonly JWK[];
  };
}
type Result = {
  readonly ok: true;
  readonly issuer: string;
  readonly subject: string;
  readonly profile: QualificationInput['profile'];
} |
  {
    readonly ok: false;
    readonly reason: 'invalid_token' | 'unavailable';
  };
type Refusal = Extract<Result, { ok: false; }>;
type VerifiedProfile = Refusal | (Extract<Result, { ok: true; }> & {
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly notBeforeMs: number | undefined;
});
const invalid = (): Refusal => ({ ok: false, reason: 'invalid_token' });
const unavailable = (): Refusal => ({ ok: false, reason: 'unavailable' });

function objectSegment(segment: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error('Noncanonical segment');
  const bytes = Buffer.from(segment, 'base64url');
  if (bytes.toString('base64url') !== segment) throw new Error('Noncanonical segment');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return strictJsonObject(text, { maxNodes: 512 });
}

/** Isolated qualification only: explicit trusted snapshots, never remote discovery.
 * No session, service grant or enrolled HUMAN/CI kind is inferred from claims.
 */
export async function verifyTokenProfile(token: unknown, input: QualificationInput): Promise<VerifiedProfile> {
  try {
    const { issuer, profile, nonce, nowMs } = input;
    const snapshot = structuredClone(input.snapshot);
    if (!Number.isSafeInteger(nowMs) || nowMs < 0 || Number.isNaN(new Date(nowMs).getTime()) ||
        !Number.isSafeInteger(snapshot.fetchedAtMs) || snapshot.fetchedAtMs > nowMs || nowMs - snapshot.fetchedAtMs > 300000 ||
        snapshot.keys.length < 1 || snapshot.keys.length > 32) return unavailable();
    const origin = new URL(issuer);
    if (origin.protocol !== 'https:' || origin.href !== issuer || origin.username || origin.password || origin.search || origin.hash ||
        !/^\/realms\/[A-Za-z0-9_-]{1,128}$/.test(origin.pathname)) return unavailable();
    if (typeof token !== 'string' || token.length > 16384 || !['id', 'initial-access'].includes(profile)) return invalid();
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0]!.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(parts[2]!)) return invalid();
    if (Buffer.from(parts[2]!, 'base64url').toString('base64url') !== parts[2]) return invalid();
    const header = objectSegment(parts[0]!);
    const claims = objectSegment(parts[1]!);
    if (Object.keys(header).sort().join(',') !== 'alg,kid,typ' || header.alg !== 'RS256' || header.typ !== 'JWT' ||
        typeof header.kid !== 'string' || header.kid.length < 1 || header.kid.length > 128) return invalid();
    if (new Set(snapshot.keys.map(key => key.kid)).size !== snapshot.keys.length) return unavailable();
    const selected = snapshot.keys.filter(key => key.kid === header.kid);
    if (selected.length !== 1) return invalid();
    const key = publicSigningKey(selected[0]);
    if (!key) return unavailable();
    const audience = profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate';
    if (claims.aud !== audience || claims.azp !== 'perfeng-console-login' || claims.typ !== (profile === 'id' ? 'ID' : 'Bearer') ||
        typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256 || /[\x00-\x20\x7f]/.test(claims.sub) ||
        typeof claims.iat !== 'number' || !Number.isSafeInteger(claims.iat) || typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp) ||
        claims.exp <= claims.iat || claims.exp - claims.iat > 300 ||
        (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isSafeInteger(claims.nbf))) ||
        (profile === 'id' && (typeof nonce !== 'string' || !nonce || nonce.length > 256 || claims.nonce !== nonce))) return invalid();
    const cryptoKey = await importJWK({ kty: 'RSA', n: key.n, e: key.e, alg: 'RS256', use: 'sig' }, 'RS256');
    await jwtVerify(token, cryptoKey, { algorithms: ['RS256'], typ: 'JWT', issuer, audience,requiredClaims: ['iss', 'sub', 'aud', 'iat', 'exp'], maxTokenAge: 300, clockTolerance: 30, currentDate: new Date(nowMs) });
    return { ok: true, issuer, subject: claims.sub, profile, issuedAtMs: claims.iat * 1000, expiresAtMs: claims.exp * 1000, notBeforeMs: claims.nbf === undefined ? undefined : claims.nbf * 1000 };
  } catch { return invalid(); }
}

/** Retain the per-token public projection; signed time fields stay fixture-internal. */
export async function verifyCandidate(token: unknown, input: QualificationInput): Promise<Result> {
  const verified = await verifyTokenProfile(token, input);
  return verified.ok ? { ok: true, issuer: verified.issuer, subject: verified.subject, profile: verified.profile } : verified;
}
