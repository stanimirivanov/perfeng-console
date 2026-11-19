import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

test('adding a token profile requires an explicit binding at the compiler boundary', () => {
  const profile = resolve('src/bff/login/identity/token-profile.ts');
  const contracts = resolve('src/bff/login/identity/snapshot-contracts.ts');
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2024,
    module: ts.ModuleKind.NodeNext,
    strict: true,
    noEmit: true,
    allowImportingTsExtensions: true,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  let injected = false;
  host.readFile = file => {
    const source = read(file);
    if (resolve(file) !== contracts || source === undefined) return source;
    const anchor = "readonly profile: 'id' | 'initial-access' | 'delegated';";
    assert.equal(source.split(anchor).length, 2, 'Profile union probe must have exactly one anchor');
    injected = true;
    return source.replace(anchor, "readonly profile: 'id' | 'initial-access' | 'delegated' | 'future-profile-probe';");
  };
  const program = ts.createProgram([profile], options, host);
  const errors = ts.getPreEmitDiagnostics(program).filter(diagnostic => diagnostic.file?.fileName === profile);
  assert.ok(injected);
  assert.ok(errors.some(diagnostic => /future-profile-probe/.test(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))),'A new profile must fail compilation at its missing binding, rather than inherit a default');
});
