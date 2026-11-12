import { SessionBoundary } from './session-boundary.store';
import { SESSION_BOUNDARY } from './session-boundary.port';
import type { SessionRead } from './session-reader.port';
import type { Provider } from '@angular/core';
import { SessionStore } from './session.store';
import { SessionFacade, SESSION_READ, SESSION_PREVIEW } from './session.facade';
import { SESSION_UI } from './session-ui';
import { sessionRequest } from './session-client';

export function provideSession(): Provider[] {
  return [SessionStore, SessionFacade, { provide: SESSION_UI, useExisting: SessionFacade }, { provide: SESSION_READ, useValue: sessionRequest satisfies SessionRead }];
}
export function configureSession(preview: boolean): Provider { return { provide: SESSION_PREVIEW, useValue: preview }; }

export function provideSessionBoundary(): Provider[] {
  return [SessionBoundary, { provide: SESSION_BOUNDARY, useExisting: SessionBoundary }];
}
