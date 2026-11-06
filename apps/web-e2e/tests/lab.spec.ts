import { test, expect } from "@playwright/test";

const access = "**/console/api/verification/access";

test("maintainer opens themed Verification with the runner absent and returns to Console", async ({ page }) => {
  await page.route(access, route => route.fulfill({ status: 204 }));
  await page.goto("/");
  await page.getByRole("link", { name: "Verification" }).click();
  const lab = page.locator(".verification-area");
  await expect(lab.getByText("Verification · Maintainer area")).toBeVisible();
  await expect(lab.getByRole("status")).toContainText("Runner unavailable");
  await expect(lab.getByRole("button", { name: "Start campaign" })).toBeDisabled();
  const color = await lab.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
  await lab.getByRole("link", { name: "Return to Console" }).click();
  await expect(page.getByRole("heading", { name: "Perfeng Console" })).toBeVisible();
  await expect(lab).toHaveCount(0);
  await page.goBack();
  await expect(lab).toBeVisible();
});

for (const status of [403, 404, 503]) {
  test("verification deep link fails closed on " + status, async ({ page }) => {
    await page.route(access, route => route.fulfill({ status }));
    await page.goto("/verification");
    await expect(page.getByRole("heading", { name: "Perfeng Console" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Verification" })).toHaveCount(0);
  });
}

test("direct authorized entry is rechecked after permission withdrawal", async ({ page }) => {
  let granted = true;
  await page.route(access, route => route.fulfill({ status: granted ? 204 : 403 }));
  await page.goto("/verification");
  await expect(page.getByRole("heading", { name: "Scenario Lab" })).toBeVisible();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/verification#main$/);
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: "Return to Console" }).click();
  granted = false;
  await page.getByRole("link", { name: "Verification" }).click();
  await expect(page.getByRole("link", { name: "Verification" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Perfeng Console" })).toBeVisible();
});

test("malformed preview path does not interrupt subsequent requests", async ({ request }) => {
  expect((await request.get("/%zz")).status()).toBe(400);
  expect((await request.get("/verification")).status()).toBe(200);
});
