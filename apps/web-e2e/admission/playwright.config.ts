import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "stack.spec.ts", forbidOnly: true, retries: 0, workers: 1,
  use: { baseURL: "http://127.0.0.1:4300" },
  webServer: {
    cwd: new URL("../../..", import.meta.url).pathname,
    command: "node tools/preview.mjs",
    env: { PERFENG_ADMISSION: "1" },
    url: "http://127.0.0.1:4300", reuseExistingServer: false,
  },
});
