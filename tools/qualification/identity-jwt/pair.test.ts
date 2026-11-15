import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { verifyCandidate } from './candidate.ts';
import { verifyCodePair } from './pair-candidate.ts';

const issuer = 'https://issuer.example/realms/perfeng';
const nowMs = 1_800_000_000_000;
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = { ...key.publicKey.export({ format: 'jwk' }), kid: 'reviewed-key', use: 'sig', alg: 'RS256' };
function token(profile: 'id' | 'initial-access', changes: object = {}, signingKey = key.privateKey) {
  const body = { iss: issuer, sub: 'same-person', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate', azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', nonce: 'expected', iat: nowMs / 1000, exp: nowMs / 1000 + 300, ...changes };
  const input = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'reviewed-key' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(body)).toString('base64url');
  return input + '.' + sign('RSA-SHA256', Buffer.from(input), signingKey).toString('base64url');
}
function input() {
  return { issuer, nonce: 'expected', requestStartedAtMs: nowMs - 500, nowMs, snapshot: { fetchedAtMs: nowMs, keys: [structuredClone(publicKey)] }, candidates: { stage: 'unverified-code' as const, idToken: token('id'), accessToken: token('initial-access'), expiresIn: 300 } };
}
const invalid = { ok: false, reason: 'invalid_pair' };

test('one immutable code context qualifies matching subjects without claims, tokens or service authority', async () => {
  const value = input();
  assert.deepEqual(await verifyCodePair(value), { ok: true, issuer, subject: 'same-person', validUntilMs: nowMs + 299500 });
});

test('two individually valid profiles do not admit different subjects or substituted issuer/nonce/client/audience/type', async () => {
  for (const profile of ['id', 'initial-access'] as const) {
    for (const changes of [{ sub: 'other-person' }, { iss: 'https://foreign.example/realms/perfeng' }, { azp: 'other-client' }, { aud: 'perfeng-control-plane' }, { typ: 'other' }]) {
      const value = input();
      if (profile === 'id') value.candidates.idToken = token(profile, changes);
      else value.candidates.accessToken = token(profile, changes);
      assert.deepEqual(await verifyCodePair(value), invalid, profile + JSON.stringify(changes));
    }
  }
  const wrongNonce = input(); wrongNonce.candidates.idToken = token('id', { nonce: 'other' });
  assert.deepEqual(await verifyCodePair(wrongNonce), invalid);
});

test('validity is the minimum of both signed expirations and request-start-relative response duration, without expiry grace', async () => {
  for (const profile of ['id', 'initial-access'] as const) {
    const value = input();
    const signed = token(profile, { exp: nowMs / 1000 + 20 });
    if (profile === 'id') value.candidates.idToken = signed; else value.candidates.accessToken = signed;
    assert.deepEqual(await verifyCodePair(value), { ok: true, issuer, subject: 'same-person', validUntilMs: nowMs + 20000 });
    for (const exp of [nowMs / 1000, nowMs / 1000 - 1]) {
      const expired = token(profile, { iat: nowMs / 1000 - 30, exp });
      if (profile === 'id') value.candidates.idToken = expired; else value.candidates.accessToken = expired;
      assert.deepEqual(await verifyCodePair(value), invalid);
    }
  }
  const duration = input(); duration.candidates.expiresIn = 1; duration.requestStartedAtMs = nowMs - 999;
  assert.equal((await verifyCodePair(duration)).ok, true);
  duration.requestStartedAtMs--;
  assert.deepEqual(await verifyCodePair(duration), invalid);
});

test('POST-relative issuance bounds and conservative not-before checks do not invent auth_time or extend clock tolerance', async () => {
  for (const profile of ['id', 'initial-access'] as const) {
    const value = input(); value.requestStartedAtMs = nowMs;
    for (const delta of [-30, -31]) {
      const signed = token(profile, { iat: nowMs / 1000 + delta, exp: nowMs / 1000 + 200 });
      if (profile === 'id') value.candidates.idToken = signed; else value.candidates.accessToken = signed;
      assert.equal((await verifyCodePair(value)).ok, delta === -30);
    }
    const future = token(profile, { nbf: nowMs / 1000 + 1 });
    if (profile === 'id') value.candidates.idToken = future; else value.candidates.accessToken = future;
    assert.deepEqual(await verifyCodePair(value), invalid);
  }
});

