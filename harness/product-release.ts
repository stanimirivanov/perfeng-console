import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { inspectImports } from './boundaries.ts';
import { publicImports, checkImportMaps } from './imports.ts';

const serverBuiltins = new Set(['node:crypto', 'node:events', 'node:fs/promises', 'node:https', 'node:path', 'node:url']);

const bundledBuiltins = new Set([...serverBuiltins, 'node:buffer', 'node:tls', 'node:stream', 'node:fs', 'node:module']);
const runtimePackages = new Set(['effect', 'effect/http/HttpClient', '@effect/platform-node/NodeHttpClient', '@effect/platform-node/NodeHttpIncomingMessage']);
const lockedRuntimeDirectories = new Set([
  'effect@4.1.2', '@effect+platform-node@4.1.2_effect@4.1.2_redis@6.3.1',
  '@effect+platform-node-shared@4.1.2_effect@4.1.2', 'undici@8.12.4',
]);

const serverSources = new Set([
  'tools/serve-console.ts',
  'tools/console-server.ts',
  'src/bff/public-api.ts',
  'src/bff/config-public-api.ts',
  'tools/public-api.ts',
  'src/shared/contracts/public-api.ts',
  'src/bff/csp.ts',
  'src/bff/session.ts',
  'src/bff/config.ts',
  'src/bff/transport.ts',
  'src/bff/transport-result.ts',
  'src/bff/run-reader.ts',
  'src/bff/runs.ts',
  'src/generated/run.ts',
  'src/generated/validators.mjs',
  'src/shared/contracts/observation.ts',
]);

/** Bundle the reviewed server entry and enforce its complete runtime closure. */
export async function bundleServer(root: string) {
  // Standalone packaging excludes verifier configs; validate its actual shared maps.
  const aliasErrors = checkImportMaps(root, false);
  if (aliasErrors.length) throw new Error(aliasErrors.join('\n'));
  const bundle = await build({
    absWorkingDir: root, entryPoints: ['tools/serve-console.ts'], bundle: true,
    format: 'esm', platform: 'node', target: 'node26', metafile: true, write: false,
  });
  for (const file of Object.keys(bundle.metafile.inputs)) {
    const dependency = /^node_modules\/\.pnpm\/([^/]+)\//.exec(file)?.[1];
    if (dependency && lockedRuntimeDirectories.has(dependency)) continue;
    if (!serverSources.has(file)) throw new Error('Forbidden product input: ' + file);
    const source = ts.createSourceFile(file, readFileSync(join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    inspectImports(source, (node, specifier) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) throw new Error('Computed product import: ' + file);
      const name = specifier.text;
      if (serverBuiltins.has(name) || (file === 'src/bff/config.ts' && name === 'node:fs') || (file.startsWith('src/bff/') && runtimePackages.has(name))) return;
      const target = publicImports[name] ?? (name.startsWith('.') ? relative(root, resolve(root, dirname(file), name)) : name);
      if (target.startsWith('src/shared/contracts/') &&
          !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true) &&
          !(file.startsWith('src/shared/contracts/') && ts.isExportDeclaration(node) && node.isTypeOnly))
        throw new Error('Type-only product contract: ' + target);
      if (!serverSources.has(target)) throw new Error('Forbidden product input: ' + target);
    }, (_node, _rule, reason) => { throw new Error(file + ': ' + reason); });
  }
  for (const output of Object.values(bundle.metafile.outputs)) {
    for (const dependency of output.imports) {
      if (!dependency.external || !bundledBuiltins.has(dependency.path)) throw new Error('Unbundled product dependency: ' + dependency.path);
    }
  }
  return bundle.outputFiles[0]!.text;
}
