import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
// Issue #87: these exact roots are installer/generator output, not authored inputs.
// Keep fixture manifests, locks and source beside them in the provenance inventory.
const sourceOutputs = new Set([
  ...["effect-codegen", "effect-node", "effect-runtime", "identity-jwt", "orval-fetch"]
    .map(name => `tools/qualification/${name}/node_modules`),
  "tools/qualification/orval-fetch/generated",
]);
function digest(files, excluded = new Set()) {
  const hash = createHash("sha256");
  function visit(file) {
    const info = lstatSync(file);
    if (info.isSymbolicLink())
      throw Error("Source links are not admitted.");
    if (excluded.has(file) && info.isDirectory()) return;
    if (info.isDirectory()) {
      for (const name of readdirSync(file).sort()) visit(join(file, name));
    } else if (info.isFile()) hash.update(file).update(readFileSync(file));
    else throw Error("Unsupported provenance input.");
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
    "tsconfig.paths.json",
    "package.json",
    "pnpm-lock.yaml",
  ], sourceOutputs);
}

export function browserDigest() {
  return digest(["dist/apps/console/browser"]);
}
