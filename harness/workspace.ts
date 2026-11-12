import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";
import { inspectImports } from "./boundaries.ts";

export function checkApp(root: string): string[] {
  const errors: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(file + " symlink forbidden");
        continue;
      }
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
      if (!file.endsWith('.ts')) {
        errors.push(file + ':1 [extension] Only reviewed .ts browser source is supported; review format admission before adding executable files.');
        continue;
      }
      const text = readFileSync(file, "utf8");
      const tree = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const report = (node: ts.Node, rule: string, reason: string) => {
        const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
        errors.push(file + ":" + line + " [" + rule + "] " + reason);
      };
      // The scaffold uses inline templates and one reviewed global Material theme.
      const checkResources = (node: ts.Node) => {
        if (ts.isPropertyAssignment(node) && /^(templateUrl|styleUrls?|styles)$/.test(node.name.getText(tree).replace(/["']/g, "")))
          report(node, "resource", "Use the reviewed browser template and theme inputs.");
        ts.forEachChild(node, checkResources);
      };
      checkResources(tree);
      inspectImports(tree, (node, target) => {
        if (!target || !ts.isStringLiteralLike(target)) {
          report(node, "import", "Use a statically reviewable module path.");
          return;
        }
        const name = target.text;
        const internal = name.startsWith("./") || name.startsWith("../");
        const contractAlias = name === "#perfeng/contracts" && ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true;
        const storePackage = name === "@ngrx/signals" && ["run-detail-store.ts", "local-session.store.ts"].includes(relative(resolve(root, "src"), file));
        const allowed = storePackage || contractAlias || (internal
          ? !relative(resolve(root, "src"), resolve(dirname(file), name)).startsWith("..")
          : ["@angular/core", "@angular/platform-browser", "@angular/router",
             "@angular/common", "@angular/material/button",
             ...(["run-lookup.integration.ts", "local-session.integration.ts", "run-lookup.operation.ts", "session-client.ts", "run-client.ts"].includes(relative(resolve(root, "src"), file)) ? ["effect"] : []),
             ...(file.endsWith(".spec.ts") ? ["@angular/core/testing", "@ngrx/signals", "effect"] : [])].includes(name));
        if (!allowed || (!file.endsWith(".spec.ts") && name.includes(".spec")) || (/[%?\\]/u.test(name) || (name.includes("#") && name !== "#perfeng/contracts")))
          report(node, "dependency", "Forbidden browser dependency " + name);
      }, report);
    }
  }
  walk(resolve(root, "src"));
  return errors;
}
if (process.argv[1]?.endsWith("workspace.ts")) {
  const errors = checkApp(resolve("apps/console"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
