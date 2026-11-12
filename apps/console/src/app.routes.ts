import { inject } from "@angular/core";
import { Router, type Routes } from "@angular/router";
import { ConsoleHome } from './console-home';
import { VerificationAccess } from "./verification/access";

export const routes: Routes = [
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
