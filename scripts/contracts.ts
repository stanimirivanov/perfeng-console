import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, posix } from "node:path";

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
