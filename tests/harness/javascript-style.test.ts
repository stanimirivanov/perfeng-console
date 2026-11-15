import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

test('JavaScript imports and top-level functions have visible separation', async () => {
  const lint = new ESLint();
  for (const extension of ['js', 'mjs', 'cjs']) {
    const [result] = await lint.lintText("import { join } from 'node:path';\nconst root = join('dist', 'guide');\nfunction digest() { return root; }\n", { filePath: 'scripts/style-probe.' + extension });
    assert.ok(result?.messages.some(message => message.ruleId === '@stylistic/padding-line-between-statements'), extension);
  }
});

test('exported and named top-level JavaScript functions require complete JSDoc', async () => {
  const lint = new ESLint();
  for (const code of ['export function sourceDigest() { return "hash"; }', 'function digest() { return "hash"; }', 'export const digest = () => "hash";', 'export default function digest() { return "hash"; }']) {
    const [result] = await lint.lintText(code, { filePath: 'tools/user-guide/style-probe.mjs' });
    assert.ok(result?.messages.some(message => message.ruleId === 'jsdoc/require-jsdoc'), code);
  }
  const [incomplete] = await lint.lintText('/** Hash.\n * @param value\n * @returns\n */\nexport function digest(value) { return value; }', { filePath: 'tools/user-guide/style-probe.mjs' });
  for (const rule of ['require-param-type', 'require-param-description', 'require-returns-type', 'require-returns-description'])
    assert.ok(incomplete?.messages.some(message => message.ruleId === 'jsdoc/' + rule), rule);
  const [nested] = await lint.lintText('export const samples = [1].map(value => value + 1);', { filePath: 'tools/user-guide/style-probe.mjs' });
  assert.equal(nested?.messages.some(message => message.ruleId === 'jsdoc/require-jsdoc'), false);
});

test('preferred JavaScript documentation and automatic formatting converge', async () => {
  const lint = new ESLint({ fix: true });
  const code = '/**\n * Preserve the caller-supplied identity.\n * @param {string} value - Identity to preserve.\n * @returns {string} Unchanged identity.\n */\nexport function identity(value) {\n  return value;\n}\n';
  const [preferred] = await lint.lintText(code, { filePath: 'scripts/style-probe.mjs' });
  assert.deepEqual(preferred?.messages, []);
  const [fixed] = await lint.lintText(code.replace('  return value;', ' return value; '), { filePath: 'scripts/style-probe.mjs' });
  assert.equal(fixed?.output, code);
  const [again] = await lint.lintText(fixed!.output!, { filePath: 'scripts/style-probe.mjs' });
  assert.equal(again?.output, undefined);
  for (const file of ['src/generated/validators.mjs', 'vendor/perfeng-contracts/example.js', 'tools/qualification/orval-fetch/generated/client.mjs']) {
    const config = await lint.calculateConfigForFile(file);
    assert.equal(config?.rules?.['jsdoc/require-jsdoc'], undefined, file);
    assert.equal(config?.rules?.['@stylistic/indent'], undefined, file);
  }
});

test('exported utilities stay separated without detaching their JSDoc', async () => {
  const lint = new ESLint();
  const source = 'export const root = "dist";\n/**\n * Read the selected root.\n * @returns {string} Selected root directory.\n */\nexport function sourceDigest() { return root; }\n';
  const [missing] = await lint.lintText(source, { filePath: 'tools/user-guide/style-probe.mjs' });
  assert.ok(missing?.messages.some(message => message.ruleId === '@stylistic/padding-line-between-statements'));
  const fixing = new ESLint({ fix: true });
  const [fixed] = await fixing.lintText(source, { filePath: 'tools/user-guide/style-probe.mjs' });
  assert.ok(fixed?.output?.includes('"dist";\n\n/**'));
  assert.ok(fixed?.output?.includes(' */\nexport function'));
  assert.equal(fixed?.messages.some(message => message.ruleId?.startsWith('jsdoc/')), false);
});

test('JavaScript documentation rejects stale names, missing purpose and unknown tags', async () => {
  const lint = new ESLint();
  const [result] = await lint.lintText('/**\n * @param {string} wrong - Supplied identity.\n * @returns {string} Unchanged identity.\n * @mispelled Unexpected tag.\n */\nexport function identity(value) { return value; }\n', { filePath: 'scripts/style-probe.mjs' });
  for (const rule of ['require-description', 'check-param-names', 'check-tag-names'])
    assert.ok(result?.messages.some(message => message.ruleId === 'jsdoc/' + rule), rule);
});
