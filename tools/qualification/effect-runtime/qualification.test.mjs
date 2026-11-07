import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

// Local synthetic wire fixtures only; no platform credentials or external traffic.
test('pinned Effect browser adapter qualification', { timeout: 30000 }, async t => {
  const bundle = await build({ entryPoints: ['tools/qualification/effect-runtime/browser.ts'], bundle: true,
    platform: 'browser', format: 'iife', write: false });
  const counts = new Map();
  const closed = new Set();
  const server = createServer((req, res) => {
    const path = req.url;
    counts.set(path, (counts.get(path) ?? 0) + 1);
    if (path === '/') return res.end('<!doctype html><title>Effect qualification fixture</title>');
    if (path === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
    res.on('close', () => closed.add(path));
    if (path === '/redirect') { res.writeHead(302, { location: '/escaped' }); return res.end(); }
    if (path === '/before') return;
    res.setHeader('Content-Type', 'application/json');
    if (path === '/duplicate') res.setHeader('Content-Type', ['application/json', 'text/plain']);
    if (path === '/body' || path === '/deadline') { res.write('{'); return; }
    if (path === '/large') return res.end('x'.repeat(8192));
    if (path === '/error') { res.writeHead(403); return res.end('fixture-secret'); }
    res.end('{"value":42}');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.addScriptTag({ url: '/bundle.js' });
  async function waitFor(predicate) {
    const deadline = Date.now() + 3000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, 'wire condition must occur within 3 seconds');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  await t.test('reads JSON and rejects response policy violations without exposing bodies', async () => {
    assert.deepEqual(await page.evaluate(() => window.probe.read('/valid')), { ok: true, text: '{"value":42}' });
    for (const path of ['/redirect', '/duplicate', '/large', '/error']) {
      assert.deepEqual(await page.evaluate(path => window.probe.read(path), path), { ok: false });
    }
    assert.equal(counts.get('/escaped'), undefined);
  });
  await t.test('rejects cross-origin and scheme-relative targets before dispatch', async () => {
    for (const path of ['https://example.invalid/', '//example.invalid/', '/\\example.invalid/']) {
      assert.deepEqual(await page.evaluate(path => window.probe.read(path), path), { ok: false });
    }
  });
  for (const path of ['/before', '/body']) {
    await t.test('interrupt closes actual wire operation ' + path, async () => {
      await page.evaluate(path => window.probe.start(path), path);
      await waitFor(() => counts.has(path));
      await page.evaluate(() => window.probe.stop());
      await waitFor(() => closed.has(path));
    });
  }
  await t.test('whole-operation deadline closes stalled body', async () => {
    assert.deepEqual(await page.evaluate(() => window.probe.read('/deadline', 250)), { ok: false });
    await waitFor(() => closed.has('/deadline'));
  });
});
