import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('a runner-reported skip fails the suite even when node:test exits zero', () => {
  const root = mkdtempSync(join(tmpdir(), 'perfeng-test-accounting-'));
  try {
    mkdirSync(join(root, 'tests/fixture'), { recursive: true });
    writeFileSync(join(root, 'tests/fixture/skip.test.ts'),
      "import {test} from 'node:test'; test('missing', {skip:true}, () => {});");
    const run = spawnSync('sh', [resolve('harness/test.sh')], {cwd: root, encoding: 'utf8'});
    assert.equal(run.status, 1);
    assert.match(run.stderr, /test-accounting/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
