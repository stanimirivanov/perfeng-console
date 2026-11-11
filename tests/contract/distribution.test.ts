import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareDistribution, readSelectionReceipt, stageSnapshot, verifyRollback } from "#perfeng/tooling/contracts";

const revision = "a".repeat(40);
const digest = "b".repeat(64);
const manifestSha256 = "c".repeat(64);
const family = {
  sourceRevision: revision,
  manifestSha256,
  members: { "api/run/openapi.json": { destination: "openapi.json", sha256: digest } },
};
const receipt = {
  status: "passed",
  consumerCommit: revision,
  ledgerSha256: digest,
  distributionLockSha256: digest,
  historyRelease: "contract-history-123",
  toolRelease: "contract-materializer-v1-example",
  families: { runPolicy: family },
};
function receiptPin(bytes: Buffer) {
  return {
    commit: revision,
    receiptSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
const receiptBytes = Buffer.from(JSON.stringify(receipt));

test("accepts only the reviewed exact receipt and control-plane revision", () => {
  const pin = receiptPin(receiptBytes);
  assert.deepEqual(readSelectionReceipt(receiptBytes, pin), receipt);
  assert.throws(() => readSelectionReceipt(Buffer.from(JSON.stringify({ ...receipt, status: "failed" })), pin), /receipt digest/);
  assert.throws(() => readSelectionReceipt(receiptBytes, { ...pin, commit: "d".repeat(40) }), /control-plane commit/);
});

test("compares selected members and independently mapped supplements", () => {
  const snapshot = { "openapi.json": digest, "report.json": digest, "lock.json": digest };
  const supplements = ["report.json"];
  const provider = new Map([
    ["api/run/openapi.json", digest],
    ["report.json", digest],
  ]);
  assert.equal(compareDistribution(receipt, snapshot, supplements, new Map([["runPolicy", provider]])), 3);
  assert.throws(() => compareDistribution(receipt, snapshot, [], new Map([["runPolicy", provider]])), /coverage/);
  provider.delete("report.json");
  assert.throws(() => compareDistribution(receipt, snapshot, supplements, new Map([["runPolicy", provider]])), /report.json/);
  provider.set("api/run/openapi.json", "d".repeat(64));
  assert.throws(() => compareDistribution(receipt, snapshot, supplements, new Map([["runPolicy", provider]])), /openapi.json/);
});

test("rejects a mismatched vendor ledger and duplicate projection destinations", () => {
  const snapshot = { "openapi.json": digest, "lock.json": digest };
  const verified = new Map([["runPolicy", new Map([["api/run/openapi.json", digest]])]]);
  assert.throws(() => compareDistribution({ ...receipt, ledgerSha256: "d".repeat(64) }, snapshot, [], verified), /vendor lock/i);
  assert.throws(() => compareDistribution(receipt, snapshot, ["openapi.json"], verified), /openapi.json/);
});


test("stages exact provider bytes and refuses changed or unsafe candidates", () => {
  const area = mkdtempSync(join(tmpdir(), "console-contract-update-"));
  const target = join(area, "snapshot");
  const content = Buffer.from("{}");
  const sha = createHash("sha256").update(content).digest("hex");
  const provenance = Buffer.from(JSON.stringify({ sha256: { "schema.json": sha } }));
  try {
    assert.throws(() => stageSnapshot(target, provenance, new Map([["schema.json", Buffer.from("changed")]])), /checksum/);
    assert.throws(() => readFileSync(target), /ENOENT/);
    stageSnapshot(target, provenance, new Map([["schema.json", content]]));
    assert.deepEqual(readFileSync(join(target, "schema.json")), content);
    assert.deepEqual(readFileSync(join(target, "provenance.json")), provenance);
    assert.throws(() => stageSnapshot(target, provenance, new Map([["schema.json", content]])), /EEXIST/);
    const pin = createHash("sha256").update(provenance).digest("hex");
    verifyRollback(target, { "schema.json": sha }, pin);
    writeFileSync(join(target, "schema.json"), "{} ");
    assert.throws(() => verifyRollback(target, { "schema.json": sha }, pin), /checksum/);
  } finally {
    rmSync(area, { recursive: true, force: true });
  }
});
