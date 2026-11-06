import { writeFileSync } from "node:fs";
import { sourceDigest } from "./source.mjs";
import { spawnSync } from "node:child_process";
import { discardGuideOutput } from "./owned-output.mjs";
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
  writeFileSync(
    "dist/user-guide/provenance.json",
    JSON.stringify({ sourceSha256: source, node: process.versions.node }),
  );
} catch (error) {
  discardGuideOutput(process.cwd());
  throw error;
}
