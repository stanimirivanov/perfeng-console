import { Data, Effect } from 'effect';
import type { DecodeResult, LoginReturnIntent, UnverifiedCodeTokens, TokenPostReason, TokenPostResult, CodeExchangeResult } from './login-contracts.ts';

type Admission = {
  readonly ok: false;
  readonly reason: 'invalid_callback' | 'provider_denied';
  readonly clearCookie?: string;
} |
  {
    readonly ok: true;
    readonly clearCookie: string;
    readonly handoff: {
      readonly code: string;
      readonly codeVerifier: string;
      readonly nonce: string;
      readonly returnIntent: LoginReturnIntent;
    };
  };

/** Consumer-owned capabilities; authentication and transport remain adapters. */
export interface CodeExchangeDependencies {
  readonly admit: (target: string, cookies: readonly string[]) => Admission;
  readonly issue: () => {
    client_id: string;
    client_assertion_type: string;
    client_assertion: string;
  } | undefined;
  readonly post: (form: string) => Effect.Effect<TokenPostResult, unknown>;
  readonly decode: (body: unknown) => DecodeResult<UnverifiedCodeTokens>;
  readonly active: () => boolean;
  readonly now: () => number;
  readonly redirectUri: string;
}
class ExchangeClockFailure extends Data.TaggedError('ExchangeClockFailure')<{ readonly message: string; }> {}
const readTime = (now: () => number) => Effect.try({ try: now, catch: () => new ExchangeClockFailure({ message: 'Exchange clock unavailable' }) }).pipe(
  Effect.catchTag('ExchangeClockFailure', () => Effect.succeed(undefined))
);
const validTime = (value: number | undefined): value is number => value !== undefined && Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());

/** Consume once on execution, never replay after any uncertain provider effect.
 * Success carries credentials/expected nonce only; no JWT identity is verified.
 */
export function exchangeCode(deps: CodeExchangeDependencies, target: string, cookies: readonly string[]): Effect.Effect<CodeExchangeResult, unknown> {
  return Effect.gen(function* () {
    if (!deps.active()) return { ok: false as const, reason: 'unavailable' as const };
    const admitted = deps.admit(target, cookies);
    if (!admitted.ok) return admitted;
    const refused = (reason: TokenPostReason) => ({ ok: false as const, reason, clearCookie: admitted.clearCookie });
    const started = yield* readTime(deps.now);
    if (!validTime(started)) return refused('unavailable');
    const assertion = deps.issue();
    if (!assertion || assertion.client_id !== 'perfeng-console-login' || assertion.client_assertion_type !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer' || !deps.active()) return refused('unavailable');
    const form = new URLSearchParams({ grant_type: 'authorization_code', code: admitted.handoff.code,redirect_uri: deps.redirectUri, code_verifier: admitted.handoff.codeVerifier,client_id: assertion.client_id, client_assertion_type: assertion.client_assertion_type, client_assertion: assertion.client_assertion }).toString();
    const response = yield* deps.post(form);
    const completed = yield* readTime(deps.now);
    // Retirement and clock checks fence late credentials independently of abort.
    if (!deps.active() || !validTime(completed) || completed < started) return refused('unavailable');
    if (!response.ok) return refused(response.reason);
    const decoded = deps.decode(response.body);
    if (!decoded.ok) return refused(decoded.reason);
    return { ok: true as const, candidates: decoded.candidates, nonce: admitted.handoff.nonce,returnIntent: admitted.handoff.returnIntent, requestStartedAtMs: started, clearCookie: admitted.clearCookie };
  });
}
