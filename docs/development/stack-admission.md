# M05-PR1 stack admission evidence

Checked 2026-11-06 against exact official registry manifests. Existing scaffold packages remain provisional for production use.

| Package | Version | License | Node engine |
|---|---|---|---|
| @angular/cdk | 22.2.6 | MIT | not declared |
| @angular/common | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/compiler | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/core | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/forms | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/material | 22.2.6 | MIT | not declared |
| @angular/platform-browser | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/router | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| rxjs | 7.8.2 | Apache-2.0 | not declared |
| tslib | 2.8.1 | 0BSD | not declared |
| @angular/build | 22.2.6 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/cli | 22.2.6 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @angular/compiler-cli | 22.2.4 | MIT | ^22.22.3 || ^24.15.0 || >=26.0.0 |
| @playwright/test | 1.65.0 | Apache-2.0 | >=20 |
| @types/node | 26.6.6 | MIT | not declared |
| eslint | 10.14.0 | MIT | ^20.19.0 || ^22.13.0 || >=24 |
| jsdom | 31.0.0 | MIT | ^22.22.2 || ^24.15.0 || >=26.0.0 |
| nx | 24.0.4 | MIT | not declared |
| typescript | 6.0.3 | Apache-2.0 | >=14.17 |
| typescript-eslint | 8.72.1 | MIT | ^18.18.0 || ^20.9.0 || >=21.1.0 |
| vitest | 5.1.0 | MIT | ^22.12.0 || ^24.0.0 || >=26.0.0 |
| @ngrx/signals | 22.0.1 | MIT | not declared |
| effect | 4.1.2 | MIT | not declared |

## Executed admission evidence

The strict-CSP regression initially failed on the lazy Material route with four blocked inline style insertions. The owner authorized per-response style nonces on 2026-11-06. The BFF-owned renderer uses 32 random bytes per response, binds the same nonce to Angular and the style policy, and sends Cache-Control: no-store. The loopback server uses this renderer; the production BFF must use the same boundary when implemented.

Executed checks after the exception:
- Frozen install with scripts disabled and production build passed.
- make verify passed harness checks, 19 harness tests and four Angular tests.
- make browser-test passed 11 Chromium tests, including positive CSP, fresh nonce/cache headers and deliberate mismatched nonce refusal.
- make stack-admission compiled the exact selected Angular/Material/NgRx/Effect stack in an isolated entry, then passed a real Material dialog keyboard/focus check with zero CSP violations, page errors or external requests.
- SignalStore invalidation and Effect fiber cancellation passed component-test execution.
- make guide passed its tagged journey. Source and build digests remain bound to capture.
- make supply-chain passed the high threshold with one moderate finding. Optional WASM peer warnings remain visible.

The isolated build is 399.76 kB initial / 101.08 kB estimated transfer in the observed build. It includes the fixture, framework and Material dialog, so it is not an incremental Effect-only measurement. Fixture sources never enter the product entry. The candidate packages are admitted for the scoped stack; actual product state/session orchestration remains future work.

## Remaining acceptance boundaries

PR2 adds reviewed asset-input restrictions, known secret/fixture distribution canaries, invalid-template/failing-component aggregate probes and all-runner skip accounting. New asset mechanisms still require their own negative fixtures. PR8 owns digest-bound expectation admission. Full WCAG conformance, real session expiry, authenticated credential-canary checks, report polling and live-update accessibility remain future runtime acceptance. The keyboard/name/focus checks here qualify the admission fixture only. No live cluster or platform mutation ran.

Official Angular guidance requires a fresh server-generated nonce for dynamically inserted styles. ADR 0002 remains the source for the narrow exception. The policy contains no unsafe-inline or unsafe-eval. No API credentials or runner were introduced.
