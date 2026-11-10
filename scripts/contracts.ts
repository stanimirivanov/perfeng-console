import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, posix } from "node:path";

type Document = Record<string, unknown>;
export function checkReferences(files: Map<string, unknown>) {
  function visit(value: unknown, file: string) {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (["$ref", "$dynamicRef", "$recursiveRef"].includes(key)) {
        if (typeof item !== "string" || /[:%\\]/.test(item))
          throw Error("Forbidden reference in " + file);
        const [path, pointer = ""] = item.split("#");
        const name = path ? posix.normalize(posix.join(posix.dirname(file), path)) : file;
        let target: unknown = files.get(name);
        if (!files.has(name) || (pointer && !pointer.startsWith("/")))
          throw Error("Undeclared reference " + item);
        for (const part of pointer.split("/").slice(1)) {
          target = (target as Document | undefined)?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
          if (target === undefined) throw Error("Missing reference " + item);
        }
      } else visit(item, file);
    }
  }
  for (const [file, value] of files) visit(value, file);
}

export function verifySnapshot(root: string) {
  const manifest = JSON.parse(readFileSync(join(root, "provenance.json"), "utf8"));
  const expected = manifest.sha256 as Record<string, string>;
  const files = new Map<string, unknown>();
  const names: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(join(root, dir)).sort()) {
      const name = posix.join(dir, entry);
      const path = join(root, name);
      if (lstatSync(path).isSymbolicLink()) throw Error("Snapshot symlink");
      if (lstatSync(path).isDirectory()) walk(name);
      else if (name !== "provenance.json") {
        if (!(name in expected)) throw Error("Snapshot inventory mismatch " + name);
        names.push(name);
        const bytes = readFileSync(path);
        if (createHash("sha256").update(bytes).digest("hex") !== expected[name])
          throw Error("Snapshot checksum mismatch " + name);
        if (name.endsWith(".json")) files.set(name, JSON.parse(bytes.toString()));
      }
    }
  }
  walk("");
  if (JSON.stringify(names.sort()) !== JSON.stringify(Object.keys(expected).sort()))
    throw Error("Snapshot inventory mismatch");
  checkReferences(files);
  return files;
}

type Family = {
  sourceRevision: string;
  manifestSha256: string;
  members: Record<string, { destination: string; sha256: string }>;
};
type Receipt = {
  status: string;
  consumerCommit: string;
  ledgerSha256: string;
  historyRelease: string;
  toolRelease: string;
  families: Record<string, Family>;
};
type ReceiptPin = { commit: string; receiptSha256: string };
type DistributionLock = {
  controlPlane: ReceiptPin;
  historyRelease: string;
  toolRelease: string;
  tool: Record<string, string>;
  publisher: Record<string, string>;
};

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function readSelectionReceipt(bytes: Buffer, pin: ReceiptPin): Receipt {
  if (sha256(bytes) !== pin.receiptSha256) throw Error("Control-plane receipt digest mismatch");
  const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;
  if (receipt.status !== "passed" || receipt.consumerCommit !== pin.commit)
    throw Error("Expected a passing receipt for the reviewed control-plane commit");
  return receipt;
}

export function compareDistribution(
  receipt: Receipt,
  snapshot: Record<string, string>,
  supplements: string[],
  verified: Map<string, Map<string, string>>,
) {
  const selected = new Set(["lock.json"]);
  if (snapshot["lock.json"] !== receipt.ledgerSha256)
    throw Error("Vendor lock differs from the control-plane receipt");
  function compare(source: string, destination: string, expected: string, hashes?: Map<string, string>) {
    if (!/^[a-f0-9]{64}$/.test(expected) || selected.has(destination) ||
        snapshot[destination] !== expected || hashes?.get(source) !== expected)
      throw Error("Signed provider bytes differ from the selected vendor file: " + destination);
    selected.add(destination);
  }
  for (const [name, family] of Object.entries(receipt.families)) {
    for (const [source, member] of Object.entries(family.members))
      compare(source, member.destination, member.sha256, verified.get(name));
  }
  for (const path of supplements) {
    const expected = snapshot[path];
    if (expected === undefined) throw Error("Unknown vendor supplement: " + path);
    compare(path, path, expected, verified.get("runPolicy"));
  }
  if (selected.size !== Object.keys(snapshot).length)
    throw Error("Incomplete signed provider coverage for the vendor snapshot");
  return selected.size;
}

