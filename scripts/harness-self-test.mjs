import { cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const target = mkdtempSync(join(tmpdir(), "console-harness-probes-"));
// Cold aggregate verification approaches two minutes on hosted runners (issue #156).
const VERIFY_PROBE_TIMEOUT_MS = 180000;

/**
 * Check a disposable harness probe against its expected exit status and diagnostic.
 * @param {string} command - Probe executable, invoked directly without a shell.
 * @param {string[]} args - Arguments for the probe in the disposable checkout.
 * @param {boolean} expected - Whether success is required; false requires a failing status.
 * @param {RegExp} [evidence] - Required diagnostic pattern for expected failures.
 * @param {number} [timeoutMs=120000] - Child execution budget; aggregate verification receives cold-checkout headroom.
 * @throws {Error} If the probe times out, cannot run, or fails to demonstrate its expected result; includes termination metadata.
 */
function run(command, args, expected, evidence, timeoutMs = 120000) {
  console.log("Checking " + command + " " + args.join(" ") + " (timeout " + timeoutMs + "ms)");
  const started = performance.now();
  const result = spawnSync(command, args, {
    cwd: target,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, NX_DAEMON: "false" },
  });
  const elapsedMs = Math.round(performance.now() - started);
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.error || result.status === null || (result.status === 0) !== expected ||
      (evidence && !evidence.test(output)))
    throw Error("Unexpected probe result: " + command + " " + args.join(" ") +
      " (elapsed=" + elapsedMs + "ms, timeout=" + timeoutMs + "ms, status=" + result.status +
      ", signal=" + (result.signal ?? "none") + ", error=" + (result.error?.code ?? "none") + ")\n" + output);
  console.log("Verified " + args.join(" ") + " in " + elapsedMs + "ms");
}
try {
  cpSync(root, target, {
    recursive: true,
    filter: path => ![".git", "node_modules", "dist", ".nx", ".angular", "test-results", "playwright-report"].includes(basename(path)),
  });
  symlinkSync(join(root, "node_modules"), join(target, "node_modules"), "dir");
  run("make", ["verify"], true, undefined, VERIFY_PROBE_TIMEOUT_MS);
  // Issue #51: prove the production gate checks tools independently of test imports.
  for (const file of ['tools/serve-console.ts', 'tools/console-server.ts']) {
    const path = join(target, file);
    const source = readFileSync(path, 'utf8');
    const probe = "\nconst h2CompilerProbe: number = 'production-tool-compiler-probe';\n";
    if (source.includes('h2CompilerProbe')) throw Error('Compiler probe already present: ' + file);
    try {
      writeFileSync(path, source + probe);
      if (readFileSync(path, 'utf8') !== source + probe) throw Error('Compiler probe was not injected: ' + file);
      run('make', ['typecheck'], false,new RegExp(file.replaceAll('.', '\\.') + '\\(\\d+,\\d+\\): error TS2322:'));
    } finally {
      writeFileSync(path, source);
    }
  }

  const home = join(target, "apps/console/src/runs/run-lookup.ts");
  const original = readFileSync(home, "utf8");
  const anchor = '<h1>Perfeng Console';
  if (original.split(anchor).length !== 2) throw Error('Template probe needs exactly one anchor; refusing a no-op or ambiguous edit.');
  const changed = original.replace(anchor, '<h1>{{ missingProperty }} Perfeng Console');
  try {
    writeFileSync(home, changed);
    if (readFileSync(home, 'utf8') !== changed || changed === original) throw Error('Template fault was not injected.');
    // H5 retires the byte fences: aggregate failure must now be the Angular diagnostic.
    run("make", ["verify"], false, /missingProperty/, VERIFY_PROBE_TIMEOUT_MS);
  } finally { writeFileSync(home, original); }

  const unit = join(target, "apps/console/src/verification/probe.spec.ts");
  writeFileSync(unit, 'it("harness-probe", () => { expect(1).toBe(2); });');
  run("make", ["verify"], false, /harness-probe/, VERIFY_PROBE_TIMEOUT_MS);
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
