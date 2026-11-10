import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { compareDistribution, readSelectionReceipt } from "#perfeng/tooling/contracts";

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
