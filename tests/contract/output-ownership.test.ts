import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { synchronizeOutputs } from "../../scripts/generated-output.ts";

test("renamed outputs remove only unchanged previously owned files", () => {
  const root = mkdtempSync(join(tmpdir(), "generated-ownership-"));
  try {
    writeFileSync(join(root, "AGENTS.md"), "handwritten");
    synchronizeOutputs(root, new Map([["schemas/old.ts", "export {};"]]), true);
    assert.throws(() => synchronizeOutputs(root, new Map([["schemas/new.ts", "export {};"]]), false));
    synchronizeOutputs(root, new Map([["schemas/new.ts", "export {};"]]), true);
    assert.equal(existsSync(join(root, "schemas/old.ts")), false);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "handwritten");
    synchronizeOutputs(root, new Map([["schemas/new.ts", "export {};"]]), false);
    writeFileSync(join(root, "orphan.ts"), "export {};");
    assert.throws(() => synchronizeOutputs(root, new Map([["schemas/new.ts", "export {};"]]), false), /Unowned/);
    assert.throws(() => synchronizeOutputs(root, new Map([["schemas/new.ts", "export {};"]]), true), /Unowned/);
    assert.equal(existsSync(join(root, "orphan.ts")), true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("edited old output and malicious ledger names never authorize deletion", () => {
  const root = mkdtempSync(join(tmpdir(), "generated-edited-"));
  try {
    synchronizeOutputs(root, new Map([["old.ts", "original"]]), true);
    writeFileSync(join(root, "old.ts"), "edited");
    assert.throws(() => synchronizeOutputs(root, new Map([["new.ts", "new"]]), true), /Edited/);
    assert.equal(existsSync(join(root, "new.ts")), false);
    writeFileSync(join(root, "generated-manifest.json"), JSON.stringify({ version: 1, files: { "../escape.ts": "a".repeat(64) } }));
    assert.throws(() => synchronizeOutputs(root, new Map(), true), /Unsafe/);
    assert.equal(readFileSync(join(root, "old.ts"), "utf8"), "edited");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("symlinks and concurrent writes cannot take ownership", () => {
  const root = mkdtempSync(join(tmpdir(), "generated-concurrency-"));
  try {
    writeFileSync(join(root, ".generation.lock"), "other writer");
    assert.throws(() => synchronizeOutputs(root, new Map(), true), /EEXIST/);
    assert.throws(() => synchronizeOutputs(root, new Map(), false), /progress/);
    assert.equal(readFileSync(join(root, ".generation.lock"), "utf8"), "other writer");
    rmSync(join(root, ".generation.lock"));
    symlinkSync("/tmp", join(root, "escape"));
    assert.throws(() => synchronizeOutputs(root, new Map(), true), /symlink/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
