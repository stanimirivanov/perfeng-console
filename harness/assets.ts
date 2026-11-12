import { diagnostic } from './diagnostics.ts';
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function checkStyles(source: string): string[] {
  const errors: string[] = [];
  const remaining = source.replace('@use "@angular/material" as mat;', "");
  if (/@(?:use|forward|import)|url\s*\(/i.test(remaining))
    errors.push("Only the reviewed local Material Sass input is admitted.");
  return errors;
}

export function checkAssets(root: string) {
  const config = JSON.parse(readFileSync(join(root, "angular.json"), "utf8"));
  const project = config.projects.console;
  const options = project.architect.build.options;
  if (Object.keys(config.projects).join() !== "console" ||
      options.outputPath !== "dist/apps/console" ||
      options.tsConfig !== "apps/console/tsconfig.app.json" ||
      options.browser !== "apps/console/src/main.ts" ||
      options.index !== "apps/console/src/index.html" ||
      JSON.stringify(options.styles) !== '["apps/console/src/styles.scss"]' ||
      options.assets || options.scripts ||
      Object.values(project.architect.build.configurations).some(value => {
        const settings = value as Record<string, unknown>;
        return ["assets", "styles", "scripts", "browser", "index"].some(key => key in settings);
      }))
    throw Error(diagnostic('angular.json', 1, 'asset', 'Review browser build inputs before extending the asset boundary.'));
  const index = readFileSync(join(root, options.index), "utf8");
  if (/<(?:script|link|style)\b/i.test(index))
    throw Error(diagnostic(options.index, 1, 'asset', 'Browser index cannot bypass reviewed script/style inputs.'));
  const errors = checkStyles(readFileSync(join(root, options.styles[0]), "utf8"));
  if (errors.length) throw Error(errors.map(reason => diagnostic(options.styles[0], 1, 'asset', reason)).join('\n'));
}

export function checkDistribution(root: string) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw Error(diagnostic(path, 1, 'distribution', 'Distribution symlinks forbidden.', 'distribution'));
    if (entry.isDirectory()) checkDistribution(path);
    else {
      const bytes = readFileSync(path, "utf8");
      if (/PERFENG_SECRET_CANARY|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{30,}|Design fixture only|node:child_process/.test(bytes))
        throw Error(diagnostic(path, 1, 'distribution', 'Forbidden secret, fixture or execution marker.', 'distribution'));
    }
  }
}
if (process.argv[1]?.endsWith("assets.ts")) {
  checkAssets(".");
  if (process.argv.includes("--distribution")) checkDistribution("dist/apps/console/browser");
}
