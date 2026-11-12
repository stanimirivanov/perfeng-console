# Perfeng Console

Build one browser application. Keep Verification lazy, visibly labeled and themed with local Material tokens. Require fresh same-origin confirmation before entering. The BFF must authorize actual operations. Never import the runner, server secrets or design fixtures. Read [browser guidance](../../src/browser/AGENTS.md).

Follow the [runtime ownership model](../../docs/development/runtime-ownership.md):
components, stores, operations, adapters and composition have distinct roles even
inside this single app. Register concrete role paths with their first implementation.
Verification uses the same rendering/state rules but never imports simulator authority.
Use the [pending harness rules](../../docs/development/harness-rules.md) to identify
required negative tests; do not treat this documentation as package admission.

## Feature map and entry rules

- `src/shell`: application chrome and local pairing UI; consumes session UI/provider entries.
- `src/session`: component-scoped CSRF/presentation owner, adapter/reader contract and application-scoped epoch coordinator/port.
- `src/runs`: exact lookup, readonly UI contract, store, operation and adapter; `detail` renders evidence.
- `src/verification`: lazy maintainer area, public capability port/provider, qualified adapter, application-scoped capability facade/store.
- Root `src/main.ts`, `app.config.ts`, `app.routes.ts`: bootstrap and configuration only.

Keep reader contracts separate from UI contracts, local to their owning feature.
Shared wire DTOs remain in `src/shared/contracts`. Register exact public entries in
`harness/angular-features.ts`; cross-feature access to private implementations is forbidden.
Components may call reviewed feature provider functions only directly in
`Component.providers` metadata. Facades/stores live in the component injector, never
root lifetime factories. Provider modules assemble dependencies without executing
Effects or native I/O. No new package authority follows from a folder or role.

Session replacement/logout/local-session denial invalidate the shared epoch before
clearing feature owners. Depend on session-boundary.port.ts across features, never
its private store or facade. Scoped 403/404 and provider outages clear affected
observations without global logout. The application epoch/capability owners are
explicit exceptions to component lifetimes; neither copies session presentation.
Unsubscribe on injector teardown; retain both epoch and local generation guards.
