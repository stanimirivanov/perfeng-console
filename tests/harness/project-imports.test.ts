import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
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
  assert.deepEqual(inspectProjectImports(root, root + '/tools/qualification/effect-node/candidate.ts',"import { loadUpstreamConfig } from '../../../src/bff/config-public-api.ts';"), []);
  assert.ok(inspectProjectImports(root, root + '/tools/qualification/effect-node/candidate.ts',"import { loadUpstreamConfig } from '../../../src/bff/config.ts';").length);
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

test('the retired source-to-fixture snapshot-admission bridge refuses every old form', () => {
  const file = root + '/tools/qualification/effect-node/signing-key-source.ts';
  const entry = '../identity-jwt/public-api.ts';
  assert.ok(inspectProjectImports(root, file, "import { admitSigningKeys } from '" + entry + "';").length);
  assert.ok(inspectProjectImports(root, file, "import type { SigningKeySnapshot } from '" + entry + "';").length);
  for (const source of ["import * as snapshot from '" + entry + "';", "import('" + entry + "');", "export { admitSigningKeys } from '" + entry + "';", "import { verifyCandidate } from '" + entry + "';", "import { SigningKeySnapshot } from '" + entry + "';", "import { admitSigningKeys } from '../identity-jwt/jwks-candidate.ts';"])
    assert.ok(inspectProjectImports(root, file, source).length, source);
  for (const file of ['src/bff/key-source.ts', 'src/scenarios/probe.ts', 'tools/qualification/orval-fetch/probe.ts', 'tools/qualification/effect-node/generated/probe.ts', 'tools/qualification/other/probe.ts']) {
    const target = relative(dirname(root + '/' + file), root + '/tools/qualification/identity-jwt/public-api.ts');
    assert.ok(inspectProjectImports(root, root + '/' + file, "import { admitSigningKeys } from '" + target + "';").length, file);
    assert.ok(inspectProjectImports(root, root + '/' + file, "import('" + target + "');").length, file);
  }
});


test('resolved pair verifier has only its exact named identity-qualification entry', () => {
  const file = root + '/tools/qualification/effect-node/code-pair-verifier.ts';
  const entry = '../identity-jwt/public-api.ts';
  assert.deepEqual(inspectProjectImports(root, file, "import { codePairKeyIds, makeSnapshotVerifier } from '" + entry + "';"), []);
  assert.deepEqual(inspectProjectImports(root, file, "import type { CodePairRequest, CodePairResult } from '" + entry + "';"), []);
  for (const source of ["import { admitSigningKeys } from '" + entry + "';", "import { CodePairRequest } from '" + entry + "';", "import * as identity from '" + entry + "';", "import('" + entry + "');", "export { verifyCodePair } from '" + entry + "';", "import { verifyCodePair } from '../identity-jwt/pair-candidate.ts';"])
    assert.ok(inspectProjectImports(root, file, source).length, source);
  for (const importer of ['src/bff/probe.ts', 'src/scenarios/probe.ts', 'tools/qualification/effect-node/generated/code-pair-verifier.ts', 'tools/qualification/other/probe.ts']) {
    const target = relative(dirname(root + '/' + importer), root + '/tools/qualification/identity-jwt/public-api.ts');
    assert.ok(inspectProjectImports(root, root + '/' + importer, "import { verifyCodePair } from '" + target + "';").length, importer);
  }
});


test('private qualifier CLI imports only its reviewed strict parser bridge', () => {
  for (const name of ['code-pair-cli.ts', 'cache-rotation-cli.ts']) {
    const file = root + '/tools/qualification/effect-node/' + name;
    const entry = '../identity-jwt/public-api.ts';
    assert.deepEqual(inspectProjectImports(root, file, "import { strictJsonObject } from '" + entry + "';"), []);
    for (const source of ["import { verifyCodePair } from '" + entry + "';", "import * as parser from '" + entry + "';", "import('" + entry + "');", "import { strictJsonObject } from '../identity-jwt/strict-json.ts';"])
      assert.ok(inspectProjectImports(root, file, source).length, source);
  }
  assert.ok(inspectProjectImports(root, root + '/src/bff/cli.ts', "import { strictJsonObject } from '../../tools/qualification/identity-jwt/public-api.ts';").length);
});

test('identity fixture delegates only exact static members to the private BFF qualification entry', () => {
  const file = root + '/tools/qualification/identity-jwt/candidate.ts';
  const bridge = '../../../src/bff/login/identity/qualification-api.ts';
  assert.deepEqual(inspectProjectImports(root, root + '/tools/qualification/identity-jwt/pair-candidate.ts', `export { codePairKeyIds, verifyCodePair } from '${bridge}';`), []);
  assert.deepEqual(inspectProjectImports(root, file, `export { verifyCandidate, verifyTokenProfile, tokenKeyId } from '${bridge}';`), []);
  for (const source of [
    `export * from '${bridge}';`,
    `export { makeSnapshotVerifier } from '${bridge}';`,
    `import('${bridge}');`,
    "export { verifyCandidate } from '../../../src/bff/login/identity/token-profile.ts';",
  ]) assert.ok(inspectProjectImports(root, file, source).length);
  assert.ok(inspectProjectImports(root, root + '/tools/qualification/identity-jwt/other.ts', `export { verifyCandidate } from '${bridge}';`).length);
});

test('key qualification bridges delegate only exact static names and retire source-to-fixture admission', () => {
  const wire = root + '/tools/qualification/effect-node/signing-key-get.ts';
  const entry = '../../../src/bff/login/identity/key-qualification-api.ts';
  assert.deepEqual(inspectProjectImports(root, wire, `export { createSigningKeyGet } from '${entry}';`), []);
  for (const source of [`export * from '${entry}';`, `import('${entry}');`, `export { makeSigningKeyResolver } from '${entry}';`, "export { createSigningKeyGet } from '../../../src/bff/login/identity/signing-key-get.ts';"]) {
    assert.ok(inspectProjectImports(root, wire, source).length);
  }
  assert.ok(inspectProjectImports(root, root + '/tools/qualification/effect-node/signing-key-source.ts', "import { admitSigningKeys } from '../identity-jwt/public-api.ts';").length);
  assert.ok(inspectProjectImports(root, root + '/src/bff/login/identity/signing-key-source.ts', "import { admitSigningKeys } from '../../../../tools/qualification/identity-jwt/public-api.ts';").length);
});
