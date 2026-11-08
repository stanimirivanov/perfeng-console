# Ownership harness specification

Companion to [runtime ownership](runtime-ownership.md), tracked by
[issue #33](https://github.com/stanimirivanov/perfeng-console/issues/33).
This specifies the full target. The implementation receipt below distinguishes active structural sensors from pending product behavior.

## Existing baseline

harness/boundaries.ts checks src layer/package imports. harness/workspace.ts checks
Angular/workspace imports. harness/assets.ts checks source and distribution assets.
Existing BFF policy permits node:https throughout that layer; NgRx/Effect imports in
Angular are currently admitted only in spec files. The additional harness/ownership.ts sensor enforces the role policy described below; the full product behavior still needs its owning slices. Existing transport tests are security baselines to preserve.

## Required sensors

Each implementation must ship a permitted fixture and a forbidden fixture using the
actual scanner. Diagnostics identify file, location, rule ID and corrective ownership.
No new Make commands are proposed; extend the existing gates.

| ID | Required rule and positive case | Negative proof | Gate / implementation location |
|---|---|---|---|
| OWN-01 | Register production module roles; component consumes feature view, operation consumes port | Component/store imports concrete network adapter; operation imports store; unclassified new executable module | make architecture; harness/workspace.ts and harness/boundaries.ts |
| OWN-02 | Execute Effect only at registered composition/integration boundaries | runPromise/runFork/runtime construction in component or reusable operation, including renamed imports | make architecture; same scanners |
| OWN-03 | Permit HTTP, native abort and timer primitives only in explicitly admitted adapters/schedulers | fetch, XMLHttpRequest, Node HTTP, manual AbortController or setInterval in components/stores; globalThis and aliased forms | make architecture; AST checks plus resolved symbol provenance |
| OWN-04 | Pure presentation transforms may import generated types; shared contracts contain type declarations and type-only imports | Presentation or contracts import runtime authority; contracts contain executable declarations or have runtime consumers | make architecture; extend existing layer fixtures |
| OWN-05 | Browser consumes same-origin BFF; runner stays external | Server credentials/fault adapters imported through barrel, type-only, lazy or path-alias edges; design fixture in built output | make architecture and make build; existing scanners/assets |
| OWN-06 | Qualified server adapter preserves security contract | Wrong CA/hostname, redirect, repeated content-type, oversized or slow body, credential canary, invalid identity | make test; tests/integration/transport.test.ts |
| OWN-07 | Scope closure terminates work and releases resources | Disconnect/interrupt before headers and mid-body leaves socket or work alive; shutdown leaves request scopes running | make test; real local TLS and bounded cleanup assertions |
| OWN-08 | Single writer/scheduler and epoch-checked observations | Older report success after health outage; route teardown; session replacement; expired value on resume; overlapping pollers | make component-test and make browser-test; new focused fixtures |
| OWN-09 | Mutation interruption preserves uncertainty and intent identity | Timeout/reconnect causes redispatch or fabricates cancellation; forged/stale authority bypass | make test and make browser-test when mutation slice exists |
| OWN-10 | Contract bytes and runtime validation remain authoritative | Generated drift, invalid response accepted, Effect/generator adoption silently replaces Ajv | make contracts-check and make test; existing contract fixtures plus consumer tests |

Resolve aliases/re-exports to owners, inspect literal dynamic and type-only imports,
and reject computed module loading as today. Do not rely on filename substrings or
bare text grep for symbol restrictions. Cover .ts/.mts/.cts/.tsx or explicitly reject
unsupported executable extensions. Resolve workspace path aliases consistently with the
compiler. Allow framework-owned scheduling and transport internals inside dependencies;
these checks govern handwritten application ownership, not a ban on framework internals.

Static rules cannot prove one writer, eventual cleanup, secrecy, authorization or arbitrary
JavaScript behavior. OWN-06 through OWN-09 require behavioral evidence; do not label
these guarantees enforced solely because an import test passes. Capability checks remain
server-side even when the UI hides an action.

## Admission and rollout sequence

1. Review these documents and scoped instructions before transport edits.
2. Qualify exact browser/server APIs in isolated fixtures. Record failures and package
   admission needs; do not broaden production imports to make a probe compile.
3. Implement structural sensors with failing fixtures. Register narrow paths together
   with their consumers. During migration, any temporary legacy allowance must name the
   current src/bff/transport.ts, issue #33 and the replacement/removal step; no layer-wide exemption.
4. Replace the BFF transport with the qualified adapter and remove its temporary allowance
   in the same slice. Prove the old structure is rejected and all security tests still pass.
5. Implement the thin browser integration in its owning M05 slice. Admit NgRx/Effect only
   to the registered roles; prove one scheduler, invalidation and actual teardown.
6. Link tested production modules as canonical references. Never promote an uncompiled
   sketch or fixture-only implementation as the production pattern.

Keep behavior-preserving boundary extraction separate from behavior changes. Contract
providers and simulator ownership do not move. Roll back a consumer before removing its
adapter; do not weaken a security rule to restore a build. New sensors must distinguish
existing migration debt from admitted target code without hiding that debt.

## Verification and review

Documentation slice: git diff --check, local Markdown link checks and make architecture.
Implementation slices: focused gates above, then make verify; browser changes additionally
make browser-test; package changes require dependency admission and make supply-chain.
make harness-self-test proves aggregate failures where affected. Existing tests must stay
nonempty with no skipped/todo cases; record first failures and unavailable gates.

Review rationale comments at security decisions and non-obvious mappings. A dedicated
comment policy remains a later slice; this document does not claim its lint rules exist.
An owner/ticket comment rule needs structured validation, not a blanket TODO keyword ban.
Agent review is advisory until separately approved, isolated and specified; it cannot
replace deterministic gates or human review. No agent workflow is introduced here.

## Structural sensor receipt (2026-11-07, issue #33)

make architecture now runs harness/ownership.ts. It registers exact handwritten paths
under apps/console/src, src/browser, src/bff, src/presentation and src/shared, resolves module
edges using TypeScript configuration, and checks type/lazy/barrel edges, runtime
execution references, native/ambient I/O and unsupported executable extensions.
Existing package/asset scanners remain independent constraints; a role never admits a
new package. Only src/bff/transport.ts admits effect; src/bff/run-reader.ts additionally admits the
exact qualified HttpClient and Node adapter subpaths. No layer-wide Effect admission.

OWN-01 through OWN-04 now have executable structural fixtures. OWN-05 retains existing
browser/server/asset guards and adds role-edge checks. OWN-06/07 now exercise the production Node transport through real TLS and an isolated lifecycle host. OWN-08/09 remain pending their browser and
mutation slices. OWN-10 retains the existing offline contract/validator gates.

The transport legacy allowance is retired. One existing mixed-ownership module remains
frozen by SHA-256: apps/console/src/verification/access.ts (remove with the M05 browser integration
migration, before adopting its pattern for other features). Its current bytes pass;
edits fail until the allowance is retired in the reviewed migration. This exposes
existing debt without changing production code or giving a directory-wide exemption.

Runtime-name checks are deliberately conservative: reserved execution names are
restricted even when a local function has the same spelling. Import aliases and
namespace/global property forms are covered by fixtures; arbitrary reflective JavaScript
is not proven safe. Existing eval/loader prohibitions still apply. Admission of a new
adapter/composition module requires registry and negative-test review. A registered
role does not prove cleanup, authorization, secrecy or absence of duplicate state.

Issue #41 extends OWN-04 to the shared contract role. Browser imports resolve to the
exact reviewed observation DTO and must use declaration-level import type. The
product release gate also rejects runtime imports of that DTO. Phase 3 adds exact Node/TypeScript alias parity and named public entries; see
[import surfaces](import-surfaces.md). Broad import lint/cycle rules remain Phase 4.
