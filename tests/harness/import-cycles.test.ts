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
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('no-cross-owner-cycle'));
    write('src/bff/b.ts', 'export interface B { id: string }');
    assert.match(run(), /no dependency violations/);
    write('src/presentation/view.ts', 'export interface View { id: string }');
    write('src/bff/b.ts', "import type { View } from '../presentation/view.ts'; export type B = View;");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('no-external-presentation-consumer'));
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

test('resolved signing-key bridge permits only the exact composition through its public entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'snapshot-bridge-'));
  const write = (file: string, source: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), source); };
  const cli = resolve('node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
  const config = resolve('.dependency-cruiser.mjs');
  const run = () => execFileSync(process.execPath, [cli, '--config', config, '--output-type', 'err', 'src', 'tools'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    write('tsconfig.json', '{}'); write('package.json', '{"type":"module"}');
    write('src/probe.ts', 'export {};');
    write('tools/qualification/identity-jwt/jwks-candidate.ts', 'export function admitSigningKeys() {}');
    write('tools/qualification/identity-jwt/public-api.ts', "export { admitSigningKeys } from './jwks-candidate.ts';");
    write('src/bff/login/identity/signing-key-source.ts', 'export function createSigningKeySource() {}');
    write('src/bff/login/identity/key-qualification-api.ts', "export { createSigningKeySource } from './signing-key-source.ts';");
    write('tools/qualification/effect-node/signing-key-source.ts', "export { createSigningKeySource } from '../../../src/bff/login/identity/key-qualification-api.ts';");
    assert.match(run(), /no dependency violations/);
    write('tools/qualification/effect-node/signing-key-source.ts', "import { admitSigningKeys } from '../identity-jwt/public-api.ts'; admitSigningKeys();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('identity-qualification-is-not-production'));
    write('tools/qualification/effect-node/signing-key-source.ts', 'export {};');
    write('tools/qualification/identity-jwt/pair-candidate.ts', 'export function verifyCodePair() {}');
    write('tools/qualification/identity-jwt/public-api.ts', "export { admitSigningKeys } from './jwks-candidate.ts'; export { verifyCodePair } from './pair-candidate.ts';");
    write('src/bff/login/identity/resolved-pair-verifier.ts', 'export function makeCodePairVerifier() {}');
    write('src/bff/login/identity/qualification-api.ts', "export { makeCodePairVerifier } from './resolved-pair-verifier.ts';");
    write('tools/qualification/effect-node/code-pair-verifier.ts', "export { makeCodePairVerifier } from '../../../src/bff/login/identity/qualification-api.ts';");
    assert.match(run(), /no dependency violations/);
    write('tools/qualification/effect-node/code-pair-verifier.ts', "import { verifyCodePair } from '../identity-jwt/public-api.ts'; verifyCodePair();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('identity-qualification-is-not-production'));
    write('tools/qualification/effect-node/code-pair-verifier.ts', "import { verifyCodePair } from '../identity-jwt/pair-candidate.ts'; verifyCodePair();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('identity-qualification-is-not-production'));
    write('tools/qualification/effect-node/code-pair-verifier.ts', 'export {};');
    write('tools/qualification/identity-jwt/strict-json.ts', 'export function strictJsonObject() {}');
    write('tools/qualification/identity-jwt/public-api.ts', "export { admitSigningKeys } from './jwks-candidate.ts'; export { strictJsonObject } from './strict-json.ts';");
    write('tools/qualification/effect-node/code-pair-cli.ts', "import { strictJsonObject } from '../identity-jwt/public-api.ts'; strictJsonObject();");
    assert.match(run(), /no dependency violations/);
    write('tools/qualification/effect-node/code-pair-cli.ts', "import { strictJsonObject } from '../identity-jwt/strict-json.ts'; strictJsonObject();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('signing-key-composition-uses-public-entry-only'));
    write('tools/qualification/effect-node/code-pair-cli.ts', 'export {};');
    write('tools/qualification/effect-node/signing-key-source.ts', "import { admitSigningKeys } from '../identity-jwt/jwks-candidate.ts'; admitSigningKeys();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('identity-qualification-is-not-production'));
    write('tools/qualification/effect-node/signing-key-source.ts', 'export {};');
    write('src/probe.ts', "import { admitSigningKeys } from '../tools/qualification/identity-jwt/public-api.ts'; admitSigningKeys();");
    assert.throws(run, error => String((error as { stdout?: string; }).stdout).includes('identity-qualification-is-not-production'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
