import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

test('ESLint reports the original DTO escape and enforces Nx project boundaries', async () => {
  const lint = new ESLint();
  const [original] = await lint.lintText("import type { X } from '../../../src/presentation/observation';", { filePath: 'apps/console/src/import-probe.ts' });
  assert.ok(original?.messages.some(message => message.ruleId === 'perfeng/public-boundaries' && message.message.includes('docs/IMPORTS.md')));
  const [sibling] = await lint.lintText("import type { Accounting } from '../../web-e2e/public-api';", { filePath: 'apps/console/src/import-probe.ts' });
  assert.ok(sibling?.messages.some(message => message.ruleId === '@nx/enforce-module-boundaries'));
});


test('ESLint covers alternate module extensions and encoded path escapes', async () => {
  const lint = new ESLint();
  for (const ext of ['js', 'cjs', 'mts', 'cts', 'mjs', 'ts']) {
    const [result] = await lint.lintText("import '../../src/bff/config.ts';", { filePath: 'tools/generated/probe.' + ext });
    assert.ok(result?.messages.some(message => message.ruleId === 'perfeng/public-boundaries'), ext);
  }
  const [encoded] = await lint.lintText("import './%2e%2e/src/bff/config.ts';", { filePath: 'tools/probe.mjs' });
  assert.ok(encoded?.messages.some(message => message.ruleId === 'perfeng/public-boundaries'));
});
