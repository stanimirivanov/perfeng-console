import type { DestroyRef } from '@angular/core';
import { Effect, Exit, Fiber } from 'effect';
import { LocalSessionStore } from './local-session.store';
import type { SessionFeature, SessionReply, VerificationPort } from './operator-ports';

type SessionRead = (action?: 'pair' | 'logout', credential?: string) => Effect.Effect<SessionReply>;
export class LocalSessionIntegration implements SessionFeature {
  private readonly store = new LocalSessionStore();
  readonly mode = this.store.mode;
  readonly pending = this.store.pending;
  readonly message = this.store.message;
  readonly granted;
  private csrf = '';
  private disposed = false;
  private started = false;
  private generation = 0;
  private work?: Fiber.Fiber<SessionReply>;
  constructor(owner: DestroyRef, private readonly access: VerificationPort, private readonly read: SessionRead) {
    this.granted = access.granted;
    owner.onDestroy(() => {
      this.disposed = true; this.generation++; this.csrf = '';
      if (this.work) Effect.runFork(Fiber.interrupt(this.work));
      this.store.complete('pairing', '');
    });
  }
  start(preview: boolean) {
    if (this.started || this.disposed) return;
    this.started = true; this.store.initialize(preview);
    if (preview) void this.access.refresh(); else void this.request();
  }
  pair(code: string) { return this.pending() ? Promise.resolve(false) : this.request('pair', code); }
  async signOut() { if (!this.pending()) await this.request('logout', this.csrf); }
  private async request(action?: 'pair' | 'logout', credential?: string) {
    if (this.disposed) return false;
    const generation = ++this.generation;
    this.store.begin();
    const work = Effect.runFork(this.read(action, credential));
    this.work = work;
    const result = await Effect.runPromiseExit(Fiber.join(work));
    if (this.disposed || generation !== this.generation) return false;
    if (Exit.isFailure(result)) throw new Error('Session operation failed');
    const reply = result.value;
    this.csrf = reply.mode === 'paired' ? reply.csrf : '';
    this.store.complete(reply.mode === 'unavailable' ? 'pairing' : reply.mode,
      reply.mode === 'unavailable' ? 'Session unavailable. Check the code or restart the local server.' : '');
    if (reply.mode === 'paired') void this.access.refresh();
    return reply.mode === 'paired';
  }
}
