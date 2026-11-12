import { InjectionToken, type Signal } from '@angular/core';
import type { RunDetail, ArtifactObservation } from '#perfeng/contracts';

export type RunInvalidation = 'input' | 'offline' | 'online' | 'hidden';
export interface RunUi {
  readonly status: Signal<string>;
  readonly run: Signal<RunDetail | undefined>;
  readonly artifacts: Signal<ArtifactObservation>;
  readonly observations: Signal<readonly { revision: number; state: string; updatedAt: string }[]>;
  find(id: string): void;
  invalidate(reason: RunInvalidation): void;
}
export const RUN_UI = new InjectionToken<RunUi>('Run lookup UI');
