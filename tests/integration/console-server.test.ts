import assert from 'node:assert/strict';
import { fork, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:https';
import { test } from 'node:test';

test('actual HTTPS listener contains reader, pairing and response defects without leaking details', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'console-errors-'));
  const cert = join(directory, 'cert.pem'); const key = join(directory, 'key.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  const child = fork('tests/integration/fixtures/console-server-failure.ts', [cert, key], { silent: true });
  let errors = ''; child.stderr?.on('data', value => { errors += String(value); });
  try {
    const ready = await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error(errors); })]);
    const { origin, code } = ready[0] as { origin: string; code: string };
    async function call(path: string, body?: string, cookie?: string) {
      return await new Promise<{ status: number; body: string; cookie?: string }>((resolve, reject) => {
        const req = request(origin + path, { rejectUnauthorized: false, method: body === undefined ? 'GET' : 'POST', headers: {
          Origin: origin, 'X-Perfeng-CSRF': body === undefined ? 'read' : 'pair', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
        } }, res => {
          let text = ''; res.on('data', value => { text += String(value); });
          res.on('error', reject);
          res.on('end', () => resolve({ status: res.statusCode!, body: text, ...(res.headers['set-cookie'] ? { cookie: res.headers['set-cookie'][0]!.split(';')[0]! } : {}) }));
        });
        req.on('error', reject); req.setTimeout(2000, () => req.destroy(new Error('response timeout'))); req.end(body);
      });
    }
    child.send('fail-clock'); await once(child, 'message');
    assert.deepEqual(await call('/console/api/session/pair', JSON.stringify({ code })), { status: 500, body: '' });
    child.send('restore-clock'); await once(child, 'message');
    assert.equal((await call('/console/api/session/pair')).status, 404);
    assert.equal((await call('/console/api/session/logout')).status, 404);
    assert.equal((await call('/console/api/session', '{}')).status, 404);
    const paired = await call('/console/api/session/pair', JSON.stringify({ code }));
    assert.equal(paired.status, 200);
    for (const suffix of ['', '/artifacts']) {
      const result = await call('/console/api/runs/perf-20260902-120000-abcdef12' + suffix, undefined, paired.cookie);
      assert.deepEqual(result, { status: 500, body: '' });
      assert.equal((await call('/console/api/session', undefined, paired.cookie)).status, 200);
    }
    assert.equal((await call('/console/api/session/pair', '{')).status, 400);
    assert.equal((await call('/missing.js')).status, 404);
    assert.deepEqual(await call('/'), { status: 500, body: '' });
    await assert.rejects(call('/fault-partial'));
    assert.equal((await call('/fault-ended')).status, 200);
    assert.equal((await call('/console/api/session', undefined, paired.cookie)).status, 200);
    assert.equal(child.exitCode, null);
    assert.equal(errors.includes('private-'), false);
  } finally {
    if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; } rmSync(directory, { recursive: true, force: true });
  }
});
