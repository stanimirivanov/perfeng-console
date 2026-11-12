import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { roles } from '#perfeng/harness/ownership';

// Issue #55: H5 must retire these exact mixed-role fences with its runtime migration.
const frozen = {
  "apps/console/src/app.ts": "1380a56bf5488277eb99b8eb30548a786cc820db09e9fce9c97fff4eee73ead9",
  "apps/console/src/console-home.ts": "b34540c74553233d1b1d18ea79c0845e941a29cf226b85ad4fe867683a83bdec"
};
test('H4 mixed shell and Run extraction bytes remain frozen until H5', () => {
  for (const [file, digest] of Object.entries(frozen)) {
    assert.ok(existsSync(file), 'Missing extracted module: ' + file);
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), digest,
      'H4 frozen extraction changed; retire with H5 runtime migration: ' + file);
    assert.equal(roles[file], 'composition');
  }
});
test('Angular bootstrap is separate from components and route declarations', () => {
  const main = ts.createSourceFile('main.ts', readFileSync('apps/console/src/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  assert.equal(main.statements.filter(ts.isClassDeclaration).length, 0);
  assert.equal(main.statements.filter(statement => !ts.isImportDeclaration(statement)).length, 1);
  assert.ok(existsSync('apps/console/src/app.routes.ts'));
});
