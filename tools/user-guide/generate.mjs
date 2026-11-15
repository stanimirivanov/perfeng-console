import { writeFileSync } from "node:fs";
import { browserDigest, sourceDigest } from "./source.mjs";
import { spawnSync } from "node:child_process";
import { discardGuideOutput } from "./owned-output.mjs";

/**
 * Run one guide stage synchronously and refuse partial publication on failure.
 * @param {string[]} args - Executable followed by its arguments, without shell interpolation.
 * @param {NodeJS.ProcessEnv} [env] - Explicit stage environment, defaulting to the current process.
 * @throws {Error} If the child cannot start or exits unsuccessfully.
 */
function execute(args, env = process.env) {
  const p = spawnSync(args[0], args.slice(1), { stdio: "inherit", env });
  if (p.error || p.status !== 0) throw Error("Guide stage failed.");
}
try {
  discardGuideOutput(process.cwd());
  const source = sourceDigest();
  execute(["node_modules/.bin/nx", "run-many", "-t", "build"], {
    ...process.env,
    NX_DAEMON: "false",
  });
  const browser = browserDigest();
  execute(
    [
      "node_modules/.bin/playwright",
      "test",
      "-c",
      "apps/web-e2e/playwright.config.ts",
      "--grep",
      "@user-guide",
    ],
    { ...process.env, PERFENG_GUIDE: "1" },
  );
  if (sourceDigest() !== source) throw Error("Source changed during capture.");
  if (browserDigest() !== browser) throw Error("Browser build changed during capture.");
  writeFileSync(
    "dist/user-guide/provenance.json",
    JSON.stringify({ sourceSha256: source, browserSha256: browser, node: process.versions.node }),
  );
} catch (error) {
  discardGuideOutput(process.cwd());
  throw error;
}
