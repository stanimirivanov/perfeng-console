import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeCodeTokens, decodeDelegatedTokens } from '#perfeng/bff-token-response';

// Synthetic candidates deliberately have no valid JWT claims/signature.
const token = 'e30.e30.c2ln';
const code = { access_token: token, id_token: token, token_type: 'Bearer', expires_in: 300 };
const delegated = { access_token: token, token_type: 'Bearer', expires_in: 300, issued_token_type: 'urn:ietf:params:oauth:token-type:access_token' };
const invalid = { ok: false, reason: 'invalid_response' };

test('code envelopes project only explicitly unverified candidates, not user identity or scalar extensions', () => {
  assert.deepEqual(decodeCodeTokens(JSON.stringify({ ...code, scope: 'openid', session_state: 'private-extension', 'not-before-policy': 0 })), {
    ok: true,
    candidates: { stage: 'unverified-code', accessToken: token, idToken: token, expiresIn: 300 },
  });
  assert.deepEqual(decodeCodeTokens(JSON.stringify({ ...code, token_type: 'bEaReR', refresh_token: token, refresh_expires_in: 1800 })), {
    ok: true,
    candidates: { stage: 'unverified-code', accessToken: token, idToken: token, expiresIn: 300, refreshToken: token },
  });
  assert.deepEqual(decodeDelegatedTokens(JSON.stringify({ ...delegated, refresh_expires_in: 0 })), {
    ok: true,
    candidates: { stage: 'unverified-delegated', accessToken: token, expiresIn: 300 },
  });
});

test('duplicate decoded member names, malformed or non-flat JSON and overbounded inputs fail without credentials', () => {
  const valid = JSON.stringify(code);
  for (const body of [
    '',
    '{',
    '[]',
    'null',
    'true',
    valid + ' trailing',
    valid.slice(0, -1) + ',"access_token":"secret-canary"}',
    valid.slice(0, -1) + ',"\\u0061ccess_token":"secret-canary"}',
    valid.slice(0, -1) + ',"x":1,"\\u0078":2}',
    JSON.stringify({ ...code, nested: {} }),
    JSON.stringify({ ...code, nested: [] }),
    JSON.stringify({ ...code, nested: null }),
    JSON.stringify({ ...code, nested: true }),
    JSON.stringify({ ...code, bad: '\ud800' }),
    JSON.stringify({ ...code, padded: 'x'.repeat(65_536) }),
    JSON.stringify({ ...code, ...Object.fromEntries(Array.from({ length: 33 }, (_, i) => ['x' + i, i])) }),
  ]) for (const decode of [decodeCodeTokens, decodeDelegatedTokens]) {
    const result = decode(body); assert.deepEqual(result, invalid);
    assert.doesNotMatch(JSON.stringify(result), /secret-canary|accessToken|idToken/);
  }
  // Escaped quotes/colons in extension values must not become phantom keys.
  assert.equal(decodeCodeTokens(JSON.stringify({ ...code, extension: '"access_token": "fake"' })).ok, true);
});

test('lifetime equality follows the admitted five-minute bound and no strings/fractions substitute for durations', () => {
  for (const expires_in of [1, 300]) assert.equal(decodeCodeTokens(JSON.stringify({ ...code, expires_in })).ok, true);
  for (const expires_in of [0, -1, 301, 1.5, '300', null, Number.MAX_SAFE_INTEGER]) {
    assert.deepEqual(decodeCodeTokens(JSON.stringify({ ...code, expires_in })), invalid);
    assert.deepEqual(decodeDelegatedTokens(JSON.stringify({ ...delegated, expires_in })), invalid);
  }
  assert.deepEqual(decodeCodeTokens(JSON.stringify(code).replace('300', '1e309')), invalid);
});

test('token and scope boundaries reject profile confusion, offline capability and partial error envelopes', () => {
  for (const changed of [
    { token_type: 'DPoP' },
    { token_type: ' Bearer' },
    { access_token: '' },
    { access_token: 'not-a-compact-token' },
    { access_token: token + ' ' },
    { access_token: 'x'.repeat(16_385) },
    { id_token: '' },
    { issued_token_type: delegated.issued_token_type },
    { error: 'private-provider-error' },
    { error_description: 'secret-canary' },
    { scope: 'openid offline_access' },
    { scope: 'offline_access' },
    { scope: 'openid\nadmin' },
    { scope: 1 },
    { refresh_token: '' },
    { refresh_expires_in: -1 },
    { refresh_expires_in: '1800' },
  ]) assert.deepEqual(decodeCodeTokens(JSON.stringify({ ...code, ...changed })), invalid);
  assert.deepEqual(decodeCodeTokens(JSON.stringify(delegated)), invalid);
  for (const changed of [
    { issued_token_type: 'urn:ietf:params:oauth:token-type:id_token' },
    { issued_token_type: '' },
    { refresh_token: token },
    { refresh_token: '' },
    { refresh_expires_in: 1800 },
    { id_token: token },
    { scope: 'offline_access' },
  ]) assert.deepEqual(decodeDelegatedTokens(JSON.stringify({ ...delegated, ...changed })), invalid);
  assert.deepEqual(decodeDelegatedTokens(JSON.stringify(code)), invalid);
  const { id_token: removed, ...missingID } = code; void removed;
  assert.deepEqual(decodeCodeTokens(JSON.stringify(missingID)), invalid);
});

test('non-text boundary inputs refuse without throwing or exposing backend type diagnostics', () => {
  for (const value of [undefined, null, {}, [], 123, true, Symbol('private-input'), Buffer.from('{}')]) {
    for (const decode of [decodeCodeTokens, decodeDelegatedTokens]) assert.deepEqual(Reflect.apply(decode, undefined, [value]), invalid);
  }
});
