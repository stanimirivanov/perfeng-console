import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import type { TestContext } from 'node:test';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'cache-rotation-')); const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const keys = ['old', 'new'].map(kid => ({ ...generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' }));
  const state = { kids: ['old'], hits: 0 };
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (_req, res) => { state.hits++; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: keys.filter(value => state.kids.includes(value.kid)) })); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  return { state, initial: { phase: 'initial', issuer: 'https://127.0.0.1:' + address.port + '/realms/perfeng-fixture', ca: readFileSync(cert, 'utf8'), oldKeyId: 'old', newKeyId: null } };
}
function child() {
  const process_ = spawn(process.execPath, ['tools/qualification/effect-node/cache-rotation-cli.ts'], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 12000, env: { PATH: process.env.PATH } });
  process_.stdin.on('error', () => {});
  let output = ''; let errors = ''; process_.stdout.on('data', value => { output += value; }); process_.stderr.on('data', value => { errors += value; });
  const lines = createInterface({ input: process_.stdout });
  return { process_, async send(value: object) { const pending = Promise.race([once(lines, 'line'), once(process_, 'close').then(() => { throw new Error('qualifier closed without acknowledgement'); })]); process_.stdin.write(JSON.stringify(value) + '\n'); return JSON.parse(String((await pending)[0])); }, async finish() { const done = process_.exitCode === null ? once(process_, 'close') : Promise.resolve([process_.exitCode]); process_.stdin.end(); const [status] = await done; return { status, output, errors }; } };
}

test('one resolver survives overlap and preserves old keys only until the fixed freshness advance', { timeout: 10000 }, async t => {
  const f = await fixture(t); const client = child(); t.after(() => client.process_.kill());
  assert.equal((await client.send(f.initial)).phase, 'initial'); assert.equal(f.state.hits, 1);
  f.state.kids = ['old', 'new']; assert.equal((await client.send({ phase: 'overlap', oldKeyId: 'old', newKeyId: 'new' })).phase, 'overlap'); assert.equal(f.state.hits, 2);
  f.state.kids = ['new']; const retired = await client.send({ phase: 'retired', oldKeyId: 'old', newKeyId: 'new' });
  assert.deepEqual(retired.checks, ['fresh-old-key-retention', 'expired-old-key-refusal', 'new-key-survival']); assert.deepEqual(retired.clockAdvancesMs, [1001, 300001]); assert.equal(f.state.hits, 3);
  const result = await client.finish(); assert.equal(result.status, 0); assert.equal(result.errors, ''); assert.ok(!result.output.includes('PRIVATE KEY'));
});

test('incomplete, extra and mismatched phase streams cannot finish successfully', { timeout: 15000 }, async t => {
  const f = await fixture(t);
  for (const tail of [[], [f.initial], [{ phase: 'overlap', oldKeyId: 'foreign', newKeyId: 'new' }], [{ phase: 'overlap', issuer: 'https://attacker.invalid', oldKeyId: 'old', newKeyId: 'new' }]]) {
    const client = child(); t.after(() => client.process_.kill()); await client.send(f.initial);
    client.process_.stdin.write(tail.map(value => JSON.stringify(value) + '\n').join(''));
    const result = await client.finish(); assert.equal(result.status, 1); assert.equal(result.errors, ''); assert.match(result.output, /"status":"FAIL"/);
  }
});

test('raw malformed and oversized input never echoes diagnostics', { timeout: 10000 }, async () => {
  for (const data of [Buffer.from([0xff, 10]), Buffer.alloc(65537, 120), Buffer.from('{"phase":"initial","phase":"SECRET-CANARY"}\n'), Buffer.from('{"phase":"retired"}\n')]) {
    const client = child(); const done = once(client.process_, 'close'); client.process_.stdin.end(data); const [status] = await done; const result = await client.finish();
    assert.equal(status, 1); assert.equal(result.errors, ''); assert.ok(!result.output.includes('SECRET-CANARY'));
  }
});


test('an extra command after the final ACK fails terminal qualification', { timeout: 10000 }, async t => {
  const f = await fixture(t); const client = child(); t.after(() => client.process_.kill());
  await client.send(f.initial); f.state.kids = ['old', 'new'];
  await client.send({ phase: 'overlap', oldKeyId: 'old', newKeyId: 'new' }); f.state.kids = ['new'];
  await client.send({ phase: 'retired', oldKeyId: 'old', newKeyId: 'new' });
  client.process_.stdin.write('{"phase":"retired"}\n');
  const result = await client.finish(); assert.equal(result.status, 1); assert.equal(result.errors, '');
});

test('a stalled partial frame is bounded without diagnostics', { timeout: 12000 }, async () => {
  const client = child(); const done = once(client.process_, 'close'); const started = Date.now();
  client.process_.stdin.write('{'); const [status] = await done; const result = await client.finish();
  assert.equal(status, 1); assert.equal(result.errors, ''); assert.ok(Date.now() - started < 10500);
});
