import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Effect } from "effect";
import * as Generator from "@effect/openapi-generator/OpenApiGenerator";

if (!process.argv[2]) throw Error("Pass the absolute vendored contract directory.");
const root = resolve(process.argv[2]);
const expectedInputs = JSON.parse(readFileSync("inputs.json", "utf8"));
const paths = {
  run: "openapi.json",
  native: "api/native-worker/v2/openapi.json",
  integration: "api/performance-integration/v1/openapi.json",
};
const generator = await Effect.runPromise(Generator.make);
const results = [];

for (const [family, path] of Object.entries(paths)) {
  const bytes = readFileSync(root + "/" + path);
  const inputSha256 = createHash("sha256").update(bytes).digest("hex");
  if (inputSha256 !== expectedInputs[path]) throw Error("Input drift: " + path);
  const spec = JSON.parse(bytes);

  for (const format of ["httpclient", "httpclient-type-only", "httpapi"]) {
    const warnings = [];
    const record = { family, format, inputSha256, warnings };
    try {
      const output = await Effect.runPromise(generator.generate(spec, {
        name: family,
        format,
        includeSchemas: Object.keys(spec.components.schemas),
        onWarning: warning => warnings.push(warning),
      }));
      writeFileSync(family + "-" + format + ".ts", output);
      record.bytes = Buffer.byteLength(output);
      record.lines = output.split("\n").length;
      record.status = "generated";
    } catch (error) {
      record.status = "failed";
      record.error = String(error);
    }
    results.push(record);
  }
}

writeFileSync("generation.json", JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
if (results.some(record => record.status !== "generated")) process.exitCode = 1;
