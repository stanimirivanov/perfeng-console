import type { Effect } from 'effect';
import type { DecodeResult, TokenPostResult, UnverifiedDelegatedTokens } from './login-contracts.ts';

/** Server-owned ports; source credentials and validity come from verified login custody. */
export interface DelegatedExchangeDependencies {
  readonly active: () => boolean;
  readonly now: () => number;
  readonly issue: () => {
    readonly client_id: string;
    readonly client_assertion_type: string;
    readonly client_assertion: string;
  } | undefined;
  readonly post: (form: string) => Effect.Effect<TokenPostResult, unknown>;
  readonly decode: (body: unknown) => DecodeResult<UnverifiedDelegatedTokens>;
}
export type DelegatedExchangeResult = {
  readonly ok: false;
  readonly reason: 'unavailable' | 'invalid_input' | 'invalid_response' | 'denied' | 'deadline';
} | {
  readonly ok: true;
  readonly candidates: UnverifiedDelegatedTokens;
  readonly requestStartedAtMs: number;
};
