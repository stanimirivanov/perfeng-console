import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

test('handwritten TypeScript requires separate readable type members', async () => {
  const lint = new ESLint();
  for (const code of [
    'export interface Options { readonly cert: Buffer; readonly key: Buffer; readonly port: number; }',
    'export interface Options {\n  readonly cert: Buffer; readonly key: Buffer;\n}',
    'export type Options = { cert: string; key: string; };',
    'export type Options = { cert: string;\n  key: string; };',
  ]) {
    const [result] = await lint.lintText(code, { filePath: 'tools/format-probe.ts' });
    assert.ok(result?.messages.some(message => message.ruleId === '@stylistic/exp-list-style'), code);
  }
});

test('member delimiters, indentation and trailing whitespace are independently checked', async () => {
  const lint = new ESLint();
  for (const [code, rule] of [
    ['export interface Options {\n  cert: string\n}', '@stylistic/member-delimiter-style'],
    ['export interface Options {\n cert: string;\n}', '@stylistic/indent'],
    ['export interface Options {\n  cert: string; \n}', '@stylistic/no-trailing-spaces'],
  ]) {
    const [result] = await lint.lintText(code!, { filePath: 'tools/format-probe.ts' });
    assert.ok(result?.messages.some(message => message.ruleId === rule), code!);
  }
  const [preferred] = await lint.lintText('export interface Options {\n  readonly cert: string;\n  readonly key: string;\n}\n', { filePath: 'tools/format-probe.ts' });
  assert.deepEqual(preferred?.messages, []);
});

test('formatting fixes converge without forcing object-expression wrapping or formatting generated output', async () => {
  const lint = new ESLint({ fix: true });
  const [first] = await lint.lintText('export interface Options { cert: string; key: string; }\nexport const settings = { port: 4310, secure: true };\n', { filePath: 'tools/format-probe.ts' });
  assert.ok(first?.output?.includes('cert: string;\n'));
  assert.ok(first?.output?.includes('key: string;\n'));
  assert.ok(first?.output?.includes('{ port: 4310, secure: true }'));
  const [again] = await lint.lintText(first!.output!, { filePath: 'tools/format-probe.ts' });
  assert.equal(again?.output, undefined);
  for (const path of ['src/generated/run.ts', 'vendor/perfeng-contracts/generated.ts']) {
    const config = await lint.calculateConfigForFile(path);
    assert.equal(config?.rules?.['@stylistic/exp-list-style'], undefined, path);
  }
});
