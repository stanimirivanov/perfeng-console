/** Closed navigation intent; never an arbitrary URL or service grant. */
export type LoginReturnIntent = { kind: 'home' } | { kind: 'run'; runId: string };

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


export type TokenPostReason = 'invalid_input' | 'invalid_response' | 'denied' | 'unavailable' | 'deadline';
export type TokenPostResult = { readonly ok: true; readonly body: string } | { readonly ok: false; readonly reason: TokenPostReason };

/** Private code-exchange observation; nonce and credentials still need verification. */
export type CodeExchangeResult =
  { readonly ok: false; readonly reason: TokenPostReason | 'invalid_callback' | 'provider_denied'; readonly clearCookie?: string } |
  { readonly ok: true; readonly candidates: UnverifiedCodeTokens; readonly nonce: string;
    readonly returnIntent: Readonly<LoginReturnIntent>; readonly requestStartedAtMs: number; readonly clearCookie: string };
