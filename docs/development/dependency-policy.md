# Console dependency policy

Use exact Node and pnpm pins, exact direct package versions and the frozen lock.
Bootstrap with lifecycle scripts disabled. Preserve release-age protections.
Any exception needs a named version, reason, expiry and human review.
A package needs an immediate repository-owned use, official license/engine/peer evidence,
maintenance and vulnerability review, a replacement boundary and its ADR admission results.
A selected candidate is not admitted solely because its peer range matches.

Angular 22.2.4 and TypeScript 6.0.3 remain the accepted framework/compiler pair.
CLI/build and Material/CDK are 22.2.6. Vitest 5.1.0 and jsdom 31.0.0 own Angular tests;
Playwright 1.65.0 owns Chromium evidence. Nx 24.0.4 schedules the standard CLI.
NgRx SignalStore 22.0.1 and Effect 4.1.2 are admitted by the scoped compile,
cancellation, CSP, keyboard and dependency evidence in stack-admission.md.
Product-level accessibility and state orchestration still require their owning slices.
SignalStore owns session presentation; Effect owns bounded cancellable reads.
Neither replaces the pinned generated client, validator or platform decisions.

Record licenses, engines and peers from exact official registry manifests.
Keep generated lock changes with their admission evidence. Run frozen bootstrap,
make verify, make build, make browser-test and make supply-chain.
High-severity audit findings block delivery; scanner failure is an unavailable check.
Retain lower-severity findings and optional native/WASM peer warnings for review.

Reviewed major GitHub Action tags are permitted. Keep artifact digests, contract
checksums, dependency pins and reviewed sibling checkout identities exact.
No runtime schema fetching, telemetry endpoint or remote theme/font is implicitly admitted.
No arbitrary proxy origin. No dependency gains authority from documentation examples.
CSP exceptions follow ADR 0002 and explicit owner authorization.

## Official references

- [Angular CSP](https://angular.dev/best-practices/security#content-security-policy)
- [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store)
- [Pinned package metadata](https://registry.npmjs.org/)

## Node adapter admission — issue #33

@effect/platform-node 4.1.2 is admitted for the BFF Run reader only, paired with
Effect 4.1.2. MIT; Node >=22.19.0; current Node pin is 26.13.0. The exact registry
metadata, resolved fixture licenses and qualification history are recorded under
tools/qualification/effect-node. The root lock now pins the actual production graph.
Undici and Redis peers increase installed dependency weight; no Redis authority or
service is added. The selected Node HTTP backend exposes source.headersDistinct;
upgrades must repeat TLS, raw-header and cleanup tests before pin changes.
Existing peer warnings concern openapi-typescript's TypeScript range and optional
WASM @emnapi peers. They are not suppressed by this admission; keep them visible.

## Import harness admission — issue #41

Development-only dependency-cruiser 18.7.2 (MIT; Node ^22 || ^24 || >=26)
owns cross-owner cycle and forbidden graph-edge checks. User approved the pin.
@nx/eslint-plugin 24.0.4 (MIT) matches Nx 24.0.4 and supplies the requested
module-boundary lint rule. Registry peers are @typescript-eslint/parser ^8 and
eslint-config-prettier ^10; the frozen graph resolves the plugin.
No Angular ESLint or eslint-plugin-import direct dependency was added.
Both tools are replaceable behind make check-imports / make lint and add no runtime
authority. Install scripts remain disabled; release-age settings remain unchanged.
The existing openapi-typescript/TypeScript and optional @emnapi peer warnings remain
visible. Admission verification uses frozen bootstrap, full verify, audit and
negative fixtures proving lint/graph failure; receipts are reported with the change.

Official sources: [dependency-cruiser](https://github.com/sverweij/dependency-cruiser),
[Nx boundary rule](https://nx.dev/docs/kb/enforce-module-boundaries). Exact license,
engine and peer metadata was read from the npm registry for these versions.
