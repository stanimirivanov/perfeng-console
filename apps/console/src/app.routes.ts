import { inject } from "@angular/core";
import { Router, type Routes } from "@angular/router";
import { ConsoleHome } from './runs/run-lookup';
import { VERIFICATION_ACCESS } from "./verification/access.port";

export const routes: Routes = [
  { path: "", pathMatch: "full", component: ConsoleHome },
  {
    path: "verification",
    canMatch: [async () => {
      const router = inject(Router);
      return await inject(VERIFICATION_ACCESS).refresh() || router.parseUrl("/");
    }],
    loadComponent: () => import("./verification/lab").then(module => module.ScenarioLab),
  },
  { path: "**", redirectTo: "" },
];
