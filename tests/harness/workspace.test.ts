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

test("lazy imports stay inside browser source, including type and loader edges", () => {
  const root = mkdtempSync(join(tmpdir(), "browser-edges-"));
  try {
    mkdirSync(join(root, "src"));
    for (const [code, allowed] of [
      ["import('./verification/lab')", true],
      ["type Server = typeof import('node:fs')", false],
      ["import(path)", false],
      ["import('../project.json')", false],
      ["require('node:fs')", false],
    ] as const) {
      writeFileSync(join(root, "src/main.ts"), code);
      assert.equal(checkApp(root).length === 0, allowed, code);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("browser resource paths cannot copy server or design files into a build", () => {
  const root = mkdtempSync(join(tmpdir(), "browser-resources-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/main.ts"), "@Component({templateUrl: '../../../src/bff/secret.md'}) class Lab {}");
    assert.ok(checkApp(root).length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("global Sass cannot import a BFF resource or external stylesheet", async () => {
  const { checkStyles } = await import("../../harness/assets.ts");
  assert.deepEqual(checkStyles('@use "@angular/material" as mat; body { color: red; }'), []);
  assert.ok(checkStyles('@use "../../../src/bff/secret";').length);
  assert.ok(checkStyles('body { background: url("https://example.com/image"); }').length);
});

test("built assets reject secret and fixture canaries even outside TypeScript", async () => {
  const { checkDistribution } = await import("../../harness/assets.ts");
  const root = mkdtempSync(join(tmpdir(), "distribution-"));
  try {
    writeFileSync(join(root, "lazy.js"), "export {};");
    checkDistribution(root);
    writeFileSync(join(root, "lazy.js.map"), "PERFENG_SECRET_CANARY");
    assert.throws(() => checkDistribution(root), /Forbidden secret/);
    writeFileSync(join(root, "lazy.js.map"), "Design fixture only");
    assert.throws(() => checkDistribution(root), /Forbidden secret/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
