import { strictJsonObject } from './strict-json.ts';
import { PRIVATE_KEY_MEMBERS, publicSigningKey } from './signing-key.ts';
import type { PublicSigningKey } from './signing-key.ts';

/** Caller-owned retrieval provenance, not issuer/time claims read from JSON. */
export interface SigningKeysInput {
  readonly issuer: string;
  readonly retrievalStartedAtMs: number;
  readonly nowMs: number;
  readonly wire: {
    readonly ok: true;
    readonly stage: 'unverified-jwks';
    readonly body: string;
  };
}
export interface SigningKeySnapshot {
  readonly issuer: string;
  readonly fetchedAtMs: number;
  readonly keys: readonly PublicSigningKey[];
}
type Result = {
  readonly ok: true;
  readonly snapshot: SigningKeySnapshot;
} | {
  readonly ok: false;
  readonly reason: 'invalid_jwks';
};
const invalid = (): Result => ({ ok: false, reason: 'invalid_jwks' });
const instant = (value: number) => Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Admit one bounded public snapshot in isolation; no network provenance or cache proof is inferred. */
export function admitSigningKeys(input: SigningKeysInput): Result {
  try {
    const { issuer, retrievalStartedAtMs, nowMs, wire } = input;
    if (!instant(nowMs) || !instant(retrievalStartedAtMs) || retrievalStartedAtMs > nowMs || nowMs - retrievalStartedAtMs > 300000) return invalid();
    const configured = new URL(issuer);
    if (typeof issuer !== 'string' || issuer.length > 1024 || configured.href !== issuer || configured.protocol !== 'https:' ||
        configured.username || configured.password || configured.search || configured.hash || !/^\/realms\/[A-Za-z0-9_-]{1,128}$/.test(configured.pathname)) return invalid();
    const { ok, stage, body } = wire;
    if (ok !== true || stage !== 'unverified-jwks' || typeof body !== 'string' || !body.isWellFormed() || Buffer.byteLength(body, 'utf8') > 65536) return invalid();
    const document = strictJsonObject(body, { maxNodes: 4096, forbiddenMembers: PRIVATE_KEY_MEMBERS });
    if (Object.keys(document).join(',') !== 'keys' || !Array.isArray(document.keys) || !document.keys.length || document.keys.length > 32) return invalid();
    const ids = new Set<string>();
    const selected: PublicSigningKey[] = [];
    for (const entry of document.keys) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return invalid();
      const key = entry as Record<string, unknown>;
      if (typeof key.kid !== 'string' || !key.kid || key.kid.length > 128 || ids.has(key.kid) ||
          !['kty', 'alg', 'use'].every(name => typeof key[name] === 'string' && key[name].length > 0 && key[name].length <= 128)) return invalid();
      ids.add(key.kid);
      // Mixed public encryption/EC siblings are not signature authority; never treat missing selectors as a default.
      if (key.alg !== 'RS256' || key.use !== 'sig') continue;
      const admitted = publicSigningKey(key);
      if (!admitted) return invalid();
      selected.push(Object.freeze(admitted));
    }
    if (!selected.length) return invalid();
    return Object.freeze({ ok: true as const, snapshot: Object.freeze({ issuer, fetchedAtMs: retrievalStartedAtMs, keys: Object.freeze(selected) }) });
  } catch { return invalid(); }
}
