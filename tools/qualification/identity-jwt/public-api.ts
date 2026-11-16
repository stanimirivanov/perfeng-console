/** Qualification-only snapshot/code-pair surface, never production authentication. */
export { admitSigningKeys } from './jwks-candidate.ts';
export type { SigningKeySnapshot } from './jwks-candidate.ts';
export { codePairKeyIds, verifyCodePair } from './pair-candidate.ts';
export type { CodePairRequest, CodePairResult } from './pair-candidate.ts';
