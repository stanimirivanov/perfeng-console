import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Effect, Exit, Fiber } from 'effect';
import { SESSION_BOUNDARY } from '../session/session-boundary.port';
import { AccessStore } from './access.store';
import type { AccessRead, AccessReply } from './access-reader.port';
import type { VerificationAccessPort } from './access.port';

export const ACCESS_READ = new InjectionToken<AccessRead>('Verification reader');
@Injectable()
export class VerificationAccess implements VerificationAccessPort {
  private readonly store = inject(AccessStore);
  private readonly boundary = inject(SESSION_BOUNDARY);
  private readonly router = inject(Router);
  private readonly read = inject(ACCESS_READ);
  readonly granted = this.store.granted;
  private revision = 0;
  private disposed = false;
  private work?: Fiber.Fiber<AccessReply>;
  constructor() {
    const unsubscribe = this.boundary.subscribe(() => { this.clear(); this.leave(); });
    inject(DestroyRef).onDestroy(() => { unsubscribe(); this.clear(); this.disposed = true; });
  }
  private clear() {
    this.revision++;
    if (this.work) Effect.runFork(Fiber.interrupt(this.work));
    this.store.setGranted(false);
  }
  private leave() {
    if (this.router.url.split(/[?#]/)[0] === '/verification') void this.router.navigateByUrl('/');
  }
  async refresh(): Promise<boolean> {
    if (this.disposed) return false;
    this.clear();
    const revision = this.revision;
    const epoch = this.boundary.epoch();
    const work = Effect.runFork(this.read());
    this.work = work;
    const result = await Effect.runPromiseExit(Fiber.join(work));
    if (this.disposed || revision !== this.revision || epoch !== this.boundary.epoch()) return false;
    const granted = Exit.isSuccess(result) && result.value === 'granted';
    this.store.setGranted(granted);
    if (!granted) this.leave();
    return granted;
  }
}
