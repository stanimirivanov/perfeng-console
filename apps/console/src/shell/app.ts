import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SESSION_UI } from '../session/session-ui';
import { provideSession } from '../session/session.providers';
import { VERIFICATION_ACCESS } from '../verification/access.port';

@Component({
  selector: 'app-root',
  providers: provideSession(),
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly router = inject(Router);
  private readonly owner = inject(DestroyRef);
  private readonly session = inject(SESSION_UI);
  readonly access = inject(VERIFICATION_ACCESS);
  readonly mode = this.session.mode;
  readonly pending = this.session.pending;
  readonly message = this.session.message;
  async pair(event: Event, input: HTMLInputElement, main: HTMLElement) {
    event.preventDefault();
    if (this.pending()) return;
    const code = input.value;
    input.value = '';
    if (await this.session.pair(code) && !this.owner.destroyed) main.focus();
  }
  signOut() { return this.session.signOut(); }
}
