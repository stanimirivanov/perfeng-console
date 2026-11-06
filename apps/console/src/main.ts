import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
@Component({
  selector: "app-root",
  standalone: true,
  template: `<a href="#main">Skip to content</a>
    <main id="main">
      <h1>Perfeng Console</h1>
      <p>Open a Run from a CI link to inspect its evidence.</p>
      <p role="status">
        Backend unavailable — platform connection is not configured.
      </p>
      <button disabled>Open Run</button>
    </main>`,
})
class App {}
bootstrapApplication(App).catch(() => {
  document.body.textContent = "Application unavailable.";
});
