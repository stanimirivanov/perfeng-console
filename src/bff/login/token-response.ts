import { decodeTokenEnvelope, isJwtShapedToken } from './token-envelope.ts';

/** Candidates are private credentials, not verified claims, sessions or grants. */
export interface UnverifiedCodeTokens {
  readonly stage: 'unverified-code';
  readonly accessToken: string;
  readonly idToken: string;
  readonly expiresIn: number;
  readonly refreshToken?: string;
}
export interface UnverifiedDelegatedTokens {
  readonly stage: 'unverified-delegated';
  readonly accessToken: string;
  readonly expiresIn: number;
}
export type InvalidResponse = { readonly ok: false; readonly reason: 'invalid_response' };
export type DecodeResult<T> = { readonly ok: true; readonly candidates: T } | InvalidResponse;

const invalid = (): InvalidResponse => ({ ok: false, reason: 'invalid_response' });

/** Decode only a code-response envelope; JWT signatures/claims remain unverified. */
export function decodeCodeTokens(body: unknown): DecodeResult<UnverifiedCodeTokens> {
  const value = decodeTokenEnvelope(body);
  if (!value || !isJwtShapedToken(value.id_token) || Object.hasOwn(value, 'issued_token_type') ||
      (value.refresh_token !== undefined && !isJwtShapedToken(value.refresh_token))) return invalid();
  return { ok: true, candidates: { stage: 'unverified-code', accessToken: value.access_token,
    idToken: value.id_token, expiresIn: value.expires_in,
    ...(value.refresh_token === undefined ? {} : { refreshToken: value.refresh_token }) } };
}

/** Decode only the access-token exchange profile; never retain exchanged refresh/ID tokens. */
export function decodeDelegatedTokens(body: unknown): DecodeResult<UnverifiedDelegatedTokens> {
  const value = decodeTokenEnvelope(body);
  // The delegate may receive an access token only, not a renewable/offline grant.
  // Keycloak may still emit zero-valued refresh-expiry metadata without a token.
  if (!value || value.issued_token_type !== 'urn:ietf:params:oauth:token-type:access_token' ||
      Object.hasOwn(value, 'refresh_token') || Object.hasOwn(value, 'id_token') ||
      (value.refresh_expires_in !== undefined && value.refresh_expires_in !== 0)) return invalid();
  return { ok: true, candidates: { stage: 'unverified-delegated', accessToken: value.access_token, expiresIn: value.expires_in } };
}
