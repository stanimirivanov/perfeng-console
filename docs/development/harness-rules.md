# Ownership harness specification

This is the enforcement-status index, companion to [runtime ownership](runtime-ownership.md).
The model originated in [issue #33](https://github.com/stanimirivanov/perfeng-console/issues/33);
[H1 / issue #49](https://github.com/stanimirivanov/perfeng-console/issues/49) reconciles the map
after merged [PR #48](https://github.com/stanimirivanov/perfeng-console/pull/48).
Executable policies enforce rules; documentation does not admit code or packages.
Use [HARNESS.md](../../HARNESS.md#sensors-and-failure-handling) for commands and the
single [alias table](../IMPORTS.md#reviewed-aliases) for public surfaces.

## Current baseline

The qualified BFF transport has retired native upstream dispatch and its legacy
allowance. Exact package paths are admitted in transport.ts/run-reader.ts; TLS,
raw headers, limits, identity and lifecycle have behavioral tests. The incoming
HTTPS server in tools is a separate boundary, not an upstream transport exception.

Production Angular admission is narrow: Effect in main.ts, session-client.ts and
run-client.ts; NgRx in run-detail-store.ts. run-detail.ts renders inputs; the store
writes Run/artifact observations and bounded session history. Existing Chromium
fixtures cover lookup freshness, late results, reconnect and evidence claims.
`main.ts` still declares components while registered as composition: that grants
those components execution authority. This is debt, not an example to copy.
VerificationAccess remains a separate exact hash-bound mixed-ownership allowance.
Neither admission proves a shared-session coordinator, general polling or mutation
lifetimes. Those behaviors remain pending.

## Scanner coverage

These scopes are distinct; a check passing in one row does not extend another.

| Sensor | Roots / extensions | Active checks | Exclusions and limits |
|---|---|---|---|
| boundaries.ts | src; .ts/.tsx/.d.mts; rejects other non-document/style formats except exact generated artifacts | Layer/package edges, loaders, literal imports, aliases/config inheritance, scoped-guide presence | No apps/tools scan; generated JS/manifest bytes belong to contracts-check |
| workspace.ts | apps/console/src; .ts (including specs) | Browser package/local-import and inline-template/theme resource policy | Other executable extensions are skipped here; ownership currently rejects them, not a demonstrated aggregate bypass |
| ownership.ts | apps/console/src; src/browser,bff,presentation,shared; executable .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs candidates | Exact role registry, role edges, runtime execution and selected I/O names; unsupported formats rejected after registration | .spec.ts excluded; no tools/scenarios/simulator/generated role scan; reflective JS and all schedulers are not proven covered |
| project-imports.ts / public-boundaries ESLint | apps,src,tools,tests,harness,scripts; JS/TS variants plus CSS/SCSS resources in CLI | Owner-relative edges, exact aliases, literal/type/lazy imports, symlinks, narrow qualification exceptions | node_modules omitted; generated directory names are not exclusions; no runtime-lifetime proof |
| check-imports.ts / dependency-cruiser | Same six roots; resolved runtime/type graph | Alias parity, unresolved product imports, module/owner cross-owner cycles, presentation isolation | Does not follow installed dependencies; optional qualification outputs are outside unresolved-product gate |
| assets.ts | Reviewed Angular build inputs and emitted browser distribution | Local Material resource admission, known secret/fixture/execution markers, distribution symlink refusal | Known-marker regression check, not general secret detection; binary robustness work remains H9 |
| product-release.ts | Exact server source/dependency closure | Reviewed bundle inputs, built-ins, type-only shared DTO use, external dependency closure | Not a compiler/role registry for all tools; installed isolation requires its separate target |

`make typecheck` checks the explicit production-tools Node program first, then
root Node and e2e programs. `tools/tsconfig.json` extends the strict Node root and
selects serve-console.ts, console-server.ts and public-api.ts with an empty include
list, so test/qualification roots are not inherited. Imported production dependencies
remain checked. Configuration inheritance and paths/baseUrl guards include this
exact consumer. Angular AOT/strict templates are checked by build in make verify.
The compiler-inventory regression is tests/harness/compiler-coverage.test.ts.
Injected CLI/server TS2322 probes run in the existing CI harness-self-test and
restore their temporary source even on failure. This does not add tools runtime
ownership, JavaScript typechecking or qualification-package admission (H7 remains).

## Required sensors

Each implementation must ship a permitted fixture and a forbidden fixture using the
actual scanner. Diagnostics identify file, location, rule ID and corrective ownership.
No new Make commands are proposed; extend the existing gates.

| ID | Required rule and positive case | Negative proof | Gate / implementation location |
|---|---|---|---|
| OWN-01 | Register production module roles; component consumes feature view, operation consumes port | Component/store imports concrete network adapter; operation imports store; unclassified new executable module | make architecture; harness/ownership.ts plus workspace.ts/boundaries.ts |
| OWN-02 | Execute Effect only at registered composition/integration boundaries | runPromise/runFork/runtime construction in component or reusable operation, including renamed imports | make architecture; harness/ownership.ts |
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
   exact module, owning issue and replacement/removal step; no layer-wide exemption.
   The former src/bff/transport.ts allowance is already retired.
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

Review rationale comments under the [contribution policy](../../CONTRIBUTING.md#rationale-comments-and-review).
There is no comment-presence or comment-quality linter. New mechanical enforcement
requires permitted/forbidden fixtures, not prose claiming it exists.

## Semantic review duties

Human review checks whether the change solves the agreed problem, misunderstands
requirements, adds unnecessary features or creates costly abstractions. Structural
and behavioral tests do not settle those questions. Optional isolated AI review is
advisory, explicitly authorized and cannot replace human review or deterministic
gates. No automated AI review workflow is introduced. The
[PR template](../../.github/pull_request_template.md) records the recurring-mistake
example, executable proof, corrective guide and remaining judgment.

## Remaining hardening

The approved H1–H10 remediation identifiers are not M05 PR numbers. H1 changes
only guides and review process. H2 adds the compiler checks described above;
the other rows remain pending and are not new admissions.

| Task | Remaining scope |
|---|---|
| H2 | Implemented in [issue #51](https://github.com/stanimirivanov/perfeng-console/issues/51): explicit production-tool compiler coverage and injected CLI/server type-error proof |
| H3 | Workspace extension coverage and scheduling authority classification |
| H4/H5 | Mechanical Angular extraction, then runtime integration; enforce component/composition separation only with migration |
| H6 | Shared-session denial/epoch coordination and VerificationAccess allowance retirement; scoped resource denial must not fabricate global logout |
| H7 | Exact incoming server/CLI/preview tools ownership and native-I/O admission |
| H8 | Corrective diagnostics, generation-lock guidance and automated alias-document parity |
| H9 | Byte-safe distribution scanning without skipping binary files |
| H10 | Measured CI duplication/cache improvements; release-age exception disposition; retain full staged verification by default |

The Playwright minimumReleaseAgeExclude entries name versions but lack durable
reason/expiry records required by dependency-policy.md. H1 reports the gap; H10
must remove unnecessary matured exclusions or obtain a real scoped approval.
Do not invent historical authorization or silently renew them.

## Structural sensor receipt (2026-11-07, issue #33; historical scope)

make architecture now runs harness/ownership.ts. It registers exact handwritten paths
under apps/console/src, src/browser, src/bff, src/presentation and src/shared, resolves module
edges using TypeScript configuration, and checks type/lazy/barrel edges, runtime
execution references, native/ambient I/O and unsupported executable extensions.
Existing package/asset scanners remain independent constraints; a role never admits a
new package. Within src/bff, transport.ts admits effect; run-reader.ts additionally admits the
exact qualified HttpClient and Node adapter subpaths. No layer-wide Effect admission.

OWN-01 through OWN-04 now have executable structural fixtures. OWN-05 retains existing
browser/server/asset guards and adds role-edge checks. OWN-06/07 now exercise the production Node transport through real TLS and an isolated lifecycle host. OWN-08 has since gained the narrow Run-detail browser evidence above; general
session/polling coverage and OWN-09 mutation behavior remain pending. OWN-10 retains the existing offline contract/validator gates.

The transport legacy allowance is retired. One exact mixed-ownership allowance remains
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
[import surfaces](import-surfaces.md). Phase 4 import lint/cycle rules are active; see the scanner coverage above.
