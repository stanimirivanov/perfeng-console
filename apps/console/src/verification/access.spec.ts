import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSessionBoundary } from '../session/session.providers';
import { provideVerificationAccess } from './providers';
import { VerificationAccess } from "./access";

beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), provideSessionBoundary(), provideVerificationAccess()] }));
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

it("a late grant cannot undo a subsequent denial", async () => {
  let grant!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { grant = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending)
    .mockResolvedValueOnce(new Response(null, { status: 403 })));
  const access = TestBed.inject(VerificationAccess);
  const older = access.refresh();
  expect(await access.refresh()).toBe(false);
  grant(new Response(null, { status: 204 }));
  expect(await older).toBe(false);
  expect(access.granted()).toBe(false);
});

it("unexpected HTML success and network errors never disclose Verification", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response("<html>preview</html>", { status: 200 }))
    .mockRejectedValueOnce(new TypeError("offline")));
  const access = TestBed.inject(VerificationAccess);
  expect(await access.refresh()).toBe(true);
  expect(await access.refresh()).toBe(false);
  expect(await access.refresh()).toBe(false);
  expect(access.granted()).toBe(false);
});

it('mounted Verification content disappears when a recheck denies access', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 403 })));
  const access = TestBed.inject(VerificationAccess);
  await access.refresh();
  const { ScenarioLab } = await import('./lab');
  const fixture = TestBed.createComponent(ScenarioLab);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Scenario Lab');
  await access.refresh();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('button')).toBeNull();
  expect(fixture.nativeElement.textContent).toContain('Verification unavailable');
});
