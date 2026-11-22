import { RunDetail } from './detail/run-detail';
import { MatButtonModule } from '@angular/material/button';
import { Component, inject } from '@angular/core';
import { RUN_UI, type RunInvalidation } from './run-ui';
import { provideRunLookup } from './run.providers';

@Component({
  selector: 'app-home',
  providers: provideRunLookup(),
  imports: [RunDetail, MatButtonModule],
  templateUrl: './run-lookup.html',
  host: {
    '(window:offline)': "invalidate('offline')",
    '(window:online)': "invalidate('online')",
    '(document:visibilitychange)': 'visibilityChanged()',
  },
})
export class RunLookup {
  private readonly detail = inject(RUN_UI);
  protected readonly status = this.detail.status;
  protected readonly run = this.detail.run;
  protected readonly artifacts = this.detail.artifacts;
  protected readonly observations = this.detail.observations;

  protected invalidate(reason: RunInvalidation) { this.detail.invalidate(reason); }
  protected visibilityChanged() {
    if (document.hidden) {
      this.invalidate('hidden');
    }
  }
  protected find(event: Event, id: string) { event.preventDefault(); this.detail.find(id); }
}
