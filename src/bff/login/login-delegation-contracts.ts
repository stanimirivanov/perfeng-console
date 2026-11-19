import type { Effect } from 'effect';
import type { CodeExchangeResult, LoginReturnIntent } from './login-contracts.ts';
import type { CodePairVerifier } from './identity/snapshot-contracts.ts';
import type { SigningKeyGetConfig } from './identity/signing-key-contracts.ts';
import type { VerifiedDelegation, VerifiedDelegationResult } from './verified-delegation-contracts.ts';

export interface LoginDelegationConfig extends SigningKeyGetConfig {
  readonly consoleOrigin: string;
  readonly loginPrivateKeyPem: string;
  readonly delegatePrivateKeyPem: string;
}
export type LoginDelegationResult = (Extract<CodeExchangeResult, { ok: false; }> | Extract<VerifiedDelegationResult, { ok: false; }> | {
  readonly ok: false;
  readonly reason: 'invalid_pair';
}) & { readonly clearCookie?: string; } | {
  readonly ok: true;
  readonly stage: 'verified-login-delegation';
  readonly issuer: string;
  readonly subject: string;
  readonly validUntilMs: number;
  readonly returnIntent: Readonly<LoginReturnIntent>;
  readonly clearCookie: string;
};
export interface LoginDelegation {
  readonly begin: (intent: unknown) => {
    readonly authorizationUrl: string;
    readonly setCookie: string;
  } | undefined;
  readonly complete: (target: string, cookies: readonly string[]) => Effect.Effect<LoginDelegationResult, unknown>;
  readonly stop: () => void;
}
export interface LoginDelegationDependencies {
  readonly issuer: string;
  readonly active: () => boolean;
  readonly now: () => number;
  readonly exchange: (target: string, cookies: readonly string[]) => Effect.Effect<CodeExchangeResult, unknown>;
  readonly verifyPair: CodePairVerifier['verify'];
  readonly delegate: VerifiedDelegation['delegate'];
}
