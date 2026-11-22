import { Component, computed, input, inject, ElementRef, afterNextRender } from '@angular/core';
import type { RunDetail as RunDetailRecord, ArtifactObservation } from '#perfeng/contracts';

@Component({
  selector: 'app-run-detail',
  templateUrl: './run-detail.html',
  styleUrl: './run-detail.css',
})
export class RunDetail {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly run = input.required<RunDetailRecord>();
  readonly artifacts = input.required<ArtifactObservation>();
  readonly observations = input.required<readonly {
    revision: number;
    state: string;
    updatedAt: string;
  }[]>();
  protected readonly states = computed(() => Object.keys(this.run().transitions));
  protected readonly claims = computed(() => {
    const value = this.artifacts();
    return value.status === 'available' ? value.artifacts : [];
  });

  constructor() {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('#detail-title')?.focus());
  }
}
