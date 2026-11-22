import { diagnostic } from './diagnostics.ts';
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve, relative, dirname, sep } from "node:path";
import ts from "typescript";
import { inspectImports } from "./boundaries.ts";
import { angularPackages, effectTypePorts } from "./angular-features.ts";
import { componentStyleImports } from './assets.ts';

function componentDecorators(tree: ts.SourceFile) {
  const names = new Set<string>();
  const namespaces = new Set<string>();
  for (const item of tree.statements) {
    if (!ts.isImportDeclaration(item) || !ts.isStringLiteral(item.moduleSpecifier) || item.moduleSpecifier.text !== '@angular/core') continue;
    const bindings = item.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === 'Component') names.add(binding.name.text);
      }
    }
  }
  return (target: ts.Expression) => ts.isIdentifier(target) ? names.has(target.text) :
    ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression) &&
    namespaces.has(target.expression.text) && target.name.text === 'Component';
}

export function checkApp(root: string): string[] {
  const errors: string[] = [];
  const sourceRoot = resolve(root, 'src');
  const styleEntry = resolve(sourceRoot, 'styles.scss');
  const bundledStyles = lstatSync(styleEntry, { throwIfNoEntry: false })?.isFile()
    ? componentStyleImports(readFileSync(styleEntry, 'utf8')) : [];
  const usedStyles = new Set<string>();
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(diagnostic(relative(root, file), 1, 'symlink', 'symlink forbidden'));
        continue;
      }
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
      if (!file.endsWith('.ts')) {
        errors.push(diagnostic(relative(root, file), 1, 'extension', 'Only reviewed .ts browser source is supported; review format admission before adding executable files.'));
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
        errors.push(diagnostic(relative(root, file), line, rule, reason));
      };
      const isComponent = componentDecorators(tree);
      const name = basename(file, '.ts');
      const isSpec = file.endsWith('.spec.ts');
      const siblingExists = (suffix: string) => lstatSync(resolve(dirname(file), name + suffix), { throwIfNoEntry: false })?.isFile();
      const checkResources = (node: ts.Node) => {
        if (ts.isClassDeclaration(node)) {
          for (const decorator of ts.getDecorators(node) ?? []) {
            const call = decorator.expression;
            if (!ts.isCallExpression(call) || !isComponent(call.expression)) continue;
            const metadata = call.arguments[0];
            if (!metadata || !ts.isObjectLiteralExpression(metadata)) {
              report(decorator, 'resource', 'Use a literal @Component metadata object.');
              continue;
            }
            const externalTemplates: ts.Expression[] = [];
            for (const property of metadata.properties) {
              if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
                report(property, 'resource', 'Use explicit, statically named component metadata properties.');
                continue;
              }
              const key = property.name.text;
              if (key === 'templateUrl') externalTemplates.push(property.initializer);
              if (['styles', 'styleUrl', 'styleUrls'].includes(key) || (key === 'template' && !isSpec)) {
                report(property, 'resource', 'Use a sibling HTML template and bundle component CSS through src/styles.scss.');
              }
            }
            if (!isSpec || externalTemplates.length) {
              const template = externalTemplates[0];
              if (externalTemplates.length !== 1 || !template || !ts.isStringLiteralLike(template) ||
                  template.text !== './' + name + '.html' || !siblingExists('.html')) {
                report(decorator, 'resource', `Use the regular sibling file './${name}.html' as a literal templateUrl.`);
              }
            }
            if (isSpec) continue;
            if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || node.name?.text !== name.split('-').map(part => part[0]!.toUpperCase() + part.slice(1)).join('')) {
              report(node, 'resource', 'Use a PascalCase component class matching its hyphenated file basename.');
            }
            if (!siblingExists('.css')) report(decorator, 'resource', `Add the regular sibling stylesheet '${name}.css'.`);
            const css = relative(sourceRoot, resolve(dirname(file), name + '.css')).split(sep).join('/');
            usedStyles.add(css);
            if (bundledStyles.filter(path => path === css).length !== 1) {
              report(decorator, 'resource', `Bundle '${css}' exactly once with @use in src/styles.scss.`);
            }
          }
        }
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
        const localPath = relative(resolve(root, "src"), file);
        const reviewedPackage = (angularPackages[localPath] ?? []).includes(name);
        const effectType = name === 'effect' && effectTypePorts.includes(localPath) &&
          ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true;
        const allowed = reviewedPackage || effectType || contractAlias || (internal
          ? !relative(resolve(root, "src"), resolve(dirname(file), name)).startsWith("..")
          : ["@angular/core", "@angular/platform-browser", "@angular/router","@angular/common", "@angular/material/button",...(file.endsWith(".spec.ts") ? ["@angular/core/testing", "@ngrx/signals", "effect"] : [])].includes(name));
        if (!allowed || (!file.endsWith(".spec.ts") && name.includes(".spec")) || (/[%?\\]/u.test(name) || (name.includes("#") && name !== "#perfeng/contracts")))
          report(node, "dependency", "Forbidden browser dependency " + name);
      }, report);
    }
  }
  walk(sourceRoot);
  for (const stylesheet of bundledStyles) {
    if (!usedStyles.has(stylesheet)) errors.push(diagnostic('src/styles.scss', 1, 'resource', `No production component owns '${stylesheet}'.`));
  }
  return errors;
}
if (process.argv[1]?.endsWith("workspace.ts")) {
  const errors = checkApp(resolve("apps/console"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
