import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import GuideReporter from "../../apps/web-e2e/user-guide/reporter.ts";
import type {
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
test("guide excludes ordinary tests and discards failed or empty publications", () => {
  const root = mkdtempSync(join(tmpdir(), "guide-"));
  const cwd = process.cwd();
  const previous = process.env.PERFENG_GUIDE;
  try {
    process.chdir(root);
    process.env.PERFENG_GUIDE = "1";
    const plain = new GuideReporter();
    plain.onBegin();
    plain.onTestEnd(
      { tags: [], title: "ordinary" } as unknown as TestCase,
      { status: "passed" } as TestResult,
    );
    assert.throws(() => plain.onEnd({ status: "passed" } as FullResult));
    assert.equal(existsSync("dist/user-guide/index.html"), false);
    const guide = new GuideReporter();
    guide.onBegin();
    guide.onTestEnd(
      { tags: ["@user-guide"], title: "Task" } as unknown as TestCase,
      {
        status: "passed",
        retry: 0,
        attachments: [
          {
            name: "guide-step",
            body: Buffer.from(
              JSON.stringify({
                title: "Read state",
                body: "<script>unsafe</script>",
              }),
            ),
          },
          { name: "guide-image", body: Buffer.from("test image") },
        ],
      } as TestResult,
    );
    guide.onEnd({ status: "passed" } as FullResult);
    assert.match(
      readFileSync("dist/user-guide/index.html", "utf8"),
      /&lt;script&gt;/,
    );
    guide.onBegin();
    guide.onTestEnd(
      { tags: ["@user-guide"] } as unknown as TestCase,
      { status: "failed" } as TestResult,
    );
    assert.throws(() => guide.onEnd({ status: "failed" } as FullResult));
    assert.equal(existsSync("dist/user-guide/index.html"), false);
  } finally {
    process.chdir(cwd);
    if (previous === undefined) delete process.env.PERFENG_GUIDE;
    else process.env.PERFENG_GUIDE = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
