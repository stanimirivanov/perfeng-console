import { TestBed } from '@angular/core/testing';
import type { DestroyRef } from '@angular/core';
import { RUN_FEATURE } from './operator-ports';
import { RunLookupIntegration } from './run-lookup.integration';
import { lookupRun } from './run-client';
import { ConsoleHome } from './console-home';

afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

it('route destruction aborts its pending lookup and clears the Run observation', async () => {
  let requestSignal: AbortSignal | null | undefined;
  vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
    requestSignal = options?.signal;
    return new Promise<Response>((_resolve, reject) => {
      requestSignal?.addEventListener('abort', () => reject(new DOMException('Test lookup aborted', 'AbortError')), { once: true });
    });
  }));
  TestBed.configureTestingModule({ providers: [{ provide: RUN_FEATURE, useValue: (owner: DestroyRef) =>
    new RunLookupIntegration(owner, lookupRun) }] });
  const fixture = TestBed.createComponent(ConsoleHome);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Ready for exact Run lookup');
  fixture.componentInstance.find(new Event('submit'), 'perf-20260902-120000-abcdef12');
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  fixture.destroy();
  await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  expect(fixture.componentInstance.detail.run()).toBeUndefined();
});
