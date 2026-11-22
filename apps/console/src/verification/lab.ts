import { VERIFICATION_ACCESS } from './access.port';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-scenario-lab',
  imports: [MatButton, RouterLink],
  host: { class: 'verification-area' },
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
})
export class ScenarioLab { readonly access = inject(VERIFICATION_ACCESS); }
