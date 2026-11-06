import { test, expect } from "@playwright/test";
test("Scenario Lab starts independently", async ({ page }) => {
  await page.goto("http://127.0.0.1:4301");
  await expect(
    page.getByRole("heading", { name: "Scenario Lab" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start campaign" }),
  ).toBeDisabled();
});
