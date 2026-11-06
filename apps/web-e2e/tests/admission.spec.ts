import { test, expect } from "@playwright/test";

test("production browser passes the strict style CSP admission gate", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", message => {
    if (/violates.*Content Security Policy|Refused to apply inline style/i.test(message.text()))
      violations.push(message.text());
  });
  await page.route("**/console/api/verification/access", route => route.fulfill({ status: 204 }));
  await page.goto("/verification");
  await expect(page.getByRole("heading", { name: "Scenario Lab" })).toBeVisible();
  expect(violations).toEqual([]);
});

test("HTML reloads get fresh nonces and cannot reuse cached HTML", async ({ request }) => {
  const first = await request.get("/");
  const second = await request.get("/");
  const policy = first.headers()["content-security-policy"];
  const nonce = (await first.text()).match(/ngCspNonce="([^"]+)"/)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).toContain("'nonce-" + nonce + "'");
  expect(second.headers()["content-security-policy"]).not.toBe(policy);
  expect(first.headers()["cache-control"]).toBe("no-store");
});

test("a mismatched style nonce blocks Angular style injection", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", message => {
    if (/Applying inline style violates/.test(message.text())) violations.push(message.text());
  });
  await page.route("**/verification", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/ngCspNonce="[^"]+"/, 'ngCspNonce="wrong"') });
  });
  await page.route("**/console/api/verification/access", route => route.fulfill({ status: 204 }));
  await page.goto("/verification");
  await expect(page.getByRole("heading", { name: "Scenario Lab" })).toBeVisible();
  expect(violations.length).toBeGreaterThan(0);
});
