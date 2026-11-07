import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { inspectImports } from './boundaries.ts';

const serverBuiltins = new Set(['node:crypto', 'node:events', 'node:fs/promises', 'node:https', 'node:path', 'node:url']);

const serverSources = new Set([
  'tools/serve-console.ts',
  'tools/console-server.ts',
  'src/bff/csp.ts',
  'src/bff/session.ts',
]);

/** Bundle the reviewed server entry and enforce its complete runtime closure. */
export async function bundleServer(root: string) {
  const bundle = await build({
    absWorkingDir: root, entryPoints: ['tools/serve-console.ts'], bundle: true,
    format: 'esm', platform: 'node', target: 'node26', metafile: true, write: false,
  });
  for (const file of Object.keys(bundle.metafile.inputs)) {
    if (!serverSources.has(file)) throw new Error('Forbidden product input: ' + file);
    const source = ts.createSourceFile(file, readFileSync(join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    inspectImports(source, (_node, specifier) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) throw new Error('Computed product import: ' + file);
      const name = specifier.text;
      if (serverBuiltins.has(name)) return;
      const target = name.startsWith('.') ? relative(root, resolve(root, dirname(file), name)) : name;
      if (!serverSources.has(target)) throw new Error('Forbidden product input: ' + target);
    }, (_node, _rule, reason) => { throw new Error(file + ': ' + reason); });
  }
  for (const output of Object.values(bundle.metafile.outputs)) {
    for (const dependency of output.imports) {
      if (!dependency.external || !serverBuiltins.has(dependency.path)) throw new Error('Unbundled product dependency: ' + dependency.path);
    }
  }
  return bundle.outputFiles[0]!.text;
}
