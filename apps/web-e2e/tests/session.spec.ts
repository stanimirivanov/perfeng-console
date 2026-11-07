import { createServer } from 'node:https';
import { once } from 'node:events';
import { createRunTransport } from '../../../src/bff/transport.ts';
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { startConsole } from '../../../tools/console-server.ts';

test('loopback HTTPS pairing is keyboard usable and session boundaries fail closed', async ({ browser }) => {
  const directory = mkdtempSync(join(homedir(), '.perfeng-session-'));
  const cert = join(directory, 'cert.pem');
  const key = join(directory, 'key.pem');
  let now = 0;
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=loopback-test', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key],
    { stdio: 'ignore' });
    const tls = { cert: readFileSync(cert), key: readFileSync(key), port: 0 };
    const example = JSON.parse(readFileSync('vendor/perfeng-contracts/api/run-management/v1/examples/completed.json', 'utf8'));
    const token = 'upstream-browser-fixture-canary';
    const tokenFile = join(directory, 'bearer');
    writeFileSync(tokenFile, token, { mode: 0o600 });
    chmodSync(cert, 0o600);
    const provider = createServer(tls, (req, res) => {
      if (req.headers.authorization !== 'Bearer ' + token) return res.writeHead(401).end();
      if (req.url !== '/v1/runs/' + example.id) return res.writeHead(403).end('private provider response');
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(example));
    });
    provider.listen(0, '127.0.0.1');
    await once(provider, 'listening');
    const address = provider.address();
    if (!address || typeof address === 'string') throw new Error('Expected TLS fixture address');
    const runs = createRunTransport({ origin: 'https://127.0.0.1:' + address.port, tokenFile, caFile: cert });
    const local = await startConsole({ ...tls, now: () => now, runs });
    const other = await startConsole(tls);
    // Only this isolated test context accepts the disposable certificate.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    try {
      const page = await context.newPage();
      const base = local.origin + '/console/api/session';
      const network: string[] = [];
      page.on('request', request => network.push(request.url()));
      const runPath = local.origin + '/console/api/runs/' + example.id;
      const headers = { 'X-Perfeng-CSRF': 'read' };
      expect((await context.request.get(runPath, { headers })).status()).toBe(401);
      await page.goto(local.origin);
      await expect(page.getByRole('heading', { name: 'Pair local console' })).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Pairing code')).toBeFocused();

      const crossPage = await context.newPage();
      await crossPage.route(other.origin + '/attack', route => route.fulfill({
        contentType: 'text/html', body: '<title>Cross-origin fixture</title>',
      }));
      await crossPage.goto(other.origin + '/attack');
      expect(await crossPage.evaluate(async endpoint => {
        try {
          await fetch(endpoint, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Perfeng-CSRF': 'pair' },
            body: '{}',
          });
          return 'allowed';
        } catch { return 'blocked'; }
      }, base + '/pair')).toBe('blocked');
      await crossPage.close();
      expect((await context.request.get(base, { headers: { Host: 'rebound.invalid', 'X-Perfeng-CSRF': 'read' } })).status()).toBe(403);

      const cross = await context.request.post(base + '/pair', {
        headers: { Origin: 'https://example.invalid', 'X-Perfeng-CSRF': 'pair' }, data: { code: local.code },
      });
      expect(cross.status()).toBe(403);
      expect((await context.request.post(base + '/pair', {
        headers: { Origin: local.origin }, data: { code: local.code },
      })).status()).toBe(403);
      await page.keyboard.insertText(local.code);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Perfeng Console' })).toBeVisible();
      expect((await context.request.get(runPath)).status()).toBe(403);
      const runId = page.getByLabel('Run ID');
      await runId.fill(example.id);
      await runId.press('Enter');
      await expect(page.getByRole('heading', { name: 'Current Run' })).toBeVisible();
      await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
      const response = await context.request.get(runPath, { headers });
      expect(response.headers()['cache-control']).toBe('no-store');
      expect(await response.json()).toEqual({
        value: { id: example.id, state: example.state, revision: example.revision, updatedAt: example.updatedAt },
        validForMs: 10_000,
      });
      await runId.fill('perf-20260902-120000-abcdef13');
      await runId.press('Enter');
      await expect(page.getByRole('status')).toContainText('not found in this operator scope');
      await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
      const cookies = await context.cookies();
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatchObject({ name: '__Host-perfeng-session', httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
      expect(await page.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length])).toEqual(['', 0, 0]);
      expect(network.every(url => new URL(url).origin === local.origin && !url.includes(local.code))).toBe(true);
      expect((await context.request.post(base + '/logout', {
        headers: { Origin: local.origin, 'X-Perfeng-CSRF': 'wrong' },
      })).status()).toBe(403);
      expect((await context.request.post(base + '/pair', {
        headers: { Origin: local.origin, 'X-Perfeng-CSRF': 'pair' }, data: { code: local.code },
      })).status()).toBe(403);
      expect((await context.request.get(local.origin + '/console/api/unlisted')).status()).toBe(404);
      now += 899_999;
      expect((await context.request.get(base)).status()).toBe(403);
      now += 1;
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Pair local console' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0);
    } finally {
      await context.close();
      await Promise.all([local, other, { server: provider }].map(({ server }) => {
        server.closeAllConnections();
        return new Promise<void>(resolve => server.close(() => resolve()));
      }));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
