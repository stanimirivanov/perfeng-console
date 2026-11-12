import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { Effect, Fiber } from 'effect';
import { RunStore } from './run.store';
import { readRun } from './run.operation';
import type { RunRead } from './run-reader.port';
import type { RunUi, RunInvalidation } from './run-ui';

export const RUN_READ = new InjectionToken<RunRead>('Run reader');

@Injectable()
export class RunFacade implements RunUi {
  private readonly owner = inject(DestroyRef);
  private readonly read = inject(RUN_READ);
  private readonly store = inject(RunStore);
  readonly status = this.store.status;
  readonly run = this.store.run;
  readonly artifacts = this.store.artifacts;
  readonly observations = this.store.observations;
  private generation = 0;
  private work?: Fiber.Fiber<void>;
  private disposed = false;
  constructor() {
    this.owner.onDestroy(() => { this.clear(''); this.disposed = true; });
  }
  invalidate(reason: RunInvalidation) {
    this.clear({ input: 'Ready to look up this Run.', offline: 'Connection unavailable. Run evidence cleared.',
      online: 'Connection restored. Look up the Run again.', hidden: 'Look up the Run again to see current evidence.' }[reason]);
  }
  private clear(message: string, preserveObservations = false) {
    if (this.disposed) return;
    this.generation++;
    if (this.work) Effect.runFork(Fiber.interrupt(this.work));
    this.store.clear(preserveObservations);
    this.store.setStatus(message);
  }
  find(id: string) {
    if (this.disposed) return;
    this.clear('Looking up Run…', true);
    if (!navigator.onLine) { this.store.setStatus('Connection unavailable. Try again when connected.'); return; }
    const generation = this.generation;
    const started = performance.now();
    this.work = Effect.runFork(Effect.gen({ self: this }, function* () {
      const result = yield* readRun(id, this.read, started);
      if (this.disposed || generation !== this.generation) return;
      if (result.kind === 'failed') { this.store.clear(); this.store.setStatus(result.message); return; }
      // Recheck absolute expiry at publication; processing never extends evidence validity.
      const remaining = result.expiresAt - performance.now();
      if (remaining > 0) {
        if (!this.store.observe(result.observation.value, result.artifacts)) {
          this.store.clear(); this.store.setStatus('Run observation inconsistent. Look up the Run again.'); return;
        }
        this.store.setStatus('Current Run evidence loaded.');
        yield* Effect.sleep(remaining);
      }
      if (!this.disposed && generation === this.generation) {
        this.store.clear(); this.store.setStatus('Run evidence expired. Look up the Run again.');
      }
    }));
  }
}
