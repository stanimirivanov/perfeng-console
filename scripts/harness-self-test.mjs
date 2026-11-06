import { cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const target = mkdtempSync(join(tmpdir(), "console-harness-probes-"));
function run(command, args, expected, evidence) {
  const result = spawnSync(command, args, {
    cwd: target, encoding: "utf8", timeout: 120000,
    env: { ...process.env, NX_DAEMON: "false" },
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.error || result.status === null || (result.status === 0) !== expected ||
      (evidence && !evidence.test(output)))
    throw Error("Unexpected probe result: " + command + " " + args.join(" ") + "\n" + output);
  console.log("Verified " + args.join(" "));
}
try {
  cpSync(root, target, {
    recursive: true,
    filter: path => ![".git", "node_modules", "dist", ".nx", ".angular", "test-results", "playwright-report"].includes(basename(path)),
  });
  symlinkSync(join(root, "node_modules"), join(target, "node_modules"), "dir");
  run("make", ["verify"], true);
  const main = join(target, "apps/console/src/main.ts");
  const original = readFileSync(main, "utf8");
  writeFileSync(main, original.replace("<h1>Perfeng Console", "<h1>{{ missingProperty }} Perfeng Console"));
  run("make", ["verify"], false, /missingProperty/);
  writeFileSync(main, original);

  const unit = join(target, "apps/console/src/verification/probe.spec.ts");
  writeFileSync(unit, 'it("harness-probe", () => { expect(1).toBe(2); });');
  run("make", ["verify"], false, /harness-probe/);
  writeFileSync(unit, 'it.skip("harness-probe", () => {});');
  run("make", ["component-test"], false, /Angular accounting/);
  rmSync(unit);
  run("make", ["build"], true);

  const browser = join(target, "apps/web-e2e/tests/probe.spec.ts");
  writeFileSync(browser, 'import {test} from "@playwright/test"; test.skip("harness-probe", () => {});');
  run("node_modules/.bin/playwright", ["test", "-c", "apps/web-e2e/playwright.config.ts", "--grep", "harness-probe"], false, /skipped/);
  writeFileSync(browser, 'import {test, expect} from "@playwright/test"; test("harness-probe", () => { expect(1).toBe(2); });');
  run("node_modules/.bin/playwright", ["test", "-c", "apps/web-e2e/playwright.config.ts", "--grep", "harness-probe"], false, /failed/);
} finally {
  rmSync(target, { recursive: true, force: true });
}
