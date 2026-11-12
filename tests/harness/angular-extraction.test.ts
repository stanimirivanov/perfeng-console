import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { roles } from '#perfeng/harness/ownership';

test('components have component roles after H4 fence retirement', () => {
  for (const file of ['apps/console/src/shell/app.ts', 'apps/console/src/runs/run-lookup.ts']) {
    assert.equal(roles[file], 'component');
  }
});
test('Angular bootstrap is separate from components and route declarations', () => {
  const main = ts.createSourceFile('main.ts', readFileSync('apps/console/src/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  assert.equal(main.statements.filter(ts.isClassDeclaration).length, 0);
  assert.equal(main.statements.filter(statement => !ts.isImportDeclaration(statement)).length, 1);
  assert.ok(existsSync('apps/console/src/app.routes.ts'));
});
