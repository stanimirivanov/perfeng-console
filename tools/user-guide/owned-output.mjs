import {
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import path from "node:path";

/**
 * Resolve an output path only within a real, non-redirected owned directory.
 * @param {string} root - Existing canonical ownership root.
 * @param {string} relative - Descendant path; the root itself and escapes are forbidden.
 * @param {object} [options] - Inspection options.
 * @param {boolean} [options.missing] - Permit absent descendants after their existing parents pass inspection.
 * @returns {string} Absolute descendant path after inspecting existing path components.
 * @throws {Error} If paths escape, traverse links, cross unsupported parents, or cannot be inspected.
 */
export function ownedPath(root, relative, { missing = false } = {}) {
  const resolvedRoot = path.resolve(root);
  const canonicalRoot = realpathSync(root);
  if (
    lstatSync(resolvedRoot).isSymbolicLink() ||
    path.relative(canonicalRoot, resolvedRoot) !== ""
  ) {
    throw new Error(
      "Generated output root cannot be redirected by symlinks or junctions.",
    );
  }
  const target = path.resolve(canonicalRoot, relative);
  const local = path.relative(canonicalRoot, target);
  if (
    !local ||
    local === ".." ||
    local.startsWith(`..${path.sep}`) ||
    path.isAbsolute(local)
  ) {
    throw new Error("Generated path escapes its owned output root.");
  }
  let cursor = canonicalRoot;
  const parts = local.split(path.sep);
  for (let index = 0; index < parts.length; index++) {
    cursor = path.join(cursor, parts[index]);
    let info;
    try {
      info = lstatSync(cursor);
    } catch (error) {
      if (missing && error.code === "ENOENT") return target;
      throw new Error("Generated path is missing or cannot be inspected.");
    }
    if (info.isSymbolicLink())
      throw new Error("Generated output cannot contain symlinks or junctions.");
    if (index < parts.length - 1 && !info.isDirectory())
      throw new Error("Generated path parent must be a directory.");
  }
  return target;
}

/**
 * Inventory owned regular files before deletion, refusing redirected or special entries.
 * @param {string} root - Real owned directory to inspect recursively.
 * @returns {string[]} Sorted absolute regular-file paths, bounded to ten thousand entries.
 * @throws {Error} If the root/tree contains links, unsupported entries or exceeds the file bound.
 */
export function inspectTree(root) {
  const info = lstatSync(root);
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new Error("Owned output root must be a real directory.");
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = ownedPath(
        root,
        path.relative(root, path.join(directory, entry.name)),
      );
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(absolute);
      else
        throw new Error(
          "Generated output contains an unsupported filesystem entry.",
        );
      if (files.length > 10_000)
        throw new Error("Generated output inventory exceeds its bound.");
    }
  };
  walk(root);
  return files.sort();
}

/**
 * Reset only the fixed guide output after inspecting its existing tree.
 * @param {string} repositoryRoot - Canonical checkout owning dist/user-guide.
 * @returns {string} New absolute guide output directory.
 * @throws {Error} If ownership/link checks or filesystem operations fail; an absent output is allowed.
 */
export function resetGuideOutput(repositoryRoot) {
  const target = ownedPath(repositoryRoot, "dist/user-guide", {
    missing: true,
  });
  try {
    inspectTree(target);
    rmSync(target, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  mkdirSync(target, { recursive: true });
  return target;
}

/**
 * Remove only the inspected guide publication, leaving unrelated distribution files intact.
 * @param {string} repositoryRoot - Canonical checkout owning dist/user-guide.
 * @throws {Error} If ownership/link checks or filesystem operations fail; an absent output is allowed.
 */
export function discardGuideOutput(repositoryRoot) {
  const target = ownedPath(repositoryRoot, "dist/user-guide", {
    missing: true,
  });
  try {
    inspectTree(target);
    rmSync(target, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

/**
 * Reset a valid chapter without touching siblings or following redirected assets.
 * @param {string} outputRoot - Real guide publication directory.
 * @param {string} slug - Lowercase hyphenated chapter identifier, never a relative path.
 * @returns {string} New absolute chapter directory containing an assets directory.
 * @throws {Error} If the slug or ownership checks fail, or filesystem access fails.
 */
export function resetChapter(outputRoot, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
    throw new Error("Guide slug is invalid.");
  const target = ownedPath(outputRoot, slug, { missing: true });
  try {
    inspectTree(target);
    rmSync(target, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  mkdirSync(path.join(target, "assets"), { recursive: true });
  return target;
}

/**
 * Discard only the validated chapter directory after inspecting all existing entries.
 * @param {string} outputRoot - Real guide publication directory.
 * @param {string} slug - Lowercase hyphenated chapter identifier, never a relative path.
 * @throws {Error} If the slug or ownership checks fail, or filesystem access fails.
 */
export function discardChapter(outputRoot, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
    throw new Error("Guide slug is invalid.");
  const target = ownedPath(outputRoot, slug, { missing: true });
  try {
    inspectTree(target);
    rmSync(target, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
