import { Injectable, signal } from "@angular/core";

// Private same-origin BFF capability probe. Only an explicit grant enables UI.
@Injectable({ providedIn: "root" })
export class VerificationAccess {
  readonly granted = signal(false);
  private revision = 0;

  async refresh(): Promise<boolean> {
    const current = ++this.revision;
    let granted = false;
    try {
      const response = await fetch("/console/api/verification/access", {
        credentials: "same-origin", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(3000),
      });
      granted = response.status === 204;
    } catch {
      // An absent provider or an expired session grants no access.
    }
    if (current !== this.revision) return false;
    this.granted.set(granted);
    return granted;
  }
}
