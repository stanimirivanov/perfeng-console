import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw Error("Pass the absolute console checkout directory.");
const consoleRoot = resolve(process.argv[2]);
const root = join(consoleRoot, "vendor/perfeng-contracts");
const validators = await import(pathToFileURL(join(consoleRoot, "src/generated/validators.mjs")).href);
const declared = JSON.parse(readFileSync("expected.json", "utf8"));
const expectedInputs = JSON.parse(readFileSync("inputs.json", "utf8"));
for (const [path, expected] of Object.entries(expectedInputs)) {
  const actual = createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
  assert.equal(actual, expected, "Input drift: " + path);
}
const load = path => JSON.parse(readFileSync(join(root, path), "utf8"));
const capabilities = load("api/native-worker/v2/examples/presence.json").capabilities;
const lease = load("api/native-worker/v2/examples/lease.json");
const extra = [
  { name: "WorkerCapabilities complete", schema: "WorkerCapabilities", input: capabilities, expected: true },
  {
    name: "WorkerCapabilities duplicate artifactKinds",
    schema: "WorkerCapabilities",
    input: { ...capabilities, artifactKinds: ["measurements", "measurements"] },
    expected: false,
  },
  { name: "Lease complete positional artifactPlan", schema: "Lease", input: lease, expected: true },
  {
    name: "Lease reversed positional artifactPlan",
    schema: "Lease",
    input: { ...lease, artifactPlan: [...lease.artifactPlan].reverse() },
    expected: false,
  },
];
// Contract-derived expectations are recorded before invoking any validator.
const cases = [...declared.cases, ...extra];
writeFileSync("oracle-expectations.json", JSON.stringify({ cases }, null, 2) + "\n");
const results = cases.map(item => {
  const before = JSON.stringify(item.input);
  const actual = validators["native_" + item.schema](item.input);
  assert.equal(actual, item.expected, item.name);
  assert.equal(JSON.stringify(item.input), before, item.name + " mutated input");
  return { ...item, actual, expectationMatches: true, inputMutated: false };
});
writeFileSync("oracle-results.json", JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results.map(({ name, actual }) => ({ name, actual })), null, 2));
