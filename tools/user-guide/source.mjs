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

/**
 * Hash the ordered authored inventory without following links or installer output.
 * The unframed serialization is intentionally unchanged here; issue #88 owns its versioned replacement.
 * @param {string[]} files - Inventory roots relative to the working checkout.
 * @param {Set<string>} [excluded] - Exact generated-directory roots to omit after inspecting their entry type.
 * @returns {string} Hex SHA-256 of the current path/content serialization.
 * @throws {Error} If an included entry is a symlink, unsupported kind, missing or unreadable.
 */
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

/**
 * Bind guide capture to authored source, configuration and lockfile bytes.
 * @returns {string} Source inventory digest, excluding reviewed installation/generator directories.
 * @throws {Error} If authored input cannot be safely inspected or read.
 */
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

/**
 * Bind guide capture to all browser distribution files, including lazy chunks.
 * @returns {string} Digest of the current built browser tree.
 * @throws {Error} If the distribution is missing, redirected by links or unreadable.
 */
export function browserDigest() {
  return digest(["dist/apps/console/browser"]);
}
