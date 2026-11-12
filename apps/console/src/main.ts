import { bootstrapApplication } from "@angular/platform-browser";
import { inject, type DestroyRef } from '@angular/core';
import { RUN_FEATURE, SESSION_FEATURE } from './operator-ports';
import { RunLookupIntegration } from './run-lookup.integration';
import { LocalSessionIntegration } from './local-session.integration';
import { lookupRun } from './run-client';
import { sessionRequest } from './session-client';
import { VerificationAccess } from './verification/access';
import { provideRouter } from "@angular/router";
import { App } from './app';
import { routes } from './app.routes';

bootstrapApplication(App, { providers: [provideRouter(routes),
  { provide: RUN_FEATURE, useValue: (owner: DestroyRef) => new RunLookupIntegration(owner, lookupRun) },
  { provide: SESSION_FEATURE, useFactory: () => {
    const access = inject(VerificationAccess);
    return (owner: DestroyRef) => new LocalSessionIntegration(owner, access, sessionRequest);
  } },
] }).catch(() => {
  document.body.textContent = "Application unavailable.";
});
