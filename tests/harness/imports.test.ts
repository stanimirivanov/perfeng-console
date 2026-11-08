import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkImportMaps, publicImports } from '#perfeng/harness/imports';

test('compiler and native aliases cannot drift or be overridden by consumer configs', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-imports-'));
  const write = (file: string, value: unknown) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), JSON.stringify(value));
  };
  const imports = Object.fromEntries(Object.entries(publicImports).map(([k, v]) => [k, v.endsWith('.mjs') ? { types: './' + v.replace(/\.mjs$/, '.d.mts'), default: './' + v } : './' + v]));
  const paths = Object.fromEntries(Object.entries(publicImports).filter(([, v]) => !v.endsWith('.mjs')).map(([k, v]) => [k, ['./' + v]]));
  try {
    write('package.json', { imports });
    write('tsconfig.paths.json', { compilerOptions: { paths } });
    write('tsconfig.json', { extends: './tsconfig.paths.json' });
    write('tsconfig.base.json', { extends: './tsconfig.paths.json' });
    write('apps/console/tsconfig.app.json', { extends: '../../tsconfig.base.json' });
    write('apps/web-e2e/tsconfig.json', { extends: '../../tsconfig.base.json' });
    write('apps/console/tsconfig.spec.json', { extends: '../../tsconfig.base.json' });
    assert.deepEqual(checkImportMaps(root), []);
    for (const override of [{ compilerOptions: { paths, baseUrl: './alternate' } }, { extends: './alternate.json', compilerOptions: { paths } }]) {
      write('tsconfig.paths.json', override);
      assert.ok(checkImportMaps(root).length);
    }
    write('tsconfig.paths.json', { compilerOptions: { paths } });
    write('package.json', { imports: { ...imports, '#perfeng/contracts': './src/bff/config.ts' } });
    assert.ok(checkImportMaps(root).length);
    write('package.json', { imports });
    write('tsconfig.paths.json', { compilerOptions: { paths: { ...paths, '#perfeng/contracts': ['./src/bff/config.ts'] } } });
    assert.ok(checkImportMaps(root).length);
    write('tsconfig.paths.json', { compilerOptions: { paths } });
    write('apps/console/tsconfig.app.json', { extends: '../../tsconfig.base.json', compilerOptions: { paths: { '#perfeng/contracts': ['../../src/bff/config.ts'] } } });
    assert.ok(checkImportMaps(root).length);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('standalone import command rejects a resolvable native alias remap before graph inspection', async () => {
  const { execFileSync } = await import('node:child_process');
  const { cpSync, readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'import-cli-'));
  try {
    for (const file of ['package.json', 'tsconfig.paths.json', 'tsconfig.json', 'tsconfig.base.json',
      'apps/console/tsconfig.app.json', 'apps/console/tsconfig.spec.json', 'apps/web-e2e/tsconfig.json']) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      cpSync(file, join(root, file));
    }
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    pkg.imports['#perfeng/contracts'] = './src/bff/config.ts';
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    assert.throws(() => execFileSync(process.execPath, [resolve('harness/check-imports.ts')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }),
      error => String((error as { stderr?: string }).stderr).includes('[imports]'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
