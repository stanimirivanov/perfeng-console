import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { bundleServer } from '../harness/product-release.ts';
import { checkDistribution } from '../harness/assets.ts';
import { checkApp } from '../harness/workspace.ts';

const { name, version, engines } = JSON.parse(readFileSync('package.json', 'utf8'));
if (name !== '@perfeng/console' || typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Expected an exact console product version');
}
const browserErrors = checkApp(resolve('apps/console'));
if (browserErrors.length) throw new Error(browserErrors.join('\n'));
const browser = 'dist/apps/console/browser';
const server = await bundleServer(process.cwd());
checkDistribution(browser);
const stage = mkdtempSync(join(tmpdir(), 'perfeng-console-package-'));
try {
  cpSync(browser, join(stage, browser), { recursive: true });
  mkdirSync(join(stage, 'tools'));
  writeFileSync(join(stage, 'tools/serve-console.mjs'), server);
  cpSync('LICENSE', join(stage, 'LICENSE'));
  writeFileSync(join(stage, 'release.json'), JSON.stringify({
    name, version, node: engines.node, entry: 'tools/serve-console.mjs',
  }, null, 2) + '\n');
  mkdirSync('dist/releases', { recursive: true });
  const archive = resolve('dist/releases', 'perfeng-console-' + version + '.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', stage, 'release.json', 'LICENSE', 'tools', 'dist']);
  console.log(archive);
} finally { rmSync(stage, { recursive: true, force: true }); }
