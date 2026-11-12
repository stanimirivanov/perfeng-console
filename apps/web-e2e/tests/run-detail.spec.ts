import { test, expect } from '../user-guide/fixture';
import { readFileSync } from 'node:fs';

const id = 'perf-20260902-120000-abcdef12';
const transitions = JSON.parse(readFileSync('vendor/perfeng-contracts/transitions.json', 'utf8'));
const artifact = { id: '11111111-1111-4111-8111-111111111111', runId: id, kind: 'raw', sha256: 'a'.repeat(64), sizeBytes: 42, mediaType: 'application/json', format: 'k6/v1' };
const detail = (revision: number) => ({ value: { id, state: 'COMPLETED', revision, updatedAt: '2026-09-02T12:00:05Z', createdAt: '2026-09-02T12:00:00Z', finishedAt: '2026-09-02T12:00:05Z', failureCode: null, transitions }, validForMs: 10_000 });

test('Inspect a Run and distinguish execution from verified evidence', { tag: '@user-guide' }, async ({ page, guide }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 720 });
  let revision = 2;
  await page.route('**/console/api/runs/' + id, route => route.fulfill({ json: detail(revision) }));
  await page.route('**/console/api/runs/' + id + '/artifacts', route => route.fulfill({ json: { value: { artifacts: [artifact] }, validForMs: 10_000 } }));
  await page.goto('/');
  await guide.action(page.getByLabel('Run ID'), { title: 'Find the exact Run', body: 'Enter the Run ID you want to inspect. This guide uses only a test-owned fixture; the product has no sample fallback.' }, async () => {
    await page.getByLabel('Run ID').fill(id);
    await page.getByLabel('Run ID').press('Enter');
  });
  await expect(page.getByRole('heading', { name: 'Artifact references' })).toBeVisible();
  await expect(page.getByText('Execution completion is not a performance PASS.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Run' })).toBeFocused();
  await expect(page.getByText('SHA-256 claim (bytes not verified)')).toBeVisible();
  await expect(page.getByText('a'.repeat(64), { exact: true })).toBeVisible();
  await expect(page.getByText('Execution identity: UNKNOWN — not exposed by this API.')).toBeVisible();
  await page.getByRole('heading', { name: 'Artifact references' }).scrollIntoViewIfNeeded();
  await guide.result(page.getByRole('main'), { title: 'Inspect execution and evidence claims', body: 'Test-owned design fixtures demonstrate an exact Run. COMPLETED describes execution, while the artifact digest is an unverified claim. No artifact body is downloaded.' });
  await page.getByText('Permitted state transitions', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByText('Permitted state transitions', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh Run detail' }).focus();
  revision = 5;
  await page.keyboard.press('Enter');
  const log = page.getByRole('region', { name: 'Session observations' });
  await expect(log).toContainText('Revision 2');
  await expect(log).toContainText('Revision 5');
  await expect(log).not.toContainText('Revision 3');
  await expect(log).toContainText('not a durable event history');
  await expect(page.getByRole('heading', { name: 'Current Run' })).toBeFocused();
  await log.scrollIntoViewIfNeeded();
  await guide.result(log, { title: 'Refresh without inventing history', body: 'Only revisions actually observed in this session are listed. Missing revisions do not establish a lifecycle path; durable history remains unavailable.' });
  await page.clock.fastForward(10_001);
  await expect(page.getByText('a'.repeat(64), { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Artifact references' })).toHaveCount(0);
});

test('contract graph changes are displayed and artifact outages never become empty evidence', async ({ page, context }) => {
  await page.route('**/console/api/runs/' + id, route => route.fulfill({ json: { ...detail(1), value: { ...detail(1).value, transitions: { ...transitions, CREATED: ['ABORTED'] } } } }));
  await page.route('**/console/api/runs/' + id + '/artifacts', route => route.fulfill({ status: 503 }));
  await page.goto('/');
  await page.getByLabel('Run ID').fill(id);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByText('Artifact observation unavailable.')).toBeVisible();
  await page.getByText('Permitted state transitions', { exact: true }).click();
  await expect(page.getByRole('row', { name: 'CREATED ABORTED' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
});

test('failed execution exposes its code and artifact session loss returns to pairing', async ({ page }) => {
  let denied = false;
  await page.route('**/console/api/runs/' + id, route => route.fulfill({ json: { ...detail(3), value: { ...detail(3).value, state: 'TEST_FAILURE', failureCode: 'TOOL_ERROR' } } }));
  await page.route('**/console/api/runs/' + id + '/artifacts', route => denied
    ? route.fulfill({ status: 401 }) : route.fulfill({ json: { value: { artifacts: [{ ...artifact, runId: 'foreign-run' }] }, validForMs: 10_000 } }));
  await page.goto('/');
  await page.getByLabel('Run ID').fill(id);
  await page.getByLabel('Run ID').press('Enter');
  await expect(page.getByText('TOOL_ERROR', { exact: true })).toBeVisible();
  await expect(page.getByText('Artifact observation unavailable.')).toBeVisible();
  await expect(page.getByText('a'.repeat(64), { exact: true })).toHaveCount(0);
  denied = true;
  await page.getByRole('button', { name: 'Refresh Run detail' }).click();
  await expect(page.getByRole('heading', { name: 'Pair local console' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Current Run' })).toHaveCount(0);
});
