import { defineConfig } from "vitest/config";
// https://vitest.dev/guide/reporters#json-reporter
export default defineConfig({
  test: {
    retry: 0,
    allowOnly: false,
    reporters: ["default", ["json", { outputFile: "dist/angular-tests.json" }]],
  },
});
