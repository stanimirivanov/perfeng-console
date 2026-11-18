import type { Effect } from 'effect';
import type { CodeExchangeResult, LoginReturnIntent } from './login-contracts.ts';
import type { SigningKeyGetConfig } from './identity/signing-key-contracts.ts';
import type { CodePairVerifier } from './identity/snapshot-contracts.ts';

export interface VerifiedCodeExchangeConfig extends SigningKeyGetConfig {
  readonly consoleOrigin: string;
  readonly privateKeyPem: string;
}
export type VerifiedCodeExchangeResult = Extract<CodeExchangeResult, { readonly ok: false; }> | {
  readonly ok: false;
  readonly reason: 'invalid_pair';
  readonly clearCookie: string;
} | {
  readonly ok: true;
  readonly stage: 'verified-code-observation';
  readonly issuer: string;
  readonly subject: string;
  readonly validUntilMs: number;
  readonly returnIntent: Readonly<LoginReturnIntent>;
  readonly clearCookie: string;
};
export interface VerifiedCodeExchange {
  readonly begin: (intent: unknown) => {
    readonly authorizationUrl: string;
    readonly setCookie: string;
  } | undefined;
  readonly complete: (target: string, cookies: readonly string[]) => Effect.Effect<VerifiedCodeExchangeResult, unknown>;
  readonly stop: () => void;
}
export interface VerifiedExchangeDependencies {
  readonly issuer: string;
  readonly exchange: (target: string, cookies: readonly string[]) => Effect.Effect<CodeExchangeResult, unknown>;
  readonly verify: CodePairVerifier['verify'];
  readonly active: () => boolean;
  readonly now: () => number;
}
