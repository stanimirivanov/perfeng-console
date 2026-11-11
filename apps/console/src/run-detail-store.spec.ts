import { TestBed } from '@angular/core/testing';
import { RunDetailStore } from './run-detail-store';

it('keeps only actually observed revisions and clears all evidence on invalidation', () => {
  const store = TestBed.runInInjectionContext(() => new RunDetailStore());
  const run = { id: 'fixture-run', state: 'RUNNING', revision: 2, createdAt: '', updatedAt: '', finishedAt: null, failureCode: null, transitions: {} };
  expect(store.observe(run, { status: 'unavailable' })).toBe(true);
  store.clear(true);
  expect(store.observe({ ...run, revision: 5 }, { status: 'unavailable' })).toBe(true);
  expect(store.observations().map(value => value.revision)).toEqual([2, 5]);
  expect(store.observe({ ...run, revision: 3 }, { status: 'unavailable' })).toBe(false);
  store.clear();
  expect(store.run()).toBeUndefined();
  expect(store.observations()).toEqual([]);
});
