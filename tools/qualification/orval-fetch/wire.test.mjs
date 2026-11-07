import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ajv from '../../../src/generated/validators.mjs';
import { getRuns } from './generated/run/runs/runs.ts';
import { getDefault as getNative } from './generated/native/default/default.ts';
import { getDefault as getIntegration } from './generated/integration/default/default.ts';
import { observe } from './wire-boundary.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(
  '../../../vendor/perfeng-contracts/' + path, import.meta.url,
), 'utf8'));
const run = load('api/run-management/v1/examples/completed.json');
const create = load('examples/create.json');
const acquire = load('api/native-worker/v2/examples/acquire.json');
const renew = load('api/native-worker/v2/examples/renew.json');
const renewal = load('api/native-worker/v2/examples/renewal.json');
const gone = load('api/native-worker/v2/examples/lease-gone-error.json');
const publication = load('examples/performance-analysis/published.json');
const readAnalysis = (fetcher) => getIntegration(fetcher).getPerformanceAnalysis(
  'request-1', { issuer: 'https://issuer.example/team?x=1&y=2' },
);
const readRun = (fetcher, signal) => getRuns(fetcher).getRun(run.id, { signal });
const throttled = { code: 'rate_limited', message: 'Slow down' };
const acquireLease = (fetcher) => getNative(fetcher).acquireNativeLease(acquire);
const renewLease = (fetcher) => getNative(fetcher).renewNativeLease(
  renewal.leaseId, renew, { 'X-Perfeng-Lease': 'fixture-capability' },
);
const json = (data, status, headers = {}) => Response.json(data, { status, headers });

test('Run serializes create intent, preserves response headers and surfaces a conflict without retry', async () => {
  const key = 'fixture-create-001';
  const headers = { Location: '/v1/runs/' + run.id, 'Idempotency-Key-Expires-At': '2026-11-08T00:00:00Z' };
  const conflict = { code: 'IDEMPOTENCY_CONFLICT', message: 'Different intent', requestId: 'fixture-request' };
  const replies = [json(run, 201, headers), json(conflict, 409)];
  const requests = [];
  const client = getRuns(async (url, init) => {
    requests.push({ url, method: init.method, headers: new Headers(init.headers), body: JSON.parse(init.body) });
    return replies.shift();
  });
  const accepted = await client.createRun(create, { 'Idempotency-Key': key });
  assert.equal(accepted.status, 201);
  assert.deepEqual(accepted.data, run);
  for (const [name, value] of Object.entries(headers)) assert.equal(accepted.headers.get(name), value);
  const rejected = await client.createRun(create, { 'Idempotency-Key': key });
  assert.equal(rejected.status, 409);
  assert.deepEqual(rejected.data, conflict);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.url, '/v1/runs');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.get('idempotency-key'), key);
    assert.equal(request.headers.get('content-type'), 'application/json');
    assert.deepEqual(request.body, create);
  }
});

test('Native serializes the lease capability, revision and path', async () => {
  const result = await renewLease(async (url, init) => {
    assert.equal(url, '/native-worker/v2/leases/' + renewal.leaseId + '/renew');
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).get('x-perfeng-lease'), 'fixture-capability');
    assert.deepEqual(JSON.parse(init.body), renew);
    return json(gone, 410);
  });
  assert.equal(result.status, 410);
  assert.deepEqual(result.data, gone);
});

test('Integration encodes issuer query and preserves throttling metadata', async () => {
  const result = await readAnalysis(async (url, init) => {
    assert.equal(url, '/integration/v1/requests/request-1/analysis?issuer=https%3A%2F%2Fissuer.example%2Fteam%3Fx%3D1%26y%3D2');
    assert.equal(init.method, 'GET');
    return json(throttled, 429, { 'Retry-After': '12', 'Cache-Control': 'no-store' });
  });
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('retry-after'), '12');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(result.data, throttled);
});

