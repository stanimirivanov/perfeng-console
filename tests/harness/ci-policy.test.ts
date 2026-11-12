import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

test('CI retains all gates while invoking the import preflight only through full verify', () => {
  const quality = readFileSync('.github/workflows/quality.yml', 'utf8');
  const verify = quality.split('  verify:\n')[1]!.split('\n  browser:')[0]!;
  assert.match(verify, /run: make verify/);
  assert.doesNotMatch(verify, /run: pnpm check:imports/);
  for (const command of ['make browser-test', 'make console-isolation-check', 'make stack-admission',
    'make harness-self-test', 'make supply-chain']) assert.ok(quality.includes('run: ' + command));
  assert.doesNotMatch(quality, /continue-on-error:|^\s+if:|paths-ignore:/m);
  const plan = execFileSync('make', ['--dry-run', 'verify'], { encoding: 'utf8' });
  assert.equal(plan.match(/node harness\/check-imports.ts/g)?.length, 1);
  assert.ok(plan.indexOf('node harness/check-imports.ts') < plan.indexOf('sh scripts/contracts-offline.sh'),
    'Retain fail-fast public import validation before contract generation');
  for (const command of ['eslint', 'tsc', 'harness/ownership.ts', 'harness/test.sh', 'ng test', 'nx run console:build'])
    assert.ok(plan.includes(command), command);
});

test('bootstrap caches only the pnpm store and still performs a frozen script-disabled install', () => {
  const bootstrap = readFileSync('.github/actions/bootstrap/action.yml', 'utf8');
  const pnpm = bootstrap.split('uses: pnpm/action-setup@v6')[1]!;
  assert.match(pnpm, /cache: true/);
  assert.match(pnpm, /cache_dependency_path: pnpm-lock.yaml/);
  assert.match(pnpm, /run: make bootstrap/);
  assert.match(readFileSync('Makefile', 'utf8'), /pnpm install --frozen-lockfile --ignore-scripts/);
  assert.doesNotMatch(bootstrap, /path:.*node_modules|\.nx|test-results|cache-hit/);
});

test('release-age policy is explicit and has no matured exemptions or lockfile trust bypass', () => {
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  assert.match(workspace, /^minimumReleaseAge: 1440$/m);
  assert.match(workspace, /^minimumReleaseAgeStrict: true$/m);
  assert.match(workspace, /^minimumReleaseAgeIgnoreMissingTime: false$/m);
  assert.match(workspace, /^trustLockfile: false$/m);
  assert.match(workspace, /^verifyStoreIntegrity: true$/m);
  assert.doesNotMatch(workspace, /^minimumReleaseAgeExclude:/m);
});

test('the real staged hook rejects staged bad work hidden by unstaged good work and verifies all staged gates', () => {
  const root = mkdtempSync(join(tmpdir(), 'full-staged-hook-'));
  const hook = resolve('.githooks/pre-commit');
  const stages = ['lint', 'typecheck', 'architecture', 'test', 'component-test', 'build'];
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const run = () => spawnSync('sh', [hook], { cwd: root, encoding: 'utf8', timeout: 10000 });
  try {
    git('init', '-q'); mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'Makefile'), '.PHONY: verify ' + stages.join(' ') + '\nverify: ' + stages.join(' ') +
      '\n' + stages.join(' ') + ':\n\t@echo $@\n\t@test "$$(cat state.txt)" = valid\n');
    writeFileSync(join(root, 'state.txt'), 'invalid'); git('add', 'Makefile', 'state.txt');
    writeFileSync(join(root, 'state.txt'), 'valid');
    const bad = run(); assert.equal(bad.error, undefined); assert.notEqual(bad.status, 0);
    assert.equal(readFileSync(join(root, 'state.txt'), 'utf8'), 'valid');
    git('add', 'state.txt'); writeFileSync(join(root, 'state.txt'), 'invalid');
    const good = run(); assert.equal(good.error, undefined); assert.equal(good.status, 0, good.stderr);
    for (const stage of stages) assert.match(good.stdout, new RegExp('^' + stage + '$', 'm'));
    assert.equal(readFileSync(join(root, 'state.txt'), 'utf8'), 'invalid');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
