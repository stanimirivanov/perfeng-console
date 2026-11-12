import { RunDetailView } from './detail/run-detail';
import { MatButtonModule } from '@angular/material/button';
import { Component, inject } from '@angular/core';
import { RUN_UI, type RunInvalidation } from './run-ui';
import { provideRunLookup } from './run.providers';

@Component({
  selector: "app-home",
  providers: provideRunLookup(),
  imports: [RunDetailView, MatButtonModule],
  template: `
    <h1>Perfeng Console</h1>
    <h2>Find a Run</h2>
    <p id="lookup-help">Enter an exact Run ID. Run listing and history are unavailable.</p>
    <form (submit)="find($event, id.value)">
      <label for="run-id">Run ID</label>
      <input id="run-id" #id required maxlength="100" autocomplete="off" spellcheck="false"
        aria-describedby="lookup-help" (input)="invalidate('input')">
      <button type="submit">Look up Run</button>
    </form>
    <p role="status">{{ status() }}</p>
    @if (run(); as record) {
      <button matButton type="button" (click)="find($event, record.id)">Refresh Run detail</button>
      <app-run-detail [run]="record" [artifacts]="detail.artifacts()" [observations]="detail.observations()" />
    }
  `,
  host: {
    '(window:offline)': "invalidate('offline')",
    '(window:online)': "invalidate('online')",
    '(document:visibilitychange)': 'visibilityChanged()',
  },
})
export class ConsoleHome {
  readonly detail = inject(RUN_UI);
  readonly status = this.detail.status;
  readonly run = this.detail.run;
  invalidate(reason: RunInvalidation) { this.detail.invalidate(reason); }
  visibilityChanged() {
    if (document.hidden) this.invalidate('hidden');
  }
  find(event: Event, id: string) { event.preventDefault(); this.detail.find(id); }
}
