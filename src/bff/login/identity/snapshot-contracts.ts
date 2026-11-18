import type { Effect } from 'effect';

export interface TokenVerificationInput {
  readonly issuer: string;
  readonly profile: 'id' | 'initial-access';
  readonly nonce?: string | undefined;
  readonly nowMs: number;
  readonly snapshot: {
    readonly fetchedAtMs: number;
    readonly keys: readonly Readonly<Record<string, unknown>>[];
  };
}
/** Login-owned unverified response context; its caller must establish transaction custody. */
export interface CodePairRequest {
  readonly nonce: string;
  readonly requestStartedAtMs: number;
  readonly candidates: {
    readonly stage: 'unverified-code';
    readonly idToken: string;
    readonly accessToken: string;
    readonly expiresIn: number;
  };
}
export interface CodePairVerificationInput extends CodePairRequest {
  readonly issuer: string;
  readonly nowMs: number;
  readonly snapshot: TokenVerificationInput['snapshot'];
}
export type CodePairResult = {
  readonly ok: true;
  readonly issuer: string;
  readonly subject: string;
  readonly validUntilMs: number;
} | {
  readonly ok: false;
  readonly reason: 'invalid_pair' | 'unavailable';
};
/** Trusted provenance is a caller obligation; a TypeScript shape cannot establish it. */
export type SnapshotVerificationInput = Omit<CodePairVerificationInput, 'issuer' | 'nowMs'>;
export type SnapshotVerificationResult = CodePairResult | {
  readonly ok: false;
  readonly reason: 'deadline';
};
export interface SnapshotVerifierConfig {
  readonly issuer: string;
  readonly now?: () => number;
}
export interface SnapshotVerifier {
  readonly verify: (input: SnapshotVerificationInput) => Effect.Effect<SnapshotVerificationResult>;
}
