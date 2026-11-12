import { provideSessionBoundary } from '../session/session.providers';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideVerificationAccess } from '../verification/providers';
import { App } from './app';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideSessionBoundary()] }));
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

it('pairing clears the code, focuses main, denies Verification and logout returns to pairing', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/verification/access')) return new Response(null, { status: 403 });
    return Response.json(url.endsWith('/pair') ? { csrf: 'a'.repeat(43) } : {});
  }));
  TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([]), provideVerificationAccess()] });
  const fixture = TestBed.createComponent(App);
  const host: HTMLElement = fixture.nativeElement;
  document.body.append(host);
  try {
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.pending()).toBe(false));
    expect(fixture.componentInstance.mode()).toBe('pairing');
    const input = host.querySelector<HTMLInputElement>('#pair-code')!;
    input.value = 'test-owned-one-use-code';
    await fixture.componentInstance.pair(new Event('submit'), input, host.querySelector('main')!);
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(host.querySelector('main'));
    expect(host.querySelector('nav')).not.toBeNull();
    expect(host.textContent).not.toContain('Verification');
    await fixture.componentInstance.signOut();
    fixture.detectChanges();
    expect(host.querySelector('#pair-code')).not.toBeNull();
    expect(host.querySelector('nav')).toBeNull();
  } finally { fixture.destroy(); host.remove(); }
});
