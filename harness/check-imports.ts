import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkImportMaps } from './imports.ts';
import { scanProjectImports, checkOwnerCycles, type DependencyModule } from './project-imports.ts';

const root = process.cwd();
const aliasErrors = checkImportMaps(root);
if (aliasErrors.length) {
  console.error(aliasErrors.join('\n'));
  process.exitCode = 1;
} else {
  const errors = scanProjectImports(root);
  if (!errors.length) {
    const result: { modules: DependencyModule[]; summary: { error: number; violations: { rule: { name: string } }[] } } = JSON.parse(execFileSync(
      process.execPath, [resolve('node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'),
        '--config', '.dependency-cruiser.mjs', '--output-type', 'json', '--no-ignore-known', '--no-cache',
        'apps', 'src', 'tools', 'tests', 'harness', 'scripts'],
      { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    ));
    // JSON reporting has no failure exit code: explicitly enforce its error count.
    if (!Array.isArray(result.modules) || !Number.isInteger(result.summary?.error))
      throw new Error('Invalid dependency-cruiser receipt');
    if (result.summary.error > 0) errors.push('[dependency-graph] ' + JSON.stringify(result.summary.violations));
    errors.push(...checkOwnerCycles(result.modules));
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Verified alias parity, import ownership, module and owner cycles.');
}
