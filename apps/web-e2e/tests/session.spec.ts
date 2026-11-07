import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startConsole } from '../../../tools/console-server.ts';

test('loopback HTTPS pairing is keyboard usable and session boundaries fail closed', async ({ browser }) => {
  const directory = mkdtempSync(join(tmpdir(), 'perfeng-session-'));
  const cert = join(directory, 'cert.pem');
  const key = join(directory, 'key.pem');
  let now = 0;
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=loopback-test', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key],
    { stdio: 'ignore' });
    const tls = { cert: readFileSync(cert), key: readFileSync(key), port: 0 };
    const local = await startConsole({ ...tls, now: () => now });
    const other = await startConsole(tls);
    // Only this isolated test context accepts the disposable certificate.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    try {
      const page = await context.newPage();
      const base = local.origin + '/console/api/session';
      const network: string[] = [];
      page.on('request', request => network.push(request.url()));
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
      await Promise.all([local, other].map(({ server }) => {
        server.closeAllConnections();
        return new Promise<void>(resolve => server.close(() => resolve()));
      }));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
