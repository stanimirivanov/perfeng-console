import { lookupRun } from './run-client';
import { RunDetailView } from './run-detail';
import { RunDetailStore } from './run-detail-store';
import { MatButtonModule } from '@angular/material/button';
import { Effect, Fiber } from 'effect';
import { sessionRequest } from './session-client';
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Router, RouterLink, RouterOutlet, Routes } from "@angular/router";
import { VerificationAccess } from "./verification/access";

@Component({
  selector: "app-home",
  imports: [RunDetailView, MatButtonModule],
  providers: [RunDetailStore],
  template: `
    <h1>Perfeng Console</h1>
    <h2>Find a Run</h2>
    <p id="lookup-help">Enter an exact Run ID. Run listing and history are unavailable.</p>
    <form (submit)="find($event, id.value)">
      <label for="run-id">Run ID</label>
      <input id="run-id" #id required maxlength="100" autocomplete="off" spellcheck="false"
        aria-describedby="lookup-help" (input)="invalidate('Ready to look up this Run.')">
      <button type="submit">Look up Run</button>
    </form>
    <p role="status">{{ status() }}</p>
    @if (run(); as record) {
      <button matButton type="button" (click)="find($event, record.id)">Refresh Run detail</button>
      <app-run-detail [run]="record" [artifacts]="detail.artifacts()" [observations]="detail.observations()" />
    }
  `,
  host: {
    '(window:offline)': "invalidate('Connection unavailable. Run evidence cleared.')",
    '(window:online)': "invalidate('Connection restored. Look up the Run again.')",
    '(document:visibilitychange)': 'visibilityChanged()',
  },
})
class ConsoleHome {
  readonly status = signal('Ready for exact Run lookup.');
  readonly detail = inject(RunDetailStore);
  readonly run = this.detail.run;
  private generation = 0;
  private pending?: Fiber.Fiber<void>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.invalidate(''));
  }

  invalidate(message: string, preserveObservations = false) {
    this.generation++;
    if (this.pending) Effect.runFork(Fiber.interrupt(this.pending));
    this.detail.clear(preserveObservations);
    this.status.set(message);
  }

  visibilityChanged() {
    if (document.hidden) this.invalidate('Look up the Run again to see current evidence.');
  }

  find(event: Event, id: string) {
    event.preventDefault();
    this.invalidate('Looking up Run…', true);
    if (!navigator.onLine) {
      this.status.set('Connection unavailable. Try again when connected.');
      return;
    }
    const generation = this.generation;
    const started = performance.now();
    this.pending = Effect.runFork(Effect.gen({ self: this }, function* () {
      const result = yield* lookupRun(id.trim());
      if (this.generation !== generation) return;
      if ('message' in result) {
        this.detail.clear();
        this.status.set(result.message);
        return;
      }
      // Charge transit and processing against the lifetime so network delay never extends freshness.
      const remaining = result.observation.validForMs - (performance.now() - started);
      if (remaining > 0) {
        if (!this.detail.observe(result.observation.value, result.artifacts)) {
          this.detail.clear();
          this.status.set('Run observation inconsistent. Look up the Run again.');
          return;
        }
        this.status.set('Current Run evidence loaded.');
        yield* Effect.sleep(remaining);
      }
      if (this.generation === generation) {
        this.detail.clear();
        this.status.set('Run evidence expired. Look up the Run again.');
      }
    }));
  }
}

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
      @if (mode() === 'paired' || mode() === 'preview') { <router-outlet /> }
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
