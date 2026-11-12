import { diagnostic } from './diagnostics.ts';
import { readFileSync, readdirSync, lstatSync, openSync, readSync, closeSync, fstatSync, constants } from "node:fs";
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

const literalMarkers = ['PERFENG_SECRET_CANARY', 'BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY',
  'BEGIN EC PRIVATE KEY', 'BEGIN OPENSSH PRIVATE KEY', 'Design fixture only', 'node:child_process'];
const tokenSuffixMinimum = 30;
const tokenMarker = new RegExp('gh[pousr]_[A-Za-z0-9]{' + tokenSuffixMinimum + ',}');
// Recognition needs a prefix plus 30 token characters, not the entire unbounded token.
// Double the longest required window for UTF-16, retaining all but one byte across reads.
const overlapBytes = 2 * Math.max(4 + tokenSuffixMinimum, ...literalMarkers.map(value => value.length)) - 1;
const marked = (text: string) => literalMarkers.some(marker => text.includes(marker)) || tokenMarker.test(text);

function containsMarker(bytes: Buffer): boolean {
  if (marked(bytes.toString('latin1'))) return true;
  // Binary payloads need no BOM; a UTF-16 string can start at either byte alignment.
  for (const offset of [0, 1]) {
    const length = Math.floor((bytes.length - offset) / 2) * 2;
    if (length <= 0) continue;
    const aligned = bytes.subarray(offset, offset + length);
    if (marked(aligned.toString('utf16le')) || marked(Buffer.from(aligned).swap16().toString('utf16le'))) return true;
  }
  return false;
}

const distributionError = (path: string, reason: string) => Error(diagnostic(path, 1, 'distribution', reason, 'distribution'));
function scanDistributionFile(path: string) {
  // Do not follow a replaced file symlink or block opening a substituted FIFO.
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!fstatSync(fd).isFile()) throw distributionError(path, 'Distribution entries must be a regular file or directory.');
    const chunk = Buffer.alloc(64 * 1024);
    let tail = Buffer.alloc(0);
    for (;;) {
      const count = readSync(fd, chunk, 0, chunk.length, null);
      if (!count) break;
      const window = Buffer.concat([tail, chunk.subarray(0, count)]);
      if (containsMarker(window)) throw distributionError(path, 'Forbidden secret, fixture or execution marker.');
      tail = window.subarray(Math.max(0, window.length - overlapBytes));
    }
  } finally { closeSync(fd); }
}

export function checkDistribution(root: string) {
  const info = lstatSync(root);
  if (info.isSymbolicLink()) throw distributionError(root, 'Distribution symlinks forbidden.');
  if (!info.isDirectory()) throw distributionError(root, 'Distribution root must be a directory.');
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    const child = lstatSync(path);
    if (child.isSymbolicLink()) throw distributionError(path, 'Distribution symlinks forbidden.');
    if (child.isDirectory()) checkDistribution(path);
    else if (child.isFile()) scanDistributionFile(path);
    else throw distributionError(path, 'Distribution entries must be a regular file or directory.');
  }
}
if (process.argv[1]?.endsWith("assets.ts")) {
  checkAssets(".");
  if (process.argv.includes("--distribution")) checkDistribution("dist/apps/console/browser");
}