function run(file: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  return execFileSync(file, args, {
    cwd, env, encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function verifyFamily(
  family: Family,
  lock: DistributionLock,
  history: string,
  scratch: string,
  tool: string,
) {
  const { sourceRevision, manifestSha256 } = family;
  if (!/^[a-f0-9]{40}$/.test(sourceRevision) || !/^[a-f0-9]{64}$/.test(manifestSha256))
    throw Error("Invalid family pin in reviewed selection receipt");
  const manifestPath = join(history, sourceRevision + ".manifest.json");
  const bytes = readFileSync(manifestPath);
  if (sha256(bytes) !== manifestSha256) throw Error("Historical manifest digest mismatch");
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest.releaseId !== lock.historyRelease || manifest.source.revision !== sourceRevision)
    throw Error("Historical manifest selection mismatch");

  const policy = join(scratch, "provider.json");
  writeFileSync(policy, JSON.stringify({ ...lock.publisher, manifestSha256 }), { mode: 0o600 });
  // Use the independently restored inspector on the whole signed closure.
  const inspect = "import sys\nsys.path.insert(0, sys.argv.pop(1))\n" +
    "from scripts.contracts_inspect import main\nraise SystemExit(main())";
  const result = run(join(tool, "runtime/bin/python3.12"), [
    "-IB", "-c", inspect, tool, "--manifest", manifestPath,
    "--archive", join(history, sourceRevision + ".tar.gz"),
    "--bundle", join(history, "manifest.sigstore.jsonl"),
    "--policy", policy, "--verifier", join(tool, "bin/gh"),
  ], scratch, {});
  return new Map(Object.entries(JSON.parse(result) as Record<string, string>));
}

function shadow(assets: string, bootstrap: string, verifier: string, receiptPath: string) {
  if (![assets, bootstrap, verifier, receiptPath].every(path => path && isAbsolute(path)))
    throw Error("Expected absolute paths for assets, bootstrap, verifier and control-plane receipt");
  const lock = JSON.parse(readFileSync("contracts-distribution.lock.json", "utf8")) as DistributionLock;
  const receipt = readSelectionReceipt(readFileSync(receiptPath), lock.controlPlane);
  if (receipt.historyRelease !== lock.historyRelease || receipt.toolRelease !== lock.toolRelease)
    throw Error("Reviewed receipt distribution identity mismatch");
  const root = "vendor/perfeng-contracts";
  verifySnapshot(root);
  const provenance = JSON.parse(readFileSync(join(root, "provenance.json"), "utf8"));
  const supplemental = provenance.supplemental;
  if (supplemental.repository !== "https://github.com/stanimirivanov/perfeng-contracts" ||
      supplemental.commit !== receipt.families.runPolicy?.sourceRevision)
    throw Error("Provider supplement revision mismatch");

  const scratch = mkdtempSync(join(tmpdir(), "perfeng-console-shadow-"));
  try {
    const pins = join(scratch, "tool.json");
    const tool = join(scratch, "tool");
    writeFileSync(pins, JSON.stringify(lock.tool), { mode: 0o600 });
    run("uv", ["run", "--locked", "--offline", "--no-sync", "python",
      "-m", "scripts.contracts_tool_release", "restore", "--archive", join(assets, "tool/materializer.tar.gz"),
      "--bundle", join(assets, "tool/materializer.sigstore.jsonl"),
      "--verifier", verifier, "--pins", pins, "--target", tool], bootstrap);
    const verified = new Map(Object.entries(receipt.families).map(([name, family]) =>
      [name, verifyFamily(family, lock, join(assets, "history"), scratch, tool)]));
    const matchedFiles = compareDistribution(receipt, provenance.sha256, supplemental.files, verified);
    return {
      status: "passed", controlPlaneCommit: receipt.consumerCommit,
      controlPlaneReceiptSha256: lock.controlPlane.receiptSha256,
      historyRelease: lock.historyRelease, toolRelease: lock.toolRelease, matchedFiles,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const [assets = "", bootstrap = "", verifier = "", receipt = ""] = process.argv.slice(2);
  try {
    console.log(JSON.stringify(shadow(assets, bootstrap, verifier, receipt)));
  } catch (error) {
    console.error("contracts-shadow:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
