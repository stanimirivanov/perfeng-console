import { Component, input, inject, ElementRef, afterNextRender } from '@angular/core';
import type { RunDetail, ArtifactObservation } from '#perfeng/contracts';

@Component({
  selector: 'app-run-detail',
  templateUrl: './run-detail.html',
  styleUrl: './run-detail.scss',
})
export class RunDetailView {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('#detail-title')?.focus());
  }
  readonly run = input.required<RunDetail>();
  readonly artifacts = input.required<ArtifactObservation>();
  readonly observations = input.required<readonly {
    revision: number;
    state: string;
    updatedAt: string;
  }[]>();
  states() { return Object.keys(this.run().transitions); }
  claims() { const value = this.artifacts(); return value.status === 'available' ? value.artifacts : []; }
}
