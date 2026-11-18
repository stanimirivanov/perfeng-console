import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { evaluateAudit } from '#perfeng/harness/supply-chain';

const finding = { version: '4.0.7', paths: ['.>dependency-cruiser>picomatch'], dev: true, optional: false, bundled: false };
const advisory = { id: 1247710, module_name: 'picomatch', github_advisory_id: 'GHSA-fc5q-39xc-vjpf', severity: 'high', findings: [finding] };
const exception = { advisory: 'GHSA-fc5q-39xc-vjpf', package: 'picomatch', version: '4.0.7', severity: 'high', scope: 'root-development-only', validFrom: '2026-11-18T00:00:00.000Z', expiresAt: '2026-12-02T00:00:00.000Z', trackingIssue: 'https://github.com/stanimirivanov/perfeng-console/issues/111', reason: 'No upstream patch; bounded development tooling exposure remains.', review: 'human-review-and-merge-required' };
const policy = { schemaVersion: 1, exceptions: [exception] };
const now = Date.parse('2026-11-19T00:00:00.000Z');
function report(value: object = advisory, counts = { info: 0, low: 0, moderate: 0, high: 1, critical: 0 }) {
  return { advisories: { '1247710': value }, metadata: { vulnerabilities: counts, dependencies: 30, devDependencies: 797, optionalDependencies: 197, totalDependencies: 841 } };
}
const refused = (value: unknown, settings: unknown = policy, at = now, status = 1) => assert.equal(evaluateAudit(value, settings, at, status).ok, false);

test('only exact reviewed development risk is accepted visibly without claiming a fix', () => {
  const result = evaluateAudit(report(), policy, now, 1);
  assert.equal(result.ok, true);
  assert.match(result.messages.join('\n'), /RISK ACCEPTED/);
  assert.match(result.messages.join('\n'), /4\.0\.7/);
  assert.match(result.messages.join('\n'), /2026-12-02/);
  assert.match(result.messages.join('\n'), /issues\/111/);
  assert.match(result.messages.join('\n'), /1 path/);
});

test('advisory, package, version, severity and production changes never inherit the exception', () => {
  for (const change of [{ github_advisory_id: 'GHSA-aaaa-bbbb-cccc' }, { module_name: 'another-package' }, { severity: 'critical' }, { severity: 'unknown' }, { findings: [{ ...finding, version: '4.0.8' }] }, { findings: [{ ...finding, dev: false }] }, { findings: [{ ...finding, bundled: true }] }, { findings: [finding, { ...finding, version: '4.0.6', paths: ['.>other>picomatch'] }] }]) refused(report({ ...advisory, ...change }));
  refused(report({ ...advisory, severity: 'critical' }, { info: 0, low: 0, moderate: 0, high: 0, critical: 1 }));
});

test('scanner failures and incomplete or inconsistent reports fail closed', () => {
  for (const value of [null, {}, { error: { code: 'ECONNRESET' } }, { ...report(), metadata: undefined }, report({ ...advisory, findings: [] }), report({ ...advisory, findings: [{}] }), report({ ...advisory, findings: [{ ...finding, paths: [] }] }), report({ ...advisory, findings: [{ version: '4.0.7', paths: finding.paths }] }), report({ ...advisory, id: 5 }), report(advisory, { info: 0, low: 0, moderate: 0, high: 0, critical: 0 })]) refused(value);
  refused(report(), policy, now, 0); refused(report(), policy, now, 2);
  refused(report({ ...advisory, findings: [{ ...finding, paths: ['.>ok', '.>ok'] }] }));
});

test('exception windows, exact versions and mandatory retirement are enforced', () => {
  for (const change of [{ version: '^4.0.7' }, { expiresAt: 'invalid' }, { validFrom: '2026-11-18' }, { expiresAt: '2026-12-03T00:00:00.000Z' }, { scope: 'production' }, { review: 'auto-approved' }, { trackingIssue: '' }]) refused(report(), { ...policy, exceptions: [{ ...exception, ...change }] });
  assert.equal(evaluateAudit(report(), policy, Date.parse(exception.validFrom), 1).ok, true);
  assert.equal(evaluateAudit(report(), policy, Date.parse(exception.expiresAt) - 1, 1).ok, true);
  refused(report(), policy, Date.parse(exception.validFrom) - 1);
  refused(report(), policy, Date.parse(exception.expiresAt));
  refused(report(), policy, NaN);
  const empty = { ...report(), advisories: {}, metadata: { ...report().metadata, vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } } };
  refused(empty, policy, now, 0);
  assert.equal(evaluateAudit(empty, { schemaVersion: 1, exceptions: [] }, now, 0).ok, true);
});

test('unexcepted lower findings remain visible and new high findings block', () => {
  const low = { ...advisory, severity: 'low', findings: [{ ...finding, version: '0.28.0', dev: false }], module_name: 'esbuild' };
  const result = evaluateAudit(report(low, { info: 0, low: 1, moderate: 0, high: 0, critical: 0 }), { schemaVersion: 1, exceptions: [] }, now, 1);
  assert.equal(result.ok, true); assert.match(result.messages.join('\n'), /LOW esbuild@0\.28\.0/);
  refused(report(), { schemaVersion: 1, exceptions: [] });
});


test('unexpected input failures never echo untrusted diagnostic text', () => {
  const hostile = new Proxy({}, { ownKeys() { throw new Error('SECRET-CANARY'); } });
  const result = evaluateAudit(hostile, policy, now, 1);
  assert.equal(result.ok, false); assert.ok(!result.messages.join('').includes('SECRET-CANARY'));
});


test('an accepted risk never hides additional advisory severities', () => {
  const extra = { ...advisory, id: 1247711, module_name: 'another-package', github_advisory_id: 'GHSA-aaaa-bbbb-cccc' };
  const both = { ...report(), advisories: { '1247710': advisory, '1247711': extra }, metadata: { ...report().metadata, vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0 } } };
  const blocked = evaluateAudit(both, policy, now, 1);
  assert.equal(blocked.ok, false); assert.match(blocked.messages.join('\n'), /another-package/);
  const lower = { ...both, advisories: { ...both.advisories, '1247711': { ...extra, severity: 'moderate' } }, metadata: { ...both.metadata, vulnerabilities: { info: 0, low: 0, moderate: 1, high: 1, critical: 0 } } };
  const retained = evaluateAudit(lower, policy, now, 1);
  assert.equal(retained.ok, true); assert.match(retained.messages.join('\n'), /MODERATE another-package/);
});


test('root risk policy cannot dispatch an audit for an isolated or foreign working directory', () => {
  const directory = mkdtempSync(join(tmpdir(), 'audit-scope-'));
  const marker = join(directory, 'invoked');
  try {
    writeFileSync(join(directory, 'pnpm'), '#!/bin/sh\necho invoked > "' + marker + '"\necho "{}"\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, [resolve('harness/supply-chain.ts')], { cwd: directory, env: { PATH: directory }, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 1); assert.equal(existsSync(marker), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
