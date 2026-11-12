import { type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { configureSession } from './session/session.providers';
import { provideVerificationAccess } from './verification/providers';

export const appConfig: ApplicationConfig = { providers: [provideRouter(routes), provideVerificationAccess(),
  configureSession(!!document.querySelector('meta[name="perfeng-console-preview"][content="true"]'))] };
