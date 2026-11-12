import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkOwnership } from '#perfeng/harness/ownership';
import { checkApp } from '#perfeng/harness/workspace';
import { scan } from '#perfeng/harness/boundaries';

test('architecture failures identify source/rule and give corrective rerun and guide', () => {
  const root = mkdtempSync(join(tmpdir(), 'actionable-harness-'));
  const put = (file: string, value: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value);
  };
  try {
    const file = 'apps/console/src/bad.ts';
    put(file, "import { Effect } from 'effect'; Effect.runFork(job);");
    put('src/browser/bad.ts', "import 'node:https';");
    for (const errors of [checkOwnership(root, { [file]: 'component' }), checkApp(join(root, 'apps/console')), scan(root)]) {
      assert.ok(errors.length);
      for (const error of errors) {
        assert.match(error, /\.ts:\d+ \[[^\]]+\]/);
        assert.match(error, /Next:/);
        assert.match(error, /Rerun: make architecture/);
        assert.match(error, /Guide: docs\//);
        assert.doesNotMatch(error, /eslint-disable|ts-ignore|rm -|--force/);
      }
    }
    put('apps/console/src/control\nname.ts', 'fetch("/");');
    put('apps/console/src/control\u009bname.ts', 'fetch("/");');
    const messages = checkOwnership(root, { [file]: 'component', 'apps/console/src/control\nname.ts': 'component',
      'apps/console/src/control\u009bname.ts': 'component' });
    assert.ok(messages.length);
    assert.ok(messages.every(value => !/[\x00-\x1f\x7f-\x9f]/u.test(value)), 'Source paths cannot inject terminal/log lines');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('import graph and distribution failures guide correction without exposing matched secret bytes', async () => {
  const { inspectProjectImports, checkOwnerCycles } = await import('#perfeng/harness/project-imports');
  const { checkDistribution } = await import('#perfeng/harness/assets');
  const root = mkdtempSync(join(tmpdir(), 'safe-harness-errors-'));
  try {
    const issues = [...inspectProjectImports(root, join(root, 'src/browser/view.ts'), "import '../bff/config.ts';"),
      ...checkOwnerCycles([{ source: 'src/browser/view.ts', dependencies: [{ resolved: 'src/bff/config.ts' }] },
        { source: 'src/bff/config.ts', dependencies: [{ resolved: 'src/browser/view.ts' }] }])];
    assert.ok(issues.length >= 2);
    for (const issue of issues) { assert.match(issue, /Rerun: make check-imports/); assert.match(issue, /Next:.*Guide:/); }
    const secret = 'PERFENG_SECRET_CANARY-private-content';
    writeFileSync(join(root, 'bad.js'), secret);
    assert.throws(() => checkDistribution(root), error => {
      const text = String(error);
      assert.match(text, /bad.js:1 \[distribution\].*Rerun: make build/);
      assert.doesNotMatch(text, new RegExp(secret));
      return true;
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
