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

Production Angular admission is narrow: Effect in the exact runs/session adapters,
runs/run.operation.ts and feature facades; NgRx in runs/run.store.ts and
session/session.store.ts. Feature-local reader contracts admit only type-only Effect
imports. Shell and Run components consume readonly UI ports, not concrete clients or
runtimes. Component metadata installs feature providers in the component injector.
Main bootstraps app.config.ts; app.routes.ts is a framework integration/configuration
boundary. Provider modules assemble dependencies but cannot execute Effects or I/O. Only registered composition/integration roles execute Effects; component
or directive declarations require the component role, including imported aliases;
adapter/store relabeling cannot evade the declaration check either.
Verification access now has a native adapter, Effect integration and SignalStore;
its mixed-ownership hash allowance is retired. A shared epoch store invalidates
session presentation, Run observations and capability reads together. General
polling, upstream health/provider epochs and mutation uncertainty remain pending.

## Scanner coverage

These scopes are distinct; a check passing in one row does not extend another.

| Sensor | Roots / extensions | Active checks | Exclusions and limits |
|---|---|---|---|
| boundaries.ts | src; .ts/.tsx/.d.mts; rejects other non-document/style formats except exact generated artifacts | Layer/package edges, loaders, literal imports, aliases/config inheritance, scoped-guide presence | No apps/tools scan; generated JS/manifest bytes belong to contracts-check |
| workspace.ts | apps/console/src; .ts (including specs); rejects alternate executable JS/TS formats at every depth | Browser package/local-import and inline-template/theme resource policy; source symlinks refused | Unsupported formats do not gain admission from an installed parser or a spec-like filename |
| ownership.ts | apps/console/src; src/browser,bff,presentation,shared; executable .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs candidates | Exact role registry, role edges, runtime execution and selected I/O names; unsupported formats rejected after registration | .spec.ts excluded; no tools/scenarios/simulator/generated role scan; reserved scheduling names are checked; reflective JS and arbitrary resource cleanup are not proven safe |
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

## Native scheduling scope

