import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { verifyCandidate } from './candidate.ts';
import { admitSigningKeys } from './jwks-candidate.ts';

const issuer = 'https://issuer.example/realms/perfeng';
const nowMs = 1_800_000_000_000;
const primary = generateKeyPairSync('rsa', { modulusLength: 2048 });
const replacement = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { ...primary.publicKey.export({ format: 'jwk' }), kid: 'old', use: 'sig', alg: 'RS256' };
const next = { ...replacement.publicKey.export({ format: 'jwk' }), kid: 'new', use: 'sig', alg: 'RS256' };
function input(body = JSON.stringify({ keys: [key, next] })) {
  return { issuer, retrievalStartedAtMs: nowMs - 1000, nowMs, wire: { ok: true as const, stage: 'unverified-jwks' as const, body } };
}
const invalid = { ok: false, reason: 'invalid_jwks' };

test('multiple rotation keys become an owned frozen minimal snapshot, not authority from metadata', async () => {
  const value = input(JSON.stringify({ keys: [{ ...key, key_ops: ['verify'], x5u: 'https://never-fetch.invalid', x5c: ['ignored-certificate'] }, next] }));
  const result = admitSigningKeys(value);
  assert.ok(result.ok);
  assert.equal(result.snapshot.issuer, issuer);
  assert.equal(result.snapshot.fetchedAtMs, nowMs - 1000);
  assert.deepEqual(result.snapshot.keys.map(candidate => candidate.kid), ['old', 'new']);
  assert.deepEqual(Object.keys(result.snapshot.keys[0]!).sort(), ['alg', 'e', 'kid', 'kty', 'n', 'use']);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.snapshot) && Object.isFrozen(result.snapshot.keys) && result.snapshot.keys.every(Object.isFrozen));
  assert.equal(Reflect.set(result.snapshot.keys[0]!, 'n', 'AA'), false);
  value.wire.body = '{}'; value.issuer = 'https://other.example'; value.retrievalStartedAtMs = 0;
  assert.equal(result.snapshot.issuer, issuer); assert.equal(result.snapshot.keys[0]!.n, key.n);
  for (const [record, signer] of [[key, primary], [next, replacement]] as const) {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: record.kid })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ iss: issuer, sub: 'fixture-person', aud: 'perfeng-console-login', azp: 'perfeng-console-login', typ: 'ID', nonce: 'expected', iat: nowMs / 1000, exp: nowMs / 1000 + 300 })).toString('base64url');
    const payload = header + '.' + body;
    const token = payload + '.' + sign('RSA-SHA256', Buffer.from(payload), signer.privateKey).toString('base64url');
    assert.deepEqual(await verifyCandidate(token, { issuer, profile: 'id', nonce: 'expected', nowMs, snapshot: result.snapshot }), { ok: true, issuer, subject: 'fixture-person', profile: 'id' });
  }
});

test('mixed public encryption and EC siblings are counted but never admitted as RS256 authority', () => {
  const siblings = [{ kty: 'RSA', alg: 'RSA-OAEP', use: 'enc', kid: 'encryption', n: 'irrelevant-public-material', e: 'AQAB' }, { kty: 'EC', alg: 'ES256', use: 'sig', kid: 'ec', crv: 'P-256', x: 'public', y: 'public' }];
  const result = admitSigningKeys(input(JSON.stringify({ keys: [...siblings, key] })));
  assert.ok(result.ok); assert.deepEqual(result.snapshot.keys.map(candidate => candidate.kid), ['old']);
  assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys: siblings }))), invalid);
});

