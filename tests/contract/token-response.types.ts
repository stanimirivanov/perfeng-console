import type { DecodeResult, InvalidResponse, UnverifiedCodeTokens, UnverifiedDelegatedTokens, decodeCodeTokens, decodeDelegatedTokens } from '#perfeng/bff-token-response';

// Compile-only consumer contract: no suppression is needed to check readonly API shape.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type InvalidContract = Assert<Equal<InvalidResponse, { readonly ok: false; readonly reason: 'invalid_response' }>>;
export type CodeReadonly = Assert<Equal<UnverifiedCodeTokens, Readonly<UnverifiedCodeTokens>>>;
export type DelegatedReadonly = Assert<Equal<UnverifiedDelegatedTokens, Readonly<UnverifiedDelegatedTokens>>>;
export type ResultReadonly = Assert<Equal<DecodeResult<UnverifiedCodeTokens>, Readonly<DecodeResult<UnverifiedCodeTokens>>>>;
export type CodeReturnContract = Assert<Equal<ReturnType<typeof decodeCodeTokens>, DecodeResult<UnverifiedCodeTokens>>>;
export type DelegatedReturnContract = Assert<Equal<ReturnType<typeof decodeDelegatedTokens>, DecodeResult<UnverifiedDelegatedTokens>>>;
