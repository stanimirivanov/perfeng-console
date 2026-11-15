import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createLoginProtocol } from '#perfeng/bff-login-protocol';

const issuer = 'https://identity.example/realms/perfeng';
const consoleOrigin = 'https://console.example';
const runId = 'perf-20260902-120000-abcdef12';
const profile = () => ({ issuer, consoleOrigin });
const callback = (state: string, extra = { code: 'one-use-code', iss: issuer }) =>
  '/console/auth/callback?' + new URLSearchParams({ state, ...extra });
const cookie = (setCookie: string) => [setCookie.split(';')[0]!];

test('fixed login profile emits only code/openid/S256 and protected binding cookie instructions', () => {
  const config = profile();
  const protocol = createLoginProtocol(config);
  config.issuer = 'https://evil.example/realms/evil';
  const begun = protocol.begin({ kind: 'run', runId })!;
  const url = new URL(begun.authorizationUrl);
  assert.equal(url.origin + url.pathname, issuer + '/protocol/openid-connect/auth');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['client_id', 'code_challenge', 'code_challenge_method', 'nonce', 'redirect_uri', 'response_type', 'scope', 'state']);
  assert.equal(url.searchParams.get('client_id'), 'perfeng-console-login');
  assert.equal(url.searchParams.get('redirect_uri'), consoleOrigin + '/console/auth/callback');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), 'openid');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(begun.setCookie, /^__Host-perfeng_login=[A-Za-z0-9_-]{43}; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=300$/);
  const result = protocol.callback(callback(url.searchParams.get('state')!), cookie(begun.setCookie));
  assert.ok(result.ok);
  assert.equal(result.handoff.code, 'one-use-code');
  assert.equal(result.handoff.nonce, url.searchParams.get('nonce'));
  assert.equal(createHash('sha256').update(result.handoff.codeVerifier).digest('base64url'), url.searchParams.get('code_challenge'));
  assert.deepEqual(result.handoff.returnIntent, { kind: 'run', runId });
  assert.equal(url.href.includes(result.handoff.codeVerifier), false);
  assert.equal(url.href.includes(cookie(begun.setCookie)[0]!.split('=')[1]!), false);
  assert.match(result.clearCookie, /Max-Age=0$/);
  assert.equal(protocol.callback(callback(url.searchParams.get('state')!), cookie(begun.setCookie)).ok, false);
});

test('invalid fixed configuration has one safe error and never admits a request-selected destination', () => {
  for (const change of [
    { issuer: 'http://identity.example/realms/perfeng' },
    { issuer: issuer + '?query' },
    { issuer: issuer + '/' },
    { issuer: 'https://user:private@identity.example/realms/perfeng' },
    { issuer: 'https://identity.example/realms/../other' },
    { issuer: issuer + '#fragment' },
    { consoleOrigin: 'http://console.example' },
    { consoleOrigin: consoleOrigin + '/' },
    { consoleOrigin: consoleOrigin + '/callback' },
    { consoleOrigin: 'https://user:private@console.example' },
  ]) assert.throws(() => createLoginProtocol({ ...profile(), ...change }), { message: 'Invalid login configuration' });
  assert.equal(createLoginProtocol(profile()).begin('https://evil.example'), undefined);
});

test('only the matching browser can consume a transaction; duplicate cookies and state do not select a victim', () => {
  const protocol = createLoginProtocol(profile());
  const one = protocol.begin({ kind: 'home' })!;
  const two = protocol.begin({ kind: 'home' })!;
  const state = new URL(one.authorizationUrl).searchParams.get('state')!;
  const target = callback(state);
  for (const headers of [[], cookie(two.setCookie), [...cookie(one.setCookie), ...cookie(one.setCookie)],[cookie(one.setCookie)[0] + '; ' + cookie(one.setCookie)[0]], ['__Host-perfeng_login=%00'], ['x'.repeat(4097)],[cookie(one.setCookie)[0] + '\r\n'], [cookie(one.setCookie)[0] + '; ignored=é']]) {
    const result = protocol.callback(target, headers);
    assert.equal(result.ok, false);
    assert.equal('clearCookie' in result, false);
  }
  assert.equal(protocol.callback(target + '&%73tate=other', cookie(one.setCookie)).ok, false);
  assert.ok(protocol.callback(target, cookie(one.setCookie)).ok);
});

test('bound issuer errors, malformed parameter sets and provider refusals burn the transaction without diagnostics', () => {
  for (const change of [
    '&iss=duplicate',
    '&unknown=value',
    '&code=duplicate',
    '&%63ode=duplicate',
    '&error=access_denied',
    '&code=' + 'a'.repeat(4097),
  ]) {
    const protocol = createLoginProtocol(profile());
    const begun = protocol.begin({ kind: 'home' })!;
    const state = new URL(begun.authorizationUrl).searchParams.get('state')!;
    assert.equal(protocol.callback(callback(state) + change, cookie(begun.setCookie)).ok, false);
    assert.equal(protocol.callback(callback(state), cookie(begun.setCookie)).ok, false);
  }
  for (const extra of [{ code: 'code', iss: 'https://evil.example' }, { code: 'code' },{ code: 'a'.repeat(4097), iss: issuer }, { code: 'control\ncode', iss: issuer },{ code: 'code', iss: issuer, session_state: 'x'.repeat(257) }, { error: '', iss: issuer },{ error: 'access_denied', error_description: 'private-provider-detail', error_uri: 'https://private.example', iss: issuer }]) {
    const protocol = createLoginProtocol(profile());
    const begun = protocol.begin({ kind: 'home' })!;
    const state = new URL(begun.authorizationUrl).searchParams.get('state')!;
    const target = '/console/auth/callback?' + new URLSearchParams({ state, ...extra });
    const denied = protocol.callback(target, cookie(begun.setCookie));
    assert.equal(denied.ok, false);
    assert.match(JSON.stringify(denied), /invalid_callback|provider_denied/);
    assert.doesNotMatch(JSON.stringify(denied), /private-provider-detail|private\.example|one-use-code/);
    assert.ok('clearCookie' in denied);
    assert.equal(protocol.callback(callback(state), cookie(begun.setCookie)).ok, false);
  }
});

test('raw callback bounds reject absolute/normalized paths, fragments and malformed encodings; shutdown and expiry deny', () => {
  let now = 0;
  const protocol = createLoginProtocol(profile(), () => now);
  const begun = protocol.begin({ kind: 'home' })!;
  const state = new URL(begun.authorizationUrl).searchParams.get('state')!;
  const target = callback(state);
  for (const value of [consoleOrigin + target, target.replace('/auth/', '/x/../auth/'), target + '#fragment', target + '&x=%ZZ',target + '&x=%', target + '&x=' + 'a'.repeat(8192), target + '\r\n', target.replace('code=', 'code=%00')]) {
    assert.equal(protocol.callback(value, cookie(begun.setCookie)).ok, false);
  }
  const expiring = protocol.begin({ kind: 'home' })!;
  const expiryTarget = callback(new URL(expiring.authorizationUrl).searchParams.get('state')!);
  now = 300_000;
  assert.equal(protocol.callback(expiryTarget, cookie(expiring.setCookie)).ok, false);
  const stopping = protocol.begin({ kind: 'home' })!;
  protocol.stop();
  assert.equal(protocol.callback(callback(new URL(stopping.authorizationUrl).searchParams.get('state')!), cookie(stopping.setCookie)).ok, false);
  assert.equal(protocol.begin({ kind: 'home' }), undefined);
});
