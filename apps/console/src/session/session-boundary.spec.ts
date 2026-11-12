import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSessionBoundary, configureSession } from './session.providers';
import { SESSION_BOUNDARY } from './session-boundary.port';
import { provideVerificationAccess } from '../verification/providers';
import { VERIFICATION_ACCESS } from '../verification/access.port';
import { provideRunLookup } from '../runs/run.providers';
import { RUN_UI } from '../runs/run-ui';
import { App } from '../shell/app';

@Component({ template: '', providers: provideRunLookup() })
class RunHost { readonly ui = inject(RUN_UI); }
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideSessionBoundary(),
    configureSession(true), provideVerificationAccess()] });
}
it('a shared epoch change aborts Run reads, clears session and capability, and ignores late grants', async () => {
  const signals: AbortSignal[] = [];
  let grant!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn((_url: string, options?: RequestInit) => {
    signals.push(options!.signal!);
    return new Promise<Response>(resolve => { if (_url.endsWith('/access')) grant = resolve; });
  }));
  setup();
  const shell = TestBed.createComponent(App);
  const run = TestBed.createComponent(RunHost);
  run.componentInstance.ui.find('perf-20260902-120000-abcdef12');
  await vi.waitFor(() => expect(signals).toHaveLength(2));
  const access = TestBed.inject(VERIFICATION_ACCESS);
  const boundary = TestBed.inject(SESSION_BOUNDARY);
  const epoch = boundary.epoch();
  boundary.invalidate();
  expect(boundary.epoch()).toBe(epoch + 1);
  await vi.waitFor(() => expect(signals.every(signal => signal.aborted)).toBe(true));
  grant(new Response(null, { status: 204 }));
  await Promise.resolve();
  expect(shell.componentInstance.mode()).toBe('pairing');
  expect(access.granted()).toBe(false);
  expect(run.componentInstance.ui.run()).toBeUndefined();
  expect(run.componentInstance.ui.observations()).toEqual([]);
});
it('session invalidation clears an existing capability grant immediately', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
  setup();
  const access = TestBed.inject(VERIFICATION_ACCESS);
  expect(await access.refresh()).toBe(true);
  TestBed.inject(SESSION_BOUNDARY).invalidate();
  expect(access.granted()).toBe(false);
});
it('logout invalidates before dispatch, aborts pending grants and keeps CSRF private', async () => {
  let logout!: (response: Response) => void;
  let capabilitySignal: AbortSignal | undefined;
  let credential: string | null = null;
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith('/access')) {
      capabilitySignal = options!.signal!;
      return new Promise<Response>(() => {});
    }
    if (url.endsWith('/logout')) {
      credential = new Headers(options!.headers).get('X-Perfeng-CSRF');
      return new Promise<Response>(resolve => { logout = resolve; });
    }
    return Promise.resolve(Response.json({ csrf: 'a'.repeat(43) }));
  }));
  setup();
  TestBed.overrideProvider((await import('./session.facade')).SESSION_PREVIEW, { useValue: false });
  const shell = TestBed.createComponent(App);
  await vi.waitFor(() => expect(shell.componentInstance.mode()).toBe('paired'));
  await vi.waitFor(() => expect(capabilitySignal).toBeDefined());
  const epoch = TestBed.inject(SESSION_BOUNDARY).epoch();
  const completion = shell.componentInstance.signOut();
  await vi.waitFor(() => expect(logout).toBeDefined());
  expect(TestBed.inject(SESSION_BOUNDARY).epoch()).toBeGreaterThan(epoch);
  expect(shell.componentInstance.mode()).toBe('pairing');
  expect(credential).toBe('a'.repeat(43));
  await vi.waitFor(() => expect(capabilitySignal?.aborted).toBe(true));
  expect(TestBed.inject(VERIFICATION_ACCESS).granted()).toBe(false);
  logout(Response.json({}));
  await completion;
  expect(shell.componentInstance.mode()).toBe('pairing');
});
