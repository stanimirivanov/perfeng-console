import { RunDetailView } from './run-detail';
import { MatButtonModule } from '@angular/material/button';
import { Component, DestroyRef, inject } from '@angular/core';
import { RUN_FEATURE } from './operator-ports';

@Component({
  selector: "app-home",
  imports: [RunDetailView, MatButtonModule],
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
  readonly detail = inject(RUN_FEATURE)(inject(DestroyRef));
  readonly status = this.detail.status;
  readonly run = this.detail.run;
  invalidate(message: string) { this.detail.invalidate(message); }
  visibilityChanged() {
    if (document.hidden) this.invalidate('Look up the Run again to see current evidence.');
  }
  find(event: Event, id: string) { event.preventDefault(); this.detail.find(id); }
}
