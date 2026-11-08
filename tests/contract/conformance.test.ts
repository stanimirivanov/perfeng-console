import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analysis, run_Run, run_RunState, native_WorkerPresence, integration_Error } from "#perfeng/validators";

const example = (path: string) => JSON.parse(readFileSync("vendor/perfeng-contracts/" + path, "utf8"));
test("report preserves pinned verdicts and rejects WARN, unknown fields and unsupported schema versions", () => {
  const report = example("examples/analysis/slo-pass-regression-fail.json");
  assert.equal(analysis(report), true);
  const wrong = structuredClone(report);
  wrong.evaluations[0].regression.status = "WARN";
  assert.equal(analysis(wrong), false);
  assert.equal(analysis({ ...report, schemaVersion: 999 }), false);
  assert.equal(analysis({ ...report, unrecognized: true }), false);
  assert.equal(report.evaluations[0].regression.status, "FAIL");
});
test("Run lifecycle enums and closed response payloads follow the pinned contract", () => {
  assert.equal(run_RunState("COMPLETED"), true);
  assert.equal(run_RunState("UNKNOWN_NEW_STATE"), false);
  const run = example("api/run-management/v1/examples/completed.json");
  assert.equal(run_Run(run), true);
  assert.equal(run_Run({ ...run, secret: true }), false);
});
test("native and integration validators retain required boundary shapes", () => {
  assert.equal(native_WorkerPresence({}), false);
  assert.equal(integration_Error({}), false);
});
