import { Effect } from 'effect';
import { sessionRequest } from './session-client';
import { Component, inject, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Router, RouterLink, RouterOutlet, Routes } from "@angular/router";
import { VerificationAccess } from "./verification/access";

@Component({
  selector: "app-home",
  template: `
    <h1>Perfeng Console</h1>
    <p>Open a Run from a CI link to inspect its evidence.</p>
    <p role="status">Backend unavailable — platform connection is not configured.</p>
    <button disabled>Open Run</button>
  `,
})
class ConsoleHome {}

const routes: Routes = [
  { path: "", pathMatch: "full", component: ConsoleHome },
  {
    path: "verification",
    canMatch: [async () => {
      const router = inject(Router);
      return await inject(VerificationAccess).refresh() || router.parseUrl("/");
    }],
    loadComponent: () => import("./verification/lab").then(module => module.ScenarioLab),
  },
  { path: "**", redirectTo: "" },
];

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink],
  template: `
    <a [attr.href]="router.url.split('#')[0] + '#main'">Skip to content</a>
    @if (mode() === 'paired' || mode() === 'preview') {
      <nav aria-label="Workspace">
        <a routerLink="/">Console</a>
        @if (access.granted()) { <a routerLink="/verification">Verification</a> }
        @if (mode() === 'paired') { <button type="button" [disabled]="pending()" (click)="signOut()">Sign out</button> }
      </nav>
    }
    <main #main id="main" tabindex="-1">
      <div [hidden]="mode() !== 'paired' && mode() !== 'preview'"><router-outlet /></div>
      @if (mode() === 'pairing') {
        <h1>Pair local console</h1>
        <p id="pair-help">Enter the single-use code shown in the console server terminal.</p>
        <form (submit)="pair($event, code, main)">
          <label for="pair-code">Pairing code</label>
          <input #code id="pair-code" type="password" autocomplete="off" maxlength="43" required aria-describedby="pair-help">
          <button type="submit" [disabled]="pending()">Pair console</button>
        </form>
      }
      @if (message()) { <p role="alert">{{ message() }}</p> }
    </main>
  `,
})
class App {
  readonly router = inject(Router);
  readonly access = inject(VerificationAccess);
  readonly mode = signal<'pairing' | 'paired' | 'preview'>(
    document.querySelector('meta[name="perfeng-console-preview"][content="true"]') ? 'preview' : 'pairing',
  );
  readonly pending = signal(false);
  readonly message = signal('');
  private csrf = '';

  constructor() {
    if (this.mode() === 'preview') void this.access.refresh();
    else void this.refresh();
  }

  private async refresh() {
    this.pending.set(true);
    const result = await Effect.runPromise(sessionRequest());
    this.apply(result);
  }

  private apply(result: { mode: 'paired'; csrf: string } | { mode: 'pairing' | 'unavailable' }) {
    this.csrf = result.mode === 'paired' ? result.csrf : '';
    this.mode.set(result.mode === 'unavailable' ? 'pairing' : result.mode);
    this.message.set(result.mode === 'unavailable' ? 'Session unavailable. Check the code or restart the local server.' : '');
    this.pending.set(false);
    if (result.mode === 'paired') void this.access.refresh();
  }

  async pair(event: Event, input: HTMLInputElement, main: HTMLElement) {
    event.preventDefault();
    if (this.pending()) return;
    this.pending.set(true);
    const code = input.value;
    input.value = '';
    const result = await Effect.runPromise(sessionRequest('pair', code));
    this.apply(result);
    if (result.mode === 'paired') main.focus();
  }

  async signOut() {
    if (this.pending()) return;
    this.pending.set(true);
    this.apply(await Effect.runPromise(sessionRequest('logout', this.csrf)));
  }
}

bootstrapApplication(App, { providers: [provideRouter(routes)] }).catch(() => {
  document.body.textContent = "Application unavailable.";
});
