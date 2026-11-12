import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SESSION_FEATURE } from './operator-ports';

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
export class App {
  readonly router = inject(Router);
  private readonly owner = inject(DestroyRef);
  private readonly session = inject(SESSION_FEATURE)(this.owner);
  readonly access = this.session;
  readonly mode = this.session.mode;
  readonly pending = this.session.pending;
  readonly message = this.session.message;
  constructor() {
    this.session.start(!!document.querySelector('meta[name="perfeng-console-preview"][content="true"]'));
  }
  async pair(event: Event, input: HTMLInputElement, main: HTMLElement) {
    event.preventDefault();
    if (this.pending()) return;
    const code = input.value;
    input.value = '';
    if (await this.session.pair(code) && !this.owner.destroyed) main.focus();
  }
  signOut() { return this.session.signOut(); }
}
