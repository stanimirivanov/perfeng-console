import type { DestroyRef } from '@angular/core';
import { Effect, Fiber } from 'effect';
import { RunDetailStore } from './run-detail-store';
import { observeRun, type RunRead } from './run-lookup.operation';
import type { RunFeature } from './operator-ports';

export class RunLookupIntegration implements RunFeature {
  private readonly store = new RunDetailStore();
  readonly status = this.store.status;
  readonly run = this.store.run;
  readonly artifacts = this.store.artifacts;
  readonly observations = this.store.observations;
  private generation = 0;
  private work?: Fiber.Fiber<void>;
  private disposed = false;
  constructor(owner: DestroyRef, private readonly read: RunRead) {
    owner.onDestroy(() => { this.invalidate(''); this.disposed = true; });
  }
  invalidate(message: string, preserveObservations = false) {
    if (this.disposed) return;
    this.generation++;
    if (this.work) Effect.runFork(Fiber.interrupt(this.work));
    this.store.clear(preserveObservations);
    this.store.setStatus(message);
  }
  find(id: string) {
    if (this.disposed) return;
    this.invalidate('Looking up Run…', true);
    if (!navigator.onLine) { this.store.setStatus('Connection unavailable. Try again when connected.'); return; }
    const generation = this.generation;
    const started = performance.now();
    this.work = Effect.runFork(observeRun(id, this.read, started, () => performance.now(), event => {
      if (this.disposed || generation !== this.generation) return false;
      if (event.kind === 'received') {
        if (!this.store.observe(event.result.observation.value, event.result.artifacts)) {
          this.store.clear();
          this.store.setStatus('Run observation inconsistent. Look up the Run again.');
          return false;
        }
        this.store.setStatus('Current Run evidence loaded.');
      } else {
        this.store.clear();
        this.store.setStatus(event.kind === 'failed' ? event.message : 'Run evidence expired. Look up the Run again.');
      }
      return true;
    }));
  }
}
