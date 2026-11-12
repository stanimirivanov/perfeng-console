import { provideSessionBoundary } from '../session/session.providers';
import { TestBed } from '@angular/core/testing';
import { ConsoleHome } from './run-lookup';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideSessionBoundary()] }));
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

it('route destruction aborts its pending lookup and clears the Run observation', async () => {
  let requestSignal: AbortSignal | null | undefined;
  vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
    requestSignal = options?.signal;
    return new Promise<Response>((_resolve, reject) => {
      requestSignal?.addEventListener('abort', () => reject(new DOMException('Test lookup aborted', 'AbortError')), { once: true });
    });
  }));
  const fixture = TestBed.createComponent(ConsoleHome);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Ready for exact Run lookup');
  fixture.componentInstance.find(new Event('submit'), 'perf-20260902-120000-abcdef12');
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  fixture.destroy();
  await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  expect(fixture.componentInstance.detail.run()).toBeUndefined();
});
