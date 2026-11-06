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
    await expect(page.getByRole("status")).toContainText("Backend unavailable");
    await guide.result(page.getByRole("status"), {
      title: "Check availability before acting",
      body: "An unavailable backend is explicit. No previous or sample Run is presented, and Open Run remains disabled.",
    });
    await expect(page.getByRole("button", { name: "Open Run" })).toBeDisabled();
  },
);
test("keyboard skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
