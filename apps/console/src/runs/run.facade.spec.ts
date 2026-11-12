import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRunLookup } from './run.providers';
import { RUN_UI } from './run-ui';

@Component({ template: '', providers: provideRunLookup() })
class Host { readonly ui = inject(RUN_UI); }
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
const id = 'perf-20260902-120000-abcdef12';
for (const phase of ['headers', 'body'] as const) {
  it('Angular component destruction aborts pending ' + phase + ' and rejects late evidence', async () => {
    let signal: AbortSignal | null | undefined;
    let finish!: (value: unknown) => void;
    const pending = new Promise(resolve => { finish = resolve; });
    vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
      signal = options?.signal;
      return phase === 'headers' ? pending : Promise.resolve({ ok: true, json: () => pending });
    }));
    const fixture = TestBed.createComponent(Host);
    const ui = fixture.componentInstance.ui;
    ui.find(id);
    await vi.waitFor(() => expect(signal).toBeDefined());
    fixture.destroy();
    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
    const value = { value: { id, state: 'COMPLETED', revision: 42, createdAt: '', updatedAt: '',
      finishedAt: null, failureCode: null, transitions: { COMPLETED: [] } }, validForMs: 10000 };
    finish(phase === 'headers' ? Response.json(value) : value);
    await Promise.resolve();
    expect(ui.run()).toBeUndefined();
    expect(ui.status()).toBe('');
  });
}
it('component instances isolate state and work; recreation starts fresh', async () => {
  const signals: AbortSignal[] = [];
  const fetch = vi.fn((_url: string, options?: RequestInit) => {
    signals.push(options!.signal!);
    return new Promise<Response>(() => {});
  });
  vi.stubGlobal('fetch', fetch);
  const first = TestBed.createComponent(Host);
  const second = TestBed.createComponent(Host);
  const old = first.componentInstance.ui;
  expect(old).not.toBe(second.componentInstance.ui);
  old.find(id); second.componentInstance.ui.find(id);
  await vi.waitFor(() => expect(signals).toHaveLength(2));
  first.destroy();
  await vi.waitFor(() => expect(signals[0]!.aborted).toBe(true));
  expect(signals[1]!.aborted).toBe(false);
  expect(second.componentInstance.ui.status()).toBe('Looking up Run…');
  old.find(id);
  expect(fetch).toHaveBeenCalledTimes(2);
  const fresh = TestBed.createComponent(Host);
  expect(fresh.componentInstance.ui).not.toBe(old);
  expect(fresh.componentInstance.ui.status()).toBe('Ready for exact Run lookup.');
  expect(fresh.componentInstance.ui.observations()).toEqual([]);
});
