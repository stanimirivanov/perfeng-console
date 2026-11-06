import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkApp } from "../../harness/workspace.ts";
test("app source cannot import the other app or node authority", () => {
  const root = mkdtempSync(join(tmpdir(), "workspace-check-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(
      join(root, "src/main.ts"),
      "import '../../../scenario-lab/src/main'; import 'node:fs';",
    );
    assert.equal(checkApp(root).length, 2);
    writeFileSync(join(root, "src/main.ts"), "import '@angular/core';");
    assert.deepEqual(checkApp(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
