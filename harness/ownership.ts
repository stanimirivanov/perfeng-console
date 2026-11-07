import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { inspectImports } from './boundaries.ts';

export type Role = 'component' | 'store' | 'operation' | 'port' | 'adapter' | 'composition' | 'presentation';
// Register concrete consumers in review; a directory name never grants authority.
export const roles: Readonly<Record<string, Role>> = {
  'apps/console/src/main.ts': 'composition',
  'apps/console/src/verification/lab.ts': 'component',
  'apps/console/src/verification/access.ts': 'adapter',
  'src/bff/config.ts': 'adapter',
  'src/bff/csp.ts': 'adapter',
  'src/bff/session.ts': 'adapter',
  'apps/console/src/session-client.ts': 'adapter',
  'src/bff/transport.ts': 'composition',
  'src/bff/run-reader.ts': 'adapter',
  'src/bff/transport-result.ts': 'port',
};
// Issue #33: freeze existing mixed ownership until its migration, never copy it.
const legacyHashes: Readonly<Record<string, string>> = {
  'apps/console/src/verification/access.ts': '124a443f1e5680bf84769e491ff37cda77ebacf75fdab16e1ec3757e9f993008'
};
const edges: Record<Role, readonly Role[]> = {
  component: ['component', 'store', 'port', 'presentation'],
  store: ['store', 'port', 'operation', 'presentation'],
  operation: ['operation', 'port', 'presentation'],
  port: ['port', 'presentation'],
  adapter: ['adapter', 'port', 'presentation'],
  composition: ['component', 'store', 'operation', 'port', 'adapter', 'presentation'],
  presentation: ['presentation'],
};
const ioNames = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'AbortController', 'AbortSignal', 'setTimeout', 'setInterval']);
const runtimes = new Set(['runPromise', 'runPromiseExit', 'runFork', 'runSync', 'runSyncExit', 'runCallback', 'runForkWith', 'runPromiseWith']);

