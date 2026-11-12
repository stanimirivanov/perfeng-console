import { TestBed } from '@angular/core/testing';
import type { DestroyRef } from '@angular/core';
import { signal } from '@angular/core';
import { Effect } from 'effect';
import { LocalSessionIntegration } from './local-session.integration';
import { RunLookupIntegration } from './run-lookup.integration';
import { lookupRun } from './run-client';
import { sessionRequest } from './session-client';

afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
function lifetime() {
  let close = () => {};
  const owner = { destroyed: false, onDestroy: (callback: () => void) => { close = callback; return () => {}; } } as DestroyRef;
  return { owner, close: () => close() };
}
for (const phase of ['headers', 'body'] as const) {
  it('disposing Run integration during ' + phase + ' aborts and rejects late completion', async () => {
    let requestSignal: AbortSignal | null | undefined;
    let finish!: (value: unknown) => void;
    const pending = new Promise(resolve => { finish = resolve; });
    vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
      requestSignal = options?.signal;
      return phase === 'headers' ? pending : Promise.resolve({ ok: true, json: () => pending });
    }));
    const scope = lifetime();
    const feature = TestBed.runInInjectionContext(() => new RunLookupIntegration(scope.owner, lookupRun));
    feature.find('perf-20260902-120000-abcdef12');
    await vi.waitFor(() => expect(requestSignal).toBeDefined());
    scope.close();
    await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
    const reply = { value: { id: 'perf-20260902-120000-abcdef12', state: 'COMPLETED', revision: 42,
      createdAt: '2026-09-02T12:00:00Z', updatedAt: '2026-09-02T12:00:00Z', finishedAt: null,
      failureCode: null, transitions: { COMPLETED: [] } }, validForMs: 10_000 };
    finish(phase === 'headers' ? Response.json(reply) : reply);
    await Promise.resolve();
    expect(feature.run()).toBeUndefined();
    expect(feature.status()).toBe('');
  });
}
it('disposing a session aborts pending transport and refuses late grants', async () => {
  let requestSignal: AbortSignal | null | undefined;
  let finish!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
    requestSignal = options?.signal;
    return new Promise<Response>(resolve => { finish = resolve; });
  }));
  const scope = lifetime();
  const refresh = vi.fn(async () => false);
  const session = TestBed.runInInjectionContext(() => new LocalSessionIntegration(scope.owner,
    { granted: signal(false), refresh }, sessionRequest));
  const result = session.pair('test-owned-code');
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  scope.close();
  await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  finish(Response.json({ csrf: 'a'.repeat(43) }));
  expect(await result).toBe(false);
  expect(session.mode()).toBe('pairing');
  expect(session.pending()).toBe(false);
  expect(refresh).not.toHaveBeenCalled();
});
it('a disposed Run integration cannot acquire another operation', () => {
  const scope = lifetime();
  const read = vi.fn(() => Effect.succeed({ message: 'unavailable' }));
  const feature = TestBed.runInInjectionContext(() => new RunLookupIntegration(scope.owner, read));
  scope.close();
  feature.find('test-run');
  expect(read).not.toHaveBeenCalled();
  expect(feature.run()).toBeUndefined();
});
