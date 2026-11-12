import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

const id = 'perf-20260902-120000-abcdef12';
const path = '**/console/api/runs/' + id;
const observation = (revision: number) => ({
  value: { createdAt: '2026-09-02T12:00:00Z', finishedAt: '2026-09-02T12:00:05Z', failureCode: null, transitions: JSON.parse(readFileSync('vendor/perfeng-contracts/transitions.json', 'utf8')), id, revision, state: 'COMPLETED', updatedAt: '2026-09-02T12:00:00Z' },
  validForMs: 10_000,
});

test.beforeEach(async ({ page }) => {
  await page.route(path + '/artifacts', route => route.fulfill({ json: { value: { artifacts: [] }, validForMs: 10_000 } }));
});

test('exact Run evidence expires and reconnect requires a new lookup', async ({ page, context }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 640 });
  let revision = 9;
  await page.route(path, route => route.fulfill({ json: observation(revision++) }));
  await page.goto('/');
  const input = page.getByLabel('Run ID');
  await input.fill(id);
  await input.press('Enter');
  await expect(page.getByText('9', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.clock.fastForward(10_001);
  await expect(page.getByText('9', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('expired');
  await input.press('Enter');
  await expect(page.getByText('10', { exact: true })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText('10', { exact: true })).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByText('10', { exact: true })).toHaveCount(0);
  await input.press('Enter');
  await expect(page.getByText('11', { exact: true })).toBeVisible();
});

test('a delayed generation cannot replace a newer result and a deadline clears evidence', async ({ page }) => {
  await page.clock.install();
  const first = deferred();
  const last = deferred();
  const firstFinished = deferred();
  let calls = 0;
  await page.route(path, async route => {
    const call = ++calls;
    if (call === 1) await first.promise;
    if (call === 3) await last.promise;
    await route.fulfill({ json: observation(call) }).catch(() => {});
    if (call === 1) firstFinished.resolve();
  });
  await page.goto('/');
  const input = page.getByLabel('Run ID');
  await input.fill(id);
  await input.press('Enter');
  await expect.poll(() => calls).toBe(1);
  await input.press('Enter');
  await expect(page.getByText('2', { exact: true })).toBeVisible();
  first.resolve();
  await firstFinished.promise;
  await expect(page.getByText('2', { exact: true })).toBeVisible();
  await expect(page.getByText('1', { exact: true })).toHaveCount(0);
  await input.press('Enter');
  await expect.poll(() => calls).toBe(3);
  await page.clock.fastForward(3001);
  await expect(page.getByRole('status')).toContainText('unavailable');
  last.resolve();
  await expect(page.getByRole('status')).toContainText('unavailable');
  await expect(page.getByText('1', { exact: true })).toHaveCount(0);
  await expect(page.getByText('2', { exact: true })).toHaveCount(0);
  await expect(page.getByText('3', { exact: true })).toHaveCount(0);
});

test('leaving the Run route interrupts lookup and never restores its late result on return', async ({ page }) => {
  await page.route('**/console/api/verification/access', route => route.fulfill({ status: 204 }));
  const reply = deferred();
  const finished = deferred();
  let started = false;
  await page.route(path, async route => {
    started = true;
    await reply.promise;
    await route.fulfill({ json: observation(42) }).catch(() => {});
    finished.resolve();
  });
  await page.goto('/');
  const input = page.getByLabel('Run ID');
  await input.fill(id);
  await input.press('Enter');
  await expect.poll(() => started).toBe(true);
  await page.getByRole('link', { name: 'Verification' }).click();
  await expect(page.getByRole('heading', { name: 'Scenario Lab' })).toBeVisible();
  reply.resolve();
  await finished.promise;
  await page.getByRole('link', { name: 'Return to Console' }).click();
  await expect(page.getByRole('status')).toContainText('Ready for exact Run lookup');
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
  await expect(input).toHaveValue('');
});

test('hidden evidence stays cleared on resume until an explicit fresh lookup', async ({ page }) => {
  await page.route(path, route => route.fulfill({ json: observation(23) }));
  await page.goto('/');
  await page.getByLabel('Run ID').fill(id);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByRole('heading', { name: 'Current Run' })).toBeVisible();
  // Test-owned visibility events characterize the existing framework host binding.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('status')).toContainText('Look up the Run again');
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByRole('heading', { name: 'Current Run' })).toBeFocused();
});

test('a local-session denial clears the shell and cannot be undone by a late capability grant', async ({ page }) => {
  const grant = deferred();
  let requested!: () => void;
  const capabilityRequested = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/console/api/verification/access', async route => {
    requested(); await grant.promise; await route.fulfill({ status: 204 });
  });
  await page.route(path, route => route.fulfill({ status: 401 }));
  await page.goto('/');
  await capabilityRequested;
  await page.getByLabel('Run ID').fill(id);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByRole('heading', { name: 'Pair local console' })).toBeVisible();
  grant.resolve();
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
});

for (const status of [403, 404]) {
  test('scoped Run denial ' + status + ' clears evidence without global logout', async ({ page }) => {
    await page.route('**/console/api/verification/access', route => route.fulfill({ status: 204 }));
    await page.route(path, route => route.fulfill({ status }));
    await page.goto('/');
    await page.getByLabel('Run ID').fill(id);
    await page.getByLabel('Run ID').press('Enter');
    await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Perfeng Console' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Verification' })).toBeVisible();
  });
}

test('artifact local-session denial also returns to pairing', async ({ page }) => {
  await page.route(path, route => route.fulfill({ json: observation(1) }));
  await page.route(path + '/artifacts', route => route.fulfill({ status: 401 }));
  await page.goto('/');
  await page.getByLabel('Run ID').fill(id);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByRole('heading', { name: 'Pair local console' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
});
