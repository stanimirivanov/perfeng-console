import { createHash } from "node:crypto";
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";

const ledgerName = "generated-manifest.json";
const lockName = ".generation.lock";
const digest = (content: string) => createHash("sha256").update(content).digest("hex");

function validateName(name: string) {
  if (!/^[a-zA-Z0-9_./-]+\.(ts|mjs|d\.mts)$/.test(name) ||
      posix.isAbsolute(name) || posix.normalize(name) !== name ||
      name.split("/").some(part => part === ".." || part === "."))
    throw Error("Unsafe generated name " + name);
}

export function synchronizeOutputs(root: string, outputs: ReadonlyMap<string, string>, write: boolean) {
  const rootInfo = lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw Error("Unsafe generated root.");
  let lock: number | undefined;
  if (write) lock = openSync(join(root, lockName), "wx", 0o600);
  else if (existsSync(join(root, lockName))) throw Error("Generation is in progress.");
  try {
    const names: string[] = [];
    function inventory(dir: string) {
      for (const entry of readdirSync(join(root, dir))) {
        const name = posix.join(dir, entry);
        const path = join(root, name);
        if (lstatSync(path).isSymbolicLink()) throw Error("Generated symlink forbidden " + name);
        if (lstatSync(path).isDirectory()) inventory(name);
        else if (name !== lockName) names.push(name);
      }
    }
    inventory("");
    let previous: Record<string, string> = {};
    if (names.includes(ledgerName)) {
      const ledger = JSON.parse(readFileSync(join(root, ledgerName), "utf8"));
      if (ledger.version !== 1 || !ledger.files || Array.isArray(ledger.files) ||
          typeof ledger.files !== "object" || Object.keys(ledger).sort().join() !== "files,version")
        throw Error("Invalid generated ledger.");
      previous = ledger.files;
      for (const [name, hash] of Object.entries(previous)) {
        validateName(name);
        if (!/^[0-9a-f]{64}$/.test(hash)) throw Error("Invalid generated digest.");
      }
    }
    for (const name of outputs.keys()) validateName(name);
    const desired = Object.fromEntries([...outputs.keys()].sort()
      .map(name => [name, digest(outputs.get(name)!)]));
    // Preflight every file before any writes or deletion.
    for (const name of names) {
      if (name === ledgerName || name === "AGENTS.md") continue;
      if (!Object.hasOwn(previous, name) && !outputs.has(name)) throw Error("Unowned generated file " + name);
      const actual = digest(readFileSync(join(root, name), "utf8"));
      if (write && actual !== desired[name] && actual !== previous[name])
        throw Error("Edited generated file requires review " + name);
      if (!write && (!outputs.has(name) || actual !== desired[name]))
        throw Error("Generated output drift " + name);
    }
    const ledger = JSON.stringify({ version: 1, files: desired }, null, 2) + "\n";
    if (!write) {
      if (Object.keys(desired).some(name => !names.includes(name)) ||
          !names.includes(ledgerName) || readFileSync(join(root, ledgerName), "utf8") !== ledger)
        throw Error("Generated inventory drift.");
      return;
    }
    for (const [name, content] of outputs) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), content);
    }
    for (const name of Object.keys(previous))
      if (!outputs.has(name) && names.includes(name)) rmSync(join(root, name));
    writeFileSync(join(root, ledgerName), ledger);
  } finally {
    if (lock !== undefined) { closeSync(lock); rmSync(join(root, lockName)); }
  }
}
