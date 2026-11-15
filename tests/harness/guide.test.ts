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


for (const family of ['source', 'browser'] as const) {
  test(family + ' digest frames content/path boundaries and sorts file records deterministically', async () => {
    const { sourceDigest, browserDigest } = await import('#perfeng/user-guide');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const root = mkdtempSync(join(tmpdir(), 'guide-framing-'));
    const cwd = process.cwd();
    try {
      process.chdir(root);
      for (const dir of ['src', 'apps', 'tools', 'dist/apps/console/browser']) mkdirSync(dir, { recursive: true });
      for (const file of ['pnpm-workspace.yaml', 'angular.json', 'nx.json', 'tsconfig.base.json', 'tsconfig.paths.json', 'package.json', 'pnpm-lock.yaml']) writeFileSync(file, '');
      const directory = family === 'source' ? 'src' : 'dist/apps/console/browser';
      const digest = family === 'source' ? sourceDigest : browserDigest;
      writeFileSync(directory + '/a', 'X' + directory + '/b');
      writeFileSync(directory + '/b', 'Y');
      const boundary = digest();
      writeFileSync(directory + '/a', 'X');
      writeFileSync(directory + '/b', directory + '/bY');
      assert.notEqual(digest(), boundary, 'two changed bodies cannot shift a filename across their boundary');
      rmSync(directory + '/a'); rmSync(directory + '/b');
      writeFileSync(directory + '/a', 'bX');
      const pathBoundary = digest();
      rmSync(directory + '/a'); writeFileSync(directory + '/ab', 'X');
      assert.notEqual(digest(), pathBoundary, 'a filename suffix cannot become file content');
      rmSync(directory + '/ab');
      writeFileSync(directory + '/é', Buffer.from([0, 255, 13, 10]));
      writeFileSync(directory + '/z', 'unchanged');
      const ordered = digest();
      rmSync(directory + '/é'); rmSync(directory + '/z');
      writeFileSync(directory + '/z', 'unchanged');
      writeFileSync(directory + '/é', Buffer.from([0, 255, 13, 10]));
      assert.equal(digest(), ordered, 'filesystem creation order does not change digest');
      assert.match(ordered, /^[a-f0-9]{64}$/);
    } finally { process.chdir(cwd); rmSync(root, { recursive: true, force: true }); }
  });
}

test('guide publication names the framed format and retains capture invalidation/cleanup', async () => {
  const { mkdirSync, writeFileSync, chmodSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const root = mkdtempSync(join(tmpdir(), 'guide-producer-'));
  try {
    for (const dir of ['src', 'apps', 'tools', 'node_modules/.bin']) mkdirSync(join(root, dir), { recursive: true });
    for (const file of ['pnpm-workspace.yaml', 'angular.json', 'nx.json', 'tsconfig.base.json', 'tsconfig.paths.json', 'package.json', 'pnpm-lock.yaml']) writeFileSync(join(root, file), '');
    const build = join(root, 'node_modules/.bin/nx');
    const capture = join(root, 'node_modules/.bin/playwright');
    writeFileSync(build, '#!/bin/sh\nmkdir -p dist/apps/console/browser\nprintf built > dist/apps/console/browser/main.js\n');
    chmodSync(build, 0o700);
    const script = new URL('../../tools/user-guide/generate.mjs', import.meta.url);
    for (const mutation of ['', 'printf altered > src/change.ts', 'printf altered > dist/apps/console/browser/main.js']) {
      writeFileSync(capture, '#!/bin/sh\nmkdir -p dist/user-guide\nprintf captured > dist/user-guide/index.html\n' + mutation + '\n');
      chmodSync(capture, 0o700);
      if (mutation) {
        assert.throws(() => execFileSync(process.execPath, [script.pathname], { cwd: root, stdio: 'pipe' }), /Command failed/);
        assert.equal(existsSync(join(root, 'dist/user-guide')), false);
      } else {
        execFileSync(process.execPath, [script.pathname], { cwd: root, stdio: 'pipe' });
        const receipt = JSON.parse(readFileSync(join(root, 'dist/user-guide/provenance.json'), 'utf8'));
        assert.equal(receipt.digestFormat, 'perfeng-guide-sha256-framed-v1');
        assert.match(receipt.sourceSha256, /^[a-f0-9]{64}$/);
        assert.match(receipt.browserSha256, /^[a-f0-9]{64}$/);
        assert.equal(receipt.node, process.versions.node);
        assert.deepEqual(Object.keys(receipt).sort(), ['browserSha256', 'digestFormat', 'node', 'sourceSha256']);
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('framed guide digests match independent version/domain UTF-8 and binary vectors', async () => {
  const { sourceDigest, browserDigest } = await import('#perfeng/user-guide');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'guide-vectors-'));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    for (const dir of ['src', 'apps', 'tools', 'dist/apps/console/browser']) mkdirSync(dir, { recursive: true });
    for (const file of ['pnpm-workspace.yaml', 'angular.json', 'nx.json', 'tsconfig.base.json', 'tsconfig.paths.json', 'package.json', 'pnpm-lock.yaml']) writeFileSync(file, '');
    // Independently calculated from the documented bytes using Python struct.pack('>Q') + hashlib.
    // These constants bind the format/domain headers as well as file framing and raw UTF-8 lengths.
    assert.equal(sourceDigest(), '1f5e01c443c17d63353a1e3692781779a35fac1ec4243180321837c9c24e94a7');
    writeFileSync('dist/apps/console/browser/é', Buffer.from([0, 255, 13, 10]));
    assert.equal(browserDigest(), '334d1fd22dee7d7e1d361d76ab6bf31b4c9916a5edc4adea99775466d6d133e8');
  } finally { process.chdir(cwd); rmSync(root, { recursive: true, force: true }); }
});
