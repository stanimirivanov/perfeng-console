import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
function digest(files) {
  const hash = createHash("sha256");
  function visit(file) {
    if (lstatSync(file).isSymbolicLink())
      throw Error("Source links are not admitted.");
    if (lstatSync(file).isDirectory()) {
      for (const name of readdirSync(file).sort()) visit(join(file, name));
    } else hash.update(file).update(readFileSync(file));
  }
  files.forEach(visit);
  return hash.digest("hex");
}

export function sourceDigest() {
  return digest([
    "src",
    "pnpm-workspace.yaml",
    "apps",
    "tools",
    "angular.json",
    "nx.json",
    "tsconfig.base.json",
    "package.json",
    "pnpm-lock.yaml",
  ]);
}

export function browserDigest() {
  return digest(["dist/apps/console/browser"]);
}
