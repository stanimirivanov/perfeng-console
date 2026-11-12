# Runtime and state ownership

Origin: ownership specification for [issue #33](https://github.com/stanimirivanov/perfeng-console/issues/33).
The user approved the ownership model, sensors and Node adapter qualification.
Issue #33 implements the qualified BFF adapter; PR #48 adds the narrow Run-detail
browser admission below. The matrix describes the target ownership model; the
[enforcement index](harness-rules.md) separates active checks from pending work.

## Decision and scope

[ADR 0002](../decisions/0002-ui-technology-stack.md) establishes Angular rendering,
SignalStore presentation state and Effect-managed asynchronous browser reads.
This document makes those responsibilities actionable and records the approved
extension to Effect-managed BFF operations. It does not change the M05 product
scope, provider authority, dependency pins or independent verifier release gates.

Use Effect for application operations whose correctness depends on I/O lifetime,
concurrency, cancellation, time or resource cleanup. Its value is composable typed
failures, explicit dependencies, scoped cleanup and bounded execution. Merely wrapping
an unmanaged Promise does not supply these guarantees. Use plain TypeScript for pure
calculations; use Angular for rendering and framework lifecycle integration.

## Ownership matrix

| Concern | Owner | Boundary |
|---|---|---|
| Rendering, routing, forms, focus and accessibility | Angular components and framework services | Render readonly observations; emit operator intent; no provider I/O |
| Local interaction state | Angular signals | Local form/expansion state; computed derivations; do not duplicate shared observations |
| Feature observations | NgRx SignalStore | Single writer per observation; immutable completion events; no second Effect/RxJS cache |
| Session/provider invalidation | Session-scoped SignalStore coordinator | Own invalidation epochs; feature stores apply them before publishing results |
| Reads, polling, deadlines and bounded concurrency | Effect application operations | One scheduler per observation; narrow client ports; no UI state ownership |
| Browser HTTP | Same-origin BFF adapter | No provider URL or bearer; preserve session/CSRF protocol |
| BFF requests and upstream resources | Effect operations and qualified server adapter | Fixed destination, server credentials, TLS and safe result projection |
| Browser–BFF DTOs | Pure TypeScript in src/shared/contracts | Data-only contracts; no framework, runtime or I/O; generated provider types and validation remain authoritative |
| Safe provider-to-DTO projection | BFF boundary | Remove private failure messages/storage locations; do not confer artifact-content verification |
| Display models and comparisons | Pure TypeScript in src/presentation | No Angular, NgRx, Effect runtime or I/O; no recomputed scientific verdicts |
| Provider shapes and validation | Pinned generated types and Ajv | Offline generation; no runtime schema fetching or hand-authored replacement wire types |
| Framework Observable interoperability | Narrow Angular boundary adapter | RxJS does not become a competing polling, retry or state system |
| Platform state, authorization and audit | Control plane through public contracts | UI affordances do not confer permission; BFF checks do not replace provider authorization |
| Scenario execution and approval journal | Separate simulator process | No runner/fault authority in browser or BFF; independent acceptance gates |
| Expected-vs-actual evaluation | Independent evaluator | Frozen expectations; immutable observations; no execution authority |

## Dependency direction and placement

Keep existing top-level layers. Within apps/console/src, distinguish component,
store, operation, adapter and composition responsibilities in the module policy.
Concrete module paths must be registered with their role when the first consumer
is implemented; this document does not create empty feature directories.

Components consume feature interfaces and readonly store views. Stores dispatch
operation intents and accept completion events through a narrow integration service.
Operations depend on client ports; adapters implement those ports. Composition roots
wire concrete adapters and dependencies. Operations cannot import components or stores.
The integration service delivers events; it does not keep a duplicate observation cache.

Angular DI owns the browser integration service. Effect services supply operation
dependencies inside that boundary; do not mirror the entire Angular service graph.
The BFF has its own composition root and runtime. No cross-process runtime singleton.
Keep shared browser–BFF DTOs in src/shared/contracts, free of Effect types. Keep generated clients and validators
in their existing ownership boundaries; do not edit generated source to fit an adapter.

## Lifetimes and completion

- Create runtimes only at registered composition/integration entry points. Reusable
  operations return Effects; they do not call runPromise/runFork or detach work.
- Route acquisitions end with their owning route. Shared acquisitions belong to an
  explicit session owner with subscriber lifetime accounting, not whichever component
  happened to start them. Logout/configuration change closes old work and invalidates it.
- BFF process resources and per-request scopes are separate. Client disconnect,
  deadline and shutdown close the appropriate scope. Cleanup must stop underlying I/O,
  including body reads; a resolved cancellation result alone is insufficient.
- One Effect scheduler owns polling/deadlines. Preserve ADR 0002's 5 s polling,
  3 s read deadline and maximum 10 s validity; honor an earlier BFF validity bound.
- Capture session, resource/scope, provider generation, request sequence and local
  endpoint/provider epochs at dispatch. Advance epochs before clearing failed data.
  Accept completion only if those identities remain admissible and revisions/immutable
  fields remain compatible. Cancellation does not replace this late-result guard.
- Expire live observations using the ADR's conservative monotonic timing rule.
  Revalidate on resume; health recovery cannot restore an old report. Keep explicitly
  dated historical receipts distinct from current live observations.

## Errors, mutations and validation

Use Data.TaggedError for expected failures inside handwritten Effect operations.
Preserve contract error vocabulary and map to safe public result unions at process/UI
boundaries. Do not serialize raw causes, credentials or provider bodies. Defects remain
visible through safe diagnostics; do not turn all defects into ordinary successful values.
Pure validation functions may return discriminated unions without constructing Effects.

Effect may bound mutation execution, but cannot undo a dispatched mutation or establish
permission. No automatic mutation retries. Preserve stable intent/idempotency identity
and an explicit uncertain outcome; reconcile through public APIs before any further action.
Check current session, capability, target and approval at the authority-owning boundary.
Browser interruption must not claim the upstream mutation was cancelled.

Retain openapi-typescript and Ajv. Effect runtime adoption does not qualify an OpenAPI
generator, authorize an alternate validator or permit broader imports. Validate untrusted
inputs/outputs at boundaries; keep trusted internal transformations pure.

## Server adapter admission

Qualify the exact pinned Effect APIs and platform implementation before replacement.
The qualified Node reader and composition boundary are implemented under src/bff.
Exact import admission is enforced by harness/boundaries.ts and harness/ownership.ts.

Require real TLS evidence for fixed HTTPS origin, explicit CA, hostname verification,
TLS minimum, server-only bearer, redirect refusal, strict media/encoding handling,
duplicate-header detection, bounded bytes and whole-operation timeout. Preserve safe
status mapping and generated Run identity validation. A client that normalizes away
required duplicate-header evidence does not qualify without an equivalent proven check.

Native HTTP, filesystem and AbortSignal interoperability belongs only in reviewed
platform adapters. Prefer the qualified Effect HTTP interface for dispatch. If a low-level
bridge is necessary, record the gap, exact path/imports, threat model and negative tests
before admission. Do not silently fall back to a handwritten transport in application code.

## References and limits

- [Angular signals](https://angular.dev/guide/signals): rendering dependencies and computed state.
- [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store): presentation-state composition.
- [Effect 4 fibers](https://effect.website/docs/v4/concurrency/fibers) and
  [scopes](https://effect.website/docs/v4/resource-management/scope): interruption and resource lifetime.
- [Harness rule specification](harness-rules.md): required proof and enforcement status.

Pinned baseline: Angular 22.2.4, NgRx signals 22.0.1, Effect 4.1.2 and TypeScript 6.0.3.
Documentation establishes intended semantics, not exact adapter compatibility. The existing
stack test proves an abort callback is reached, not full network cleanup. Production adapter evidence is in tests/integration/transport.test.ts. Narrow Run
freshness/browser evidence is in apps/web-e2e/tests/runs.spec.ts and run-detail.spec.ts;
general session coordination and mutation lifetimes remain unimplemented.

## Run-detail browser admission (M05-PR22)

`apps/console/src/run-detail-store.ts` is the sole SignalStore writer for the
Run-detail observation, safe artifact claims and the bounded session observation
log. `run-detail.ts` renders readonly inputs. H4 mechanically moves the existing
Run component to `console-home.ts`; its temporary composition role admits the
unchanged Effect fiber, generation guard and teardown. The shell is in `app.ts`,
routes in `app.routes.ts`, and main.ts only bootstraps them. The two mixed component
files are frozen until H5, not component reference patterns. See the
[H4 extraction receipt](harness-rules.md#h4-extraction-receipt). `run-client.ts`
owns same-origin bounded reads. Refresh keeps only actually observed revisions
for the same Run; invalidation removes evidence. This narrow feature admission
does not implement general shared-session coordination, polling or mutation
ownership. The existing Verification adapter allowance remains frozen.

The BFF uses the generated `#perfeng/run-transitions` entry to project pinned
topology. The browser consumes it as DTO data, without fetching schemas or
importing a provider runtime. Artifact-list reads share the qualified Node reader
and never confer artifact-body access. The standalone release inventory includes
the generated transition entry.