test('unsafe clock/duration/context and stale trust refuse generically without partial credentials', async () => {
  for (const change of [{ nowMs: NaN }, { nowMs: -1 }, { nowMs: 1.5 }, { nowMs: Number.MAX_SAFE_INTEGER }, { requestStartedAtMs: nowMs + 1 }, { requestStartedAtMs: -1 }, { requestStartedAtMs: NaN }]) {
    assert.deepEqual(await verifyCodePair({ ...input(), ...change }), invalid);
  }
  for (const expiresIn of [0, -1, 301, 1.5, NaN]) {
    const value = input(); value.candidates.expiresIn = expiresIn;
    assert.deepEqual(await verifyCodePair(value), invalid);
  }
  const stale = input(); stale.snapshot.fetchedAtMs = nowMs - 300001;
  assert.deepEqual(await verifyCodePair(stale), { ok: false, reason: 'unavailable' });
});

test('caller mutation during cryptography cannot replace either credential or its expected context', async () => {
  const value = input();
  const pending = verifyCodePair(value);
  value.issuer = 'https://attacker.example'; value.nonce = 'changed'; value.nowMs = 0; value.requestStartedAtMs = 0;
  value.snapshot.keys[0]!.n = 'AA'; value.candidates.accessToken = token('initial-access', { sub: 'attacker' }); value.candidates.expiresIn = 1;
  assert.deepEqual(await pending, { ok: true, issuer, subject: 'same-person', validUntilMs: nowMs + 299500 });
});


test('two independently valid subjects cannot be combined, but exact common issuance is not proven by this profile', async () => {
  const value = input(); value.candidates.accessToken = token('initial-access', { sub: 'other-person' });
  assert.equal((await verifyCandidate(value.candidates.idToken, { ...value, profile: 'id' })).ok, true);
  assert.equal((await verifyCandidate(value.candidates.accessToken, { ...value, profile: 'initial-access' })).ok, true);
  assert.deepEqual(await verifyCodePair(value), invalid);
  // A fresh access token for the same subject may come from another issuance event.
  // No at_hash/common-response guarantee is claimed by the qualified local profile.
  value.candidates.accessToken = token('initial-access', { iat: nowMs / 1000 - 1, exp: nowMs / 1000 + 200, nonce: 'previous-event' });
  assert.deepEqual(await verifyCodePair(value), { ok: true, issuer, subject: 'same-person', validUntilMs: nowMs + 200000 });
});

test('fractional request times tighten the issuance window and malformed shapes never leak partial results', async () => {
  const value = input(); value.requestStartedAtMs = nowMs; value.candidates.idToken = token('id', { iat: nowMs / 1000 - 30, exp: nowMs / 1000 + 200 });
  assert.equal((await verifyCodePair(value)).ok, true);
  value.requestStartedAtMs++; value.nowMs++;
  assert.deepEqual(await verifyCodePair(value), invalid);
  for (const malformed of [null, {}, { ...input(), nonce: '' }, { ...input(), candidates: { ...input().candidates, stage: 'unverified-delegated' } }, { ...input(), candidates: { ...input().candidates, idToken: 'private-id-canary' } }]) {
    const result = await verifyCodePair(malformed as never);
    assert.deepEqual(result, invalid);
    assert.doesNotMatch(JSON.stringify(result), /same-person|private-id-canary/);
  }
});


test('a valid ID cannot release identity or timestamps when the access signature is invalid', async () => {
  const value = input();
  const unrelated = generateKeyPairSync('rsa', { modulusLength: 2048 });
  value.candidates.accessToken = token('initial-access', {}, unrelated.privateKey);
  const result = await verifyCodePair(value);
  assert.deepEqual(result, invalid);
  assert.doesNotMatch(JSON.stringify(result), /same-person|issuer\.example|validUntil|exp|iat/);
});
