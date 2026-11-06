import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";
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
      if (!file.endsWith(".ts")) continue;
      const text = readFileSync(file, "utf8");
      const tree = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const target = node.moduleSpecifier;
          if (target && ts.isStringLiteral(target)) {
            const spec = target.text;
            const allowed = spec.startsWith(".")
              ? !relative(root, resolve(dirname(file), spec)).startsWith("..")
              : [
                  "@angular/core",
                  "@angular/platform-browser",
                  "@angular/router",
                  "@angular/common",
                  "@angular/material/button",
                ].includes(spec);
            if (!allowed)
              errors.push(file + " forbidden browser dependency " + spec);
          }
        }
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        )
          errors.push(file + " dynamic import requires reviewed boundary");
        ts.forEachChild(node, visit);
      };
      visit(tree);
    }
  }
  walk(resolve(root, "src"));
  return errors;
}
if (process.argv[1]?.endsWith("workspace.ts")) {
  const errors = ["console", "scenario-lab"].flatMap((app) =>
    checkApp(resolve("apps", app)),
  );
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
