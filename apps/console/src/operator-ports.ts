import { InjectionToken, type DestroyRef, type Signal } from '@angular/core';
import type { Observation, RunDetail, ArtifactObservation } from '#perfeng/contracts';

export type LookupResult = { observation: Observation<RunDetail>; artifacts: ArtifactObservation } | { message: string };
export type SessionReply = { mode: 'paired'; csrf: string } | { mode: 'pairing' | 'unavailable' };
export type SessionMode = 'pairing' | 'paired' | 'preview';
export interface VerificationPort { readonly granted: Signal<boolean>; refresh(): Promise<boolean> }
export interface RunFeature {
  readonly status: Signal<string>;
  readonly run: Signal<RunDetail | undefined>;
  readonly artifacts: Signal<ArtifactObservation>;
  readonly observations: Signal<readonly { revision: number; state: string; updatedAt: string }[]>;
  find(id: string): void;
  invalidate(message: string, preserveObservations?: boolean): void;
}
export interface SessionFeature {
  readonly mode: Signal<SessionMode>;
  readonly pending: Signal<boolean>;
  readonly message: Signal<string>;
  readonly granted: Signal<boolean>;
  start(preview: boolean): void;
  pair(code: string): Promise<boolean>;
  signOut(): Promise<void>;
}
// Factories acquire each feature in its creating component's lifetime, never a cached route injector.
export const RUN_FEATURE = new InjectionToken<(owner: DestroyRef) => RunFeature>('Run feature factory');
export const SESSION_FEATURE = new InjectionToken<(owner: DestroyRef) => SessionFeature>('Session feature factory');
