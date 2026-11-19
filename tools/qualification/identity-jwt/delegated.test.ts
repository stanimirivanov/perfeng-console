import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { verifyDelegatedToken } from './candidate.ts';

const issuer = 'https://issuer.example/realms/perfeng';
const nowMs = 1800000000000;
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const snapshot = { fetchedAtMs: nowMs, keys: [{ ...key.publicKey.export({ format: 'jwk' }), kid: 'reviewed', alg: 'RS256', use: 'sig' }] };
const input = () => ({ issuer, subject: 'original-human', nowMs, requestStartedAtMs: nowMs - 1000, expiresIn: 120, snapshot });
function token(changes: object = {}) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = encode({ alg: 'RS256', typ: 'JWT', kid: 'reviewed' }) + '.' + encode({ iss: issuer, sub: 'original-human', aud: 'perfeng-control-plane', azp: 'perfeng-console-delegate', typ: 'Bearer', iat: nowMs / 1000, exp: nowMs / 1000 + 300, ...changes });
  return data + '.' + sign('RSA-SHA256', Buffer.from(data), key.privateKey).toString('base64url');
}

test('delegated observation binds signed human, client and API audience with response-relative expiry', async () => {
  assert.deepEqual(await verifyDelegatedToken(token(), input()), { ok: true, issuer, subject: 'original-human', validUntilMs: nowMs + 119000 });
  assert.deepEqual(await verifyDelegatedToken(token({ exp: nowMs / 1000 + 60 }), input()), { ok: true, issuer, subject: 'original-human', validUntilMs: nowMs + 60000 });
});

test('signed profile confusion and claim substitution refuse', async () => {
  for (const changes of [{ sub: 'another-human' }, { azp: 'perfeng-console-login' }, { aud: ['perfeng-control-plane', 'other'] }, { aud: 'perfeng-console-delegate' }, { typ: 'ID' }, { iss: 'https://foreign' }, { exp: nowMs / 1000 }, { iat: nowMs / 1000 + 31 }, { nbf: nowMs / 1000 + 31 }]) {
    assert.equal((await verifyDelegatedToken(token(changes), input())).ok, false);
  }
  const compact = token();
  const [header, body, signature] = compact.split('.');
  const tampered = header + '.' + body + '.' + (signature![0] === 'A' ? 'B' : 'A') + signature!.slice(1);
  assert.equal((await verifyDelegatedToken(tampered, input())).ok, false);
});

test('bad context, stale trust and pre-request issuance refuse without granting a session', async () => {
  for (const change of [{ subject: '' }, { subject: 'other' }, { requestStartedAtMs: nowMs + 1 }, { requestStartedAtMs: NaN }, { expiresIn: 0 }, { expiresIn: 301 }, { expiresIn: 1 }, { nowMs: NaN }, { snapshot: { ...snapshot, fetchedAtMs: nowMs - 300001 } }]) {
    assert.equal((await verifyDelegatedToken(token(), { ...input(), ...change })).ok, false);
  }
  assert.equal((await verifyDelegatedToken(token({ iat: nowMs / 1000 - 60 }), input())).ok, false);
});
