import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

test('self-test CLI reports child termination metadata and retains failed probe output', () => {
  const root = mkdtempSync(join(tmpdir(), 'harness-diagnostic-'));
  try {
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'Makefile'), '.PHONY: verify\nverify:\n\t@echo intentional-probe-failure\n\t@exit 42\n');
    const result = spawnSync(process.execPath, [resolve('scripts/harness-self-test.mjs')], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unexpected probe result: make verify/);
    assert.match(result.stderr, /elapsed=\d+ms, timeout=\d+ms, status=2, signal=none, error=none/);
    assert.match(result.stderr, /intentional-probe-failure/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('self-test CLI exposes native spawn errors instead of hiding their code', () => {
  const root = mkdtempSync(join(tmpdir(), 'harness-spawn-diagnostic-'));
  try {
    mkdirSync(join(root, 'node_modules'));
    const result = spawnSync(process.execPath, [resolve('scripts/harness-self-test.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, PATH: root },
      timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unexpected probe result: make verify/);
    assert.match(result.stderr, /status=null, signal=none, error=ENOENT/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
