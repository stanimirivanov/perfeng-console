import { diagnostic } from './diagnostics.ts';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { publicImports, checkImportMaps } from './imports.ts';

interface Policy {
  layers: readonly string[];
  packages: readonly string[];
}

// All internal dependencies point down this graph. New external authority needs review.
export const policy: Readonly<Record<string, Policy>> = {
  generated: { layers: [], packages: [] },
  shared: { layers: [], packages: [] },
  presentation: { layers: ['generated'], packages: [] },
  browser: { layers: ['presentation', 'shared', 'generated'], packages: [] },
  bff: { layers: ['presentation', 'shared', 'generated'], packages: ['node:crypto', 'node:fs', 'node:path'] },
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
    errors.push(diagnostic(relative(root, file), line + 1, rule, message));
  };
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined) => {
    if (!specifier || !ts.isStringLiteralLike(specifier)) {
      report(node, 'dynamic', 'Use a literal module specifier for a reviewable dependency.');
      return;
    }
    const name = specifier.text;
    if (['%', '?', String.fromCharCode(92)].some((char) => name.includes(char)) || (name.includes('#') && !Object.hasOwn(publicImports, name))) {
      report(node, 'specifier', 'Use a canonical module path without encoding, query or fragment.');
      return;
    }
    const identityPackages: Record<string, {
      file: string;
      values: readonly string[];
      types: readonly string[];
    }> = {
      'jose': { file: 'src/bff/login/identity/token-profile.ts', values: ['importJWK', 'jwtVerify'], types: [] },
      'jsonc-parser': { file: 'src/bff/login/identity/strict-json.ts', values: ['parseTree'], types: ['Node', 'ParseError'] },
    };
    if (Object.hasOwn(identityPackages, name)) {
      const admission = identityPackages[name]!;
      const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
      const bindings = clause && !clause.name && clause.namedBindings;
      if (relative(root, file) !== admission.file || !bindings || !ts.isNamedImports(bindings) || !bindings.elements.length ||
          !bindings.elements.every(member => (clause?.isTypeOnly || member.isTypeOnly ? admission.types : admission.values).includes((member.propertyName ?? member.name).text)))
        report(node, 'package', 'Identity dependencies require exact reviewed named adapter imports.');
      return;
    }
    if (relative(root, file).startsWith('src/bff/login/identity/') && !name.startsWith('.') && !name.startsWith('#')) {
      const fileName = relative(root, file);
      const modules: Record<string, Record<string, {
        values: readonly string[];
        types?: readonly string[];
      }>> = {
        'resolved-pair.operation.ts': { effect: { values: ['Effect', 'Option', 'Semaphore'] } },
        'resolved-pair-verifier.ts': { effect: { values: ['Effect'], types: ['Scope'] } },
        'snapshot-verifier.ts': { effect: { values: ['Effect', 'Option', 'Semaphore'] } },
        'code-pair.ts': { 'node:crypto': { values: ['createHash'] } },
        'snapshot-contracts.ts': { effect: { values: [], types: ['Effect'] } },
        'signing-key-contracts.ts': { effect: { values: [], types: ['Effect'] } },
        'signing-key-get.ts': {
          'node:http': { values: ['maxHeaderSize'] },
          'node:crypto': { values: ['X509Certificate'] },
          effect: { values: ['Data', 'Effect', 'Stream'] },
          'effect/http/HttpClient': { values: ['HttpClient', 'withScope'] },
          'effect/http/HttpClientRequest': { values: ['get', 'setHeader'] },
          '@effect/platform-node/NodeHttpClient': { values: ['layerNodeHttpOptions'] },
          '@effect/platform-node/NodeHttpIncomingMessage': { values: ['NodeHttpIncomingMessage'] },
        },
        'signing-key-source.ts': { effect: { values: ['Effect'] } },
        'signing-key-store.ts': { effect: { values: ['Effect', 'Exit', 'Fiber', 'Option', 'ScopedCache', 'Semaphore'], types: ['Scope'] } },
        'signing-key-cache.ts': { effect: { values: ['Effect'] } },
        'signing-key-resolver.ts': { effect: { values: ['Effect', 'Fiber', 'Option', 'ScopedCache', 'Semaphore'], types: ['Scope'] } },
      };
      const admission = modules[fileName.slice('src/bff/login/identity/'.length)]?.[name];
      const allowedValues = admission?.values ?? [];
      const allowedTypes = admission?.types ?? [];
      const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
      const bindings = clause && !clause.name && clause.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings) || !bindings.elements.length || !bindings.elements.every(member =>
        (clause?.isTypeOnly || member.isTypeOnly ? allowedTypes : allowedValues).includes((member.propertyName ?? member.name).text)))
        report(node, 'package', 'Private identity modules admit only their reviewed named members; key-network authority belongs solely to the wire adapter.');
      return;
    }
    const verifiedExchangeEffect: Record<string, {
      values: readonly string[];
      types: readonly string[];
    }> = {
      'src/bff/login/verified-code-exchange.ts': { values: ['Effect', 'Option', 'Semaphore'], types: ['Scope'] },
      'src/bff/login/verified-exchange.operation.ts': { values: ['Effect'], types: [] },
      'src/bff/login/delegated-exchange.operation.ts': { values: ['Effect'], types: [] },
      'src/bff/login/verified-exchange-contracts.ts': { values: [], types: ['Effect'] },
      'src/bff/login/delegated-exchange-contracts.ts': { values: [], types: ['Effect'] },
    };
    const verifiedAdmission = verifiedExchangeEffect[relative(root, file)];
    if (verifiedAdmission && name === 'effect') {
      const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
      const bindings = clause && !clause.name && clause.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings) || !bindings.elements.length || !bindings.elements.every(member =>
        (clause?.isTypeOnly || member.isTypeOnly ? verifiedAdmission.types : verifiedAdmission.values).includes((member.propertyName ?? member.name).text)))
        report(node, 'package', 'Verified exchange uses exact named Effect capabilities; ports stay type-only.');
      return;
    }
    const rules = policy[owner]!;
    // Exact module admission: package installation alone grants no BFF authority.
    const admitted: Readonly<Record<string, readonly string[]>> = {
      'src/bff/transport.ts': ['effect'],
      'src/bff/login/identity/snapshot-verifier.ts': ['effect'],
      'src/bff/login/identity/snapshot-contracts.ts': ['effect'],
      'src/bff/login/code-exchange.operation.ts': ['effect'],
      'src/bff/login/token-post.ts': ['node:http', 'effect', 'effect/http/HttpClient', 'effect/http/HttpClientRequest', '@effect/platform-node/NodeHttpClient', '@effect/platform-node/NodeHttpIncomingMessage'],
      'src/bff/run-reader.ts': ['effect', 'effect/http/HttpClient', '@effect/platform-node/NodeHttpClient', '@effect/platform-node/NodeHttpIncomingMessage'],
    };
    const localPackages = admitted[relative(root, file)] ?? [];
    if (!Object.hasOwn(publicImports, name) && !name.startsWith('./') && !name.startsWith('../')) {
      if (!rules.packages.includes(name) && !localPackages.includes(name) && !(browserSchema && name === 'effect/Schema')) report(node, 'package', `Review and explicitly admit ${name} for ${owner}.`);
      return;
    }
    const target = relative(join(root, 'src'), Object.hasOwn(publicImports, name) ? resolve(root, publicImports[name]!) : resolve(dirname(file), name));
    if (target === '..' || target.startsWith('../')) {
      report(node, 'escape', 'Import only modules owned under src/.');
      return;
    }
    const targetOwner = target.split('/')[0]!;
    if (owner === 'browser' && targetOwner === 'shared' &&
        !(name === '#perfeng/contracts' && target === 'shared/contracts/public-api.ts' && ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true)) {
      report(node, 'shared-contract', 'Use a type-only import of the reviewed shared observation DTO.');
    }
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
      issues.push(diagnostic(relative(root, path), 1, 'symlink', 'Keep source inside its owned directory.'));
      return;
    }
    if (lstatSync(path).isDirectory()) {
      for (const entry of readdirSync(path).sort()) walk(join(path, entry));
      return;
    }
    const name = relative(join(root, 'src'), path);
    const owner = name.split('/')[0]!;
    if (!Object.hasOwn(policy, owner)) issues.push(diagnostic('src/' + name, 1, 'owner', 'Assign an explicit layer.'));
    else if (owner === 'generated' && name.endsWith('.css')) issues.push(diagnostic('src/' + name, 1, 'resource', 'Generated schemas cannot own stylesheets.'));
    else if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.d.mts')) issues.push(...inspectFile(root, path, owner));
    else if (name === 'generated/validators.mjs' || name === 'generated/generated-manifest.json') {
      // Bytes are regenerated and compared by the offline contract gate.
    } else if (!/\.(md|css)$/u.test(name)) issues.push(diagnostic('src/' + name, 1, 'extension', 'Use TypeScript or review the source format.'));
  }
  walk(join(root, 'src'));
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = [...scan(process.cwd()), ...checkImportMaps(process.cwd())];
  for (const layer of Object.keys(policy)) {
    const guide = join('src', layer, 'AGENTS.md');
    if (!lstatSync(guide, { throwIfNoEntry: false })?.isFile()) errors.push(diagnostic(guide, 1, 'guide', "Restore the layer's instructions."));
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}
