import { constants, createPrivateKey, randomBytes, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

/** Trusted server-only input. Each registered client needs its own managed key. */
export interface ClientAssertionConfig {
  issuer: string;
  clientId: string;
  privateKeyPem: string;
}

function admitted(config: ClientAssertionConfig) {
  try {
    const issuer = new URL(config.issuer);
    if (config.issuer.length > 1024 || issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash ||
        issuer.href !== config.issuer || !/^\/realms\/[A-Za-z0-9_-]{1,128}$/.test(issuer.pathname) ||
        !['perfeng-console-login', 'perfeng-console-delegate'].includes(config.clientId) ||
        typeof config.privateKeyPem !== 'string' || config.privateKeyPem.length > 16_384 ||
        !/^-----BEGIN PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PRIVATE KEY-----(?:\r?\n)?$/.test(config.privateKeyPem)) throw new Error();
    const key = createPrivateKey(config.privateKeyPem);
    const details = key.asymmetricKeyDetails;
    if (key.asymmetricKeyType !== 'rsa' || !details?.modulusLength || details.modulusLength < 2048 || details.modulusLength > 8192 ||
        details.publicExponent !== 65_537n) throw new Error();
    return { key, clientId: config.clientId, endpoint: config.issuer + '/protocol/openid-connect/token' };
  } catch { throw new Error('Invalid client authentication configuration'); }
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Own one client's signing capability. No file/network access or OAuth execution.
 * Claims/algorithm are fixed, not caller input. Returned form fields are secrets
 * for the later token adapter, never a browser response or user-identity proof.
 */
export function createClientAssertion(config: ClientAssertionConfig, now = () => Date.now()) {
  const profile = admitted(config);
  const { clientId, endpoint } = profile;
  let key: KeyObject | undefined = profile.key;
  let lastIssued = 0;
  const stop = () => { key = undefined; };
  return {
    issue() {
      if (!key) return;
      try {
        const time = now();
        const issued = Math.floor(time / 1000);
        // JWT NumericDate needs wall time, not the pending-login monotonic clock.
        // A regressing second or invalid clock retires this configured owner.
        if (!Number.isSafeInteger(time) || time < 0 || Number.isNaN(new Date(time).getTime()) || issued < lastIssued) { stop(); return; }
        lastIssued = issued;
        const header = encode({ alg: 'RS256', typ: 'JWT' });
        const body = encode({ iss: clientId, sub: clientId, aud: endpoint, iat: issued, exp: issued + 60, jti: randomBytes(32).toString('base64url') });
        const input = header + '.' + body;
        const signature = sign('RSA-SHA256', Buffer.from(input), { key, padding: constants.RSA_PKCS1_PADDING }).toString('base64url');
        return { client_id: clientId, client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: input + '.' + signature };
      } catch { stop(); return; }
    },
    stop,
  };
}
