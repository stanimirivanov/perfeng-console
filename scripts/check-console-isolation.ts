import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const temporary = mkdtempSync(join(tmpdir(), 'perfeng-console-isolation-'));
const source = join(temporary, 'source');
const installed = join(temporary, 'installed');
const inputs = [
  '.node-version', 'LICENSE', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'tsconfig.paths.json', 'angular.json', 'nx.json', 'tsconfig.base.json', 'Makefile', 'apps/console',
  'harness/imports.ts', 'harness/assets.ts', 'harness/workspace.ts', 'harness/boundaries.ts', 'harness/product-release.ts',
  'scripts/package-console.ts', 'tools/serve-console.ts', 'tools/console-server.ts',
  'src/shared/contracts/public-api.ts', 'src/bff/public-api.ts', 'src/bff/config-public-api.ts',
  'tools/public-api.ts', 'src/bff/session.ts', 'src/bff/csp.ts', 'src/bff/runs.ts', 'src/bff/config.ts',
  'src/bff/transport.ts', 'src/bff/run-reader.ts', 'src/bff/transport-result.ts',
  'src/generated/transitions.ts', 'src/generated/run.ts', 'src/generated/validators.mjs', 'src/shared/contracts/observation.ts',
];

try {
  for (const path of inputs) cpSync(path, join(source, path), { recursive: true });
  const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: source, stdio: 'inherit' });
  run('make', ['bootstrap']);
  run('make', ['console-release']);

  const { version } = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  mkdirSync(installed);
  execFileSync('tar', ['-xzf', join(source, 'dist/releases', 'perfeng-console-' + version + '.tar.gz'), '-C', installed]);
  const release = JSON.parse(readFileSync(join(installed, 'release.json'), 'utf8'));
  if (release.name !== '@perfeng/console' || release.version !== version || release.node !== process.versions.node ||
      release.entry !== 'tools/serve-console.mjs') throw new Error('Invalid installed release identity');

  const cert = join(temporary, 'certificate.pem');
  const key = join(temporary, 'key.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=loopback-test', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key],
  { stdio: 'ignore' });
  // Use a separate working directory and an empty environment to expose ambient runtime dependencies.
  const child = spawn(process.execPath, [join(installed, release.entry), cert, key, '0'], {
    cwd: temporary, env: {}, stdio: ['ignore', 'ignore', 'pipe'],
  });
  const exited = once(child, 'exit');
  try {
    const ready = await new Promise<{ origin: string; code: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Installed console did not start')), 5000);
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Installed console exited before startup')); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      let output = '';
      child.stderr.setEncoding('utf8').on('data', chunk => {
        output += chunk;
        const match = /Console URL (https:\/\/127\.0\.0\.1:\d+)\nPairing code ([A-Za-z0-9_-]{43})\n/.exec(output);
        if (!match) return;
        clearTimeout(timer);
        resolve({ origin: match[1]!, code: match[2]! });
      });
    });
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ ignoreHTTPSErrors: true });
      const foreign: string[] = [];
      page.on('request', request => {
        if (new URL(request.url()).origin !== ready.origin) foreign.push(request.url());
      });
      await page.goto(ready.origin);
      await page.getByRole('heading', { name: 'Pair local console' }).waitFor();
      await page.getByLabel('Pairing code').fill(ready.code);
      await page.getByLabel('Pairing code').press('Enter');
      await page.getByRole('heading', { name: 'Perfeng Console' }).waitFor();
      if (foreign.length) throw new Error('Installed console requested a foreign origin');
    } finally { await browser.close(); }
  } finally {
    child.kill();
    await exited;
  }
  console.log('Verified clean build, archive install and Chromium pairing for ' + release.name + '@' + version);
} finally { rmSync(temporary, { recursive: true, force: true }); }
