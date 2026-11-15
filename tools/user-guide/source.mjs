import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, sep } from "node:path";

// Both hash domain headers and publication metadata use this exact format identifier.
export const GUIDE_DIGEST_FORMAT = 'perfeng-guide-sha256-framed-v1';

// Issue #87: these exact roots are installer/generator output, not authored inputs.
// Keep fixture manifests, locks and source beside them in the provenance inventory.
const sourceOutputs = new Set([
  ...["effect-codegen", "effect-node", "effect-runtime", "identity-jwt", "orval-fetch"]
    .map(name => `tools/qualification/${name}/node_modules`),
  "tools/qualification/orval-fetch/generated",
]);

/**
 * Hash the ordered authored inventory without following links or installer output.
 * Frame each UTF-8 path and raw body by byte length; never hash ambiguous concatenations.
 * @param {'source'|'browser'} domain - Independent evidence family, framed before the inventory.
 * @param {string[]} files - Inventory roots relative to the working checkout.
 * @param {Set<string>} [excluded] - Exact generated-directory roots to omit after inspecting their entry type.
 * @returns {string} Hex SHA-256 of the versioned, domain-separated binary record stream.
 * @throws {Error} If an included entry is a symlink, unsupported kind, missing or unreadable.
 */
function digest(domain, files, excluded = new Set()) {
  const hash = createHash("sha256");

  // Unsigned 64-bit big-endian lengths frame bytes, not JavaScript character counts.
  function append(bytes) {
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length).update(bytes);
  }
  append(Buffer.from(GUIDE_DIGEST_FORMAT, 'utf8'));
  append(Buffer.from(domain, 'utf8'));

  function visit(file) {
    const info = lstatSync(file);
    if (info.isSymbolicLink())
      throw Error("Source links are not admitted.");
    if (excluded.has(file) && info.isDirectory()) return;
    if (info.isDirectory()) {
      for (const name of readdirSync(file).sort()) visit(join(file, name));
    } else if (info.isFile()) {
      hash.update(Buffer.from([1])); // File record tag, reserved independently of header fields.
      append(Buffer.from(file.split(sep).join('/'), 'utf8'));
      append(readFileSync(file));
    }
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
  return digest('source', [
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
  return digest('browser', ["dist/apps/console/browser"]);
}
