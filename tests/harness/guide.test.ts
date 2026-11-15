import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GuideReporter } from "#perfeng/e2e";
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

test("source provenance covers shared layers and browser provenance covers lazy chunks", async () => {
  const { sourceDigest, browserDigest } = await import("#perfeng/user-guide");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "guide-inputs-"));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    for (const dir of ["src", "tools", "apps", "dist/apps/console/browser"])
      mkdirSync(dir, { recursive: true });
    for (const path of ["pnpm-workspace.yaml", "angular.json", "nx.json", "tsconfig.base.json", "tsconfig.paths.json", "package.json", "pnpm-lock.yaml"])
      writeFileSync(path, "");
    const beforeAliases = sourceDigest();
    writeFileSync("tsconfig.paths.json", "changed alias target");
    assert.notEqual(sourceDigest(), beforeAliases);
    const source = sourceDigest();
    writeFileSync("src/shared.ts", "export const value = 1;");
    assert.notEqual(sourceDigest(), source);
    const browser = browserDigest();
    writeFileSync("dist/apps/console/browser/lazy.js", "export {};");
    assert.notEqual(browserDigest(), browser);
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("guide source inventory excludes owned installs but retains authored fixture inputs and rejects source links", async () => {
  const { sourceDigest } = await import("#perfeng/user-guide");
  const { mkdirSync, writeFileSync, symlinkSync } = await import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "guide-installed-"));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    for (const dir of ["src", "apps", "tools/qualification/orval-fetch"])
      mkdirSync(dir, { recursive: true });
    for (const path of ["pnpm-workspace.yaml", "angular.json", "nx.json", "tsconfig.base.json", "tsconfig.paths.json", "package.json", "pnpm-lock.yaml"])
      writeFileSync(path, "");
    const before = sourceDigest();
    for (const fixture of ["effect-codegen", "effect-node", "effect-runtime", "identity-jwt", "orval-fetch"]) {
      const modules = `tools/qualification/${fixture}/node_modules`;
      mkdirSync(modules + "/.pnpm", { recursive: true });
      symlinkSync(".pnpm/package", modules + "/package");
    }
    assert.equal(sourceDigest(), before);
    mkdirSync("tools/qualification/orval-fetch/generated", { recursive: true });
    writeFileSync("tools/qualification/orval-fetch/generated/client.ts", "generated client");
    assert.equal(sourceDigest(), before);
    mkdirSync("tools/handwritten/generated", { recursive: true });
    writeFileSync("tools/handwritten/generated/input.ts", "authored input");
    assert.notEqual(sourceDigest(), before);
    const authored = sourceDigest();
    writeFileSync("tools/qualification/orval-fetch/pnpm-lock.yaml", "authored lock");
    assert.notEqual(sourceDigest(), authored);
    symlinkSync("missing", "tools/qualification/orval-fetch/handwritten.mjs");
    assert.throws(() => sourceDigest(), /Source links/);
    rmSync("tools/qualification/orval-fetch/handwritten.mjs");
    rmSync("tools/qualification/orval-fetch/node_modules", { recursive: true });
    symlinkSync("missing", "tools/qualification/orval-fetch/node_modules");
    assert.throws(() => sourceDigest(), /Source links/);
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});