/** Inspect handwritten ownership; behavioral guarantees remain integration-test duties. */
export function checkOwnership(root: string, registry: Readonly<Record<string, Role>> = roles): string[] {
  const errors: string[] = [];
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink()) { errors.push(`${file} [OWN-01] Symlinks cannot change ownership.`); continue; }
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:[cm]?[jt]sx?)$/.test(file) && !file.endsWith('.spec.ts')) files.push(file);
    }
  };
  for (const dir of ['apps/console/src', 'src/browser', 'src/bff', 'src/presentation']) walk(resolve(root, dir));
  const config = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  const options = config ? ts.parseJsonConfigFileContent(ts.readConfigFile(config, ts.sys.readFile).config, ts.sys, root).options : {};
  const program = ts.createProgram(files, { ...options, noEmit: true });
  const checker = program.getTypeChecker();
  for (const file of files) {
    const name = relative(root, file);
    const role = registry[name];
    if (!role) { errors.push(`${name}:1 [OWN-01] Register this executable module's role.`); continue; }
    if (!file.endsWith('.ts')) { errors.push(`${name}:1 [OWN-01] Only reviewed TypeScript source is supported.`); continue; }
    const source = program.getSourceFile(file)!;
    const report = (node: ts.Node, rule: string, reason: string) => {
      errors.push(`${name}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} [${rule}] ${reason}`);
    };
    // A hash-bound legacy allowance cannot grow while production code is held unchanged.
    const legacy = registry === roles && Object.hasOwn(legacyHashes, name);
    if (legacy && createHash('sha256').update(readFileSync(file)).digest('hex') !== legacyHashes[name]) {
      report(source, 'OWN-01', 'Issue #33 legacy source changed; remove the allowance with its ownership migration.');
    }
    inspectImports(source, (node, specifier) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) { report(node, 'OWN-01', 'Use literal imports.'); return; }
      const spec = specifier.text;
      const target = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule;
      if (target && !target.isExternalLibraryImport) {
        const targetName = relative(root, target.resolvedFileName);
        const targetRole = registry[targetName];
        if (targetName.startsWith('src/generated/')) return;
        if (!targetRole || !edges[role].includes(targetRole)) {
          // Existing main consumes the existing capability adapter until the reviewed browser migration.
          if (!(registry === roles && name === 'apps/console/src/main.ts' && targetName === 'apps/console/src/verification/access.ts'))
            report(node, 'OWN-01', `${role} cannot depend on ${targetRole ?? 'unregistered module'} ${targetName}. Use a port.`);
        }
      }
      if (['node:http', 'node:https', 'http', 'https'].includes(spec)) report(node, 'OWN-03', 'Native dispatch needs explicit platform admission, not just an adapter role.');
      if (role === 'presentation' && !spec.startsWith('.')) report(node, 'OWN-04', 'Presentation stays framework/runtime independent.');
      if ((spec.startsWith('node:') || spec.startsWith('effect/http') || spec.startsWith('@effect/platform-node')) && role !== 'adapter')
        report(node, 'OWN-03', 'Platform I/O belongs in a reviewed adapter.');
    }, report);
    const authority = (expression: ts.Expression, seen = new Set<ts.Symbol>()): string => {
      if (!ts.isIdentifier(expression)) return expression.getText(source);
      const symbol = checker.getSymbolAtLocation(expression);
      if (!symbol || seen.has(symbol)) return expression.text;
      seen.add(symbol);
      const imported = symbol.declarations?.find(ts.isImportSpecifier);
      if (imported) return (imported.propertyName ?? imported.name).text;
      const namespace = symbol.declarations?.find(ts.isNamespaceImport);
      if (namespace) {
        const declaration = namespace.parent.parent;
        if (ts.isImportDeclaration(declaration) && ts.isStringLiteral(declaration.moduleSpecifier)) {
          const name = declaration.moduleSpecifier.text;
          if (name === 'effect' || name === 'effect/Effect') return 'Effect';
          if (name === 'effect/ManagedRuntime' || name === 'effect/Runtime') return 'Runtime';
        }
      }
      const variable = symbol.declarations?.find(ts.isVariableDeclaration);
      return variable?.initializer ? authority(variable.initializer, seen) : expression.text;
    };
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        // Imported aliases retain the original member even without installed fixture packages.
        const declaration = symbol?.declarations?.find(ts.isImportSpecifier);
        const original = declaration ? (declaration.propertyName ?? declaration.name).text : node.text;
        if (!legacy && ioNames.has(original) && role !== 'adapter' && !(original === 'AbortSignal' && ts.isTypeReferenceNode(node.parent))) report(node, 'OWN-03', 'I/O, native abort and timers belong in an admitted adapter.');
        if (original === 'ManagedRuntime' && role !== 'composition') report(node, 'OWN-02', 'Managed runtime creation belongs at composition.');
        if (runtimes.has(original) && role !== 'composition') report(node, 'OWN-02', 'Execute Effects only at composition boundaries.');
      }
      if (ts.isElementAccessExpression(node)) {
        const member = node.argumentExpression;
        if (ts.isStringLiteralLike(member)) {
          if (!legacy && ioNames.has(member.text) && role !== 'adapter') report(node, 'OWN-03', 'Indirect I/O must stay in an adapter.');
          if (runtimes.has(member.text) && role !== 'composition') report(node, 'OWN-02', 'Indirect runtime execution is forbidden here.');
        } else if (/^(window|globalThis|self|Effect|ManagedRuntime|Runtime)$/.test(authority(node.expression))) report(node, 'OWN-03', 'Computed authority is not reviewable.');
      }
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) &&
        /effect\/(ManagedRuntime|Runtime)$/.test(node.moduleSpecifier.text) && role !== 'composition') report(node, 'OWN-02', 'Runtime modules belong at composition boundaries.');
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'ManagedRuntime' && role !== 'composition') report(node, 'OWN-02', 'Managed runtimes belong at composition boundaries.');
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = checkOwnership(process.cwd());
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
}
