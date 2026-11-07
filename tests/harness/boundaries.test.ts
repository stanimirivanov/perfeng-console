import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { scan } from '../../harness/boundaries.ts';

function diagnostics(files: Record<string, string>, link = false): string {
  const root = mkdtempSync(join(tmpdir(), 'perfeng-guard-'));
  try {
    for (const [path, source] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    }
    if (link) symlinkSync(tmpdir(), join(root, 'src/browser/escape'));
    return scan(root).join('\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('browser may consume presentation, including a corrected forbidden edge', () => {
  assert.equal(diagnostics({'src/browser/view.ts': "import '../presentation/view.js';",
    'src/presentation/view.ts': 'export {};'}), '');
});

for (const [name, code, rule] of [
  ['barrel crossing authority', "export * from '../bff/token.js';", 'layer'],
  ['type crossing authority', "type T = import('../simulator/step.js').T;", 'layer'],
  ['built-in authority', "import {readFile} from 'node:fs';", 'package'],
  ['computed import', 'void import(name);', 'dynamic'],
  ['CommonJS loader', "require('fs');", 'loader'],
  ['encoded relative target', "import './%2e%2e/bff/token.js';", 'specifier'],
  ['ambient compiler reference', '/// <reference types="node" />', 'reference'],
  ['unadmitted package', "import 'unexpected';", 'package'],
  ['repository escape', "import '../../../secret.js';", 'escape'],
] as const) {
  test(name, () => assert.match(diagnostics({'src/browser/view.ts':code}), new RegExp(rule)));
}

test('evaluator may not import the runner or provider comparison package', () => {
  assert.match(diagnostics({'src/scenarios/evaluate.ts': "import '../simulator/runner.js';"}), /layer/);
  assert.match(diagnostics({'src/scenarios/evaluate.ts': "import 'perfeng-analysis';"}), /package/);
});

test('unknown layers, alternate source languages and symlinks fail closed', () => {
  const results = diagnostics({'src/other/x.ts':'', 'src/browser/hide.cjs':''}, true);
  for (const reason of ['owner','extension','symlink']) assert.match(results, new RegExp(reason));
});

test('generated schema namespace admits Effect Schema without admitting server clients', () => {
  assert.equal(diagnostics({
    'src/generated/schemas/run.ts': "import * as Schema from 'effect/Schema'; export {Schema};",
    'src/presentation/run.ts': "import '../generated/schemas/run.js';",
  }), '');
  for (const code of [
    "import '../../bff/generated/client.js';",
    "export * from '../../bff/generated/client.js';",
    "type Client = import('../../bff/generated/client.js').Client;",
    "import * as Client from 'effect/unstable/http/HttpClient';",
  ]) {
    assert.match(diagnostics({'src/generated/schemas/run.ts': code}), /layer|package/);
  }
});

test('generated schemas cannot smuggle server resources through URL constructors or styles', () => {
  assert.match(diagnostics({
    'src/generated/schemas/resource.ts': "export const file = new URL('../../bff/secret.txt', import.meta.url);",
  }), /resource/);
  assert.match(diagnostics({
    'src/generated/schemas/style.css': '@import "../../bff/secret.css";',
  }), /resource/);
});

test('Effect Node imports are admitted only to the reviewed BFF modules', () => {
  assert.equal(diagnostics({'src/bff/run-reader.ts': "import * as N from '@effect/platform-node/NodeHttpClient';"}), '');
  assert.equal(diagnostics({'src/bff/transport.ts': "import {Effect} from 'effect';"}), '');
  for (const path of ['src/bff/other.ts', 'src/browser/view.ts']) {
    assert.match(diagnostics({[path]: "import * as N from '@effect/platform-node/NodeHttpClient';"}), /package/);
  }
  assert.match(diagnostics({'src/bff/transport.ts': "import 'node:https';"}), /package/);
});
