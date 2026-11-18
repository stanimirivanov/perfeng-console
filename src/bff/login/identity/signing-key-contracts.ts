import type { Effect } from 'effect';
import type { PublicSigningKey } from './snapshot-contracts.ts';

/** Configuration is trusted server input, never a token-selected destination or CA. */
export interface SigningKeyGetConfig {
  readonly issuer: string;
  readonly ca: string;
  readonly deadlineMs?: number;
  readonly maxResponseBytes?: number;
}
export interface SigningKeySourceConfig extends SigningKeyGetConfig {
  readonly now?: () => number;
}
export type SigningKeyResult = {
  readonly ok: true;
  readonly stage: 'unverified-jwks';
  readonly body: string;
} | {
  readonly ok: false;
  readonly reason: 'unavailable' | 'invalid_response' | 'deadline';
};
export interface SigningKeyGet {
  readonly get: () => Effect.Effect<SigningKeyResult, unknown>;
}
export interface SigningKeysInput {
  readonly issuer: string;
  readonly retrievalStartedAtMs: number;
  readonly nowMs: number;
  readonly wire: Extract<SigningKeyResult, { readonly ok: true; }>;
}
export interface SigningKeySnapshot {
  readonly issuer: string;
  readonly fetchedAtMs: number;
  readonly keys: readonly PublicSigningKey[];
}
export type SigningKeysAdmission = {
  readonly ok: true;
  readonly snapshot: SigningKeySnapshot;
} | {
  readonly ok: false;
  readonly reason: 'invalid_jwks';
};
export type SourceResult = {
  readonly ok: true;
  readonly snapshot: SigningKeySnapshot;
} | {
  readonly ok: false;
  readonly reason: 'invalid_clock' | 'invalid_jwks' | 'invalid_response' | 'unavailable' | 'deadline';
};
export interface SigningKeySource {
  readonly load: () => Effect.Effect<SourceResult, unknown>;
}
export type SnapshotLoadGate = (load: Effect.Effect<SourceResult, unknown>, observe: () => number | undefined) => Effect.Effect<SourceResult, unknown>;
export interface SnapshotStore {
  readonly readTime: Effect.Effect<number | undefined>;
  readonly refreshSnapshot: () => Effect.Effect<SourceResult, unknown>;
  readonly readSnapshot: () => Effect.Effect<SourceResult, unknown>;
}
export type SigningKeyResolution = {
  readonly ok: true;
  readonly issuer: string;
  readonly fetchedAtMs: number;
  readonly key: PublicSigningKey;
} | {
  readonly ok: false;
  readonly reason: 'invalid_key_id' | 'unknown_key' | 'invalid_clock' | 'invalid_jwks' | 'invalid_response' | 'unavailable' | 'deadline';
};
export interface SigningKeyResolver {
  readonly resolveKey: (kid: unknown) => Effect.Effect<SigningKeyResolution, unknown>;
}
