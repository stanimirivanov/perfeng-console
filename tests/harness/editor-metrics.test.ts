import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("editor baseline reports nearest-rank warm percentiles from its actual observations", () => {
  const receipt = JSON.parse(execFileSync(process.execPath, ["scripts/editor-baseline.mjs"], {
    encoding: "utf8", timeout: 30000,
  }));
  const warm = (receipt.samples as number[]).slice(1).sort((a, b) => a - b);
  assert.equal(warm.length, 4);
  assert.equal(receipt.warmP50Ms, warm[Math.ceil(warm.length * 0.5) - 1]);
  assert.equal(receipt.warmP95Ms, warm[Math.ceil(warm.length * 0.95) - 1]);
});
