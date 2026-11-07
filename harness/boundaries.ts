import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

interface Policy {
  layers: readonly string[];
  packages: readonly string[];
}

// All internal dependencies point down this graph. New external authority needs review.
export const policy: Readonly<Record<string, Policy>> = {
  generated: { layers: [], packages: [] },
  presentation: { layers: ['generated'], packages: [] },
  browser: { layers: ['presentation', 'generated'], packages: [] },
  bff: { layers: ['presentation', 'generated'], packages: ['node:crypto', 'node:fs', 'node:https', 'node:path'] },
  scenarios: { layers: ['generated'], packages: [] },
  simulator: { layers: ['scenarios', 'generated'], packages: ['node:child_process', 'node:crypto', 'node:fs', 'node:path'] },
};

function inspectFile(root: string, file: string, owner: string): string[] {
  const schemaModule = relative(join(root, 'src/generated/schemas'), file);
  const browserSchema = owner === 'generated' && !schemaModule.startsWith('..');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const errors: string[] = [];
  const report = (node: ts.Node, rule: string, message: string) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    errors.push(`${relative(root, file)}:${line + 1} [${rule}] ${message}`);
  };
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined) => {
    if (!specifier || !ts.isStringLiteralLike(specifier)) {
      report(node, 'dynamic', 'Use a literal module specifier for a reviewable dependency.');
      return;
    }
    const name = specifier.text;
    if (['%', '#', '?', String.fromCharCode(92)].some((char) => name.includes(char))) {
      report(node, 'specifier', 'Use a canonical module path without encoding, query or fragment.');
      return;
    }
    const rules = policy[owner]!;
    if (!name.startsWith('./') && !name.startsWith('../')) {
      if (!rules.packages.includes(name) && !(browserSchema && name === 'effect/Schema')) report(node, 'package', `Review and explicitly admit ${name} for ${owner}.`);
      return;
    }
    const target = relative(join(root, 'src'), resolve(dirname(file), name));
    if (target === '..' || target.startsWith('../')) {
      report(node, 'escape', 'Import only modules owned under src/.');
      return;
    }
    const targetOwner = target.split('/')[0]!;
    if (targetOwner !== owner && !rules.layers.includes(targetOwner)) {
      report(node, 'layer', `${owner} cannot import ${targetOwner}. Use the declared public boundary.`);
    }
  };
  if (owner === 'generated') {
    const checkResource = (node: ts.Node) => {
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL')
        report(node, 'resource', 'Generated schemas cannot create browser asset references.');
      ts.forEachChild(node, checkResource);
    };
    checkResource(source);
  }
  inspectImports(source, checkSpecifier, report);
  return errors;
}

export function inspectImports(
  source: ts.SourceFile,
  checkSpecifier: (node: ts.Node, specifier: ts.Node | undefined) => void,
  report: (node: ts.Node, rule: string, message: string) => void,
) {
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && node.moduleSpecifier)) {
      checkSpecifier(node, node.moduleSpecifier);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      checkSpecifier(node, node.argument.literal);
    } else if (ts.isImportEqualsDeclaration(node) ||
      (ts.isIdentifier(node) && ['require', 'createRequire'].includes(node.text))) {
      report(node, 'loader', 'Use ESM imports with literal targets.');
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      checkSpecifier(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  if (source.referencedFiles.length || source.typeReferenceDirectives.length || source.libReferenceDirectives.length) {
    report(source, 'reference', 'Use declared imports instead of ambient reference directives.');
  }
  visit(source);
}

export function scan(root: string): string[] {
  const issues: string[] = [];
  function walk(path: string) {
    if (lstatSync(path).isSymbolicLink()) {
      issues.push(`${relative(root, path)} [symlink] Keep source inside its owned directory.`);
      return;
    }
    if (lstatSync(path).isDirectory()) {
      for (const entry of readdirSync(path).sort()) walk(join(path, entry));
      return;
    }
    const name = relative(join(root, 'src'), path);
    const owner = name.split('/')[0]!;
    if (!Object.hasOwn(policy, owner)) issues.push(`src/${name} [owner] Assign an explicit layer.`);
    else if (owner === 'generated' && name.endsWith('.css')) issues.push('src/' + name + ' [resource] Generated schemas cannot own stylesheets.');
    else if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.d.mts')) issues.push(...inspectFile(root, path, owner));
    else if (name === 'generated/validators.mjs') {
      // Bytes are regenerated and compared by the offline contract gate.
    } else if (!/\.(md|css)$/u.test(name)) issues.push(`src/${name} [extension] Use TypeScript or review the source format.`);
  }
  walk(join(root, 'src'));
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = scan(process.cwd());
  for (const layer of Object.keys(policy)) {
    const guide = join('src', layer, 'AGENTS.md');
    if (!lstatSync(guide, { throwIfNoEntry: false })?.isFile()) errors.push(`${guide} [guide] Restore the layer's instructions.`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}
