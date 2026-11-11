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
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(readFileSync(join(root, 'tsconfig.paths.json'), 'utf8'));
  const expected = Object.fromEntries(Object.entries(publicImports).map(([name, file]) => [name, file.endsWith('.mjs')
    ? { types: './' + file.replace(/\.mjs$/, '.d.mts'), default: './' + file } : './' + file]));
  const paths = Object.fromEntries(Object.entries(publicImports).filter(([, file]) => !file.endsWith('.mjs')).map(([name, file]) => [name, ['./' + file]]));
  const same = (actual: unknown, wanted: Record<string, unknown>) => actual && typeof actual === 'object' &&
    Object.keys(actual).length === Object.keys(wanted).length &&
    Object.entries(wanted).every(([key, value]) => JSON.stringify((actual as Record<string, unknown>)[key]) === JSON.stringify(value));
  const configs: Record<string, string> = {
    'tsconfig.json': './tsconfig.paths.json', 'tsconfig.base.json': './tsconfig.paths.json',
    'apps/console/tsconfig.app.json': '../../tsconfig.base.json',
    'apps/console/tsconfig.spec.json': '../../tsconfig.base.json',
    'apps/web-e2e/tsconfig.json': '../../tsconfig.base.json',
  };
  const inherited = !checkConsumers || Object.entries(configs).every(([file, parent]) => {
    const consumer = JSON.parse(readFileSync(join(root, file), 'utf8'));
    return consumer.extends === parent && !consumer.compilerOptions?.paths && !consumer.compilerOptions?.baseUrl;
  });
  const central = !Object.hasOwn(config, 'extends') && !Object.hasOwn(config.compilerOptions ?? {}, 'baseUrl');
  return central && inherited && same(pkg.imports, expected) && same(config.compilerOptions?.paths, paths) ? [] :
    ['[imports] Keep Node imports and TypeScript paths aligned with the reviewed public surfaces.'];
}
