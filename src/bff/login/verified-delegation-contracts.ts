import type { Effect } from 'effect';
import type { DelegatedExchangeConfig, DelegatedExchangeResult } from './delegated-exchange-contracts.ts';
import type { DelegatedVerifier } from './identity/snapshot-contracts.ts';

/** Private caller-owned verified initial login context; never a browser request DTO. */
export interface InitialDelegationContext {
  readonly issuer: string;
  readonly subject: string;
  readonly accessToken: string;
  readonly validUntilMs: number;
}
export type VerifiedDelegationResult = Extract<DelegatedExchangeResult, { ok: false; }> | {
  readonly ok: false;
  readonly reason: 'invalid_token';
} | {
  readonly ok: true;
  readonly stage: 'verified-delegated-observation';
  readonly issuer: string;
  readonly subject: string;
  readonly validUntilMs: number;
};
export interface VerifiedDelegation {
  readonly delegate: (context: InitialDelegationContext) => Effect.Effect<VerifiedDelegationResult, unknown>;
  readonly stop: () => void;
}
export interface VerifiedDelegationDependencies {
  readonly issuer: string;
  readonly active: () => boolean;
  readonly now: () => number;
  readonly exchange: (token: string, validUntilMs: number) => Effect.Effect<DelegatedExchangeResult, unknown>;
  readonly verify: DelegatedVerifier['verify'];
}
export type VerifiedDelegationConfig = DelegatedExchangeConfig;