const { stopBy: discardedStopBy, ...withoutStopBy } = renewal;
assert.ok(discardedStopBy);
const cases = [
  ['Run retained', readRun, 200, {}, ajv.run_Run, run, true],
  ['Run unknown field', readRun, 200, {}, ajv.run_Run, { ...run, unrecognized: true }, false],
  ['Native retained cancellation', renewLease, 200, {}, ajv.native_LeaseRenewal, renewal, true],
  ['Native cancellation without stopBy', renewLease, 200, {}, ajv.native_LeaseRenewal, withoutStopBy, false],
  ['Native retained lease error', renewLease, 410, {}, ajv.native_Error, gone, true],
  ['Integration retained publication', readAnalysis, 200, { 'Cache-Control': 'no-store' }, ajv.integration_AnalysisPublication, publication, true],
  ['Integration throttled', readAnalysis, 429, { 'Cache-Control': 'no-store', 'Retry-After': '12' }, ajv.integration_Error, throttled, true],
  ['Integration error missing message', readAnalysis, 429, { 'Cache-Control': 'no-store', 'Retry-After': '12' }, ajv.integration_Error, { code: 'rate_limited' }, false],
  ['Integration invalid event type', readAnalysis, 200, { 'Cache-Control': 'no-store' }, ajv.integration_AnalysisPublication, { ...publication, type: 'fixture.invalid' }, false],
];

for (const [name, invoke, status, headers, validator, input, expected] of cases) {
  test('Ajv parity: ' + name, async () => {
    const original = structuredClone(input);
    const expectedHeaders = Object.keys(headers);
    const fetcher = async (url, init) => {
      if (invoke === readRun) {
        assert.equal(url, '/v1/runs/' + run.id);
        assert.equal(init.method, 'GET');
      }
      return json(input, status, headers);
    };
    assert.equal(validator(input), expected);
    assert.deepEqual(input, original);
    const observed = await observe(invoke, fetcher, {
      status, validator, requiredHeaders: expectedHeaders,
    });
    assert.equal(observed.status, status);
    assert.equal(observed.accepted, expected);
    assert.deepEqual(observed.data, original);
    assert.deepEqual(input, original);
  });
}

test('Native distinguishes a bodyless 204 from a JSON object', async () => {
  const result = await observe(acquireLease, async () => new Response(null, {
    status: 204, headers: { 'Retry-After': '5' },
  }), { status: 204, requiredHeaders: ['Retry-After'] });
  assert.equal(result.status, 204);
  assert.equal(result.headers.get('retry-after'), '5');
  assert.equal(result.data, undefined);
});

for (const [name, body, contentType, status, message] of [
  ['absent JSON', null, 'application/json', 200, /missing JSON/],
  ['malformed JSON', '{', 'application/json', 200, SyntaxError],
  ['wrong media type', '{}', 'text/plain', 200, /media type/],
  ['unexpected status', '{}', 'application/json', 418, /unexpected status/],
  ['oversized body', ' '.repeat(65), 'application/json', 200, /body limit/],
]) {
  test('Wire boundary rejects ' + name, async () => {
    await assert.rejects(observe(readRun, async () => new Response(body, {
      status, headers: { 'Content-Type': contentType },
    }), { status: 200, validator: ajv.run_Run, maxBytes: 64 }), message);
  });
}

test('Wire boundary rejects missing required response metadata', async () => {
  await assert.rejects(observe(acquireLease, async () => new Response(null, { status: 204 }), {
    status: 204, requiredHeaders: ['Retry-After'],
  }), /missing header/);
});

test('Aborting after headers cancels a pending body read', { timeout: 2000 }, async () => {
  const controller = new AbortController();
  const pulling = Promise.withResolvers();
  let cancelled = false;
  const body = new ReadableStream({
    pull() { pulling.resolve(); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const result = observe(
    (fetcher) => readRun(fetcher, controller.signal),
    async (_url, init) => {
      assert.equal(init.signal, controller.signal);
      return new Response(body, { headers: { 'Content-Type': 'application/json' } });
    },
    { status: 200, validator: ajv.run_Run },
  );
  await pulling.promise;
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(cancelled, true);
});
