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
})
export class App {
  private readonly router = inject(Router);
  private readonly owner = inject(DestroyRef);
  private readonly session = inject(SESSION_UI);
  protected readonly access = inject(VERIFICATION_ACCESS);
  protected readonly mode = this.session.mode;
  protected readonly pending = this.session.pending;
  protected readonly message = this.session.message;

  protected get skipTarget() { return this.router.url.split('#')[0] + '#main'; }

  protected async pair(event: Event, input: HTMLInputElement, main: HTMLElement) {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    const code = input.value;
    input.value = '';
    if (await this.session.pair(code) && !this.owner.destroyed) {
      main.focus();
    }
  }
  protected signOut() { return this.session.signOut(); }
}
