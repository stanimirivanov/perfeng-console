import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolve } from 'node:path';
import ts from 'typescript';
import { artifactObservation, runObservation } from '#perfeng/bff-runs';

const run = JSON.parse(readFileSync('vendor/perfeng-contracts/api/run-management/v1/examples/completed.json', 'utf8'));
test('Run detail projects contract fields and the exact pinned graph without fabricating identity or history', () => {
  const response = runObservation({ ok: true, run });
  assert.equal(response.status, 200);
  assert.ok('value' in response.body);
  assert.equal(response.body.value.createdAt, run.createdAt);
  assert.equal(response.body.value.finishedAt, run.finishedAt);
  assert.equal(response.body.value.failureCode, null);
  assert.deepEqual(response.body.value.transitions, JSON.parse(readFileSync('vendor/perfeng-contracts/transitions.json', 'utf8')));
  assert.equal('executionIdentity' in response.body.value, false);
  assert.equal('history' in response.body.value, false);
});

test('failure codes are projected without provider messages and artifact storage URIs stay server-side', () => {
  const failed = runObservation({ ok: true, run: { ...run, state: 'TEST_FAILURE', failure: { code: 'TOOL_ERROR', message: 'private-provider-canary' } } });
  assert.ok('value' in failed.body);
  assert.equal(failed.body.value.failureCode, 'TOOL_ERROR');
  assert.equal(JSON.stringify(failed).includes('private-provider-canary'), false);
  const artifacts = artifactObservation({ ok: true, artifacts: [{ id: '11111111-1111-4111-8111-111111111111', runId: run.id, kind: 'raw', uri: 'https://private.example/object', sha256: 'a'.repeat(64), sizeBytes: 0, mediaType: 'application/json', format: 'k6/v1' }] });
  assert.ok('value' in artifacts.body);
  assert.equal(artifacts.body.value.artifacts.length, 1);
  assert.equal(JSON.stringify(artifacts).includes('private.example'), false);
  assert.equal(artifactObservation({ ok: false, reason: 'forbidden' }).status, 404);
});


test('every Run failure retains its status and safe body, including artifact projection', () => {
  const cases = [
    { reason: 'invalid_input', status: 400, publicReason: 'invalid_id', artifactReason: 'unavailable' },
    { reason: 'forbidden', status: 404, publicReason: 'not_found', artifactReason: 'not_found' },
    { reason: 'not_found', status: 404, publicReason: 'not_found', artifactReason: 'not_found' },
    { reason: 'deadline', status: 504, publicReason: 'unavailable', artifactReason: 'unavailable' },
    { reason: 'unavailable', status: 503, publicReason: 'unavailable', artifactReason: 'unavailable' },
    { reason: 'invalid_response', status: 503, publicReason: 'unavailable', artifactReason: 'unavailable' },
    { reason: 'aborted', status: 503, publicReason: 'unavailable', artifactReason: 'unavailable' },
  ] as const;
  for (const { reason, status, publicReason, artifactReason } of cases) {
    const failure = { ok: false as const, reason };
    assert.deepEqual(runObservation(failure), { status, body: { reason: publicReason } });
    assert.deepEqual(artifactObservation(failure), { status, body: { reason: artifactReason } });
  }
});

test('adding a provider Failure requires an explicit Run projection at compile time', () => {
  const projection = resolve('src/bff/runs.ts');
  const contracts = resolve('src/bff/transport-result.ts');
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
    const anchor = " | 'aborted';";
    assert.equal(source.split(anchor).length, 2, 'Failure union probe must have exactly one anchor');
    injected = true;
    return source.replace(anchor, " | 'aborted' | 'future-failure-probe';");
  };
  const program = ts.createProgram([projection], options, host);
  const errors = ts.getPreEmitDiagnostics(program).filter(diagnostic => diagnostic.file?.fileName === projection);
  assert.ok(injected);
  assert.ok(errors.some(diagnostic => /future-failure-probe/.test(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))),'A new Failure must fail compilation rather than silently become unavailable');
});