test('document framing refuses escaped duplicates, nested duplicates, malformed syntax, deep/large JSON and private fields anywhere', () => {
  const original = JSON.stringify({ keys: [key] });
  for (const body of [original.slice(0, -1) + ',"\\u006beys":[]}', JSON.stringify({ keys: [{ ...key, extra: {} }] }).replace('"extra":{}', '"extra":{"x":1,"\\u0078":2}'), '{', original.slice(0, -1) + ',}', '/*comment*/' + original, '{"keys":[],"extra":1}', '{"keys":' + '['.repeat(20) + '1' + ']'.repeat(20) + '}', ' '.repeat(65537), '{"keys":[{"kid":"\\ud800"}]}']) {
    assert.deepEqual(admitSigningKeys(input(body)), invalid, body.slice(0, 80));
  }
  for (const field of ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']) {
    for (const record of [{ ...next, [field]: 'private-canary' }, { kty: 'EC', alg: 'ES256', use: 'sig', kid: 'ignored', metadata: { [field]: 'private-canary' } }]) {
      const result = admitSigningKeys(input(JSON.stringify({ keys: [key, record] })));
      assert.deepEqual(result, invalid); assert.doesNotMatch(JSON.stringify(result), /private-canary|old|new/);
    }
  }
});

test('key-count, key-ID and every selected RSA key are checked before releasing any snapshot', () => {
  for (const keys of [[], Array.from({ length: 33 }, (_, index) => ({ ...key, kid: String(index) })), [key, { ...next, kid: 'old' }], [key, null], [key, { ...next, kid: '' }], [key, { ...next, kid: 'x'.repeat(129) }]]) {
    assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys }))), invalid);
  }
  const maximum = admitSigningKeys(input(JSON.stringify({ keys: Array.from({ length: 32 }, (_, index) => ({ ...key, kid: String(index) })) })));
  assert.ok(maximum.ok); assert.equal(maximum.snapshot.keys.length, 32);
  for (const changed of [{ n: 'AA' }, { n: Buffer.concat([Buffer.from([0]), Buffer.from(next.n!, 'base64url')]).toString('base64url') }, { e: 'Aw' }, { key_ops: ['verify', 'sign'] }, { key_ops: [] }, { key_ops: { 0: 'verify', length: 1 } }, { kty: 'EC' }]) {
    assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys: [key, { ...next, ...changed }] }))), invalid);
  }
});

test('trusted retrieval/issuer context determines freshness; wire text cannot supply timestamps or provenance', () => {
  const value = input(); value.retrievalStartedAtMs = nowMs - 300000;
  assert.equal(admitSigningKeys(value).ok, true);
  for (const change of [{ retrievalStartedAtMs: nowMs - 300001 }, { retrievalStartedAtMs: nowMs + 1 }, { retrievalStartedAtMs: -1 }, { nowMs: NaN }, { nowMs: 1.5 }, { nowMs: Number.MAX_SAFE_INTEGER }, { issuer: 'http://issuer.example/realms/perfeng' }, { issuer: issuer + '?redirect=attacker' }]) {
    assert.deepEqual(admitSigningKeys({ ...input(), ...change }), invalid);
  }
  assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys: [key], fetchedAtMs: nowMs }))), invalid);
  for (const malformed of [null, {}, { ...input(), wire: { ok: false, reason: 'unavailable' } }, { ...input(), wire: { ...input().wire, stage: 'trusted' } }]) assert.deepEqual(admitSigningKeys(malformed as never), invalid);
});


test('valid documents meet exact byte bounds, while oversized multibyte and ignored structural excess refuse', () => {
  const original = JSON.stringify({ keys: [key] });
  assert.equal(admitSigningKeys(input(original + ' '.repeat(65536 - Buffer.byteLength(original)))).ok, true);
  assert.deepEqual(admitSigningKeys(input(original + ' '.repeat(65537 - Buffer.byteLength(original)))), invalid);
  const multibyte = JSON.stringify({ keys: [{ ...key, note: 'é'.repeat(33000) }] });
  assert.ok(multibyte.length < 65536 && Buffer.byteLength(multibyte) > 65536);
  assert.deepEqual(admitSigningKeys(input(multibyte)), invalid);
  let nested: object = {};
  for (let index = 0; index < 20; index++) nested = { extra: nested };
  assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys: [{ ...key, metadata: nested }] }))), invalid);
  const members = Object.fromEntries(Array.from({ length: 64 }, (_, index) => ['extra' + index, index]));
  assert.deepEqual(admitSigningKeys(input(JSON.stringify({ keys: [{ ...key, ...members }] }))), invalid);
});
