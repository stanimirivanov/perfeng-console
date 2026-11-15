import { createLoginTransactions } from './transactions.ts';

const callbackPath = '/console/auth/callback';
const cookieName = '__Host-perfeng_login';
const cookieAttributes = '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=';
const clearCookie = cookieName + '=' + cookieAttributes + '0';
const parameterNames = new Set(['state', 'iss', 'code', 'session_state', 'error', 'error_description', 'error_uri']);
const visible = (value: string | null, max: number): value is string => value !== null && value.length <= max && /^[\x21-\x7e]+$/.test(value);

/** Operator-owned fixed Keycloak profile; never derive these values from HTTP. */
export interface LoginProtocolConfig {
  issuer: string;
  consoleOrigin: string;
}

function fixedProfile(config: LoginProtocolConfig) {
  try {
    const issuer = new URL(config.issuer);
    const console = new URL(config.consoleOrigin);
    if (config.issuer.length > 1024 || issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash ||
        issuer.href !== config.issuer || !/^\/realms\/[A-Za-z0-9_-]{1,128}$/.test(issuer.pathname) ||
        console.protocol !== 'https:' || console.username || console.password || console.origin !== config.consoleOrigin) throw new Error();
    return { issuer: config.issuer, redirectUri: console.origin + callbackPath, authorizationEndpoint: config.issuer + '/protocol/openid-connect/auth' };
  } catch { throw new Error('Invalid login configuration'); }
}

function browserBinding(headers: readonly string[]): string | undefined {
  if (headers.length > 8 || headers.some(header => !/^[\x20-\x7e]*$/.test(header)) || headers.reduce((size, header) => size + header.length, 0) > 4096) return;
  const values: string[] = [];
  for (const header of headers) for (const part of header.split(';')) {
    const equals = part.indexOf('=');
    if (part.slice(0, equals).trim() === cookieName && equals >= 0) values.push(part.slice(equals + 1).trim());
  }
  return values.length === 1 ? values[0] : undefined;
}

/** Synchronous protocol admission, not a listener or authenticated session.
 * Future incoming adapters must check Host/method/Origin/CSRF before begin and
 * pass the unnormalized request target and all Cookie headers to callback.
 * The successful handoff is server-only input to later scoped exchange work.
 */
export function createLoginProtocol(config: LoginProtocolConfig, now?: () => number) {
  const profile = fixedProfile(config);
  const transactions = createLoginTransactions(now);
  return {
    begin(intent: unknown) {
      const pending = transactions.begin(intent);
      if (!pending) return;
      const { state, nonce, codeChallenge, codeChallengeMethod } = pending.authorization;
      const query = new URLSearchParams({ client_id: 'perfeng-console-login', redirect_uri: profile.redirectUri,response_type: 'code', scope: 'openid', state, nonce, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod });
      return { authorizationUrl: profile.authorizationEndpoint + '?' + query,setCookie: cookieName + '=' + pending.browserBinding + cookieAttributes + '300' };
    },
    callback(rawTarget: string, cookieHeaders: readonly string[]) {
      const invalid = () => ({ ok: false as const, reason: 'invalid_callback' as const });
      // Check raw bytes before URLSearchParams can normalize malformed escapes,
      // absolute targets, dot segments, control characters or fragments.
      if (rawTarget.length > 8192 || !rawTarget.startsWith(callbackPath + '?') ||
          !/^[\x21-\x7e]+$/.test(rawTarget) || rawTarget.includes('#') || /%(?![0-9a-fA-F]{2})/.test(rawTarget)) return invalid();
      const query = new URLSearchParams(rawTarget.slice(callbackPath.length + 1));
      if (query.getAll('state').length !== 1) return invalid();
      const pending = transactions.consume(query.get('state'), browserBinding(cookieHeaders));
      if (!pending) return invalid();
      const boundInvalid = () => ({ ...invalid(), clearCookie });
      // Once the browser/state pair is established, every outcome burns it.
      // In particular an issuer error must never leave a reusable handoff.
      for (const name of query.keys()) if (!parameterNames.has(name) || query.getAll(name).length !== 1) return boundInvalid();
      if (query.get('iss') !== profile.issuer || (query.has('session_state') && !visible(query.get('session_state'), 256))) return boundInvalid();
      const error = query.get('error');
      if (error !== null) {
        if (query.has('code') || !/^[a-z][a-z0-9_]{0,63}$/.test(error) ||
            (query.has('error_description') && (query.get('error_description')!.length > 512 || /[\x00-\x1f\x7f]/.test(query.get('error_description')!))) ||
            (query.has('error_uri') && !visible(query.get('error_uri'), 1024))) return boundInvalid();
        return { ok: false as const, reason: 'provider_denied' as const, clearCookie };
      }
      const code = query.get('code');
      if (!visible(code, 4096) || query.has('error_description') || query.has('error_uri')) return boundInvalid();
      return { ok: true as const, handoff: { ...pending, code }, clearCookie };
    },
    stop: transactions.stop,
  };
}
