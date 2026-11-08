import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { checkStyles } from './assets.ts';
import { inspectImports } from './boundaries.ts';
import { publicImports } from './imports.ts';

// These roots also define dependency-cruiser's cross-owner cycle rules.
export const ownerPatterns = [
  '^apps/console/', '^apps/web-e2e/',
  ...['bff', 'browser', 'generated', 'presentation', 'shared', 'scenarios', 'simulator'].map(name => '^src/' + name + '/'),
  ...['effect-node', 'effect-codegen', 'effect-runtime', 'orval-fetch'].map(name => '^tools/qualification/' + name + '/'),
  '^tools/qualification/(?!effect-node/|effect-codegen/|effect-runtime/|orval-fetch/)',
  '^tools/user-guide/', '^tools/(?!qualification/|user-guide/)', '^harness/', '^scripts/', '^tests/',
];
export const owner = (file: string) => ownerPatterns.find(pattern => new RegExp(pattern).test(file)) ?? dirname(file);
const qualifier = /^tools\/qualification\/(effect-node|effect-codegen|effect-runtime|orval-fetch)\//;
const qualificationEntries = new Set(['src/bff/config-public-api.ts', 'tools/qualification/public-api.ts', 'tools/qualification/public-api.mjs']);

/** Check resolved ownership rather than path depth; imported authority remains separately gated. */
export function inspectProjectImports(root: string, file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const importer = relative(root, file);
  const errors: string[] = [];
  const report = (node: ts.Node, reason: string) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    errors.push(`${importer}:${line} ${reason} See docs/IMPORTS.md.`);
  };
  inspectImports(source, (node, literal) => {
    if (!literal || !ts.isStringLiteralLike(literal)) {
      const oracle = importer === 'tools/qualification/effect-codegen/oracle.mjs' &&
        createHash('sha256').update(text).digest('hex') === 'caacbad61a8819666ece8c2a36e65e6472dd75e31797d34815de8c2b08c16d34' &&
        literal?.getText(source) === 'pathToFileURL(join(consoleRoot, "src/generated/validators.mjs")).href';
      if (!oracle) report(node, 'Use literal imports.');
      return;
    }
    const spec = literal.text;
    if (spec.startsWith('#')) {
      if (!Object.hasOwn(publicImports, spec)) report(node, 'Use an exact reviewed public alias.');
      return;
    }
    if (/[\\%?#]/u.test(spec)) { report(node, 'Use a canonical module specifier without encoding, query or fragment.'); return; }
    if (!spec.startsWith('.')) return;
    const target = relative(root, resolve(dirname(file), spec));
    if (owner(importer) === owner(target)) return;
    if (qualifier.test(importer) && qualificationEntries.has(target)) return;
    report(node, `Relative import crosses ownership from ${owner(importer)} to ${owner(target)}; use a public alias.`);
  }, (node, _rule, reason) => report(node, reason));
  return errors;
}

export function scanProjectImports(root: string): string[] {
  const errors: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const file = join(dir, name);
      const info = lstatSync(file);
      if (info.isSymbolicLink()) { errors.push(`${relative(root, file)}:1 Source symlink forbidden. See docs/IMPORTS.md.`); continue; }
      if (info.isDirectory()) walk(file);
      else if (/\.(css|scss)$/.test(file)) {
        const source = readFileSync(file, 'utf8');
        const styleErrors = relative(root, file) === 'apps/console/src/styles.scss' ? checkStyles(source) :
          (/@(?:import|use|forward)|url\s*\(/i.test(source) ? ['Stylesheet dependencies require explicit asset admission.'] : []);
        errors.push(...styleErrors.map(error => `${relative(root, file)}:1 ${error} See docs/IMPORTS.md.`));
      }
      else if (/\.[cm]?[jt]sx?$/.test(file)) errors.push(...inspectProjectImports(root, file, readFileSync(file, 'utf8')));
    }
  };
  for (const name of ['apps', 'src', 'tools', 'tests', 'harness', 'scripts']) walk(join(root, name));
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = scanProjectImports(process.cwd());
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
}

export interface DependencyModule {
  source: string;
  dependencies: readonly { resolved: string; coreModule?: boolean; couldNotResolve?: boolean; matchesDoNotFollow?: boolean }[];
}

/** Collapse dependency-cruiser's resolved edges to owners before detecting cycles. */
export function checkOwnerCycles(modules: readonly DependencyModule[]): string[] {
  const graph = new Map<string, Set<string>>();
  for (const module of modules) {
    const from = owner(module.source);
    for (const dependency of module.dependencies) {
      if (dependency.coreModule || dependency.couldNotResolve || dependency.matchesDoNotFollow) continue;
      const to = owner(dependency.resolved);
      if (from === to) continue;
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from)!.add(to);
    }
  }
  const errors: string[] = [];
  const visited = new Set<string>();
  const active: string[] = [];
  const visit = (node: string) => {
    const index = active.indexOf(node);
    if (index >= 0) { errors.push(`[owner-cycle] ${[...active.slice(index), node].join(' -> ')}. See docs/IMPORTS.md.`); return; }
    if (visited.has(node)) return;
    visited.add(node);
    active.push(node);
    for (const target of graph.get(node) ?? []) visit(target);
    active.pop();
  };
  for (const node of graph.keys()) visit(node);
  return errors;
}
