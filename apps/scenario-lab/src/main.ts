import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
@Component({
  selector: "app-root",
  standalone: true,
  template: `<a href="#main">Skip to content</a>
    <main id="main">
      <h1>Scenario Lab</h1>
      <p>Maintainer verification is not configured.</p>
      <p role="status">
        Backend unavailable — platform connection is not configured.
      </p>
      <button disabled>Start campaign</button>
    </main>`,
})
class App {}
bootstrapApplication(App).catch(() => {
  document.body.textContent = "Application unavailable.";
});
