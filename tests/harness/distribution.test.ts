import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { bundleServer } from '../../harness/product-release.ts';
import { checkDistribution } from '../../harness/assets.ts';

test('the product release rejects a verifier reached through a server helper', async () => {
  const root = mkdtempSync(join(tmpdir(), 'console-closure-'));
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
