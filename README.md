# Perfeng Console

This repository owns the M05 operator console and Scenario Lab coding harness. The approved implementation sequence is in [tasks/plan.md](tasks/plan.md).

Use Linux with the exact Node version in `.node-version` and pnpm version in `package.json`. Run `make bootstrap` once to install the frozen development dependencies with package scripts disabled. Run `make verify` for the offline gate. Run `make hooks` to opt into staged-tree verification before committing.

Start with the [agent map](AGENTS.md) or the [harness guide](HARNESS.md).

## Angular workspace

Nx 24.0.4 orchestrates two separately built Angular 22.2.4 apps on TypeScript 6.0.3. apps/console owns the main UI shell. apps/scenario-lab owns the independent maintainer shell. Simulation execution belongs to later reviewed work. Both display an unconfigured-backend state.

Run make build for both, or NX_DAEMON=false node_modules/.bin/nx build console (or scenario-lab) for one app. Angular's standard application builder produces each distribution. Run make browser-test for regressions and tagged journeys. Explicit browser bootstrap is node_modules/.bin/playwright install chromium.

Run make guide to rebuild, execute only @user-guide journeys, and emit dist/user-guide/index.html, screenshots and source provenance. CI uploads this artifact after success. Untagged tests remain ordinary regressions. Failed, skipped or empty guide runs cannot publish. Source changes during capture invalidate the guide. The first chapter explains recognizing the unconfigured platform; future chapters should accompany asserted operator workflows. The owned loopback preview serves static builds and does not implement production BFF/authentication.

## Guide attribution

The optional narrator interface and owned-output protection are adapted from fleetiq-ui commit 173578f1fa2ba97a79f50f0499249f8609226f5d under Apache-2.0. See apps/web-e2e/user-guide/guide-narrator.ts and tools/user-guide/owned-output.mjs. This scaffold adapts narration into Playwright attachments and a reporter instead of copying FleetIQ's full video and qualification pipeline. Fresh capture contexts deny external/backend traffic and WebSockets. Never record live credentials or commit generated guide output.

[Angular builder](https://angular.dev/tools/cli/build) · [Playwright reporters](https://playwright.dev/docs/test-reporters#custom-reporters) · [Nx configuration](https://nx.dev/docs/reference/project-configuration)
