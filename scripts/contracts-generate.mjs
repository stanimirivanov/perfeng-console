import { readFileSync, writeFileSync } from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standalone from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { verifySnapshot } from "./contracts.ts";

const files = verifySnapshot("vendor/perfeng-contracts");
const apis = {
  run: "openapi.json",
  native: "api/native-worker/v2/openapi.json",
  integration: "api/performance-integration/v1/openapi.json",
};
const output = new Map();
const transitions = files.get("transitions.json");
const states = files.get("openapi.json").components.schemas.RunState.enum;
if (JSON.stringify(Object.keys(transitions).sort()) !== JSON.stringify([...states].sort()) ||
    Object.values(transitions).some(edges => edges.some(state => !states.includes(state))))
  throw Error("Transition graph disagrees with RunState enum.");
output.set("transitions.ts", "export const transitions = " + JSON.stringify(transitions, null, 2) + " as const;\n");
const ajv = new Ajv2020({
  strict: false, inlineRefs: false, allErrors: true, validateFormats: true,
  code: { source: true, esm: true }, removeAdditional: false, useDefaults: false, coerceTypes: false,
});
addFormats(ajv);
const exports = {};
// Official standalone API: https://ajv.js.org/standalone.html
for (const [family, path] of Object.entries(apis)) {
  const doc = files.get(path);
  // openapi-typescript drops sibling $defs when a component is a reference.
  // Expand only that component root in the generator input, preserving source bytes.
  const typed = structuredClone(doc);
  for (const schema of Object.values(typed.components.schemas)) {
    if (schema.$ref && schema.$defs) {
      const target = schema.$ref.split("/").slice(1).reduce((value, key) => value[key], typed);
      delete schema.$ref;
      Object.assign(schema, structuredClone(target));
    }
  }
  output.set(family + ".ts", astToString(await openapiTS(typed)));
  const id = "urn:perfeng:" + family;
  ajv.addSchema({ components: doc.components }, id);
  for (const name of Object.keys(doc.components.schemas))
    exports[family + "_" + name] = id + "#/components/schemas/" + name;
}
for (const [path, doc] of files) {
  if (path.endsWith(".schema.json")) {
    ajv.addSchema(doc, path);
    exports[path.split("/")[1].replaceAll("-", "_")] = path;
  }
}
const code = standalone(ajv, exports);
const bundled = await build({
  stdin: { contents: code, resolveDir: process.cwd(), sourcefile: "validators.js" },
  bundle: true, write: false, minifyWhitespace: true, minifyIdentifiers: true, platform: "browser", format: "esm", legalComments: "inline",
});
output.set("validators.mjs", bundled.outputFiles[0].text);
output.set("validators.d.mts", Object.keys(exports).map(name =>
  "export const " + name + ": (data: unknown) => boolean;").join("\n") + "\n");
for (const [name, content] of output) {
  const path = "src/generated/" + name;
  if (process.argv.includes("--write")) writeFileSync(path, content);
  else if (readFileSync(path, "utf8") !== content) throw Error("Generated drift " + path);
}
