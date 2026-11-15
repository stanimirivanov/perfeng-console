import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { importJWK, jwtVerify } from 'jose';
import { verifyCandidate } from './candidate.ts';

const issuer = 'https://issuer.example/realms/perfeng';
const now = 1_800_000_000;
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'reviewed-key', use: 'sig', alg: 'RS256' };
const options = (profile: 'id' | 'initial-access' = 'id') => ({ issuer, profile, nonce: 'expected-nonce', nowMs: now * 1000,
  snapshot: { fetchedAtMs: now * 1000, keys: [publicKey] } });
const claims = (profile: 'id' | 'initial-access' = 'id') => ({ iss: issuer, sub: 'fixture-subject', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate',
  azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', iat: now, exp: now + 300, nonce: 'expected-nonce',
  email_verified: false, realm_access: { roles: ['ignored-role'] } });
function token(body: object | string = claims(), header: object | string = { alg: 'RS256', typ: 'JWT', kid: 'reviewed-key' }, key = pair.privateKey) {
  const encode = (value: object | string) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
  const input = encode(header) + '.' + encode(body);
  return input + '.' + sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
}

test('real RSA signatures qualify separate exact ID and initial-access profiles without role authority', async () => {
  for (const profile of ['id', 'initial-access'] as const) {
    assert.deepEqual(await verifyCandidate(token(claims(profile)), options(profile)), { ok: true, issuer, subject: 'fixture-subject', profile });
  }
});

test('signature, algorithm, identity, nonce and audience substitutions fail without partial claims', async () => {
  for (const changed of [ { iss: 'https://foreign.example' }, { sub: '' }, { aud: 'perfeng-control-plane' }, { aud: ['perfeng-console-login', 'other'] },
    { azp: 'perfeng-console-delegate' }, { typ: 'Bearer' }, { nonce: 'wrong' }, { iat: now + 31 }, { nbf: now + 31 }, { exp: now + 301 } ]) {
    assert.deepEqual(await verifyCandidate(token({ ...claims(), ...changed }), options()), { ok: false, reason: 'invalid_token' });
  }
  assert.equal((await verifyCandidate(token(claims(), undefined, other.privateKey), options())).ok, false);
  for (const changed of [ { alg: 'HS256' }, { alg: 'none' }, { typ: 'at+jwt' }, { jku: 'https://never-fetch.invalid' }, { crit: ['unknown'] }, { kid: 'missing' } ]) {
    assert.equal((await verifyCandidate(token(claims(), { alg: 'RS256', typ: 'JWT', kid: 'reviewed-key', ...changed }), options())).ok, false);
  }
  const { exp: removed, ...missing } = claims(); void removed;
  assert.equal((await verifyCandidate(token(missing), options())).ok, false);
  assert.equal((await verifyCandidate(token(), { ...options(), nonce: undefined })).ok, false);
});

test('decoded duplicate names at any depth, malformed syntax, escapes, unsafe encodings and oversized tokens refuse', async () => {
  const original = JSON.stringify(claims());
  for (const body of [original.slice(0, -1) + ',"\\u0073ub":"attacker"}', original.slice(0, -1) + ',"extra":{"x":1,"\\u0078":2}}',
    original.slice(0, -1) + ',}', original.slice(0, -1) + ',/*comment*/"x":1}', '{', '{"x":' + '['.repeat(32) + '1' + ']'.repeat(32) + '}' ]) {
    assert.equal((await verifyCandidate(token(body), options())).ok, false);
  }
  assert.equal((await verifyCandidate(token(claims(), '{"alg":"RS256","typ":"JWT","kid":"reviewed-key","\\u0061lg":"RS256"}'), options())).ok, false);
  assert.equal((await verifyCandidate('x'.repeat(16385), options())).ok, false);
  assert.equal((await verifyCandidate(token().replace('.', '=.'), options())).ok, false);
});

test('clock tolerance, maximum token age/lifetime and key freshness retain the reviewed bounds', async () => {
  assert.ok((await verifyCandidate(token({ ...claims(), iat: now + 30 }), options())).ok);
  assert.ok((await verifyCandidate(token({ ...claims(), exp: now - 29, iat: now - 300 }), options())).ok);
  assert.equal((await verifyCandidate(token({ ...claims(), exp: now - 30, iat: now - 300 }), options())).ok, false);
  assert.equal((await verifyCandidate(token({ ...claims(), iat: now - 331, exp: now - 31 }), options())).ok, false);
  assert.ok((await verifyCandidate(token(), { ...options(), snapshot: { fetchedAtMs: now * 1000 - 300000, keys: [publicKey] } })).ok);
  for (const fetchedAtMs of [now * 1000 - 300001, now * 1000 + 1, NaN]) {
    assert.deepEqual(await verifyCandidate(token(), { ...options(), snapshot: { fetchedAtMs, keys: [publicKey] } }), { ok: false, reason: 'unavailable' });
  }
  for (const keys of [[publicKey, publicKey], [{ ...publicKey, d: 'private-key-canary' }], [{ ...publicKey, e: 'Aw' }], [{ ...publicKey, n: 'AA' }]]) {
    const result = await verifyCandidate(token(), { ...options(), snapshot: { fetchedAtMs: now * 1000, keys } });
    assert.equal(result.ok, false); assert.doesNotMatch(JSON.stringify(result), /private-key-canary|fixture-subject/);
  }
});

test('noncanonical signature encodings cannot alias a valid signature', async () => {
  const signed = token(); const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const last = signed.charAt(signed.length - 1);
  const alias = signed.slice(0, -1) + alphabet.charAt(alphabet.indexOf(last) + 1);
  assert.deepEqual(Buffer.from(alias.split('.')[2]!, 'base64url'), Buffer.from(signed.split('.')[2]!, 'base64url'));
  assert.deepEqual(await verifyCandidate(alias, options()), { ok: false, reason: 'invalid_token' });
});

test('library defaults accept duplicate members; the qualification wrapper refuses them', async () => {
  const duplicate = JSON.stringify(claims()).slice(0, -1) + ',"sub":"fixture-subject"}';
  const signed = token(duplicate);
  const key = await importJWK(publicKey, 'RS256');
  assert.equal((await jwtVerify(signed, key, { currentDate: new Date(now * 1000) })).payload.sub, 'fixture-subject');
  assert.deepEqual(await verifyCandidate(signed, options()), { ok: false, reason: 'invalid_token' });
});

test('the in-flight verifier defensively owns its trusted configuration and key snapshot', async () => {
  const input = structuredClone(options());
  const pending = verifyCandidate(token(), input);
  input.issuer = 'https://foreign.example'; input.nonce = 'changed'; input.snapshot.keys[0]!.n = 'AA';
  assert.deepEqual(await pending, { ok: true, issuer, subject: 'fixture-subject', profile: 'id' });
});

test('an actual weak RSA snapshot is unavailable before it can become verification authority', async () => {
  const weak = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const key = { ...weak.publicKey.export({ format: 'jwk' }), kid: 'reviewed-key', use: 'sig', alg: 'RS256' };
  assert.deepEqual(await verifyCandidate(token(claims(), undefined, weak.privateKey), { ...options(), snapshot: { fetchedAtMs: now * 1000, keys: [key] } }), { ok: false, reason: 'unavailable' });
});