[H3 / issue #53](https://github.com/stanimirivanov/perfeng-console/issues/53) adds
queueMicrotask, setImmediate, requestAnimationFrame, requestIdleCallback and
scheduler.postTask to OWN-03 scheduling authority. `scheduler` and `postTask` are
reserved names too: acquiring/renaming the scheduling object must not hide its
calls. Like the existing runtime-name checks, this is deliberately conservative
and also rejects same-spelled local identifiers outside adapters.

Components, stores, reusable operations and composition do not acquire native
schedulers. Use Angular lifecycle/render hooks for rendering/focus and compose
Effect operations for bounded asynchronous work; a pure Effect.sleep description
does not launch a scheduler. New direct rendering schedulers need narrow reviewed
adapter admission and behavioral cleanup proof. Existing registered adapters can
use scheduling primitives, but do not thereby gain a package or Effect runtime.

Fixtures exercise direct/global/property forms, assigned/destructured aliases,
namespace/renamed imports, literal computed destructuring and computed access to
the scheduling object, alongside
permitted framework hooks and adapters. Nonliteral access to recognized global/
scheduler identifiers or resolved aliases is rejected; arbitrary reflection or
dynamic code is not proven safe. Installed
framework internals are not scanned by these handwritten-source rules.
The ordinary Node fixtures run under make test and make verify. No new standalone
or optional-only gate is introduced. H3 did not activate the future component-in-composition prohibition or move
components. H4 performed only the mechanical extraction; H5 now separates runtime execution.
H6 adds shared revocation and retires VerificationAccess; H7 still owns tools roles.

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
| OWN-11 | Feature implementations remain private; cross-feature dependencies use reviewed entries | Type-only, lazy or barrel access to another feature's private store/facade/reader | make architecture; feature-edge negative fixtures |
| OWN-12 | Components assemble providers only through reviewed Component.providers calls | Provider function invoked in a method/field, namespace import or unreviewed factory | make architecture; metadata-scope negative fixtures |

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
only guides and review process. H2 adds compiler coverage and H3 adds the
format/scheduling rules described above. H4 extracted the existing Angular code and H5 now enforces runtime boundaries.
H6 implements the local session boundary below. H7–H10 remain pending and are not admissions.

| Task | Remaining scope |
|---|---|
| H2 | Implemented in [issue #51](https://github.com/stanimirivanov/perfeng-console/issues/51): explicit production-tool compiler coverage and injected CLI/server type-error proof |
| H3 | Implemented in [issue #53](https://github.com/stanimirivanov/perfeng-console/issues/53): fail-closed workspace formats and native scheduling fixtures |
| H4 | Implemented in [issue #55](https://github.com/stanimirivanov/perfeng-console/issues/55): mechanical bootstrap/shell/Run extraction with exact migration fences |
| H5 | Implemented in [issue #57](https://github.com/stanimirivanov/perfeng-console/issues/57): scoped integrations, readonly component ports, decorator rejection and H4 fence/exception retirement |
| H6 | Implemented in [issue #59](https://github.com/stanimirivanov/perfeng-console/issues/59): shared local-session epoch, typed denial scope and VerificationAccess allowance retirement; no general upstream-health/polling claim |
| H7 | Exact incoming server/CLI/preview tools ownership and native-I/O admission |
| H8 | Corrective diagnostics, generation-lock guidance and automated alias-document parity |
| H9 | Byte-safe distribution scanning without skipping binary files |
| H10 | Measured CI duplication/cache improvements; release-age exception disposition; retain full staged verification by default |

The Playwright minimumReleaseAgeExclude entries name versions but lack durable
reason/expiry records required by dependency-policy.md. H1 reports the gap; H10
must remove unnecessary matured exclusions or obtain a real scoped approval.
Do not invent historical authorization or silently renew them.

## H4 extraction receipt

Historical: H4 mechanically split bootstrap, App, ConsoleHome and routes without
redesigning orchestration. It froze the two mixed component files and permitted
three exact assembly edges, with H5 explicitly owning retirement. H5 removes those
byte assertions, mixed component roles and all three assembly exceptions; they
must not be reintroduced as the current pattern. The separate VerificationAccess
legacy allowance is unchanged.

## H5 runtime boundary receipt

Components own DOM events, input clearing and focus. Feature folders are shell,
session, runs (including detail) and verification; root files configure bootstrap
and routes. Each feature owns its UI and reader contracts. Shared DTOs remain in
src/shared/contracts. harness/angular-features.ts records reviewed cross-feature
entries and exact package admission; a directory name alone grants no authority.

Session and Run components declare provideSession()/provideRunLookup() in
Component.providers. Angular creates a facade and SignalStore in each component's
injector; facades inject their own DestroyRef and own execution, generation guards
and disposal. No root lifetime factories, manual store construction or caller-supplied
DestroyRef remain. Component imports of provider entries are limited to named
reviewed functions used directly in Component.providers metadata. Provider modules
have assembly authority only, not runtime execution or native I/O.

RunStore owns status, Run/artifact observations and bounded history. SessionStore
owns local session presentation; SessionFacade retains CSRF privately, never in UI
signals. runs/run.operation.ts returns a discriminated outcome with absolute monotonic
expiry instead of calling a UI completion sink. Transit timing starts before fiber
launch; the facade checks remaining validity before publication. Existing deadlines,
revision and failure messages remain. Verification exposes a separate capability
port; H6 subsequently splits its implementation and retires the legacy allowance.

Real Angular component-injector tests cover pending headers/body, transport abort,
late completion, refusing further acquisition, isolation between simultaneous views
and fresh state on recreation. The Chromium suite retains rapid replacement,
expiry/reconnect, artifact denial, route teardown, keyboard/focus and visibility
invalidation. Static declaration checks plus these cases do not prove arbitrary
JavaScript or eventual cleanup of all future work. H6 extends this single session
presentation owner for cross-feature invalidation; it does not add a competing
session cache. See the H6 receipt for the separate epoch and capability writers.

After fence retirement, the copied-tree template probe still requires exactly one
changed anchor and finally restoration. Its make verify failure must now contain
the Angular missingProperty diagnostic, not a frozen-byte assertion. Existing
compiler/accounting/Chromium fault probes remain mandatory in quality CI.

## H6 shared-session receipt

The application injector provides one session/session-boundary.store.ts. It owns
only a monotonic epoch and synchronous invalidation subscriptions, never session
mode, CSRF, Run data or capabilities. The shell's component-scoped SessionFacade
still owns private CSRF and SessionStore is still the sole session-presentation
writer. RunFacade and VerificationAccess subscribe through session-boundary.port.ts
and release subscriptions on injector teardown.

Pair/replacement and logout advance the epoch before dispatch. An authoritative
local-session denial advances it before clearing all feature owners. Readers capture
both their local sequence and session epoch; interruption and late-result guards
prevent an old response from restoring evidence, access or a replaced session.
Verification's own sequence also rejects a stale grant after a scoped denial. Its
store is separate capability state, not a second copy of session presentation.

The existing BFF Run/artifact routes emit 401 only for a missing/expired local
session; provider failures are projected separately. These 401s return to pairing
and clear CSRF, Run/history and capability work. Scoped
Run/artifact 403/404, every non-204 capability reply and Run transport failures never fabricate
global logout. The optional capability endpoint has no implemented local-session
denial contract; its 401 is scoped rather than guessed to mean global session loss.
A failed session operation clears local authority without claiming
that an interrupted logout completed on the server. There are no automatic retries.

Verification permission is hidden while unknown/denied. A mounted Lab cannot render
its content from a withdrawn grant, and revocation leaves its route. Native fetch,
3 s deadline and interruptible signal live in access-client.ts; access.ts owns
Effect execution and access.store.ts owns its readonly grant. The BFF remains the
operation authority; the epoch coordinator grants no permission.

Angular injector regressions cover shared invalidation, late grants, abort and
logout-before-dispatch clearing. Chromium covers Run/artifact session
denial, scoped capability 401, retained shell after scoped denial, denied deep links
and actual HTTPS
session expiry during lookup. These are event-driven checks; no polling, cross-tab
logout broadcast, SSO, upstream-health epoch or mutation reconciliation is admitted.

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

Both the transport and VerificationAccess legacy allowances are retired. H6 removes
the hash exception mechanism: verification/access.ts is now an integration and
cannot dispatch native I/O; access-client.ts is an adapter and cannot execute
Effects; access.store.ts is the capability writer. Exact package checks remain
independent from roles. Regression fixtures reject reintroducing mixed ownership.

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
