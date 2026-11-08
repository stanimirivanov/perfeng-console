import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { verifySnapshot, checkReferences } from "#perfeng/tooling/contracts";

test("snapshot hashes reject byte tampering and undeclared files", () => {
  const dir = mkdtempSync(join(tmpdir(), "contract-snapshot-"));
  try {
    cpSync("vendor/perfeng-contracts", dir, { recursive: true });
    verifySnapshot(dir);
    appendFileSync(join(dir, "openapi.json"), " ");
    assert.throws(() => verifySnapshot(dir), /checksum/);
    cpSync("vendor/perfeng-contracts", dir, { recursive: true });
    writeFileSync(join(dir, "extra.json"), "{}");
    assert.throws(() => verifySnapshot(dir), /inventory/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("only declared local references with existing pointers are admitted", () => {
  const files = new Map([["a.json", { $ref: "https://example.com/schema" }]]);
  assert.throws(() => checkReferences(files), /reference/);
  files.set("a.json", { $ref: "b.json" });
  assert.throws(() => checkReferences(files), /reference/);
  files.set("a.json", { $ref: "#/missing" });
  assert.throws(() => checkReferences(files), /reference/);
});
