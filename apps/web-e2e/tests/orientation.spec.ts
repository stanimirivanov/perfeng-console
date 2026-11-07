import { test, expect } from "../user-guide/fixture";
test(
  "Open the console and recognize an unconfigured platform",
  { tag: "@user-guide" },
  async ({ page, guide }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Perfeng Console" }),
    ).toBeVisible();
    await guide.result(page.getByRole("main"), {
      title: "Recognize the console",
      body: "Start in Perfeng Console. This shell has no platform connection; it cannot show CI evidence yet.",
    });
    await expect(page.getByRole("status")).toContainText("Ready for exact Run lookup");
    await guide.result(page.getByRole("status"), {
      title: "Look up an exact Run",
      body: "Enter a known Run ID. The console displays evidence only after a successful lookup.",
    });
    await expect(page.getByLabel("Run ID")).toBeVisible();
  },
);
test("keyboard skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByRole("main")).toBeFocused();
});
