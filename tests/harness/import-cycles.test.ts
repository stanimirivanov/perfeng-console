import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { test } from 'node:test';

test('dependency-cruiser rejects type-only alias cycles and presentation leakage', async () => {
  const root = mkdtempSync(join(tmpdir(), 'import-cycles-'));
  const write = (file: string, source: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), source);
  };
  const cli = resolve('node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
  const config = resolve('.dependency-cruiser.mjs');
  const run = (output = 'err') => execFileSync(process.execPath, [cli, '--config', config, '--output-type', output, 'apps', 'src'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    write('tsconfig.json', JSON.stringify({ compilerOptions: { paths: { '#fixture/b': ['./src/bff/b.ts'] } } }));
    write('package.json', JSON.stringify({ type: 'module', imports: { '#fixture/b': './src/bff/b.ts' } }));
    write('apps/console/a.ts', "import type { B } from '#fixture/b'; export interface A { b?: B }");
    write('src/bff/b.ts', "import type { A } from '../../apps/console/a.ts'; export interface B { a?: A }");
    assert.throws(run, error => String((error as { stdout?: string }).stdout).includes('no-cross-owner-cycle'));
    write('src/bff/b.ts', 'export interface B { id: string }');
    assert.match(run(), /no dependency violations/);
    write('src/presentation/view.ts', 'export interface View { id: string }');
    write('src/bff/b.ts', "import type { View } from '../presentation/view.ts'; export type B = View;");
    assert.throws(run, error => String((error as { stdout?: string }).stdout).includes('no-external-presentation-consumer'));
    write('apps/console/public-api.ts', 'export interface A {}');
    write('src/bff/public-api.ts', 'export interface B {}');
    write('apps/console/a.ts', "import type { B } from '../../src/bff/public-api.ts'; export type A = B;");
    write('src/bff/b.ts', "import type { A } from '../../apps/console/public-api.ts'; export type B = A;");
    const graph = JSON.parse(run('json'));
    assert.equal(graph.summary.error, 0, 'module graph has no loop');
    const { checkOwnerCycles } = await import('#perfeng/harness/project-imports');
    assert.match(checkOwnerCycles(graph.modules).join('\n'), /owner-cycle/);

  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('owners cannot depend on each other through disjoint public entry modules', async () => {
  const { checkOwnerCycles } = await import('#perfeng/harness/project-imports');
  const modules = [
    { source: 'apps/console/consumer.ts', dependencies: [{ resolved: 'src/bff/public-api.ts' }] },
    { source: 'src/bff/consumer.ts', dependencies: [{ resolved: 'apps/console/public-api.ts' }] },
    { source: 'src/bff/public-api.ts', dependencies: [] },
    { source: 'apps/console/public-api.ts', dependencies: [] },
  ];
  assert.match(checkOwnerCycles(modules).join('\n'), /owner-cycle/);
  assert.deepEqual(checkOwnerCycles(modules.filter(module => module.source !== 'src/bff/consumer.ts')), []);
});
