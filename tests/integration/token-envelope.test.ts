import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeTokenEnvelope } from '#perfeng/bff-token-envelope';

const token = 'e30.e30.c2ln';
const base = { access_token: token, token_type: 'Bearer', expires_in: 300 };

test('flat envelope refuses duplicate decoded names across quotes, backslashes, Unicode and JSON whitespace', () => {
  for (const name of ['access_token', 'extension', 'quote"key', 'slash\\key', 'with:colon', '🚀']) {
    const escaped = '"' + name.split('').map(unit => '\\u' + unit.charCodeAt(0).toString(16).padStart(4, '0')).join('') + '"';
    const prefix = JSON.stringify(base).slice(0, -1);
    const first = name === 'access_token' ? '' : ',' + JSON.stringify(name) + ':"extension"';
    const value = name === 'access_token' ? token : 'extension';
    assert.equal(decodeTokenEnvelope(prefix + first + ',' + escaped + ' \t\r\n : ' + JSON.stringify(value) + '}'), undefined);
  }
  for (const value of ['"access_token": "fake"', '\\"x\\": 1', 'colons: and escaped slash \\', '🚀']) {
    assert.equal(decodeTokenEnvelope(JSON.stringify({ ...base, extension: value }))?.access_token, token);
  }
});

test('flat envelope checks exact byte, member, name and scalar bounds independently of response phase', () => {
  const valid = JSON.stringify(base);
  assert.ok(decodeTokenEnvelope(valid.padEnd(65_536, ' ')));
  assert.equal(decodeTokenEnvelope(valid.padEnd(65_537, ' ')), undefined);
  const thirtyTwo = { ...base, ...Object.fromEntries(Array.from({ length: 29 }, (_, i) => ['x' + i, i])) };
  assert.ok(decodeTokenEnvelope(JSON.stringify(thirtyTwo)));
  assert.equal(decodeTokenEnvelope(JSON.stringify({ ...thirtyTwo, extra: 1 })), undefined);
  assert.ok(decodeTokenEnvelope(JSON.stringify({ ...base, ['x'.repeat(128)]: 'v' })));
  assert.equal(decodeTokenEnvelope(JSON.stringify({ ...base, ['x'.repeat(129)]: 'v' })), undefined);
  assert.ok(decodeTokenEnvelope(JSON.stringify({ ...base, extension: 'é'.repeat(16_384) })));
  assert.equal(decodeTokenEnvelope(JSON.stringify({ ...base, extension: 'x'.repeat(16_385) })), undefined);
  assert.equal(decodeTokenEnvelope(JSON.stringify({ ...base, one: 'é'.repeat(16_384), two: 'é'.repeat(16_384) })), undefined);
  for (const input of [undefined, {}, '[]', '{', JSON.stringify({ ...base, nested: {} }), JSON.stringify({ ...base, bad: '\ud800' })]) {
    assert.equal(decodeTokenEnvelope(input), undefined);
  }
});
