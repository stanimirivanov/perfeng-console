import type { FullResult, TestResult, Reporter, TestCase } from "@playwright/test/reporter";
// https://playwright.dev/docs/api/class-reporter
export default class Accounting implements Reporter {
  private count = 0;
  private failed = false;
  onTestEnd(_test: TestCase, attempt: TestResult) {
    this.count++;
    if (attempt.status !== "passed" || attempt.retry !== 0) this.failed = true;
  }
  async onEnd(result: FullResult): Promise<{ status: "passed" | "failed" }> {
    return { status: result.status === "passed" && this.count > 0 && !this.failed ? "passed" : "failed" };
  }
}
