import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { Effect, Exit, Fiber } from 'effect';
import { SESSION_BOUNDARY } from './session-boundary.port';
import { SessionStore } from './session.store';
import { VERIFICATION_ACCESS } from '../verification/access.port';
import type { SessionUi } from './session-ui';
import type { SessionRead, SessionReply } from './session-reader.port';

export const SESSION_READ = new InjectionToken<SessionRead>('Session reader');
export const SESSION_PREVIEW = new InjectionToken<boolean>('Local console preview', { providedIn: 'root', factory: () => false });
@Injectable()
export class SessionFacade implements SessionUi {
  private readonly store = inject(SessionStore);
  readonly mode = this.store.mode;
  readonly pending = this.store.pending;
  readonly message = this.store.message;
  private readonly boundary = inject(SESSION_BOUNDARY);
  private csrf = '';
  private disposed = false;
  private generation = 0;
  private work?: Fiber.Fiber<SessionReply>;
  private readonly read = inject(SESSION_READ);
  private readonly access = inject(VERIFICATION_ACCESS);
  constructor() {
    const unsubscribe = this.boundary.subscribe(() => {
      this.generation++; this.csrf = '';
      if (this.work) Effect.runFork(Fiber.interrupt(this.work));
      this.store.complete('pairing', 'Session changed or expired. Pair the console again.');
    });
    inject(DestroyRef).onDestroy(() => {
      unsubscribe(); this.disposed = true; this.generation++; this.csrf = '';
      if (this.work) Effect.runFork(Fiber.interrupt(this.work));
      this.store.complete('pairing', '');
    });
    const preview = inject(SESSION_PREVIEW);
    this.store.initialize(preview);
    if (preview) void this.access.refresh(); else void this.request();
  }
  pair(code: string) { return this.pending() ? Promise.resolve(false) : this.request('pair', code); }
  async signOut() { if (!this.pending()) await this.request('logout', this.csrf); }
  private async request(action?: 'pair' | 'logout', credential?: string) {
    if (this.disposed) return false;
    // Revoke old work before replacement/logout dispatch, even when that dispatch fails.
    if (action) this.boundary.invalidate();
    const epoch = this.boundary.epoch();
    const generation = ++this.generation;
    this.store.begin();
    const work = Effect.runFork(this.read(action, credential));
    this.work = work;
    const result = await Effect.runPromiseExit(Fiber.join(work));
    if (this.disposed || generation !== this.generation || epoch !== this.boundary.epoch()) return false;
    if (Exit.isFailure(result)) throw new Error('Session operation failed');
    const reply = result.value;
    if (reply.mode !== 'paired') this.boundary.invalidate();
    this.csrf = reply.mode === 'paired' ? reply.csrf : '';
    this.store.complete(reply.mode === 'unavailable' ? 'pairing' : reply.mode,
      reply.mode === 'unavailable' ? 'Session unavailable. Check the code or restart the local server.' : '');
    if (reply.mode === 'paired') void this.access.refresh();
    return reply.mode === 'paired';
  }
}
