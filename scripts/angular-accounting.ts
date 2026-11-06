import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export function checkAngularResult(value: unknown) {
  const receipt = value as Record<string, unknown>;
  if (!receipt || receipt.success !== true ||
      typeof receipt.numTotalTests !== "number" || receipt.numTotalTests < 1 ||
      receipt.numPassedTests !== receipt.numTotalTests ||
      receipt.numPendingTests !== 0 || receipt.numTodoTests !== 0 ||
      receipt.numFailedTests !== 0)
    throw Error("Angular accounting requires a nonempty run with every test passed.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  checkAngularResult(JSON.parse(readFileSync("dist/angular-tests.json", "utf8")));
