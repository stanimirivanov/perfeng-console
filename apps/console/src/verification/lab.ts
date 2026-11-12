import { VERIFICATION_ACCESS } from './access.port';
import { Component, inject } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-scenario-lab",
  imports: [MatButton, RouterLink],
  host: { class: "verification-area" },
  template: `
    @if (access.granted()) {
    <p class="workspace-label">Verification · Maintainer area</p>
    <h1>Scenario Lab</h1>
    <p role="status">Runner unavailable — campaign execution is not configured.</p>
    <button matButton disabled>Start campaign</button>
    } @else { <p role="alert">Verification unavailable.</p> }
    <p><a routerLink="/">Return to Console</a></p>
  `,
})
export class ScenarioLab { readonly access = inject(VERIFICATION_ACCESS); }
