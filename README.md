# Perfeng Console

This repository owns the M05 operator console and Scenario Lab coding harness. The approved implementation sequence is in [tasks/plan.md](tasks/plan.md).

Use Linux with the exact Node version in `.node-version` and pnpm version in `package.json`. Run `make bootstrap` once to install the frozen development dependencies with package scripts disabled. Run `make verify` for the offline gate. Run `make hooks` to opt into staged-tree verification before committing.

Start with the [agent map](AGENTS.md) or the [harness guide](HARNESS.md).

## Angular workspace

Nx 24.0.4 builds one Angular 22.2.4 browser app on TypeScript 6.0.3. The Console owns the ordinary Run journey and the lazy Verification → Scenario Lab area. Its violet Material theme and maintainer label distinguish it from ordinary operations. The optional runner remains outside the browser; installing the console never grants fault permissions.

The scaffold probes the same-origin BFF at `GET /console/api/verification/access`. Only an explicit 204 response reveals the link, and navigation rechecks the grant. An unavailable or unconfigured BFF keeps the route closed. This is a private UI capability probe, not a public platform endpoint. The server-side session and operation authorization slices remain pending. The loopback preview does not implement this endpoint. Chromium tests intercept it with test-owned grants. Inside the area, the unconfigured runner leaves campaigns disabled.

Run `make verify` for harness and Angular unit tests, `make build` for the Console distribution, and `make browser-test` for Chromium regressions. To install the pinned browser use `node_modules/.bin/playwright install chromium`.

Run make guide to rebuild, execute only @user-guide journeys, and emit dist/user-guide/index.html, screenshots and source provenance. CI uploads this artifact after success. Untagged tests remain ordinary regressions. Failed, skipped or empty guide runs cannot publish. Source changes during capture invalidate the guide. The first chapter explains recognizing the unconfigured platform; future chapters should accompany asserted operator workflows. The owned loopback preview serves static builds and does not implement production BFF/authentication.

## Guide attribution

The optional narrator interface and owned-output protection are adapted from fleetiq-ui commit 173578f1fa2ba97a79f50f0499249f8609226f5d under Apache-2.0. See apps/web-e2e/user-guide/guide-narrator.ts and tools/user-guide/owned-output.mjs. This scaffold adapts narration into Playwright attachments and a reporter instead of copying FleetIQ's full video and qualification pipeline. Fresh capture contexts deny external/backend traffic and WebSockets. Never record live credentials or commit generated guide output.

[Angular builder](https://angular.dev/tools/cli/build) · [Playwright reporters](https://playwright.dev/docs/test-reporters#custom-reporters) · [Nx configuration](https://nx.dev/docs/reference/project-configuration)

For the local operator session, build the console and start the HTTPS server with a
certificate trusted by your browser for the IP address `127.0.0.1`.

```sh
make build
node tools/serve-console.ts /path/to/cert.pem /path/to/key.pem
```

Open `https://127.0.0.1:4310` and enter the pairing code shown in the server terminal.
The code expires after five minutes or five failed attempts. A successful pairing
consumes it. The session expires after 15 minutes without a successful session read
or eight hours after pairing, whichever comes first. The server stores the grant
in memory. Restart it to obtain a fresh code after sign-out, expiry or lockout.
Keep the terminal and private key local to the operator.

Build a versioned console archive with `make console-release`. The version comes
from the console package manifest. Extract the archive into a fresh directory and
run its entry point with the pinned Node version and your loopback certificate.

```sh
tar -xzf dist/releases/perfeng-console-0.1.0.tar.gz -C /path/to/empty-install-directory
node /path/to/empty-install-directory/tools/serve-console.mjs /path/to/cert.pem /path/to/key.pem
```

The archive contains the browser distribution, bundled HTTPS entry, license, and
`release.json` identity. The installed entry resolves browser assets from its own
location. Use the previous archive to roll back the product. The verifier has its
own release lifecycle and can pin the console identity independently.

`make console-isolation-check` runs a frozen install and build from selected product
sources, extracts the archive into a second directory, and verifies HTTPS pairing
in Chromium. It requires the repository's pinned toolchain, installed Chromium,
OpenSSL and tar.
