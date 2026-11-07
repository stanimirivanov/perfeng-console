import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const fixtures = [
  ["run_CreateRun", "examples/create.json"],
  ["analysis", "examples/analysis/slo-pass-regression-fail.json"],
  ["native_WorkerPresence", "api/native-worker/v2/examples/presence.json"],
];
const workloads = [];
for (const count of [1, 3]) {
  const selected = fixtures.slice(0, count);
  const checks = selected.map(([name, path]) =>
    name + "(" + readFileSync("vendor/perfeng-contracts/" + path, "utf8") + ")").join(", ");
  const bundle = await build({
    stdin: { contents: 'import { ' + selected.map(([name]) => name).join(", ") +
      ' } from "./src/generated/validators.mjs"; console.log(JSON.stringify([' + checks + ']));',
      resolveDir: process.cwd(), sourcefile: "consumer-baseline.js" },
    bundle: true, write: false, platform: "browser", format: "esm", minify: true, metafile: true,
  });
  const output = bundle.outputFiles[0].text;
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const run = spawnSync(process.execPath, ["--input-type=module", "-"], { encoding: "utf8", input: output });
    if (run.status !== 0 || JSON.parse(run.stdout).some(valid => valid !== true))
      throw Error("Baseline schema workload failed: " + run.stderr);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  workloads.push({ schemas: selected.map(([name]) => name), bytes: Buffer.byteLength(output),
    gzipBytes: gzipSync(output).length, processStartupAndDecodeMs: { p50: times[2], p95: times[4], samples: times },
    retainedInputs: Object.keys(bundle.metafile.inputs) });
}
const compileMs = [];
let compilerMemoryKiB;
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  const run = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--project", "tsconfig.json", "--extendedDiagnostics"], { encoding: "utf8" });
  if (run.status !== 0) throw Error("Baseline compiler failed: " + run.stdout + run.stderr);
  compileMs.push(performance.now() - start);
  const memory = run.stdout.match(/Memory used:\s+(\d+)K/)?.[1];
  if (!memory) throw Error("Compiler memory measurement unavailable.");
  compilerMemoryKiB = Number(memory);
}
compileMs.sort((a, b) => a - b);
const receipt = { compiler: { p50Ms: compileMs[2], p95Ms: compileMs[4], samples: compileMs, memoryKiB: compilerMemoryKiB }, node: process.versions.node, samples: 5,
  lockSha256: createHash("sha256").update(readFileSync("pnpm-lock.yaml")).digest("hex"),
  inputSha256: createHash("sha256").update(readFileSync("vendor/perfeng-contracts/provenance.json")).digest("hex"),
  workloads, unavailable: {
    serverClient: "M05-PR4 transport is not implemented",
    editor: "Measured separately by scripts/editor-baseline.mjs; compare matched call sites before claiming an improvement",
    candidate: "C5b generator cannot produce these pinned schemas",
  } };
mkdirSync("dist/qualification", { recursive: true });
writeFileSync("dist/qualification/consumer-baseline.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
