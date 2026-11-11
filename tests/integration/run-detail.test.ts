import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runObservation } from '#perfeng/bff-runs';

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

test('failure codes are projected without provider messages and artifact storage URIs stay server-side', async () => {
  const { artifactObservation } = await import('#perfeng/bff-runs');
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
