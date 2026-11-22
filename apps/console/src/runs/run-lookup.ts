import { RunDetailView } from './detail/run-detail';
import { MatButtonModule } from '@angular/material/button';
import { Component, inject } from '@angular/core';
import { RUN_UI, type RunInvalidation } from './run-ui';
import { provideRunLookup } from './run.providers';

@Component({
  selector: 'app-home',
  providers: provideRunLookup(),
  imports: [RunDetailView, MatButtonModule],
  templateUrl: './run-lookup.html',
  styleUrl: './run-lookup.scss',
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
