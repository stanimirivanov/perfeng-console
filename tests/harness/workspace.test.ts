import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkApp } from "#perfeng/harness/workspace";
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
  const { checkStyles } = await import("#perfeng/harness/assets");
  assert.deepEqual(checkStyles('@use "@angular/material" as mat; body { color: red; }'), []);
  assert.ok(checkStyles('@use "../../../src/bff/secret";').length);
  assert.ok(checkStyles('body { background: url("https://example.com/image"); }').length);
});

test("built assets reject secret and fixture canaries even outside TypeScript", async () => {
  const { checkDistribution } = await import("#perfeng/harness/assets");
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

test('browser admits only the shared DTO type import and retires the presentation escape', () => {
  const root = mkdtempSync(join(tmpdir(), 'dto-import-'));
  try {
    mkdirSync(join(root, 'src'));
    for (const [code, allowed] of [
      ["import type { RunSummary } from '../../../src/shared/contracts/observation';", false],
      ["import { RunSummary } from '../../../src/shared/contracts/observation';", false],
      ["export * from '../../../src/shared/contracts/observation';", false],
      ["import('../../../src/shared/contracts/observation');", false],
      ["import type { RunSummary } from '../../../src/presentation/observation';", false],
      ["import type { Other } from '../../../src/shared/contracts/other';", false],
    ] as const) {
      writeFileSync(join(root, 'src/main.ts'), code);
      assert.equal(checkApp(root).length === 0, allowed, code);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('nested browser imports must resolve to the reviewed DTO, not a same-spelled decoy', () => {
  const root = mkdtempSync(join(tmpdir(), 'dto-resolved-'));
  const app = join(root, 'apps/console');
  try {
    mkdirSync(join(app, 'src/nested'), { recursive: true });
    mkdirSync(join(root, 'apps/src/shared/contracts'), { recursive: true });
    writeFileSync(join(root, 'apps/src/shared/contracts/observation.ts'), 'export interface RunSummary {}');
    const file = join(app, 'src/nested/probe.ts');
    writeFileSync(file, "import type { RunSummary } from '../../../src/shared/contracts/observation';");
    assert.match(checkApp(app).join('\n'), /Forbidden browser dependency/);
    writeFileSync(file, "import type { RunSummary } from '../../../../src/shared/contracts/observation';");
    assert.match(checkApp(app).join('\n'), /Forbidden browser dependency/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('browser admits only the public contract alias as a type', () => {
  const root = mkdtempSync(join(tmpdir(), 'dto-alias-'));
  try {
    mkdirSync(join(root, 'src'));
    for (const [source, allowed] of [
      ["import type { RunSummary } from '#perfeng/contracts';", true],
      ["import '#perfeng/contracts';", false],
      ["export * from '#perfeng/contracts';", false],
      ["import type { Secret } from '#perfeng/bff';", false],
      ["import type { RunSummary } from '#perfeng/contracts/observation';", false],
    ] as const) {
      writeFileSync(join(root, 'src/main.ts'), source);
      assert.equal(checkApp(root).length === 0, allowed, source);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
