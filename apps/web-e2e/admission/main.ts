// Admission fixture only; excluded from the production entry point.
import { Component, inject } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatButton } from "@angular/material/button";
import { signalStore, withState } from "@ngrx/signals";
import { Effect } from "effect";

const Store = signalStore(withState({ label: "Admission fixture only" }));
@Component({
  template: '<h2 mat-dialog-title>Admission dialog</h2><mat-dialog-content>Keyboard and nonce fixture</mat-dialog-content><mat-dialog-actions><button matButton mat-dialog-close>Close</button></mat-dialog-actions>',
  imports: [MatDialogModule, MatButton],
})
class Dialog {}
@Component({
  selector: "app-root",
  providers: [Store],
  imports: [MatButton],
  template: '<h1>{{ store.label() }}</h1><p>{{ result }}</p><button matButton (click)="open()">Open dialog</button>',
})
class Admission {
  readonly store = inject(Store);
  readonly dialog = inject(MatDialog);
  readonly result = Effect.runSync(Effect.succeed("Effect compiled"));
  open() { this.dialog.open(Dialog); }
}
bootstrapApplication(Admission);
