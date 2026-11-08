import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectProjectImports, scanProjectImports } from '#perfeng/harness/project-imports';

const root = '/workspace';
test('cross-owner imports use public aliases and expose a useful diagnostic', () => {
  for (const source of [
    "import type { X } from '../../../src/presentation/observation';",
    "export * from '../../../src/bff/config.ts';",
    "type X = import('../../../src/bff/config.ts').X;",
    "import('../../../src/bff/config.ts');",
  ]) assert.match(inspectProjectImports(root, root + '/apps/console/src/scratch.ts', source).join('\n'), /docs\/IMPORTS.md/);
  assert.deepEqual(inspectProjectImports(root, root + '/apps/console/src/view.ts', "import './child';"), []);
  assert.deepEqual(inspectProjectImports(root, root + '/apps/console/src/view.ts', "import type { RunSummary } from '#perfeng/contracts';"), []);
});

test('presentation internals cannot be reached by alias or positional escape', () => {
  assert.ok(inspectProjectImports(root, root + '/src/bff/view.ts', "import '../presentation/view.ts';").length);
  assert.ok(inspectProjectImports(root, root + '/tools/a.ts', "import '#perfeng/unknown';").length);
});

test('qualification imports use exactly the admitted public entry links', () => {
  assert.deepEqual(inspectProjectImports(root, root + '/tools/qualification/effect-node/candidate.ts',
    "import { loadUpstreamConfig } from '../../../src/bff/config-public-api.ts';"), []);
  assert.ok(inspectProjectImports(root, root + '/tools/qualification/effect-node/candidate.ts',
    "import { loadUpstreamConfig } from '../../../src/bff/config.ts';").length);
});

test('the existing qualification oracle has one exact computed validator load', () => {
  const file = root + '/tools/qualification/effect-codegen/oracle.mjs';
  const load = 'await import(pathToFileURL(join(consoleRoot, "src/generated/validators.mjs")).href);';
  const reviewed = readFileSync('tools/qualification/effect-codegen/oracle.mjs', 'utf8');
  assert.deepEqual(inspectProjectImports(root, file, reviewed), []);
  assert.ok(inspectProjectImports(root, file, 'const join = () => "private.ts";\n' + reviewed).length);
  assert.ok(inspectProjectImports(root, file, load.replace('validators.mjs', 'secret.mjs')).length);
  assert.ok(inspectProjectImports(root, root + '/apps/console/src/view.ts', load).length);
});


test('encoded relative paths cannot hide Node ownership escapes', () => {
  const spec = './%2e%2e/src/bff/config.ts';
  assert.equal(fileURLToPath(new URL(spec, 'file:///workspace/tools/probe.mjs')), '/workspace/src/bff/config.ts');
  assert.ok(inspectProjectImports(root, root + '/tools/probe.mjs', `import('${spec}')`).length);
});

test('scanner includes handwritten generated directories, all module types and stylesheet edges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-scan-'));
  try {
    for (const name of ['apps', 'src', 'tools', 'tests', 'harness', 'scripts']) mkdirSync(join(dir, name));
    mkdirSync(join(dir, 'tools/generated'));
    for (const ext of ['js', 'cjs', 'mts', 'cts', 'mjs', 'ts']) {
      writeFileSync(join(dir, 'tools/generated/probe.' + ext), "import '../../src/bff/config.ts';");
    }
    writeFileSync(join(dir, 'tools/theme.css'), '@import "../src/presentation/theme.css";');
    assert.equal(scanProjectImports(dir).length, 7);
    rmSync(join(dir, 'tools/generated'), { recursive: true });
    symlinkSync(join(dir, 'src'), join(dir, 'tools/generated'));
    assert.match(scanProjectImports(dir).join('\n'), /symlink/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
