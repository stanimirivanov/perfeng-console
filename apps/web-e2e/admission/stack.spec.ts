import { test, expect } from "@playwright/test";
test("admitted packages compile and the Material overlay preserves keyboard behavior under CSP", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (/violates.*Content Security Policy/.test(message.text())) errors.push(message.text());
  });
  const external: string[] = [];
  page.on("request", request => {
    if (!request.url().startsWith("http://127.0.0.1:4300/")) external.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Admission fixture only" })).toBeVisible();
  await expect(page.getByText("Effect compiled")).toBeVisible();
  const opener = page.getByRole("button", { name: "Open dialog" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
