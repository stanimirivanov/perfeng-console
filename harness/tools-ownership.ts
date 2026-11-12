import ts from 'typescript';

// Issue #61: incoming listeners are distinct from the qualified upstream transport.
export const toolRoles = {
  'tools/console-server.ts': 'adapter',
  'tools/serve-console.ts': 'composition',
  'tools/preview.mjs': 'adapter',
  'tools/public-api.ts': 'entry',
} as const;

const imports: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  'tools/console-server.ts': {
    'node:https': ['createServer'], 'node:fs/promises': ['readFile'],
    'node:path': ['resolve'], 'node:url': ['fileURLToPath'], 'node:events': ['once'],
    '#perfeng/bff-runs': ['artifactObservation', 'runObservation'], '#perfeng/bff': ['createRunTransport'],
    '#perfeng/bff-session': ['createSession'], '#perfeng/bff-csp': ['renderConsoleHtml'],
  },
  'tools/serve-console.ts': {
    'node:fs/promises': ['readFile'], './console-server.ts': ['startConsole'], '#perfeng/bff': ['createRunTransport'],
  },
  'tools/preview.mjs': {
    'node:http': ['createServer'], 'node:fs/promises': ['readFile'],
    'node:path': ['resolve', 'extname'], '#perfeng/bff-csp': ['renderConsoleHtml'],
  },
  'tools/public-api.ts': { './console-server.ts': ['startConsole'] },
};

/** Named member admission prevents createServer from admitting request/get or a namespace. */
export function toolImportError(file: string, node: ts.Node, specifier: string): string | undefined {
  const members = imports[file]?.[specifier];
  if (!members) return 'Review this exact tool import and its members; file roles grant no platform imports.';
  if (file === 'tools/console-server.ts' && specifier === '#perfeng/bff' &&
      !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly))
    return 'The incoming server consumes the upstream factory through declaration-level import type only.';
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.length && clause.namedBindings.elements.every(member => members.includes((member.propertyName ?? member.name).text))) return;
  }
  if (file === 'tools/public-api.ts' && ts.isExportDeclaration(node) && node.exportClause &&
      ts.isNamedExports(node.exportClause) && node.exportClause.elements.length === 1 &&
      node.exportClause.elements.every(member => members.includes((member.propertyName ?? member.name).text) && member.name.text === 'startConsole')) return;
  return 'Use only reviewed named imports/exports; namespaces, default, lazy and import-type namespace forms grant extra authority.';
}

/** Separate owners retain their existing import/qualification checks, not these server roles. */
export function separateToolOwner(path: string): boolean {
  return path === 'tools/qualification' || path === 'tools/user-guide';
}
export function toolGlobalAllowed(file: string, member: string): boolean {
  return file === 'tools/console-server.ts' && member === 'AbortController';
}

/** The existing listener deadline is not permission to start an arbitrary global timer. */
export function toolListenerTimerAllowed(file: string, node: ts.Node, checker: ts.TypeChecker): boolean {
  if (file !== 'tools/console-server.ts') return false;
  const access = ts.isIdentifier(node) ? node.parent : node;
  const receiver = ts.isPropertyAccessExpression(access) && access.name === node ? access.expression :
    ts.isElementAccessExpression(access) ? access.expression : undefined;
  if (!receiver || !ts.isIdentifier(receiver)) return false;
  const variable = checker.getSymbolAtLocation(receiver)?.declarations?.find(ts.isVariableDeclaration);
  const call = variable?.initializer;
  if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return false;
  const member = checker.getSymbolAtLocation(call.expression)?.declarations?.find(ts.isImportSpecifier);
  const declaration = member?.parent.parent.parent;
  return !!member && (member.propertyName ?? member.name).text === 'createServer' &&
    !!declaration && ts.isImportDeclaration(declaration) && ts.isStringLiteral(declaration.moduleSpecifier) &&
    declaration.moduleSpecifier.text === 'node:https';
}
