import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:https';
import { test } from 'node:test';
import { startConsole } from '#perfeng/server';

for (const suffix of ['', '/artifacts']) {
  for (const interruption of ['disconnect', 'expiry', 'logout']) {
    test('actual listener refuses late ' + (suffix || '/run') + ' evidence after ' + interruption, { timeout: 5_000 }, async () => {
      const directory = mkdtempSync(join(tmpdir(), 'console-lifetime-'));
      const cert = join(directory, 'cert'); const key = join(directory, 'key');
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-out', cert, '-keyout', key], { stdio: 'ignore' });
      let now = 0;
      let started!: () => void; const pending = new Promise<void>(resolve => { started = resolve; });
      let release!: () => void; const ready = new Promise<void>(resolve => { release = resolve; });
      let aborted!: () => void; const abort = new Promise<void>(resolve => { aborted = resolve; });
      async function read(_id: string, signal?: AbortSignal): Promise<{ ok: false; reason: 'unavailable' }> {
        signal?.addEventListener('abort', aborted, { once: true }); started(); await ready;
        return { ok: false, reason: 'unavailable' };
      }
      const local = await startConsole({ cert: readFileSync(cert), key: readFileSync(key), port: 0, now: () => now, runs: { getRun: read, listArtifacts: read } });
      function call(path: string, method = 'GET', body?: string, cookie?: string, csrf = 'read') {
        const req = request(local.origin + path, { rejectUnauthorized: false, method, headers: { Origin: local.origin, 'Content-Type': 'application/json', 'X-Perfeng-CSRF': csrf, ...(cookie ? { Cookie: cookie } : {}) } });
        const response = new Promise<{ status: number; body: string; cookie: string }>((resolve, reject) => {
          req.on('error', reject); req.on('response', res => {
            let text = ''; res.on('data', data => { text += data; }); res.on('error', reject);
            res.on('end', () => resolve({ status: res.statusCode!, body: text, cookie: res.headers['set-cookie']?.[0]?.split(';')[0] ?? '' }));
          });
        }); req.end(body); return { req, response };
      }
      try {
        const pair = await call('/console/api/session/pair', 'POST', JSON.stringify({ code: local.code }), undefined, 'pair').response;
        assert.equal(pair.status, 200);
        const job = call('/console/api/runs/perf-20260902-120000-abcdef12' + suffix, 'GET', undefined, pair.cookie);
        // Attach before destroying the socket, so a normal ECONNRESET cannot go unobserved.
        const observed = job.response.catch(() => undefined);
        await pending;
        if (interruption === 'disconnect') { job.req.destroy(); await abort; release(); assert.equal(await observed, undefined); }
        else {
          if (interruption === 'expiry') now = 900_000;
          else assert.equal((await call('/console/api/session/logout', 'POST', '', pair.cookie, (JSON.parse(pair.body) as { csrf: string }).csrf).response).status, 200);
          release(); const result = await observed;
          assert.equal(result?.status, 401); assert.equal(result.body, '');
        }
        assert.equal((await call('/missing.js').response).status, 404);
      } finally {
        release(); local.server.closeAllConnections(); local.server.close(); await once(local.server, 'close');
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
}
