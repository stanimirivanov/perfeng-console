import assert from 'node:assert/strict';
import { cpSync, readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { bundleServer } from '#perfeng/harness/product-release';
import { checkDistribution } from '#perfeng/harness/assets';

function releaseFixture() {
  const root = mkdtempSync(join(tmpdir(), 'release-imports-'));
  for (const name of ['package.json', 'tsconfig.paths.json'])
    cpSync(new URL('../../' + name, import.meta.url), join(root, name));
  return root;
}

test('the product release rejects a verifier reached through a server helper', async () => {
  const root = releaseFixture();
  try {
    for (const [file, source] of Object.entries({
      'tools/serve-console.ts': "import './console-server.ts';",
      'tools/console-server.ts': "import '../src/simulator/runner.ts';",
      'src/simulator/runner.ts': "console.log('runner');",
    })) {
      const path = join(root, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source);
    }
    await assert.rejects(bundleServer(root), /Forbidden product input: src\/simulator\/runner\.ts/);
    writeFileSync(join(root, 'tools/console-server.ts'), "import type { Run } from '../src/simulator/runner.ts';");
    await assert.rejects(bundleServer(root), /Forbidden product input: src\/simulator\/runner\.ts/);
    writeFileSync(join(root, 'tools/console-server.ts'), "console.log('console');");
    assert.match(await bundleServer(root), /console/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('release scanning rejects fixture and secret markers in browser source maps', () => {
  const root = mkdtempSync(join(tmpdir(), 'console-release-map-'));
  try {
    const map = join(root, 'lazy.js.map');
    writeFileSync(map, JSON.stringify({ sourcesContent: ['export const safe = true;'] }));
    checkDistribution(root);
    for (const marker of ['Design fixture only', 'PERFENG_SECRET_CANARY']) {
      writeFileSync(map, JSON.stringify({ sourcesContent: [marker] }));
      assert.throws(() => checkDistribution(root), /Forbidden secret, fixture or execution marker/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('release inventory admits shared DTOs only through erased type imports', async () => {
  const root = releaseFixture();
  try {
    mkdirSync(join(root, 'tools'));
    mkdirSync(join(root, 'src/shared/contracts'), { recursive: true });
    writeFileSync(join(root, 'src/shared/contracts/observation.ts'), "export interface RunSummary {}\nexport const marker = 'loaded';");
    const entry = join(root, 'tools/serve-console.ts');
    writeFileSync(entry, "import { marker } from '../src/shared/contracts/observation.ts'; console.log(marker);");
    await assert.rejects(bundleServer(root), /Type-only product contract/);
    writeFileSync(entry, "import type { RunSummary } from '../src/shared/contracts/observation.ts'; console.log('console');");
    assert.match(await bundleServer(root), /console/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('release rejects a native alias redirected to another admitted server file', async () => {
  const root = releaseFixture();
  try {
    mkdirSync(join(root, 'tools'));
    mkdirSync(join(root, 'src/bff'), { recursive: true });
    writeFileSync(join(root, 'tools/serve-console.ts'), "import '#perfeng/bff-csp';");
    writeFileSync(join(root, 'src/bff/session.ts'), "console.log('wrong admitted module');");
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    pkg.imports['#perfeng/bff-csp'] = './src/bff/session.ts';
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    await assert.rejects(bundleServer(root), /imports/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
