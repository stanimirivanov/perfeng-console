import { diagnostic } from './diagnostics.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const publicImports: Readonly<Record<string, string>> = {
  "#perfeng/run-transitions": "src/generated/transitions.ts",
  "#perfeng/run-types": "src/generated/run.ts",
  "#perfeng/harness/imports": "harness/imports.ts",
  "#perfeng/harness/project-imports": "harness/project-imports.ts",
  "#perfeng/harness/import-lint": "harness/import-lint.mjs",

  "#perfeng/contracts": "src/shared/contracts/public-api.ts",
  "#perfeng/bff": "src/bff/public-api.ts",
  "#perfeng/bff-config": "src/bff/config-public-api.ts",
  "#perfeng/bff-session": "src/bff/session.ts",
  "#perfeng/bff-csp": "src/bff/csp.ts",
  "#perfeng/bff-runs": "src/bff/runs.ts",
  "#perfeng/validators": "src/generated/validators.mjs",
  "#perfeng/server": "tools/public-api.ts",
  "#perfeng/user-guide": "tools/user-guide/public-api.mjs",
  "#perfeng/e2e": "apps/web-e2e/public-api.ts",
  "#perfeng/harness/boundaries": "harness/boundaries.ts",
  "#perfeng/harness/workspace": "harness/workspace.ts",
  "#perfeng/harness/ownership": "harness/ownership.ts",
  "#perfeng/harness/assets": "harness/assets.ts",
  "#perfeng/harness/product-release": "harness/product-release.ts",
  "#perfeng/tooling/angular-accounting": "scripts/angular-accounting.ts",
  "#perfeng/tooling/generated-output": "scripts/generated-output.ts",
  "#perfeng/tooling/contracts": "scripts/contracts.ts"
};

/** Require compiler and native Node aliases to name exactly the reviewed surfaces. */
export function checkImportMaps(root: string, checkConsumers = true): string[] {
  const errors: string[] = [];
  const report = (file: string, reason: string) => errors.push(diagnostic(file, 1, 'imports', reason, 'imports'));
  const readConfig = (file: string) => {
    try {
      const value = JSON.parse(readFileSync(join(root, file), 'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected config object');
      return value;
    } catch {
      report(file, 'Read a valid JSON config object; inspect the file locally without logging its contents.');
      return undefined;
    }
  };
  const pkg = readConfig('package.json');
  const config = readConfig('tsconfig.paths.json');
  if (!pkg || !config) return errors;
  const expected = Object.fromEntries(Object.entries(publicImports).map(([name, file]) => [name, file.endsWith('.mjs')
    ? { types: './' + file.replace(/\.mjs$/, '.d.mts'), default: './' + file } : './' + file]));
  const paths = Object.fromEntries(Object.entries(publicImports).filter(([, file]) => !file.endsWith('.mjs')).map(([name, file]) => [name, ['./' + file]]));
  const same = (actual: unknown, wanted: Record<string, unknown>) => actual && typeof actual === 'object' &&
    Object.keys(actual).length === Object.keys(wanted).length &&
    Object.entries(wanted).every(([key, value]) => JSON.stringify((actual as Record<string, unknown>)[key]) === JSON.stringify(value));
  const configs: Record<string, string> = {
    'tsconfig.json': './tsconfig.paths.json', 'tsconfig.base.json': './tsconfig.paths.json',
    'tools/tsconfig.json': '../tsconfig.json',
    'apps/console/tsconfig.app.json': '../../tsconfig.base.json',
    'apps/console/tsconfig.spec.json': '../../tsconfig.base.json',
    'apps/web-e2e/tsconfig.json': '../../tsconfig.base.json',
  };
  if (checkConsumers) for (const [file, parent] of Object.entries(configs)) {
    const consumer = readConfig(file);
    if (!consumer) continue;
    if (consumer.extends !== parent || Object.hasOwn(consumer.compilerOptions ?? {}, 'paths') ||
        Object.hasOwn(consumer.compilerOptions ?? {}, 'baseUrl'))
      report(file, 'Inherit ' + parent + ' without local paths/baseUrl overrides.');
  }
  if (Object.hasOwn(config, 'extends') || Object.hasOwn(config.compilerOptions ?? {}, 'baseUrl'))
    report('tsconfig.paths.json', 'The central paths config cannot set extends or baseUrl.');
  if (!same(pkg.imports, expected)) report('package.json', 'Node imports differ from the reviewed public surfaces.');
  if (!same(config.compilerOptions?.paths, paths)) report('tsconfig.paths.json', 'TypeScript paths differ from the reviewed public surfaces.');
  return errors;
}

/** Compare the one human-reviewed table, not every incidental alias mention in prose. */
export function checkAliasDocumentation(root: string): string[] {
  const file = 'docs/IMPORTS.md';
  let text: string;
  try { text = readFileSync(join(root, file), 'utf8'); }
  catch { return [diagnostic(file, 1, 'alias-document', 'Cannot read the reviewed alias table.', 'imports')]; }
  const lines = text.split(/\r?\n/u);
  const headers = lines.flatMap((line, index) => /^\|\s*Alias\s*\|\s*Target\s*\|\s*$/u.test(line) ? [index] : []);
  const errors: string[] = [];
  const report = (line: number, reason: string) => errors.push(diagnostic(file, line, 'alias-document', reason, 'imports'));
  if (headers.length !== 1) { report(1, 'Require exactly one reviewed Alias/Target table.'); return errors; }
  const header = headers[0]!;
  if (!/^\|\s*-+\s*\|\s*-+\s*\|\s*$/u.test(lines[header + 1] ?? '')) report(header + 2, 'Malformed alias table separator.');
  const seen = new Set<string>();
  for (let index = header + 2; (lines[index] ?? '').startsWith('|'); index++) {
    const row = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`(?:\s*\([^|]*\))?\s*\|\s*$/u.exec(lines[index]!);
    if (!row) { report(index + 1, 'Malformed alias row; use two code-formatted Alias/Target cells.'); continue; }
    const alias = row[1]!, target = row[2]!;
    if (seen.has(alias)) report(index + 1, 'Duplicate alias row.');
    seen.add(alias);
    if (!Object.hasOwn(publicImports, alias) || target !== './' + publicImports[alias])
      report(index + 1, 'Alias target differs from the reviewed public surface inventory.');
  }
  if (Object.keys(publicImports).some(alias => !seen.has(alias))) report(header + 1, 'The reviewed alias inventory is incomplete.');
  return errors;
}
