import { InjectionToken } from '@angular/core';

/** Invalidation only: the BFF remains the authority for every request. */
export interface SessionBoundaryPort {
  epoch(): number;
  invalidate(): void;
  subscribe(clear: () => void): () => void;
}
export const SESSION_BOUNDARY = new InjectionToken<SessionBoundaryPort>('Session epoch boundary');
