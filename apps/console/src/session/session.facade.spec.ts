import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideSession } from './session.providers';
import { SESSION_UI } from './session-ui';
import { VERIFICATION_ACCESS } from '../verification/access.port';

const refresh = vi.fn(async () => false);
@Component({ template: '', providers: [...provideSession(),
  { provide: VERIFICATION_ACCESS, useValue: { granted: signal(false), refresh } }] })
class Host { readonly ui = inject(SESSION_UI); }
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('disposing the Angular session scope aborts pairing and refuses a late grant', async () => {
  let signal: AbortSignal | null | undefined;
  let finish!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({}))
    .mockImplementationOnce((_url: string, options?: RequestInit) => {
      signal = options?.signal;
      return new Promise<Response>(resolve => { finish = resolve; });
    }));
  const fixture = TestBed.createComponent(Host);
  const ui = fixture.componentInstance.ui;
  await vi.waitFor(() => expect(ui.pending()).toBe(false));
  const result = ui.pair('test-owned-code');
  await vi.waitFor(() => expect(signal).toBeDefined());
  fixture.destroy();
  await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  finish(Response.json({ csrf: 'a'.repeat(43) }));
  expect(await result).toBe(false);
  expect(ui.mode()).toBe('pairing');
  expect(ui.pending()).toBe(false);
  expect(refresh).not.toHaveBeenCalled();
  expect(await ui.pair('another-test-code')).toBe(false);
});
