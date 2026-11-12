import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './shell/app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig).catch(() => { document.body.textContent = 'Application unavailable.'; });
