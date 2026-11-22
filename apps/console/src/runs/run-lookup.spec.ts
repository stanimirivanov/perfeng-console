import { provideSessionBoundary } from '../session/session.providers';
import { TestBed } from '@angular/core/testing';
import { RunLookup } from './run-lookup';
import { RUN_UI } from './run-ui';

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
  const fixture = TestBed.createComponent(RunLookup);
  const ui = fixture.debugElement.injector.get(RUN_UI);
  const host: HTMLElement = fixture.nativeElement;
  fixture.detectChanges();
  expect(host.textContent).toContain('Ready for exact Run lookup');
  const input = host.querySelector<HTMLInputElement>('#run-id')!;
  input.value = 'perf-20260902-120000-abcdef12';
  input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  fixture.destroy();
  await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  expect(ui.run()).toBeUndefined();
});
