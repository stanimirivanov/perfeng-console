import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  retries: 0,
  workers: 1,
  forbidOnly: true,
  use: {
    baseURL: "http://127.0.0.1:4300",
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block",
  },
  reporter: [["./accounting.ts"], ["list"], ["./user-guide/reporter.ts"]],
  webServer: [
    {
      cwd: new URL("../..", import.meta.url).pathname,
      command: "node tools/preview.mjs",
      url: "http://127.0.0.1:4300",
      reuseExistingServer: false,
    },
  ],
});
