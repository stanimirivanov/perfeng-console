import assert from 'node:assert/strict';
import { constants, generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { createClientAssertion } from '#perfeng/bff-client-assertion';

const issuer = 'https://identity.example/realms/perfeng';
const endpoint = issuer + '/protocol/openid-connect/token';
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = key.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const config = (clientId = 'perfeng-console-login') => ({ issuer, clientId, privateKeyPem: pem });
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
const validSignature = (jwt: string, publicKey = key.publicKey) => {
  const [header, body, signature] = jwt.split('.');
  return verify('RSA-SHA256', Buffer.from(header + '.' + body), { key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(signature!, 'base64url'));
};

test('each client assertion has exact fixed claims, bounded lifetime and a real RS256 signature', () => {
  for (const client of ['perfeng-console-login', 'perfeng-console-delegate']) {
    let now = 1_800_000_000_123;
    const registered = client === 'perfeng-console-login' ? key : other;
    const wrong = client === 'perfeng-console-login' ? other : key;
    const source = { ...config(client), privateKeyPem: registered.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
    const owner = createClientAssertion(source, () => now);
    source.issuer = 'https://evil.example/realms/evil';
    source.clientId = 'forged';
    source.privateKeyPem = 'replaced';
    const first = owner.issue()!;
    assert.deepEqual(Object.keys(first).sort(), ['client_assertion', 'client_assertion_type', 'client_id']);
    assert.equal(first.client_id, client);
    assert.equal(first.client_assertion_type, 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    const parts = first.client_assertion.split('.');
    assert.equal(parts.length, 3);
    assert.deepEqual(decode(parts[0]!), { alg: 'RS256', typ: 'JWT' });
    const body = decode(parts[1]!);
    assert.deepEqual(Object.keys(body).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'sub']);
    assert.deepEqual({ ...body, jti: '<random>' }, { iss: client, sub: client, aud: endpoint, iat: 1_800_000_000, exp: 1_800_000_060, jti: '<random>' });
    assert.match(body.jti, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(validSignature(first.client_assertion, registered.publicKey), true);
    assert.equal(validSignature(first.client_assertion, wrong.publicKey), false);
    const changed = Buffer.from(JSON.stringify({ ...body, sub: 'attacker' })).toString('base64url');
    assert.equal(validSignature([parts[0], changed, parts[2]].join('.'), registered.publicKey), false);
    const sameSecond = decode(owner.issue()!.client_assertion.split('.')[1]!);
    assert.equal(sameSecond.iat, body.iat);
    assert.notEqual(sameSecond.jti, body.jti);
    now += 1000;
    const second = owner.issue()!;
    assert.notEqual(decode(second.client_assertion.split('.')[1]!).jti, body.jti);
    assert.equal(decode(second.client_assertion.split('.')[1]!).iat, 1_800_000_001);
    assert.equal(JSON.stringify(owner), '{}');
    assert.equal(first.client_assertion.includes(pem), false);
    owner.stop();
    owner.stop();
    assert.equal(owner.issue(), undefined);
  }
});

test('client and issuer configuration is closed and every rejection has a fixed safe error', () => {
  for (const changed of [{ clientId: 'perfeng-ci' }, { clientId: 'human-subject' }, { issuer: 'http://identity.example/realms/perfeng' },{ issuer: issuer + '/' }, { issuer: issuer + '?token=private' }, { issuer: issuer + '#fragment' },{ issuer: 'https://user:private@identity.example/realms/perfeng' }, { issuer: 'https://identity.example/realms/../evil' }]) {
    assert.throws(() => createClientAssertion({ ...config(), ...changed }), { message: 'Invalid client authentication configuration' });
  }
});

test('only bounded unencrypted PKCS8 RSA keys with admitted size and exponent can sign', () => {
  const weak = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const exponent = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 3 });
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pss = generateKeyPairSync('rsa-pss', { modulusLength: 2048 });
  const rejected = ['private-key-canary', 'x'.repeat(16_385), pem + pem,key.publicKey.export({ type: 'spki', format: 'pem' }).toString(),key.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),key.privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'test-only-password' }).toString(),...[weak, exponent, ec, pss].map(pair => pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()),];
  for (const privateKeyPem of rejected) assert.throws(() => createClientAssertion({ ...config(), privateKeyPem }), { message: 'Invalid client authentication configuration' });
});

test('bad or regressing whole-second clocks stop the owner without leaking diagnostics', () => {
  for (const bad of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER, 1_799_999_999_000]) {
    let now = 1_800_000_000_000;
    const owner = createClientAssertion(config(), () => now);
    assert.ok(owner.issue());
    now = bad;
    assert.equal(owner.issue(), undefined);
    now = 1_800_000_001_000;
    assert.equal(owner.issue(), undefined);
  }
  let failed = false;
  const owner = createClientAssertion(config(), () => { if (failed) throw new Error('private-clock-canary'); return 1_800_000_000_000; });
  failed = true;
  assert.equal(owner.issue(), undefined);
  failed = false;
  assert.equal(owner.issue(), undefined);
});
