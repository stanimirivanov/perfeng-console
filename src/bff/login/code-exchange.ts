import { createLoginProtocol } from './protocol.ts';
import type { LoginProtocolConfig } from './protocol.ts';
import { createClientAssertion } from './client-assertion.ts';
import { createTokenPost } from './token-post.ts';
import type { TokenPostConfig } from './token-post.ts';
import { decodeCodeTokens } from './token-response.ts';
import { exchangeCode } from './code-exchange.operation.ts';
export type { CodeExchangeResult } from './login-contracts.ts';

export interface CodeExchangeConfig extends LoginProtocolConfig, TokenPostConfig {
  readonly privateKeyPem: string;
}

/** Compose the private code exchange. Caller owns Effect execution/interruption;
 * stop retires authority, not a browser session or a provider-issued credential.
 */
export function createCodeExchange(config: CodeExchangeConfig, now = () => Date.now()) {
  let protocol: ReturnType<typeof createLoginProtocol> | undefined;
  let signer: ReturnType<typeof createClientAssertion> | undefined;
  try {
    const login = createLoginProtocol(config);
    protocol = login;
    const assertion = createClientAssertion({ issuer: config.issuer, clientId: 'perfeng-console-login', privateKeyPem: config.privateKeyPem }, now);
    signer = assertion;
    const wire = createTokenPost(config);
    let active = true;
    const dependencies = { admit: login.callback, issue: assertion.issue, post: wire.post, decode: decodeCodeTokens,
      active: () => active, now, redirectUri: config.consoleOrigin + '/console/auth/callback' };
    return {
      begin: (intent: unknown) => active ? login.begin(intent) : undefined,
      complete: (target: string, cookies: readonly string[]) => exchangeCode(dependencies, target, [...cookies]),
      stop() { active = false; login.stop(); assertion.stop(); },
    };
  } catch {
    protocol?.stop(); signer?.stop();
    throw new Error('Invalid code exchange configuration');
  }
}
