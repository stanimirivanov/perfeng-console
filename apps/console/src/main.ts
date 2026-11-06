import { Component, inject } from "@angular/core";
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
    <nav aria-label="Workspace">
      <a routerLink="/">Console</a>
      @if (access.granted()) { <a routerLink="/verification">Verification</a> }
    </nav>
    <main id="main" tabindex="-1"><router-outlet /></main>
  `,
})
class App {
  readonly router = inject(Router);
  readonly access = inject(VerificationAccess);
  constructor() {
    void this.access.refresh();
  }
}

bootstrapApplication(App, { providers: [provideRouter(routes)] }).catch(() => {
  document.body.textContent = "Application unavailable.";
});
