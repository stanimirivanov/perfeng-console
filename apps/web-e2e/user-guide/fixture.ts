import { test as base, expect, type Locator } from "@playwright/test";
import type { GuideNarrator, GuideStepDefinition } from "./guide-narrator";
export const test = base.extend<{ guide: GuideNarrator }>({
  guide: async ({ page }, use, info) => {
    let step = 0,
      errors = 0;
    page.on("pageerror", () => {
      errors++;
    });
    await page.context().route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        url.origin !== "http://127.0.0.1:4300" ||
        route.request().method() !== "GET" ||
        /^\/(api|console\/api|v1|integration|native-worker)(\/|$)/u.test(
          url.pathname,
        )
      )
        return route.abort();
      return route.continue();
    });
    await page.context().routeWebSocket("**/*", (socket) => socket.close());
    const record = async (target: Locator, definition: GuideStepDefinition) => {
      if (
        process.env.PERFENG_GUIDE !== "1" ||
        !info.tags.includes("@user-guide")
      )
        return;
      await expect(target).toBeVisible();
      await info.attach("guide-step", {
        body: JSON.stringify(definition),
        contentType: "application/json",
      });
      await info.attach("guide-image", {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
      step++;
    };
    await use({
      action: async (target, definition, perform) => {
        await record(target, definition);
        await perform();
      },
      result: record,
    });
    expect(errors).toBe(0);
    if (process.env.PERFENG_GUIDE === "1" && info.tags.includes("@user-guide"))
      expect(step).toBeGreaterThan(0);
  },
});
export { expect };
