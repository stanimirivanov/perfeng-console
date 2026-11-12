import { lookupRun } from './run-client';
import { RunDetailView } from './run-detail';
import { RunDetailStore } from './run-detail-store';
import { MatButtonModule } from '@angular/material/button';
import { Effect, Fiber } from 'effect';
import { Component, DestroyRef, inject, signal } from "@angular/core";

@Component({
  selector: "app-home",
  imports: [RunDetailView, MatButtonModule],
  providers: [RunDetailStore],
  template: `
    <h1>Perfeng Console</h1>
    <h2>Find a Run</h2>
    <p id="lookup-help">Enter an exact Run ID. Run listing and history are unavailable.</p>
    <form (submit)="find($event, id.value)">
      <label for="run-id">Run ID</label>
      <input id="run-id" #id required maxlength="100" autocomplete="off" spellcheck="false"
        aria-describedby="lookup-help" (input)="invalidate('Ready to look up this Run.')">
      <button type="submit">Look up Run</button>
    </form>
    <p role="status">{{ status() }}</p>
    @if (run(); as record) {
      <button matButton type="button" (click)="find($event, record.id)">Refresh Run detail</button>
      <app-run-detail [run]="record" [artifacts]="detail.artifacts()" [observations]="detail.observations()" />
    }
  `,
  host: {
    '(window:offline)': "invalidate('Connection unavailable. Run evidence cleared.')",
    '(window:online)': "invalidate('Connection restored. Look up the Run again.')",
    '(document:visibilitychange)': 'visibilityChanged()',
  },
})
export class ConsoleHome {
  readonly status = signal('Ready for exact Run lookup.');
  readonly detail = inject(RunDetailStore);
  readonly run = this.detail.run;
  private generation = 0;
  private pending?: Fiber.Fiber<void>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.invalidate(''));
  }

  invalidate(message: string, preserveObservations = false) {
    this.generation++;
    if (this.pending) Effect.runFork(Fiber.interrupt(this.pending));
    this.detail.clear(preserveObservations);
    this.status.set(message);
  }

  visibilityChanged() {
    if (document.hidden) this.invalidate('Look up the Run again to see current evidence.');
  }

  find(event: Event, id: string) {
    event.preventDefault();
    this.invalidate('Looking up Run…', true);
    if (!navigator.onLine) {
      this.status.set('Connection unavailable. Try again when connected.');
      return;
    }
    const generation = this.generation;
    const started = performance.now();
    this.pending = Effect.runFork(Effect.gen({ self: this }, function* () {
      const result = yield* lookupRun(id.trim());
      if (this.generation !== generation) return;
      if ('message' in result) {
        this.detail.clear();
        this.status.set(result.message);
        return;
      }
      // Charge transit and processing against the lifetime so network delay never extends freshness.
      const remaining = result.observation.validForMs - (performance.now() - started);
      if (remaining > 0) {
        if (!this.detail.observe(result.observation.value, result.artifacts)) {
          this.detail.clear();
          this.status.set('Run observation inconsistent. Look up the Run again.');
          return;
        }
        this.status.set('Current Run evidence loaded.');
        yield* Effect.sleep(remaining);
      }
      if (this.generation === generation) {
        this.detail.clear();
        this.status.set('Run evidence expired. Look up the Run again.');
      }
    }));
  }
}
