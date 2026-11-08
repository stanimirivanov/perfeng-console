import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAngularResult } from "#perfeng/tooling/angular-accounting";
import { Accounting } from "#perfeng/e2e";
import type { TestResult, FullResult, TestCase } from "@playwright/test/reporter";

test("Angular receipt rejects empty, skipped, retried or failed runs", () => {
  const good = { numTotalTests: 1, numPassedTests: 1, numPendingTests: 0, numTodoTests: 0, numFailedTests: 0, success: true };
  checkAngularResult(good);
  for (const change of [{ numTotalTests: 0 }, { numPendingTests: 1 }, { numTodoTests: 1 }, { numFailedTests: 1 }, { success: false }])
    assert.throws(() => checkAngularResult({ ...good, ...change }));
});
test("Playwright accounting retains the first failure even after a successful retry", async () => {
  const reporter = new Accounting();
  reporter.onTestEnd({} as TestCase, { status: "failed", retry: 0 } as TestResult);
  reporter.onTestEnd({} as TestCase, { status: "passed", retry: 1 } as TestResult);
  assert.equal((await reporter.onEnd({ status: "passed" } as FullResult)).status, "failed");
  assert.equal((await new Accounting().onEnd({ status: "passed" } as FullResult)).status, "failed");
  const skipped = new Accounting();
  skipped.onTestEnd({} as TestCase, { status: "skipped", retry: 0 } as TestResult);
  assert.equal((await skipped.onEnd({ status: "passed" } as FullResult)).status, "failed");
});
