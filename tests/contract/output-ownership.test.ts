import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { synchronizeOutputs } from "#perfeng/tooling/generated-output";

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

test("a symlinked output root never creates a lock or writes into its target", () => {
  const area = mkdtempSync(join(tmpdir(), "generated-root-"));
  try {
    const actual = join(area, "actual");
    mkdirSync(actual);
    symlinkSync(actual, join(area, "link"));
    assert.throws(() => synchronizeOutputs(join(area, "link"), new Map([["new.ts", "new"]]), true), /root/);
    assert.equal(existsSync(join(actual, ".generation.lock")), false);
    assert.equal(existsSync(join(actual, "new.ts")), false);
  } finally { rmSync(area, { recursive: true, force: true }); }
});

test("symlinked ancestors do not authorize writes through an ordinary root directory", () => {
  const area = mkdtempSync(join(tmpdir(), "generated-ancestor-"));
  try {
    mkdirSync(join(area, "actual", "generated"), { recursive: true });
    symlinkSync(join(area, "actual"), join(area, "source"));
    assert.throws(() => synchronizeOutputs(join(area, "source", "generated"), new Map([["new.ts", "new"]]), true), /root/);
    assert.equal(existsSync(join(area, "actual", "generated", "new.ts")), false);
  } finally { rmSync(area, { recursive: true, force: true }); }
});

test('both lock collisions preserve output/lock bytes and explain safe recovery without leaking contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'generated-lock-guidance-'));
  try {
    const outputs = new Map([['existing.ts', 'unchanged']]);
    synchronizeOutputs(root, outputs, true);
    const ledger = readFileSync(join(root, 'generated-manifest.json'), 'utf8');
    const canary = 'private-lock-metadata-canary';
    writeFileSync(join(root, '.generation.lock'), canary);
    for (const write of [false, true]) {
      assert.throws(() => synchronizeOutputs(root, new Map([['replacement.ts', 'new']]), write), error => {
        if (write) assert.equal((error as NodeJS.ErrnoException).code, 'EEXIST');
        const text = String(error);
        assert.match(text, /\[generation-lock\]/);
        assert.match(text, /confirm no writer/i);
        assert.match(text, /make contracts-check/);
        assert.match(text, /docs\/development\/generation-locks.md/);
        assert.doesNotMatch(text, new RegExp(canary + '|rm -|--force'));
        return true;
      });
      assert.equal(readFileSync(join(root, '.generation.lock'), 'utf8'), canary);
      assert.equal(readFileSync(join(root, 'existing.ts'), 'utf8'), 'unchanged');
      assert.equal(readFileSync(join(root, 'generated-manifest.json'), 'utf8'), ledger);
      assert.equal(existsSync(join(root, 'replacement.ts')), false);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
