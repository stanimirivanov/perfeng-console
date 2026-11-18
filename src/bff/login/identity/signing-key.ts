/** Private/secret JWK member names are forbidden even in ignored sibling metadata. */
export const PRIVATE_KEY_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'] as const;
export type PublicSigningKey = Readonly<{
  kid: string;
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  n: string;
  e: 'AQAB';
}>;

/** Validate the existing RS256 public-key profile and project only its operative fields. */
export function publicSigningKey(value: unknown): PublicSigningKey | undefined {
  if (!value || typeof value !== 'object') return;
  const key = value as Record<string, unknown>;
  if (typeof key.kid !== 'string' || !key.kid || key.kid.length > 128 ||
      key.kty !== 'RSA' || key.use !== 'sig' || key.alg !== 'RS256' || key.e !== 'AQAB' || typeof key.n !== 'string' || key.n.length > 1366 ||
      PRIVATE_KEY_MEMBERS.some(name => Object.hasOwn(key, name)) ||
      (key.key_ops !== undefined && (!Array.isArray(key.key_ops) || key.key_ops.length !== 1 || key.key_ops[0] !== 'verify'))) return;
  const modulus = Buffer.from(key.n, 'base64url');
  const bits = (modulus.length - 1) * 8 + (32 - Math.clz32(modulus[0] ?? 0));
  if (modulus.toString('base64url') !== key.n || modulus[0] === 0 || bits < 2048 || bits > 8192) return;
  // key_ops and remote/certificate extensions carry no additional authority after admission.
  return { kid: key.kid, kty: 'RSA', use: 'sig', alg: 'RS256', n: key.n, e: 'AQAB' };
}
