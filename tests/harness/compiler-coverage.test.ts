import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

test('production tools compile under their own strict Node program without test or qualification roots', () => {
  const config = resolve('tools/tsconfig.json');
  assert.ok(existsSync(config), 'Production tools need an explicit compiler configuration');
  const loaded = ts.readConfigFile(config, ts.sys.readFile);
  assert.equal(loaded.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, resolve('tools'));
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.fileNames.sort(),
    ['console-server.ts', 'public-api.ts', 'serve-console.ts'].map(file => resolve('tools', file)).sort());
  const { strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax, noEmit, module } = parsed.options;
  assert.deepEqual({ strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax, noEmit, module },
    { strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, verbatimModuleSyntax: true, noEmit: true, module: ts.ModuleKind.NodeNext });
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const sources = program.getSourceFiles().map(source => source.fileName);
  assert.ok(sources.includes(resolve('src/bff/transport.ts')), 'Production dependencies must remain checked');
  for (const excluded of ['tools/qualification/', 'tools/user-guide/', 'tests/', 'apps/']) {
    assert.equal(sources.some(file => file.startsWith(resolve(excluded) + '/')), false,
      'Tools compiler must not acquire unrelated roots: ' + excluded);
  }
});
