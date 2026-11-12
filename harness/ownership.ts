import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { inspectImports } from './boundaries.ts';
import { featureImportAllowed, componentProviders } from './angular-features.ts';

export type Role = 'component' | 'store' | 'operation' | 'port' | 'adapter' | 'composition' | 'integration' | 'presentation' | 'contract' | 'entry' | 'provider';
// Register concrete consumers in review; a directory name never grants authority.
export const roles: Readonly<Record<string, Role>> = {
  'apps/console/src/main.ts': 'composition',
  'apps/console/src/app.config.ts': 'provider',
  'apps/console/src/runs/run-ui.ts': 'port',
  'apps/console/src/runs/run-reader.port.ts': 'port',
  'apps/console/src/runs/run.providers.ts': 'provider',
  'apps/console/src/session/session-ui.ts': 'port',
  'apps/console/src/session/session-reader.port.ts': 'port',
  'apps/console/src/session/session.providers.ts': 'provider',
  'apps/console/src/verification/access.port.ts': 'port',
  'apps/console/src/verification/providers.ts': 'provider',
  'apps/console/src/shell/app.ts': 'component',
  'apps/console/src/runs/run-lookup.ts': 'component',
  'apps/console/src/app.routes.ts': 'integration',
  'apps/console/src/runs/run.operation.ts': 'operation',
  'apps/console/src/runs/run.facade.ts': 'integration',
  'apps/console/src/session/session.facade.ts': 'integration',
  'apps/console/src/session/session.store.ts': 'store',
  'apps/console/src/verification/lab.ts': 'component',
  'apps/console/src/verification/access.ts': 'adapter',
  'src/bff/config.ts': 'adapter',
  'src/bff/csp.ts': 'adapter',
  'src/bff/session.ts': 'adapter',
  'apps/console/src/runs/detail/run-detail.ts': 'component',
  'apps/console/src/runs/run.store.ts': 'store',
  'apps/console/src/runs/run-client.ts': 'adapter',
  'src/bff/runs.ts': 'adapter',
  'src/shared/contracts/observation.ts': 'contract',
  'src/shared/contracts/public-api.ts': 'contract',
  'src/bff/public-api.ts': 'entry',
  'src/bff/config-public-api.ts': 'entry',
  'apps/console/src/session/session-client.ts': 'adapter',
  'src/bff/transport.ts': 'composition',
  'src/bff/run-reader.ts': 'adapter',
  'src/bff/transport-result.ts': 'port',
};
// Issue #33: freeze existing mixed ownership until its migration, never copy it.
const legacyHashes: Readonly<Record<string, string>> = {
  'apps/console/src/verification/access.ts': '124a443f1e5680bf84769e491ff37cda77ebacf75fdab16e1ec3757e9f993008'
};
const edges: Record<Role, readonly Role[]> = {
  component: ['component', 'store', 'port', 'presentation', 'contract'],
  store: ['store', 'port', 'operation', 'presentation', 'contract'],
  operation: ['operation', 'port', 'presentation', 'contract'],
  port: ['port', 'presentation', 'contract'],
  adapter: ['adapter', 'port', 'presentation', 'contract'],
  composition: ['provider', 'component', 'integration', 'store', 'operation', 'port', 'adapter', 'presentation', 'contract'],
  integration: ['component', 'integration', 'store', 'operation', 'port', 'adapter', 'presentation', 'contract'],
  provider: ['provider', 'component', 'integration', 'store', 'adapter', 'port', 'contract'],
  presentation: ['presentation'],
  contract: ['contract'],
  entry: ['composition', 'adapter'],
};
// Issue #53: native scheduling is platform authority, including rendering callbacks.
// Angular render hooks remain framework-owned; these reserved names cannot create a second scheduler.
const ioNames = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'AbortController', 'AbortSignal',
  'setTimeout', 'setInterval', 'queueMicrotask', 'setImmediate', 'requestAnimationFrame', 'requestIdleCallback',
  'scheduler', 'postTask']);
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
  for (const dir of ['apps/console/src', 'src/browser', 'src/bff', 'src/presentation', 'src/shared']) walk(resolve(root, dir));
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
    if (role === 'entry' && source.statements.some(statement => !ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !statement.exportClause || !ts.isNamedExports(statement.exportClause)))
      report(source, 'OWN-01', 'Public entries contain only explicit named re-exports.');
    if (role === 'contract') {
      for (const statement of source.statements) {
        if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement) &&
            !(ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly === true) &&
            !(ts.isExportDeclaration(statement) && statement.isTypeOnly))
          report(statement, 'OWN-04', 'Shared contracts contain only type declarations and type-only imports/exports.');
      }
    }
    // A hash-bound legacy allowance cannot grow while production code is held unchanged.
    const legacy = registry === roles && Object.hasOwn(legacyHashes, name);
    if (legacy && createHash('sha256').update(readFileSync(file)).digest('hex') !== legacyHashes[name]) {
      report(source, 'OWN-01', 'Issue #33 legacy source changed; remove the allowance with its ownership migration.');
    }
    const providerBindings = new Set<ts.Symbol>();
    inspectImports(source, (node, specifier) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) { report(node, 'OWN-01', 'Use literal imports.'); return; }
      const spec = specifier.text;
      const target = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule;
      if (target && !target.isExternalLibraryImport) {
        const targetName = relative(root, target.resolvedFileName);
        const targetRole = registry[targetName];
        if (!featureImportAllowed(name, targetName)) report(node, 'OWN-11', 'Cross-feature import must use a reviewed feature entry; private feature implementations stay local.');
        const providerEdge = role === 'component' && targetRole === 'provider';
        if (providerEdge) {
          const bindings = ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && node.importClause?.namedBindings;
          if (!bindings || !ts.isNamedImports(bindings)) report(node, 'OWN-12', 'Use a named reviewed component provider factory only in Component.providers metadata.');
          else for (const binding of bindings.elements) {
            const exported = (binding.propertyName ?? binding.name).text;
            const symbol = checker.getSymbolAtLocation(binding.name);
            if (!(componentProviders[targetName] ?? []).includes(exported) || binding.isTypeOnly || !symbol)
              report(binding, 'OWN-12', 'Only the reviewed component provider factory is admitted.');
            else providerBindings.add(symbol);
          }
        }
        if (role === 'entry' && targetName !== (name === 'src/bff/public-api.ts' ? 'src/bff/transport.ts' : 'src/bff/config.ts'))
          report(node, 'OWN-01', 'Public entry must re-export only its reviewed owner.');
        if (targetRole === 'contract' && !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true) &&
            !(role === 'contract' && ts.isExportDeclaration(node) && node.isTypeOnly))
          report(node, 'OWN-04', 'Consume shared contracts through declaration-level import type.');
        if (targetName.startsWith('src/generated/')) return;
        if ((!targetRole || !edges[role].includes(targetRole)) && !providerEdge) {
          report(node, 'OWN-01', `${role} cannot depend on ${targetRole ?? 'unregistered module'} ${targetName}. Use a port.`);
        }
      }
      if (['node:http', 'node:https', 'http', 'https'].includes(spec)) report(node, 'OWN-03', 'Native dispatch needs explicit platform admission, not just an adapter role.');
      if ((role === 'presentation' || role === 'contract') && !spec.startsWith('.') && spec !== '#perfeng/contracts') report(node, 'OWN-04', 'Presentation and shared contracts stay framework/runtime independent.');
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
    // Issue #57: framework integration executes work but cannot conceal a UI declaration.
    const decoratorName = (expression: ts.Expression, seen = new Set<ts.Symbol>()): string => {
      if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
      if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) return expression.argumentExpression.text;
      if (ts.isIdentifier(expression)) {
        let symbol = checker.getSymbolAtLocation(expression);
        if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) symbol = checker.getAliasedSymbol(symbol);
        if (symbol && ['Component', 'Directive'].includes(symbol.getName())) return symbol.getName();
        if (symbol && !seen.has(symbol)) {
          seen.add(symbol);
          const variable = symbol.declarations?.find(ts.isVariableDeclaration);
          if (variable?.initializer) return decoratorName(variable.initializer, seen);
        }
      }
      return authority(expression);
    };
    const canExecute = role === 'composition' || role === 'integration';
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && providerBindings.has(checker.getSymbolAtLocation(node)!)) {
        const call = node.parent;
        const property = call.parent;
        const metadata = property.parent;
        const decoratorCall = metadata.parent;
        if (!(ts.isCallExpression(call) && call.expression === node && ts.isPropertyAssignment(property) &&
            property.initializer === call && property.name.getText(source) === 'providers' &&
            ts.isObjectLiteralExpression(metadata) && ts.isCallExpression(decoratorCall) &&
            ts.isDecorator(decoratorCall.parent) && decoratorName(decoratorCall.expression) === 'Component'))
          report(node, 'OWN-12', 'Provider factories may be referenced only by Component.providers metadata, never component execution.');
      }
      if (role !== 'component' && (ts.isClassDeclaration(node) || ts.isClassExpression(node))) {
        for (const decorator of ts.getDecorators(node) ?? []) {
          const expression = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;
          if (['Component', 'Directive'].includes(decoratorName(expression)))
            report(decorator, 'OWN-01', 'A component or directive requires the component role; it cannot inherit runtime, adapter or store authority.');
        }
      }
      if (!legacy && role !== 'adapter' && ts.isBindingElement(node) && node.propertyName &&
          ts.isComputedPropertyName(node.propertyName) && ts.isStringLiteralLike(node.propertyName.expression) &&
          ioNames.has(node.propertyName.expression.text))
        report(node, 'OWN-03', 'Computed binding cannot move I/O or native scheduling out of an admitted adapter.');
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        // Imported aliases retain the original member even without installed fixture packages.
        const declaration = symbol?.declarations?.find(ts.isImportSpecifier);
        const original = declaration ? (declaration.propertyName ?? declaration.name).text : node.text;
        if (!legacy && ioNames.has(original) && role !== 'adapter' && !(original === 'AbortSignal' && ts.isTypeReferenceNode(node.parent))) report(node, 'OWN-03', 'I/O, native abort and scheduling belong in an admitted adapter; use Angular render hooks for rendering.');
        if (original === 'ManagedRuntime' && !canExecute) report(node, 'OWN-02', 'Managed runtime creation belongs at registered composition/integration boundaries.');
        if (runtimes.has(original) && !canExecute) report(node, 'OWN-02', 'Execute Effects only at registered composition/integration boundaries.');
      }
      if (ts.isElementAccessExpression(node)) {
        const member = node.argumentExpression;
        if (ts.isStringLiteralLike(member)) {
          if (!legacy && ioNames.has(member.text) && role !== 'adapter') report(node, 'OWN-03', 'Indirect I/O and native scheduling must stay in an admitted adapter.');
          if (runtimes.has(member.text) && !canExecute) report(node, 'OWN-02', 'Indirect runtime execution is forbidden here.');
        } else if (/^(window|globalThis|self|scheduler|Effect|ManagedRuntime|Runtime)$/.test(authority(node.expression))) report(node, 'OWN-03', 'Computed authority is not reviewable.');
      }
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) &&
        /effect\/(ManagedRuntime|Runtime)$/.test(node.moduleSpecifier.text) && !canExecute) report(node, 'OWN-02', 'Runtime modules belong at registered composition/integration boundaries.');
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'ManagedRuntime' && !canExecute) report(node, 'OWN-02', 'Managed runtimes belong at registered composition/integration boundaries.');
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
