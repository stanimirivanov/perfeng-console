# M05 — Perfeng main UI and independent verifier

## Decision and first release

[Confirmed product intent](../docs/intent/perfeng-ui.md) and [accepted stack ADR](../docs/decisions/0002-ui-technology-stack.md) govern this revision. **Option B, revised after the scaffold review:** one Console contains a distinctly themed and text-labeled Verification → Scenario Lab area for authorized maintainers. The optional runner is independently built, installed and qualified. The console opens real Runs. The non-UI verifier uses separate credentials, executes controlled scenarios against the public platform and links back to the ordinary Run route. Environment owns disposable fault authority. Build, install, start, upgrade and roll back the console with the verifier absent.

**Maya's release test:** CI submits as automation and emits a stable, credential-free link. Maya signs in as herself, sees the exact commit, baseline artifact, policy version/digest and comparison used by that completed Run, then requests a real child Run against those references. CP records her identity, service, source and child. The original approval and today's execution permission are distinct. Refuse withdrawn or unavailable references explicitly. Never silently select today's baseline.

IDs PR1–41 retain their original work identities; PR42–63 are additions. Numeric IDs are identifiers, not merge order or GitHub issue numbers. The shared workspace already contains a working lint/type/architecture/Node-test harness, governance and ADR 0002. PR1/2 describe the remaining admission and Angular/browser work. Local pairing is sufficient for the owner's first slice; it does not qualify shared access. Implementation remains issue-first in each responsible repo, with human review.

## Release sequence and evidence

| Checkpoint | Merge priority and owner | Evidence required |
|---|---|---|
| Local console slice | Console PR1–6,42,22. Begin provider contract PR43/46 in parallel. | Start product by itself, open a known Run through local HTTPS, clear expired state. Report honest gaps. Smoke evidence only. |
| Product contracts | Contracts PR43 service/CI identity, PR46 immutable comparison, PR25 protected bytes/policy, PR49 rerun and audit. | Publish additive versions, positive/negative fixtures and exact digests before CP and consumer adoption. Reuse existing native Run, integration publication and baseline APIs. |
| Provider implementation | CP PR44 grants, PR58 trusted identities, PR45 guarded reads; PR26/27 protected bytes; PR47/48 retained comparison; PR50/59/51 audit, fenced selection and callable rerun. | Two actors on one service can share CI-owned evidence. Deny copied foreign links and stale access. Test durable lineage, exact bytes, concurrent retries and restart using PostgreSQL. |
| Workstation journey | Console PR52/53 session/link, PR28/54 comparison/rerun; environment PR18/55/63 target and actual CI link; console PR56 acceptance. | **P — product gate** below. Prioritize this lane over optional dashboards and Lab. |
| Maintainer campaigns | PR8–17 offline; PR29–39 disposable execution; PR40/41/57 qualification. Can run in parallel once each listed dependency is ready. | **V — verifier gate** below. Release the verifier against compatible public endpoints independently. |
| Later product journeys | Supporting catalog/health/baseline views and PR60–62 Git onboarding/policy changes. | Source owner review and publication proof before enabling new selections. No dependency back into P. |

**P — console release receipt (PR56).** A clean product-only build/installation on the selected shared host must contain no verifier executable, embedded runner endpoint, fault credential or adapter. Start with verifier absent. Follow the actual CI-produced link from a workstation, authenticate a named engineer, verify the bound comparison, dispatch once, observe the real child and retrieve its attributable audit receipt after restart. Include cross-service copied link, revoked membership between display/dispatch, forbidden baseline transition, withdrawn baseline, mismatched digest and lost-response same-key retry. Missing run-used evidence may display an honest gap, but cannot pass this representative positive case. Qualify with selected versions, scopes and dated receipt. Live setup and submissions require explicit authorization.

**V — verifier release receipt (PR57).** Install the optional verifier separately, deny direct use by an ordinary engineer, and prove a maintainer-injected slowdown opens the same product Run page. Qualify the frozen independently reviewed manifests, synthetic labels, denominators and immutable partial/final findings. Tier A uses 600 active seconds, Tier B 3600, with declared repetitions, separately approved mutations and fenced recovery. Report harness integrity, coverage and platform conformance separately. A failed scientific expectation is a retained finding. A verifier outage or rollback cannot break P. Neither release receipt substitutes for the other; P has zero verifier prerequisites.

**Gate ownership.** Local smoke ends at PR6/22. P is owned by the console team and is blocked until the selected deployment authenticates Maya as herself. V is owned by verifier maintainers and may run against a compatible pinned product release without rebuilding it. Use separate release manifests, CI jobs, artifact IDs and rollback procedures. Shared-source edits run each affected component’s checks. A V finding does not invalidate a P receipt unless the same defect independently fails a product criterion.

## Current evidence and interface boundaries

- Native Run GET and create/cancel exist. The PostgreSQL Get predicate uses both creator principal and Run ID. An ordinary Maya token cannot read a CI principal's Run merely by knowing its ID. Keep individual actor, automation principal, immutable service owner and per-operation rights distinct. Evaluate grants at the provider on each read and write. Existing baseline transitions already distinguish operation rights and record authenticated actor.
- Native CreateRun accepts candidate/suite/catalog/profile/environment/policy refs. Stable idempotency keys protect a single intent; the request lacks source lineage or an explicit original baseline binding. CP currently resolves approved references during reporting. Extend the public boundary and carry the accepted binding through execution, including retries and restarts.
- Existing issuer/request-scoped analysis publications can already carry native Run, policy and baseline/artifact refs. Reuse when durably correlated; do not derive historical selection from current catalog, principal or object URI. Generic Run list/filter/trends, complete ordered history and streaming are later product needs, not prerequisites to a direct CI link.
- The UI proposes Git changes for onboarding/policy after the pilot. Identify each actual source owner (some reviewed policies originate in perfeng-k8s and are published by environment). Distinguish draft, PR, merged, published and selectable. Control-plane state and approvals retain their own authority.

## Prior art and adoption analysis

Research consulted official upstream documentation and repositories before slicing. ADR 0002 selects the UI versions. PR1 validates the complete dependency graph, licenses/security and frozen lock. Approval of this plan does not admit an arbitrary latest package. No external service is needed at runtime.

| Target feature/problem | OSS project / pattern | Recommendation and integration | Licensing, weight and architectural fit |
|---|---|---|---|
| OSS1: typed public API consumer | [openapi-typescript](https://openapi-ts.dev/introduction), [openapi-fetch](https://openapi-ts.dev/openapi-fetch/api) | Adopt generator as dev dependency and fetch client as runtime dependency behind fixed-origin wrapper | MIT; generated types have no runtime cost, fetch wrapper avoids handwritten wire types. Generator reads checked local files only; types do not replace runtime validation |
| OSS2: untrusted schema validation | [Ajv standalone](https://github.com/ajv-validator/ajv/blob/master/docs/standalone.md), [security guidance](https://github.com/ajv-validator/ajv/blob/master/docs/security.md), [license](https://github.com/ajv-validator/ajv) | Adopt build-time validator dependency, generate offline validators; interface wrapper rejects remote refs | MIT; build-only code generation can avoid browser runtime compiler/unsafe-eval and reduce runtime dependency weight. Review schema dialect/formats and output size; no CSP weakening |
| OSS3: BFF transport/server | [Fastify](https://github.com/fastify/fastify), [injection testing](https://github.com/fastify/fastify/blob/main/docs/Reference/Server.md) | Candidate runtime dependency with explicit TLS/session/route wrappers; final exact package admission PR1 | MIT; smaller purpose than full-stack SSR framework, but transitive graph still reviewed. HTTP injection tests supplement, never replace actual TLS/browser tests. Do not compile arbitrary upstream schemas at runtime |
| OSS4: browser rendering | [Accepted ADR 0002](../docs/decisions/0002-ui-technology-stack.md) | Angular 22.2.4 + TypeScript 6.0.3, Material/CDK, NgRx SignalStore and Effect 4 | Angular CLI + TestBed/Vitest, Playwright E2E. Isolate browser resources, enforce strict CSP, scoped invalidation and actual build/test failure gates. Lit candidate superseded. |
| OSS5: browser verification | [Playwright assertions](https://playwright.dev/docs/test-assertions) and [retry semantics](https://playwright.dev/docs/test-retries) | Adopt development-only test dependency with exact browser release and local providers | [Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE); browser binaries are heavy, runtime product remains unaffected. Auto-wait UI assertions are useful; full-test retries must not hide a failing attempt; retain first-failure evidence |
| Durable operations | Write-ahead intent, idempotent request key, optimistic revision | Adapt pattern with standard Node filesystem and existing CP semantics; custom bounded simulator journal | No new database dependency; must prove flush/crash semantics, UNKNOWN reconciliation and partial export. Generic queues do not guarantee exactly-once mutations |
| Fault campaigns | Existing Kubernetes acceptance primitives and scoped perturbation adapters | Adapt existing code; reject wholesale chaos framework adoption for this initial scope | Existing repository license retained; avoids new cluster controllers/CRDs and broad permissions. Network injection mechanism is a separate admission risk, not an assumed `tc` capability |
| Scenario oracle and confusion matrices | Explicit expectation tables and independent binary accounting | Custom domain logic, standard math, independent test fixtures | No analysis-comparator import, statistical package or copied provider algorithm. Nonbinary outcomes and denominators explicit; synthetic results are not measured real-world significance |

## Sequencing, sizing and gates

Each PR has one mergeable purpose, tests with changed behavior, and a target of ~200–500 handwritten lines excluding lockfiles/generated data and the approved spec copy. S = ~150–250; M = ~250–450. Estimates include behavioral tests. No L task is knowingly planned. If implementation evidence pushes a slice above 500 lines **and** across independent layers, reslice before coding instead of bundling hidden foundations. Small frontend/BFF/test vertical changes can fit one PR; security foundations have multiple downstream consumers.

No synthetic success stubs are proposed. A typed NOT OBSERVABLE state is required product behavior, not a stub to be silently retired. Scenario definitions may be present but BLOCKED until their real prerequisites exist. Incomplete implementations never return successful fixtures in production.

**DAG:** `Depends on` is authoritative; parallel group Gk is the earliest topological depth, not a requirement to wait for unrelated work in earlier groups. Merge any PR after its dependencies, pinned releases and checks pass. Same-repository file overlap still requires serial merge/rebase. Contracts must be published and immutable provider releases selected, not merely merged, before dependent live execution. G1, G2, … are the topological merge groups. Within available work, give the product gate priority.

### Exact verification command inventory

Commands below are future implementation gates, **not commands run during this planning task**. Prefix `cd /home/izanagi/sources/perfeng/<repo>` is the working directory, not a chained shell instruction. Every per-PR command is scoped to its owning repo unless explicitly noted.

- Console: `make doctor`, `make verify` and `make supply-chain` exist; PR2 extends verification and adds [new] `make browser-test`; PR3 adds `make contracts-check`; PR7 adds `make traceability-check`; PR8 adds `make scenario-contracts-check`; PR9 adds `make scenario-results-check`; PR12 adds `make scenario-offline-check`; PR32 adds `make scenario-cluster-contract-check`; PR41 adds `make scenario-acceptance`. The latter consumes an explicit operator-approved manifest/config and refuses implicit cluster execution. Exact recipes/tool flags are a foundation deliverable, not fabricated existing commands. Proposed gates are missing until their owning PR merges. New focused test files are named per PR; `make verify` runs the full relevant offline suite.
- Contracts existing: `make verify`; validation is Python/Effect/JSON Schema plus API conformance. PR19 adds its named validator.
- CP existing: `make verify`, `make race`, `go test -vet=off -count=1 ./internal/httpapi ./internal/objectstore ./internal/app`. PostgreSQL `make db-validate` requires an explicitly configured disposable database; never point at local retained data. Add DB tests only if actual persistence behavior changes.
- Environment existing: `make verify`, `make render-check`, `uv run --locked --offline python -m unittest tests.test_workspace -v`, and the focused modules listed below. PR30 adds `make scenario-fixture-check`. Existing `task kubernetes:acceptance` is offline preview, **not** authorization to append live flags. Rendering requires existing Helm; unavailable tool is NOT RUN.
- Analysis adapter existing command, from analysis repo: `uv run --locked --offline perfeng-report --candidate normalized-result.json --candidate-artifact normalized-artifact.json --policy performance-policy.json --producer-image REGISTRY/IMAGE@sha256:ACTUAL-DIGEST --output analysis-result.json`. File paths are runtime **[new] campaign inputs**, REGISTRY/IMAGE and digest must be actual reviewed producer identity, not literal placeholders. Repeat `--baseline BASELINE_ID VERSION reference-result.json reference-artifact.json` only for declared inputs. Runner uses the equivalent argument array in its isolated working directory and pinned interpreter; no shell expansion. This command writes only requested external campaign results during authorized execution. Existing `make verify` in analysis also builds distributions; it was not run for read-only planning.

All behavior implementation uses RED → GREEN → refactor, focused tests then full repository checks. Do not apply TDD's green target to Perfeng characterization: a correctly functioning evaluator must retain platform FINDINGS. Before executing an actual expectation set, adversarial review its sources and exact digest, offer the required optional cross-model review, reconcile and record approval. No such per-case approval is claimed by this plan.

## Task DAG

Read the product rows first. Parallel groups describe readiness, not staffing priority. Dependencies include release/selection prerequisites where a live proof is required.

| ID | Title | Owner | Depends on | Group | Size | Lane / origin |
|---|---|---|---|---|---|---|
| M05-PR1 | Record approved constraints and admit the console stack | perfeng-console | — | G1 | M | Product / in-scope |
| M05-PR18 | Compose the console in the joint source workspace | perfeng-environment | — | G1 | S | Product / in-scope |
| M05-PR43 | Publish service-scoped identity and CI Run discovery semantics | perfeng-contracts | — | G1 | M | Product / in-scope |
| M05-PR2 | Establish the offline engineering and browser harness | perfeng-console | PR1 | G2 | M | Product / in-scope |
| M05-PR44 | Persist service ownership and revocable grants | perfeng-control-plane | PR43 | G2 | M | Product / [Prerequisite from M06] |
| M05-PR46 | Define an immutable Run comparison projection | perfeng-contracts | PR43 | G2 | M | Product / in-scope |
| M05-PR58 | Verify named human and CI identities at the provider | perfeng-control-plane | PR43 | G2 | M | Product / [Prerequisite from M06] |
| M05-PR3 | Vendor contracts and generate the offline typed client | perfeng-console | PR2 | G3 | M | Product / in-scope |
| M05-PR25 | Specify authorized immutable Run evidence reads | perfeng-contracts | PR43, PR46 | G3 | M | Product / in-scope |
| M05-PR42 | Isolate the product build and release entry point | perfeng-console | PR2 | G3 | M | Product / in-scope |
| M05-PR45 | Authorize cross-principal Run access and CI resolution | perfeng-control-plane | PR44, PR58 | G3 | M | Product / [Prerequisite from M06] |
| M05-PR47 | Capture exact report-time comparison bindings | perfeng-control-plane | PR44, PR46 | G3 | M | Product / in-scope |
| M05-PR49 | Specify attributed rerun and audit receipt | perfeng-contracts | PR43, PR46 | G3 | M | Product / in-scope |
| M05-PR4 | Secure the fixed-origin upstream transport | perfeng-console | PR3 | G4 | M | Product / in-scope |
| M05-PR26 | Serve one authorized verified artifact body | perfeng-control-plane | PR25, PR45 | G4 | M | Product / in-scope |
| M05-PR50 | Store immutable rerun intent and audit receipts | perfeng-control-plane | PR44, PR49 | G4 | M | Product / in-scope |
| M05-PR5 | Pair a local operator session with the console shell | perfeng-console | PR4 | G5 | M | Product / in-scope |
| M05-PR27 | Expose exact run-used policy evidence through serving | perfeng-control-plane | PR26 | G5 | M | Product / in-scope |
| M05-PR59 | Fence rerun execution to the approved source binding | perfeng-control-plane | PR47, PR49, PR50 | G5 | M | Product / in-scope |
| M05-PR6 | Deliver fresh exact Run lookup | perfeng-console | PR5, PR42 | G6 | M | Product / in-scope |
| M05-PR48 | Serve service-authorized comparisons by native Run ID | perfeng-control-plane | PR45, PR46, PR47, PR27 | G6 | M | Product / in-scope |
| M05-PR52 | Sign in to the console with a service-scoped identity | perfeng-console | PR5, PR43, PR58 | G6 | M | Product / [Prerequisite from M06] |
| M05-PR22 | Inspect contract-driven Run state and artifact references | perfeng-console | PR6 | G7 | M | Product / in-scope |
| M05-PR51 | Admit and serve the real audited rerun | perfeng-control-plane | PR45, PR48, PR49, PR50, PR59 | G7 | M | Product / in-scope |
| M05-PR53 | Publish and open the canonical CI Run link | perfeng-console | PR6, PR43, PR45, PR52, PR42 | G7 | M | Product / in-scope |
| M05-PR28 | Render the report and verified provenance chain | perfeng-console | PR22, PR27, PR48 | G8 | M | Product / in-scope |
| M05-PR55 | Select a shared console qualification environment | perfeng-environment | PR18, PR45, PR48, PR51, PR52 | G8 | M | Product / [Prerequisite from M06] |
| M05-PR54 | Compare the CI Run and request an audited rerun | perfeng-console | PR22, PR28, PR48, PR51, PR53 | G9 | M | Product / in-scope |
| M05-PR63 | Emit the deep link from a real CI acceptance job | perfeng-environment | PR53, PR55 | G9 | M | Product / in-scope |
| M05-PR56 | Qualify the console-only Maya journey | perfeng-console | PR42, PR53, PR54, PR55, PR63 | G10 | M | Product / in-scope |
| M05-PR19 | Publish typed existing operational and catalog interfaces | perfeng-contracts | — | G1 | M | Supporting UI / in-scope |
| M05-PR7 | Expose complete gaps and native observation limitations | perfeng-console | PR6 | G7 | M | Supporting UI / in-scope |
| M05-PR20 | Show platform serving health without false dependency health | perfeng-console | PR6, PR19 | G7 | M | Supporting UI / in-scope |
| M05-PR21 | Browse the authorized catalog snapshot | perfeng-console | PR6, PR19 | G7 | M | Supporting UI / in-scope |
| M05-PR24 | Inspect baseline lifecycle and conflicts safely | perfeng-console | PR6 | G7 | M | Supporting UI / in-scope |
| M05-PR23 | Create and cancel Runs through public operations | perfeng-console | PR21, PR22, PR5 | G8 | M | Supporting UI / in-scope |
| M05-PR29 | Extract reusable acceptance primitives without behavior change | perfeng-environment | — | G1 | M | Verifier / in-scope |
| M05-PR8 | Define admitted scenario and result contracts | perfeng-console | PR3, PR42 | G4 | M | Verifier / in-scope |
| M05-PR9 | Journal campaigns and export interrupted results | perfeng-console | PR8, PR2 | G5 | M | Verifier / in-scope |
| M05-PR10 | Evaluate expected versus actual independently | perfeng-console | PR8, PR9 | G6 | M | Verifier / in-scope |
| M05-PR30 | Compose a disposable public-API scenario target | perfeng-environment | PR18, PR27, PR29 | G6 | M | Verifier / in-scope |
| M05-PR11 | Account for confusion cells and campaign coverage | perfeng-console | PR9, PR10 | G7 | M | Verifier / in-scope |
| M05-PR12 | Run one synthetic case through the real analysis CLI | perfeng-console | PR9, PR10 | G7 | M | Verifier / in-scope |
| M05-PR31 | Execute one approved cluster step with recovery | perfeng-environment | PR29, PR30 | G7 | M | Verifier / in-scope |
| M05-PR13 | Admit synthetic semantic edge-case expectations | perfeng-console | PR8, PR12 | G8 | M | Verifier / in-scope |
| M05-PR33 | Add bounded sample-SUT delay perturbations | perfeng-environment | PR31 | G8 | M | Verifier / in-scope |
| M05-PR36 | Provide controlled cancellation and restart triggers | perfeng-environment | PR31 | G8 | M | Verifier / in-scope |
| M05-PR38 | Provide evidence-integrity fault controls | perfeng-environment | PR31, PR30 | G8 | M | Verifier / in-scope |
| M05-PR14 | Admit effect-by-noise synthetic campaigns | perfeng-console | PR11, PR12, PR13 | G9 | M | Verifier / in-scope |
| M05-PR34 | Inject disposable CPU and network perturbations | perfeng-environment | PR31, PR33 | G9 | M | Verifier / in-scope |
| M05-PR15 | Show a complete offline campaign in Scenario Lab | perfeng-console | PR5, PR11, PR14 | G10 | M | Verifier / in-scope |
| M05-PR16 | Authorize one durable mutation intent at a time | perfeng-console | PR9, PR15 | G11 | M | Verifier / in-scope |
| M05-PR17 | Enforce campaign time and recovery budgets | perfeng-console | PR16 | G12 | M | Verifier / in-scope |
| M05-PR32 | Submit and observe one real scenario via public APIs | perfeng-console | PR17, PR28, PR31 | G13 | M | Verifier / in-scope |
| M05-PR35 | Admit workload and idempotency cluster scenarios | perfeng-console | PR8, PR32, PR34 | G14 | M | Verifier / in-scope |
| M05-PR37 | Admit cancellation and interrupted-execution expectations | perfeng-console | PR35, PR36 | G15 | M | Verifier / in-scope |
| M05-PR39 | Admit missing baseline and late-evidence cases | perfeng-console | PR37, PR38 | G16 | M | Verifier / in-scope |
| M05-PR40 | Operate cluster campaigns from Scenario Lab | perfeng-console | PR32, PR35, PR37, PR39, PR7, PR54 | G17 | M | Verifier / in-scope |
| M05-PR41 | Qualify the bounded campaign and publish operator guidance | perfeng-console | PR40, PR14 | G18 | M | Verifier / in-scope |
| M05-PR57 | Qualify the independently released verifier | perfeng-console | PR41, PR42, PR54 | G19 | M | Verifier / in-scope |
| M05-PR60 | Map service configuration proposals to their Git owners | perfeng-environment | PR18 | G2 | M | Post-pilot / in-scope |
| M05-PR61 | Propose one service onboarding change for review | perfeng-console | PR52, PR56, PR60 | G11 | M | Post-pilot / in-scope |
| M05-PR62 | Propose versioned performance policy changes | perfeng-console | PR61 | G12 | M | Post-pilot / in-scope |

## Per-PR scopes

Paths are relative to the owning repo. [new] identifies proposed paths or commands; later PRs can extend files introduced earlier. All slices include behavior tests and independent rollback. Parallel candidates appear in the same G group of the DAG. Issue implementation requires separate authorization.

### M05-PR1: Record approved constraints and admit the console stack

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS5; admission only.
- **Depends on / parallel with:** — / G1.
- **Objective & scope:** Reconcile existing harness governance with the confirmed UI intent. Admit the exact Angular/Material/NgRx/Effect packages selected by accepted ADR 0002 only after its compile, CSP, accessibility and dependency gates. Reuse existing instructions and pins.
- **Not in this PR:** product behavior or installations on operator machines.
- **Layers / files:** CONSTRAINTS.md [modified]; SPEC.md [new, align product priority with confirmed intent]; AGENTS.md [modified]; CONTRIBUTING.md [new]; docs/decisions/0001-own-operator-console-and-bff.md [new]; docs/development/dependency-policy.md [new]; package.json [modified]; pnpm-lock.yaml [modified].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Constraints preserve all eleven requirements and proposed gates are explicitly unenforced until PR2/PR8.
  - ADR records separate simulator process and ownership.
  - exact versions/licenses/engines and issue-first/human-review workflow are recorded without executable stubs.
- **Harness gate / new tests:** make verify; make supply-chain; ADR 0002 admission evidence and frozen-lock check.
- **Size:** M, 250–400 plus approved spec copy handwritten LOC including tests, excluding generated/locked files.

### M05-PR18: Compose the console in the joint source workspace

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt existing workspace schema.
- **Depends on / parallel with:** — / G1.
- **Objective & scope:** Add the already-created console repository to workspace composition and M05 ownership with the simulator boundary.
- **Not in this PR:** product deployment or milestone closure.
- **Layers / files:** workspace.json [modified]; tests/test_workspace.py [modified]; docs/roadmap/milestones.md [modified].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Membership validates without mutating sibling checkouts.
  - roadmap preserves M03/M04/M06 and broad M05 outcomes.
  - source membership is explicitly not deployment activation.
- **Harness gate / new tests:** make verify; uv run --locked --offline python -m unittest tests.test_workspace -v.
- **Size:** S, 150–250 handwritten LOC including tests, excluding generated/locked files.

### M05-PR43: Publish service-scoped identity and CI Run discovery semantics

- **Origin / owner:** in-scope, `perfeng-contracts`.
- **Depends on / parallel with:** — / G1.
- **Objective & scope:** Describe service ownership separately from the CI principal, human actor and delegated caller. Reuse native Run IDs and existing issuer/request correlation; specify additive authorized resolution where needed.
- **Layers / files:** api/run-management/v1/openapi.json, api/performance-integration/v1/openapi.json, contracts.json [modified]; conformance fixtures [new].
- **Acceptance criteria:**
  - CI acceptance exposes a stable native Run identity directly or via a documented authorized resolver; URL carries no credential.
  - Specify service read/rerun and separate baseline lifecycle rights, actor provenance and scoped denial behavior.
  - Legacy principal-owned exact reads remain compatible; include same-service/different-actor and cross-service negative fixtures.
- **Harness gate / new tests:** make verify; contract examples and rejection fixtures.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR2: Establish the offline engineering and browser harness

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS4–OSS5; tools are development dependencies.
- **Depends on / parallel with:** PR1 / G2.
- **Objective & scope:** Extend the existing strict harness with Angular CLI AOT/strict templates, TestBed/Vitest and disjoint nonempty Playwright Chromium gates. Include negative CSP, asset-boundary, component failure and skipped-test fixtures per ADR 0002. Foundation is consumed by every later slice.
- **Not in this PR:** scenario or screen implementation.
- **Layers / files:** Makefile [modified]; tsconfig.json [modified]; playwright.config.ts [new]; scripts/ [new]; tests/harness/ [modified]; .github/workflows/harness.yml [modified].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Commands install nothing implicitly and refuse missing tools.
  - fresh checkout can run pinned checks after explicit bootstrap.
  - test-provider smoke and secret/import-boundary checks fail on known bad fixtures, retries do not erase failures.
- **Harness gate / new tests:** make doctor; make verify; [new] make browser-test; make supply-chain. CI tests failure propagation; browser harness must actually launch pinned Chromium.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR44: Persist service ownership and revocable grants

- **Origin / owner:** [Prerequisite from M06], `perfeng-control-plane`.
- **Depends on / parallel with:** PR43 / G2.
- **Objective & scope:** Introduce authoritative resource-to-service bindings and grants independent of the creator. Expand schema before activating new checks; provide a scoped grant/revoke administrative path for initial operators.
- **Layers / files:** internal/postgres/migrations/ [modified]; internal/postgres/service_access.go and integration tests [new].
- **Acceptance criteria:**
  - CI-owned R binds immutably to service S; authorized Maya differs from CI creator.
  - Unmapped legacy rows retain owner-only visibility; backfill only from reviewed bindings, never infer membership.
  - Grant/revoke accepts only trusted administrators and leaves a durable change record.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR46: Define an immutable Run comparison projection

- **Origin / owner:** in-scope, `perfeng-contracts`.
- **Depends on / parallel with:** PR43 / G2.
- **Objective & scope:** Version a bounded Run-scoped comparison response. Reuse published analysis data and request-scoped publication identities where correlated. Cover historical selection, not current catalog lookup.
- **Layers / files:** api/run-management/v1/openapi.json, contracts.json [modified]; comparison examples [new].
- **Acceptance criteria:**
  - Bind candidate commit/image, suite/profile, policy ID/version/hash, baseline version and exact artifact digest to this Run.
  - Per-rule values, units, quality and direction preserve source semantics; incomplete or inaccessible evidence has explicit outcomes.
  - Fixture rejects cross-run substitution and separates unavailable evidence from a performance verdict.
- **Harness gate / new tests:** make verify; schema and API conformance including negative fixtures.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR58: Verify named human and CI identities at the provider

- **Origin / owner:** [Prerequisite from M06], `perfeng-control-plane`.
- **Depends on / parallel with:** PR43 / G2.
- **Objective & scope:** Add a feature-gated verifier for trusted delegated identity alongside existing automation credentials. Select issuer and trust model before this PR; keep provider authority out of browser input.
- **Layers / files:** internal/authentication/ and internal/app/ [modified]; delegated identity conformance tests [new].
- **Acceptance criteria:**
  - Reject forged actor/service headers, wrong issuer/audience and expired credentials.
  - Distinguish verified human, CI and calling client identities and preserve legacy bearer semantics.
  - Test key rotation and fail closed on unavailable trust data.
- **Harness gate / new tests:** make verify; make race; verifier and serving authentication integration tests.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR3: Vendor contracts and generate the offline typed client

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2; wrapped generation and standalone validators.
- **Depends on / parallel with:** PR2 / G3.
- **Objective & scope:** Pin existing Run/native/integration schemas and transitions with provenance and complete local references; generate types and runtime validators offline.
- **Not in this PR:** missing provider APIs or runtime fetching.
- **Layers / files:** vendor/perfeng-contracts/ [new]; src/generated/ [new]; scripts/contracts-check.ts [new]; tests/contract/ [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Byte tampering, undeclared refs and enum drift fail.
  - generated output reproduces with network disabled.
  - unknown fields/versions are handled exactly as the pinned schema defines.
- **Harness gate / new tests:** [new] make contracts-check; make verify [new from PR2]; conformance fixtures include schema corruption and unsupported WARN.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR25: Specify authorized immutable Run evidence reads

- **Origin / owner:** in-scope, M05; `perfeng-contracts`.
- **OSS prior art / leveraged pattern:** OpenAPI and immutable artifact pattern.
- **Depends on / parallel with:** PR43, PR46 / G3.
- **Objective & scope:** Define minimum protected artifact-content and exact bound policy reads needed by report display/evaluation.
- **Not in this PR:** general URL proxy, statistics, Run history or new verdicts.
- **Layers / files:** api/run-management/v1/openapi.json [modified, new version]; api/run-management/v1/examples/ [modified]; contracts.json [modified]; tests/ [modified].
- **Contracts & boundaries:** Additive API version; existing response meaning unchanged; provider permission explicitly reviewed.
- **Acceptance criteria:**
  - Authorization/scope, resource association, bytes/media type/size/digest, limits and errors are normative.
  - policy identity binds exact run-used bytes.
  - positive/negative fixtures cover cross-run and unsupported content.
- **Harness gate / new tests:** make verify; existing API validators plus new schema fixtures. Release compatibility review before provider implementation.
- **Rollout/rollback:** publish additive contract/provider release before opt-in consumers; retain old pins. Revert the consumer/disable the new route first. No new schema migration is assumed; a required migration changes this PR boundary and needs review.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR42: Isolate the product build and release entry point

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR2 / G3.
- **Objective & scope:** Declare one browser entry and an independent optional non-UI runner entry. The product imports shared contract/presentation types only. Do not implement a dummy verifier.
- **Layers / files:** package.json, Makefile, harness/boundaries.ts [modified]; tests/harness/distribution.test.ts [new].
- **Acceptance criteria:**
  - Clean product build, install and startup succeed without any verifier binary, runtime URL, credential or adapter.
  - Reject a deliberate transitive runner import, bundled fixture or copied secret in product assets and source maps.
  - Product identity/version can be pinned independently of the verifier.
- **Harness gate / new tests:** make verify; make browser-test [new in PR2]; make console-isolation-check [new].
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR45: Authorize cross-principal Run access and CI resolution

- **Origin / owner:** [Prerequisite from M06], `perfeng-control-plane`.
- **Depends on / parallel with:** PR44, PR58 / G3.
- **Objective & scope:** Resolve a CI request/Run through public routes, enforcing actor plus service membership on each access. Use the same guard on reachable run actions, artifact metadata, baseline and integration reads; keep unqualified cross-principal adapters disabled.
- **Layers / files:** internal/httpapi/handler.go, internal/postgres/repository.go, internal/httpapi/baselines.go [modified]; authorization integration tests [new].
- **Acceptance criteria:**
  - CI creates R; Maya reads R for S, a different team learns no resource details even from a copied link.
  - Revocation takes effect on the next read/write; direct POST and forged UI state cannot bypass authorization.
  - Baseline approval is distinct from rerun permission; old principal-only routes preserve isolation.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR47: Capture exact report-time comparison bindings

- **Origin / owner:** in-scope, `perfeng-control-plane`.
- **Depends on / parallel with:** PR44, PR46 / G3.
- **Objective & scope:** Persist run-used references when the reporting resolver actually selects them. Reuse immutable publication records if they already prove the complete binding; add storage only for the missing native Run path.
- **Layers / files:** internal/reconcile/report_plan.go, internal/postgres/migrations/ [modified]; internal/postgres/run_comparison.go [new].
- **Acceptance criteria:**
  - Different current registry contents cannot change retained policy or baseline identity.
  - Crash/retry cannot replace an accepted binding; incomplete historic Runs remain explicitly incomplete.
  - No fabricated backfill from today’s catalog or approval state.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR49: Specify attributed rerun and audit receipt

- **Origin / owner:** in-scope, `perfeng-contracts`.
- **Depends on / parallel with:** PR43, PR46 / G3.
- **Objective & scope:** Specify an additive source-Run rerun operation or equivalent create extension. Define source lineage, exact references, authorized receipt/audit read and idempotency, including unknown response and retention rules.
- **Layers / files:** api/run-management/v1/openapi.json, contracts.json [modified]; rerun/audit examples [new].
- **Acceptance criteria:**
  - New human intent creates a child Run; retry of same actor/key/body returns the original receipt; body conflict fails.
  - No implicit replacement of withdrawn suite, policy or baseline; define denial/conflict and unavailable evidence outcomes.
  - Actor derives from verified identity; audit receipt binds actor, service, source, child and decision time.
- **Harness gate / new tests:** make verify; example replay/conflict/forbidden/withdrawn fixtures.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR4: Secure the fixed-origin upstream transport

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS3; wrap HTTP transport, reuse platform TLS.
- **Depends on / parallel with:** PR3 / G4.
- **Objective & scope:** Implement server-only bearer loading, reviewed destination/TLS policy and bounded allowlisted transport.
- **Not in this PR:** browser sessions or generic proxying.
- **Layers / files:** src/bff/transport.ts [new]; src/bff/config.ts [new]; tests/integration/transport.test.ts [new].
- **Contracts & boundaries:** Security boundary: fixed origin/principal; no browser-selectable URL.
- **Acceptance criteria:**
  - Unsafe credential files/ancestors, wrong CA, redirects and unapproved destinations fail closed.
  - response bounds/deadlines are enforced.
  - canary credentials never enter safe errors or logs.
- **Harness gate / new tests:** make verify; make supply-chain; TLS integration tests and canary-secret assertions.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR26: Serve one authorized verified artifact body

- **Origin / owner:** in-scope, M05; `perfeng-control-plane`.
- **OSS prior art / leveraged pattern:** Adapt existing objectstore reader; no new storage SDK assumed.
- **Depends on / parallel with:** PR25, PR45 / G4.
- **Objective & scope:** Add domain-authorized bounded content reading using existing objectstore abstractions and exact artifact metadata.
- **Not in this PR:** arbitrary URL fetch or policy source discovery.
- **Layers / files:** internal/httpapi/artifact_content.go [new]; internal/httpapi/artifact_content_test.go [new]; internal/objectstore/reader.go [modified]; internal/app/artifact_content.go [new]; internal/contract/snapshot/ [modified].
- **Contracts & boundaries:** New opt-in read permission; default deny; revert removes optional read route.
- **Acceptance criteria:**
  - Denied/cross-run requests disclose no bytes.
  - hash/size mismatch rejects before trusted response and reads are bounded.
  - startup/runtime transport policy prevents redirects or URI-controlled destinations.
- **Harness gate / new tests:** go test -vet=off -count=1 ./internal/httpapi ./internal/objectstore ./internal/app; make verify; make race.
- **Rollout/rollback:** publish additive contract/provider release before opt-in consumers; retain old pins. Revert the consumer/disable the new route first. No new schema migration is assumed; a required migration changes this PR boundary and needs review.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR50: Store immutable rerun intent and audit receipts

- **Origin / owner:** in-scope, `perfeng-control-plane`.
- **Depends on / parallel with:** PR44, PR49 / G4.
- **Objective & scope:** Extend persistence for actor-scoped idempotency, lineage and attributable audit receipt. Stage schema additively before exposing the operation.
- **Layers / files:** internal/postgres/migrations/ and internal/postgres/repository.go [modified]; rerun repository integration tests [new].
- **Acceptance criteria:**
  - Transaction commits acceptance, source-to-child reference and audit atomically; failure leaves no accepted child without receipt.
  - Concurrent duplicate intents have one outcome; distinct actors/keys cannot collide.
  - Authorized receipt read identifies CI source and requesting human; principals cannot enumerate another service’s records.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR5: Pair a local operator session with the console shell

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS3–OSS5.
- **Depends on / parallel with:** PR4 / G5.
- **Objective & scope:** Deliver loopback HTTPS pairing, expiry, CSRF and an accessible navigation shell.
- **Not in this PR:** platform mutation controls or SSO.
- **Layers / files:** src/bff/session.ts [new]; src/browser/shell.ts [new]; tests/browser/session.spec.ts [new].
- **Contracts & boundaries:** Local single-user session only; configured certificate required.
- **Acceptance criteria:**
  - Single-use pairing expiry/attempt limits and idle/absolute session expiry follow spec.
  - Host/Origin/CSRF and route allowlists block bypass.
  - browser bundle/network/storage/log checks show no upstream credentials.
- **Harness gate / new tests:** make verify; make browser-test [new]; real-browser cross-origin/expiry/keyboard tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR27: Expose exact run-used policy evidence through serving

- **Origin / owner:** in-scope, M05; `perfeng-control-plane`.
- **OSS prior art / leveraged pattern:** Adapt existing registry/objectstore configuration.
- **Depends on / parallel with:** PR26 / G5.
- **Objective & scope:** Wire immutable policy-byte resolution and configured evidence reads into actual serving composition.
- **Not in this PR:** policy editing or relabeling mutable registry policy as run-used evidence.
- **Layers / files:** internal/httpapi/run_policy.go [new]; internal/app/artifact_config.go [modified]; internal/app/storage.go [modified]; internal/httpapi/run_policy_test.go [new].
- **Contracts & boundaries:** BEHAVIOR-ADJACENT optional serving config; publish/review before environment selection.
- **Acceptance criteria:**
  - Pinned policy digest and bytes agree.
  - unavailable retained policy yields explicit absence not current registry fallback.
  - serving integration proves authorization and actual configured object I/O.
- **Harness gate / new tests:** go test -vet=off -count=1 ./internal/httpapi ./internal/app; make verify; make race. If retained identity cannot resolve exact bytes, return specified unavailable and record prerequisite instead of adding unplanned persistence.
- **Rollout/rollback:** publish additive contract/provider release before opt-in consumers; retain old pins. Revert the consumer/disable the new route first. No new schema migration is assumed; a required migration changes this PR boundary and needs review.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR59: Fence rerun execution to the approved source binding

- **Origin / owner:** in-scope, `perfeng-control-plane`.
- **Depends on / parallel with:** PR47, PR49, PR50 / G5.
- **Objective & scope:** Carry a server-owned immutable rerun selection through dispatch and reporting. Ordinary Run selection remains compatible.
- **Layers / files:** internal/reconcile/report_plan.go, internal/registry/ [modified]; rerun execution tests [new].
- **Acceptance criteria:**
  - Same commit, suite and exact baseline/policy digests survive retries and worker restart.
  - Withdrawn selection at admission fails explicitly; later policy/approval transitions follow documented rules and never silently substitute another baseline.
  - Source-only checks at HTTP admission cannot be bypassed by later resolver reselection.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR6: Deliver fresh exact Run lookup

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5.
- **Depends on / parallel with:** PR5, PR42 / G6.
- **Objective & scope:** Implement S3 exact lookup with common freshness envelopes and generation invalidation. Foundation freshness is reused by all screens.
- **Not in this PR:** Run listing or invented history.
- **Layers / files:** src/bff/runs.ts [new]; src/presentation/observation.ts [new]; src/browser/runs.ts [new]; tests/browser/runs.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S3.1–S3.4: current response only, explicit listing gap and scoped not-found.
  - 3s deadline/10s expiry clear values.
  - delayed old-generation responses and reconnect cannot resurrect data.
- **Harness gate / new tests:** make verify; make browser-test [new]; controlled clock and disconnect/reconnect browser sequence.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR48: Serve service-authorized comparisons by native Run ID

- **Origin / owner:** in-scope, `perfeng-control-plane`.
- **Depends on / parallel with:** PR45, PR46, PR47, PR27 / G6.
- **Objective & scope:** Expose the protected projection for the native CI link. Join only recorded identities and approved evidence reads, checking access before returning bytes.
- **Layers / files:** internal/httpapi/run_comparison.go [new]; internal/app/ [modified]; serving integration fixtures [new].
- **Acceptance criteria:**
  - Two actors with service rights see the same bound comparison; denied actor gets no bytes or existence leak.
  - Tampered digest/cross-run policy fails; retired baseline retains historical evidence but grants no new execution authority.
  - Existing integration-publication consumers remain compatible.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR52: Sign in to the console with a service-scoped identity

- **Origin / owner:** [Prerequisite from M06], `perfeng-console`.
- **Depends on / parallel with:** PR5, PR43, PR58 / G6.
- **Objective & scope:** Add shared-user mode behind explicit configuration. Preserve the local pairing profile. The BFF holds secrets and relays verified delegation to CP; use an allowlisted post-login Run return route.
- **Layers / files:** src/bff/session.ts [modified after PR5]; src/bff/delegation.ts, tests/browser/service-session.spec.ts [new].
- **Acceptance criteria:**
  - CI link survives sign-in without an open redirect or browser-visible bearer.
  - Expiry/revocation invalidates all stale scopes, disables writes and prevents late responses restoring data.
  - Cross-site mutations and forged actor claims fail; user data never crosses sessions.
- **Harness gate / new tests:** make verify; make browser-test [new]; TLS and browser auth tests.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR22: Inspect contract-driven Run state and artifact references

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt pinned transition graph; no state-machine library needed.
- **Depends on / parallel with:** PR6 / G7.
- **Objective & scope:** Deliver S4 state graph, revision/failure fields and artifact claims with honest session observation logs.
- **Not in this PR:** durable timeline API, content retrieval or invented execution identity.
- **Layers / files:** src/browser/run-detail.ts [new]; src/bff/artifacts.ts [new]; tests/browser/run-detail.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S4.1–S4.5 graph topology follows pinned transitions.
  - skipped revisions do not invent events.
  - hashes are claims until bytes verified and COMPLETED remains distinct from PASS.
- **Harness gate / new tests:** make verify; make browser-test [new]; changed transition graph fixture and cross-run artifact tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR51: Admit and serve the real audited rerun

- **Origin / owner:** in-scope, `perfeng-control-plane`.
- **Depends on / parallel with:** PR45, PR48, PR49, PR50, PR59 / G7.
- **Objective & scope:** Wire the public operation and receipt read into serving. Recheck actor/service entitlement, approved source and operation permission at dispatch, then use the atomic repository path.
- **Layers / files:** internal/httpapi/rerun.go [new]; internal/app/ [modified]; rerun HTTP/Postgres integration tests [new].
- **Acceptance criteria:**
  - Maya can rerun CI’s authorized source but cannot approve its baseline; removed membership or retired source refuses.
  - Lost response and same-key retry create one real child and one attributable receipt.
  - Deny direct unauthorized requests; return bounded generic failures with no credentials.
- **Harness gate / new tests:** make verify and make race; make db-validate against a disposable PostgreSQL database.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR53: Publish and open the canonical CI Run link

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR6, PR43, PR45, PR52, PR42 / G7.
- **Objective & scope:** Provide an opt-in CI consumer helper and documented integration for constructing the configured console URL from authoritative acceptance. Resolve issuer/request identity if required instead of guessing a native ID.
- **Layers / files:** src/browser/runs.ts [modified after PR6]; tools/ci-run-link.ts, tests/integration/ci-link.test.ts [new].
- **Acceptance criteria:**
  - Emitted link lands on the real Run after login across restart or reload; unknown submission yields no invented URL.
  - No bearer, capability or mutable redirect appears in link or CI logs.
  - Denied user sees scoped absence even with the exact link; Scenario Lab is absent.
- **Harness gate / new tests:** make verify; make browser-test [new]; published CI acceptance fixtures.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR28: Render the report and verified provenance chain

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2, OSS5.
- **Depends on / parallel with:** PR22, PR27, PR48 / G8.
- **Objective & scope:** Consume the PR48 run-used projection, pin evidence API and deliver S5 six-section report with exact policy/artifact association.
- **Not in this PR:** generating WARN/overall verdict or computing missing metrics.
- **Layers / files:** vendor/perfeng-contracts/ [new]; src/bff/report.ts [new]; src/browser/report.ts [new]; tests/browser/report.spec.ts [new].
- **Contracts & boundaries:** No local report upload fallback; report classification remains provider-owned.
- **Acceptance criteria:**
  - S5.1–S5.6: six sections/six visual verdict classes plus UNKNOWN, old-schema WARN rejected.
  - raw→normalized→report edges require verified refs.
  - gaps, nonblocking and point-estimate limitations stay visible.
- **Harness gate / new tests:** make contracts-check [new]; make verify; make browser-test [new]; tamper/cross-run/policy mismatch and outage tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR55: Select a shared console qualification environment

- **Origin / owner:** [Prerequisite from M06], `perfeng-environment`.
- **Depends on / parallel with:** PR18, PR45, PR48, PR51, PR52 / G8.
- **Objective & scope:** Select immutable CP, console, identity trust, CI client and real runner versions for service-scoped qualification. Choose host/IdP with the owner before execution; local-only remains available.
- **Layers / files:** deployments/console-acceptance.json and docs/console-acceptance.md [new]; environment validation tests [new].
- **Acceptance criteria:**
  - Preview/offline validation touches no live cluster; no verifier selection, binary, URL, credentials or fault adapters required.
  - Two services, CI, two humans and a baseline approver can be provisioned using explicit consent.
  - Release/rollback pins preserve evidence; protected credentials stay outside Git.
- **Harness gate / new tests:** make verify; [new] make console-selection-check; live target setup separately authorized.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR54: Compare the CI Run and request an audited rerun

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR22, PR28, PR48, PR51, PR53 / G9.
- **Objective & scope:** Place comparison and rerun on ordinary Run detail. Present commit, approved historical baseline and exact policy; confirm intent once and show actor-bound child receipt. Separate baseline approval remains locked.
- **Layers / files:** src/browser/report.ts [modified after PR28]; src/browser/rerun.ts, src/bff/rerun.ts, tests/browser/maya.spec.ts [new].
- **Acceptance criteria:**
  - CI landing shows verified values and gap states; unchanged page works with verifier absent.
  - Retries preserve the same key only for the same pending request; conflict/revocation/uncertain delivery require reconciliation.
  - Link child and audit receipt; refuse silent fallback to current baseline and never fabricate a PASS.
- **Harness gate / new tests:** make contracts-check [new]; make verify; make browser-test [new].
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR63: Emit the deep link from a real CI acceptance job

- **Origin / owner:** in-scope, `perfeng-environment`.
- **Depends on / parallel with:** PR53, PR55 / G9.
- **Objective & scope:** Publish the stable link from actual public CI submission using the reviewed helper and selected test service. No fault injection, synthetic acceptance or verifier involved.
- **Layers / files:** tests/integration/console-ci/ and opt-in CI workflow [new].
- **Acceptance criteria:**
  - CI authenticates as automation, submits a real performance Run and emits only a validated link after acceptance.
  - Re-read persisted association for delayed CI completion; unknown IDs never produce guessed links.
  - Receipt records CI identity and version without tokens.
- **Harness gate / new tests:** make verify; [new] make console-ci-preview offline; opt-in selected CI job and dated receipt.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR56: Qualify the console-only Maya journey

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR42, PR53, PR54, PR55, PR63 / G10.
- **Objective & scope:** Run the product release gate below against the selected CP from a workstation browser. This is the first product qualification receipt, separate from campaign receipts.
- **Layers / files:** tests/acceptance/console-release.test.ts, docs/console-release.md [new]; Makefile [modified].
- **Acceptance criteria:**
  - Actual CI Run link → exact comparison → real completed child Run → durable audit read as Maya.
  - Cross-service copy, revoked grant, missing/replaced baseline and uncertain retry satisfy all negative gates.
  - Verify the product artifact starts and performs the journey with no verifier package/process/secrets.
- **Harness gate / new tests:** make verify; make browser-test [new]; [new] make console-acceptance against explicit selected target.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR19: Publish typed existing operational and catalog interfaces

- **Origin / owner:** in-scope, M05; `perfeng-contracts`.
- **OSS prior art / leveraged pattern:** OSS1/OpenAPI; adapt existing handlers.
- **Depends on / parallel with:** — / G1.
- **Objective & scope:** Describe the existing health/metrics/catalog wire behavior with conformance examples.
- **Not in this PR:** new dependency-health runtime or registry APIs.
- **Layers / files:** api/operator-observation/v1/openapi.json [new]; api/operator-observation/v1/examples/ [new]; contracts.json [modified]; scripts/validate_operator_observation_api.py [new]; tests/ [modified].
- **Contracts & boundaries:** Additive contract family; publish before consumer pin, no deployment claim.
- **Acceptance criteria:**
  - Health semantics say startup serving, not dependency health.
  - cursor/status/auth and metrics media types match checked-in CP handlers.
  - additive release includes closed offline refs and compatibility notes.
- **Harness gate / new tests:** make verify; [new] uv run --locked --offline python scripts/validate_operator_observation_api.py; compare existing handler fixtures.
- **Rollout/rollback:** publish additive contract/provider release before opt-in consumers; retain old pins. Revert the consumer/disable the new route first. No new schema migration is assumed; a required migration changes this PR boundary and needs review.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR7: Expose complete gaps and native observation limitations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom traceability; adapt audit evidence.
- **Depends on / parallel with:** PR6 / G7.
- **Objective & scope:** Deliver S9 plus S7 unsupported-state panels using the audit inventory, not invented worker APIs.
- **Not in this PR:** native discovery, leases or operator inventory provider work.
- **Layers / files:** config/audit-map.json [new]; src/browser/gaps.ts [new]; src/browser/native-workers.ts [new]; scripts/traceability-check.ts [new]; tests/contract/audit-map.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Every audit NOT OBSERVABLE clause maps to owner/API/milestone.
  - S7.1–S7.4 and S9.1–S9.4 hold without worker mutation calls.
  - live outage overlays do not remove clearly static gap definitions.
- **Harness gate / new tests:** [new] make traceability-check; make verify; make browser-test [new]; completeness omissions and leaked capability fixtures fail.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR20: Show platform serving health without false dependency health

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2, OSS5.
- **Depends on / parallel with:** PR6, PR19 / G7.
- **Objective & scope:** Pin operational contract and implement S1 with bounded metrics parsing.
- **Not in this PR:** inferred dependency readiness or rate estimates from one sample.
- **Layers / files:** vendor/perfeng-contracts/ [new]; src/bff/health.ts [new]; src/browser/health.ts [new]; tests/browser/health.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S1.1–S1.4: startup-only signal labeled accurately.
  - unavailable metrics/unknown dependencies never green.
  - counter resets, bounded parsing and outage expiry are tested.
- **Harness gate / new tests:** make contracts-check [new]; make verify; make browser-test [new].
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR21: Browse the authorized catalog snapshot

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5.
- **Depends on / parallel with:** PR6, PR19 / G7.
- **Objective & scope:** Deliver S2 with complete bounded cursor traversal and read-only refs/hashes.
- **Not in this PR:** registry publication or refresh actions.
- **Layers / files:** src/bff/catalog.ts [new]; src/browser/catalog.ts [new]; tests/browser/catalog.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S2.1–S2.4 reject mixed/duplicate/expired snapshots.
  - 410 clears old pages before restarting.
  - absent registry attestation stays NOT OBSERVABLE.
- **Harness gate / new tests:** make contracts-check [new]; make verify; make browser-test [new].
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR24: Inspect baseline lifecycle and conflicts safely

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1; optimistic concurrency pattern.
- **Depends on / parallel with:** PR6 / G7.
- **Objective & scope:** Deliver S6 read lifecycle and disabled-by-default mutation boundary; test conflict-aware adapter without enabling administration.
- **Not in this PR:** provenance defect repair or broad baseline administration.
- **Layers / files:** src/browser/baselines.ts [new]; src/bff/baselines.ts [new]; tests/browser/baselines.spec.ts [new].
- **Contracts & boundaries:** Admin remains off until separate provenance qualification; tests do not activate it.
- **Acceptance criteria:**
  - S6.1–S6.5 preserve actor/reason/time.
  - guarded transition tests preserve expectedRevision and require new decision after409.
  - unverified provenance blocks approval and listing stays a gap.
- **Harness gate / new tests:** make verify; make browser-test [new]; lost-response and direct-route-denial tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR23: Create and cancel Runs through public operations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, idempotency pattern.
- **Depends on / parallel with:** PR21, PR22, PR5 / G8.
- **Objective & scope:** Deliver S8 with stable intent keys and honest uncertain outcomes.
- **Not in this PR:** scenario batching or cancellation optimism.
- **Layers / files:** src/browser/run-actions.ts [new]; src/bff/run-actions.ts [new]; tests/browser/run-actions.spec.ts [new].
- **Contracts & boundaries:** BEHAVIOR-ADJACENT: explicit enablement for mutations; defaults deny.
- **Acceptance criteria:**
  - S8.1–S8.5 test same-key replay/body conflict, authorization and terminal races.
  - direct disabled routes refuse.
  - lost response does not create a new intent automatically.
- **Harness gate / new tests:** make verify; make browser-test [new]; no live submission without separate approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR29: Extract reusable acceptance primitives without behavior change

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt existing acceptance primitives.
- **Depends on / parallel with:** — / G1.
- **Objective & scope:** Isolate public API transport and receipt/target primitives from kube-burner orchestration.
- **Not in this PR:** Scenario Lab behavior or removal of existing DB safety checks.
- **Layers / files:** scripts/kubernetes_acceptance/api_client.py [modified]; scripts/kubernetes_acceptance/journal.py [modified]; scripts/kubernetes_acceptance/workflow.py [modified]; tests/test_kubernetes_acceptance_workflow.py [modified].
- **Contracts & boundaries:** Behavior-preserving refactor; consumed by PR30 and PR31.
- **Acceptance criteria:**
  - Existing acceptance outputs/errors/mutation order remain unchanged.
  - reusable imports have no cluster side effects.
  - tests demonstrate existing guards remain intact.
- **Harness gate / new tests:** make verify; uv run --locked --offline python -m unittest tests.test_kubernetes_acceptance_workflow tests.test_kubernetes_acceptance_transport -v.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR8: Define admitted scenario and result contracts

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS2; independent JSON Schema contracts.
- **Depends on / parallel with:** PR3, PR42 / G4.
- **Objective & scope:** Create versioned scenario/result/review schemas with both expectation levels, source digests and total accounting. Shared foundation for runner/evaluator/UI.
- **Not in this PR:** execute scenarios or approve actual expectations.
- **Layers / files:** contracts/scenario.schema.json [new]; contracts/result.schema.json [new]; contracts/review.schema.json [new]; src/scenarios/admission.ts [new]; tests/scenarios/admission.test.ts [new].
- **Contracts & boundaries:** Versioned persisted local protocol; no competing Perfeng domain schemas.
- **Acceptance criteria:**
  - Unreviewed/tampered manifests are rejected before dispatch.
  - required provenance/seeds/repetitions/tolerances and explicit N/A are validated.
  - provider verdicts remain separate from evaluator statuses and research targets.
- **Harness gate / new tests:** [new] make scenario-contracts-check; make contracts-check [new]; make verify; negative admission and incompatible-version fixtures.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR9: Journal campaigns and export interrupted results

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt write-ahead intent/append-only receipt pattern; Node filesystem, no DB dependency.
- **Depends on / parallel with:** PR8, PR2 / G5.
- **Objective & scope:** Implement append/flush journaling and an independent read-only partial exporter before a runner exists.
- **Not in this PR:** mutation dispatch or a mutable result cache.
- **Layers / files:** src/simulator/journal.ts [new]; src/simulator/export.ts [new]; tests/scenarios/journal.test.ts [new].
- **Contracts & boundaries:** Persisted schema from PR8; output directory owner-controlled, redacted and bounded.
- **Acceptance criteria:**
  - Crash/truncated record/hash mismatch tests preserve acknowledged evidence and mark corruption.
  - partial export works with runner/evaluator stopped.
  - all declared repetitions have records or explicit interruption/not-executed reasons.
- **Harness gate / new tests:** [new] make scenario-results-check; make verify; process-termination and exclusive-finalization tests.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR10: Evaluate expected versus actual independently

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom oracle; cannot import perfeng-analysis comparison code.
- **Depends on / parallel with:** PR8, PR9 / G6.
- **Objective & scope:** Implement comparisons at both expectation levels using source-derived explicit values and tolerances.
- **Not in this PR:** analysis algorithms, synthetic generators or actual execution.
- **Layers / files:** src/scenarios/evaluator.ts [new]; tests/scenarios/evaluator.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Independent fixtures yield MATCH/FINDING/NOT_OBSERVABLE without modifying inputs.
  - lifecycle partial order and missing event evidence do not invent history.
  - known bugs remain findings and research gaps remain visible.
- **Harness gate / new tests:** make verify; make scenario-results-check [new]; independent mutation fixtures alter actual verdict/hash to force findings.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR30: Compose a disposable public-API scenario target

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse environment composition and accepted fixture lifetime pattern.
- **Depends on / parallel with:** PR18, PR27, PR29 / G6.
- **Objective & scope:** Add preview-first fixture selection for existing sample SUT and reviewed CP evidence serving release.
- **Not in this PR:** permanent deploy, ambient credentials or private evaluation.
- **Layers / files:** scripts/scenario_fixture.py [new]; tests/test_scenario_fixture.py [new]; deployments/scenario-fixture.json [new]; docs/scenario-lab-acceptance.md [new].
- **Contracts & boundaries:** Explicit disposable opt-in; release selection after provider publication, never branch HEAD.
- **Acceptance criteria:**
  - Preview performs no network/process mutation.
  - exact release/namespace/cluster identities and public prerequisites are validated.
  - no direct DB/store observation enters evaluator receipts and missing API blocks relevant cases.
- **Harness gate / new tests:** make verify; [new] make scenario-fixture-check; fixed fixtures assert stale identity and private-observation rejection.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR11: Account for confusion cells and campaign coverage

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom domain accounting; no scientific statistics dependency.
- **Depends on / parallel with:** PR9, PR10 / G7.
- **Objective & scope:** Produce per-effect/noise TP/TN/FP/FN, abstentions and separate integrity/coverage/conformance axes.
- **Not in this PR:** statistical significance or aggregate platform PASS.
- **Layers / files:** src/scenarios/accounting.ts [new]; tests/scenarios/accounting.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - All four confusion cells have independent fixtures.
  - zero denominators are UNKNOWN and nonbinary results never become TN.
  - declared N/A and unexecuted repetitions remain in coverage and two expectation levels remain separate.
- **Harness gate / new tests:** make verify; make scenario-results-check [new]; shuffled/incomplete/duplicate repetition tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR12: Run one synthetic case through the real analysis CLI

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Reuse perfeng-report CLI; subprocess interface wrapper, no analysis source changes.
- **Depends on / parallel with:** PR9, PR10 / G7.
- **Objective & scope:** Add an allowlisted perfeng-report adapter and bounded Tier A runner returning observed bytes to the independent evaluator.
- **Not in this PR:** output-derived expectations or baseline discovery.
- **Layers / files:** src/simulator/offline.ts [new]; tests/scenarios/offline.test.ts [new]; docs/development/analysis-adapter.md [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Uses pinned analysis checkout/tool/image identity and exclusive output.
  - subprocess failure/timeouts become results not dropped cases.
  - one pre-reviewed case executes through actual CLI with synthetic labels and no fabricated CP Run ID.
- **Harness gate / new tests:** make verify; [new] make scenario-offline-check; real CLI adapter test requires explicitly bootstrapped analysis environment. Existing invocation documented in gate inventory below.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR31: Execute one approved cluster step with recovery

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt environment fencing and receipt patterns.
- **Depends on / parallel with:** PR29, PR30 / G7.
- **Objective & scope:** Add allowlisted environment step adapter with target fencing, approval validation and durable receipts.
- **Not in this PR:** full existing privileged workflow execution or automatic cleanup.
- **Layers / files:** scripts/scenario_steps.py [new]; tests/test_scenario_steps.py [new]; docs/scenario-lab-acceptance.md [new].
- **Contracts & boundaries:** Infrastructure authority restricted to owned disposable resources; rollback itself approved.
- **Acceptance criteria:**
  - Each real mutation requires its exact approval.
  - uncertain dispatch is reconciled or blocked.
  - recovery can work during CP outage only through healthy independent target validation and separate approval.
- **Harness gate / new tests:** make verify; make scenario-fixture-check [new]; fake command runner tests cover UID change, crash and cleanup denial.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR13: Admit synthetic semantic edge-case expectations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt contract/policy semantics; independent hand-derived oracle.
- **Depends on / parallel with:** PR8, PR12 / G8.
- **Objective & scope:** Add reviewed unchanged, high-CV, missing metric/baseline, units, direction and equality case sets.
- **Not in this PR:** effect/noise sweeps or edits to analysis behavior.
- **Layers / files:** scenarios/offline/semantics/ [new]; scenarios/reviews/ [new]; tests/scenarios/semantics.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Every expected rule/classification cites source clauses and pinned policy.
  - quality precedence and validation-vs-report failures are explicit.
  - reviewer approval precedes execution and every mismatch is retained.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make scenario-offline-check [new]; make verify. Review expectation digest before any real analyzer case run.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR33: Add bounded sample-SUT delay perturbations

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse standard-library sample server.
- **Depends on / parallel with:** PR31 / G8.
- **Objective & scope:** Add +5ms/+25ms controls to the existing sample API with a bounded configuration path.
- **Not in this PR:** database addition or claiming deterministic measured latency.
- **Layers / files:** charts/sample-sut/files/server.py [modified]; charts/sample-sut/values.yaml [modified]; charts/sample-sut/templates/deployment.yaml [modified]; tests/test_sample_api.py [modified].
- **Contracts & boundaries:** BEHAVIOR-ADJACENT opt-in delay, default zero; GitOps changes through owned disposable overlay.
- **Acceptance criteria:**
  - Existing functional modes remain compatible.
  - configured delay is validated/bounded and reset is approved.
  - DB query case records N/A because inspected SUT has no DB.
- **Harness gate / new tests:** uv run --locked --offline python -m unittest tests.test_sample_api -v; make verify; make render-check (existing Helm prerequisites).
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR36: Provide controlled cancellation and restart triggers

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse acceptance lifecycle fencing.
- **Depends on / parallel with:** PR31 / G8.
- **Objective & scope:** Add reviewed target-bound triggers for dispatch cancellation windows and controller restart without altering lifecycle data.
- **Not in this PR:** inventing public state history or worker impersonation.
- **Layers / files:** scripts/scenario_lifecycle.py [new]; tests/test_scenario_lifecycle.py [new]; docs/scenario-lab-acceptance.md [new].
- **Contracts & boundaries:** M03 live worker qualification not absorbed; native expiry cases blocked without qualified disposable worker.
- **Acceptance criteria:**
  - Event condition checked again at execution, changed state invalidates approval as needed.
  - restart targets exact owned controller.
  - unreachable fast states or absent native fixture are recorded blocked, never fabricated.
- **Harness gate / new tests:** make verify; make scenario-fixture-check [new]; stale state/UID and recovery-outage fixtures.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR38: Provide evidence-integrity fault controls

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt disposable transport fault pattern; no general proxy service dependency assumed.
- **Depends on / parallel with:** PR31, PR30 / G8.
- **Objective & scope:** Add isolated artifact-delivery tamper mechanism and approved baseline transition adapter for fault campaigns.
- **Not in this PR:** direct production bucket edits, metadata rewriting or enabling general console baseline administration.
- **Layers / files:** scripts/scenario_evidence_faults.py [new]; tests/test_scenario_evidence_faults.py [new]; docs/scenario-lab-acceptance.md [new].
- **Contracts & boundaries:** Separate environment fault authority; no baseline integrity fix in characterization.
- **Acceptance criteria:**
  - Only dedicated delivery boundary can alter test bytes.
  - original/hash/target receipt retained as injection evidence.
  - baseline operations use public revision checks and each transition requires approval, provenance concern blocks unsafe setup.
- **Harness gate / new tests:** make verify; make scenario-fixture-check [new]; tamper containment and409/uncertain transition tests. Actual delivery interception mechanism must be reviewed before implementation.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR14: Admit effect-by-noise synthetic campaigns

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom seeded fixture generation using standard math, not analysis implementation.
- **Depends on / parallel with:** PR11, PR12, PR13 / G9.
- **Objective & scope:** Add +2/+5/+10/+25% and unchanged repeated inputs across declared CV cells with seeds/distribution/sample assumptions.
- **Not in this PR:** significance claims or post-run threshold tuning.
- **Layers / files:** scenarios/offline/effects/ [new]; src/scenarios/synthetic-input.ts [new]; tests/scenarios/synthetic-input.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Generated normalized summaries are mathematically consistent.
  - positive detection definition/tolerances/denominators are frozen.
  - 600s campaign declares all repetitions and reports budget-limited coverage.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make scenario-offline-check [new]; make scenario-results-check [new]; independently calculated moments/boundary fixtures.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR34: Inject disposable CPU and network perturbations

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt Kubernetes resource patches; reject full chaos framework for current bounded cases.
- **Depends on / parallel with:** PR31, PR33 / G9.
- **Objective & scope:** Add target-bound CPU-limit -25% and bounded network delay adapters with reversible receipts.
- **Not in this PR:** privileged host-wide traffic changes or DB simulation.
- **Layers / files:** scripts/scenario_perturbations.py [new]; tests/test_scenario_perturbations.py [new]; docs/scenario-lab-acceptance.md [new].
- **Contracts & boundaries:** GitOps ownership respected; no competing live writer without approved boundary.
- **Acceptance criteria:**
  - Exact prior values and target IDs are retained.
  - shared/production targets and unsupported network mechanisms are rejected.
  - cleanup requires approval and never blindly restores a recreated resource.
- **Harness gate / new tests:** make verify; make scenario-fixture-check [new]; command/fault fixtures prove scope and rollback fencing. Network mechanism admission is a gap until reviewed.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR15: Show a complete offline campaign in Scenario Lab

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS5; fixed local service wrapper.
- **Depends on / parallel with:** PR5, PR11, PR14 / G10.
- **Objective & scope:** Extend the lazy maintainer area inside the Console. Use its own Material theme and persistent Verification label, including overlays. When the runner is absent show Runner unavailable and disable campaign actions. Expose manifest review and expected/actual matrices only through authorized BFF reads. Returning to the ordinary Run page restores the Console theme.
- **Not in this PR:** cluster mutations or raw filesystem access.
- **Layers / files:** contracts/simulator.openapi.json [new]; src/bff/simulator.ts [new]; apps/console/src/verification/scenario-lab.ts [new]; tests/browser/scenario-offline.spec.ts [new].
- **Contracts & boundaries:** New authenticated simulator protocol, bounded IDs and data; no arbitrary commands.
- **Acceptance criteria:**
  - S10.1–S10.3/S10.5/S10.6/S10.9 offline paths work.
  - synthetic labels and both phase outcomes survive export.
  - simulator outage clears live status while separately requested dated receipts remain explicitly historical.
- **Harness gate / new tests:** make contracts-check [new]; make verify; make browser-test [new]; actual offline CLI acceptance after expectation approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR16: Authorize one durable mutation intent at a time

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt idempotent intent and capability binding patterns.
- **Depends on / parallel with:** PR9, PR15 / G11.
- **Objective & scope:** Implement simulator step approvals bound to target/manifest/parameters and durable dispatch state.
- **Not in this PR:** cluster credentials or real fault adapters.
- **Layers / files:** src/simulator/approval.ts [new]; apps/console/src/verification/step-approval.ts [new]; tests/scenarios/approval.test.ts [new]; tests/browser/approval.spec.ts [new].
- **Contracts & boundaries:** Persisted approvals; single use does not promise exactly-once external effects.
- **Acceptance criteria:**
  - Expired/replayed/changed/concurrent approvals cannot redispatch.
  - crash-after-dispatch yields UNKNOWN and blocks retry pending reconciliation.
  - browser cannot choose credentials or arbitrary commands.
- **Harness gate / new tests:** make verify; make browser-test [new]; process crash tests at pre-dispatch/ack boundaries.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR17: Enforce campaign time and recovery budgets

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom budget policy; standard monotonic clock.
- **Depends on / parallel with:** PR16 / G12.
- **Objective & scope:** Add declared duration admission, active-time union accounting and residual-work handling.
- **Not in this PR:** automatic cleanup authority or dynamic repetition reduction.
- **Layers / files:** src/simulator/budget.ts [new]; tests/scenarios/budget.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - 600/3600s limits count baseline/setup/recovery and overlapping waits.
  - only quiescent approval waits/shared initial provisioning are excluded.
  - exhausted budget blocks new work but separately approved recovery records overruns.
- **Harness gate / new tests:** make verify; make scenario-results-check [new]; controlled monotonic clock and restart tests.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR32: Submit and observe one real scenario via public APIs

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, reuse environment protocol.
- **Depends on / parallel with:** PR17, PR28, PR31 / G13.
- **Objective & scope:** Implement Tier B driver with real public create/lookup/evidence operations and environment adapter protocol.
- **Not in this PR:** bypassing evidence gaps or importing privileged scripts into BFF.
- **Layers / files:** src/simulator/cluster.ts [new]; src/simulator/environment-client.ts [new]; tests/scenarios/cluster.test.ts [new].
- **Contracts & boundaries:** No CP credential in browser; simulator principal separate and minimal.
- **Acceptance criteria:**
  - Pre-reviewed unchanged case can be submitted with approval and evaluated from public observations.
  - lost response preserves key/UNKNOWN state.
  - injector receipt only proves perturbation, never Perfeng outcome.
- **Harness gate / new tests:** make verify; make scenario-results-check [new]; [new] make scenario-cluster-contract-check against protocol test servers. Live verification reserved for PR41.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR35: Admit workload and idempotency cluster scenarios

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt public idempotency semantics and declared perturbation model.
- **Depends on / parallel with:** PR8, PR32, PR34 / G14.
- **Objective & scope:** Freeze unchanged/delay/CPU/network expectations plus duplicate/concurrent identical creates.
- **Not in this PR:** timing conclusions derived from measured campaign results.
- **Layers / files:** scenarios/cluster/workload/ [new]; scenarios/cluster/idempotency/ [new]; scenarios/reviews/ [new]; tests/scenarios/cluster-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Expected paths/rules/research targets cite pinned clauses and tolerate workload uncertainty explicitly.
  - each concurrent request has a separately approved intent before coordinated dispatch.
  - same key/body maps to one resource while N/A DB remains counted.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify; adversarial expectation approval before any live run; schema/independent expected-value tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR37: Admit cancellation and interrupted-execution expectations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt transition/lease contracts; independent partial-order oracle.
- **Depends on / parallel with:** PR35, PR36 / G15.
- **Objective & scope:** Add contract-derived cancellation cases for every cancellable state, after-dispatch restart and lease expiry.
- **Not in this PR:** implementing missing native/runtime capabilities.
- **Layers / files:** scenarios/cluster/lifecycle/ [new]; scenarios/reviews/ [new]; tests/scenarios/lifecycle-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Coverage enumerates states from transitions and never handcodes an assumed subset.
  - missed/unobservable windows are distinct from execution failures.
  - restart/lease expectations distinguish available current guarantees and research targets.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify; contract mutation removes/adds state and coverage gate responds. Review each expectation set before execution.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR39: Admit missing baseline and late-evidence cases

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt policy, artifact and approval contracts.
- **Depends on / parallel with:** PR37, PR38 / G16.
- **Objective & scope:** Freeze missing/unapproved baseline, tampered checksum, revoked approval on retry and delayed/missing evidence expectations.
- **Not in this PR:** change platform code or lower expected outcomes after failures.
- **Layers / files:** scenarios/cluster/evidence/ [new]; scenarios/reviews/ [new]; tests/scenarios/evidence-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Current-phase source obligations and requested research target remain distinct, including INCONCLUSIVE vs failed Run.
  - tamper refusal evaluated only from public evidence.
  - missing observability never converts into MATCH.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify; adversarial review before live execution; independent fixtures model mismatch and absent outcome.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR40: Operate cluster campaigns from Scenario Lab

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5; reuse existing simulator protocol.
- **Depends on / parallel with:** PR32, PR35, PR37, PR39, PR7, PR54 / G17.
- **Objective & scope:** Complete the separately authorized optional S10 cluster UI with per-step approval, progress, findings, real Run links and explicit partial receipts.
- **Not in this PR:** unattended mutations or full platform-health inference.
- **Layers / files:** apps/console/src/verification/scenario-cluster.ts [new]; src/bff/simulator.ts [new]; tests/browser/scenario-cluster.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S10.1–S10.9 all cluster paths are covered.
  - CP-down recovery is narrowly distinguished from disabled new work.
  - missing API/native/DB cases and historical receipts cannot appear as current successful evidence.
- **Harness gate / new tests:** make verify; make browser-test [new]; make traceability-check [new]; crash/outage/resume/expiry browser fixtures.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR41: Qualify the bounded campaign and publish operator guidance

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Reuse all admitted harnesses; independent evidence qualification.
- **Depends on / parallel with:** PR40, PR14 / G18.
- **Objective & scope:** Run separately approved live acceptance and document observed findings/coverage with reproducible external receipts. Add the operator qualification harness and runbook.
- **Not in this PR:** committing secrets/receipts or fixing platform findings.
- **Layers / files:** docs/scenario-lab-acceptance.md [new]; tests/acceptance/scenario-campaign.test.ts [new]; Makefile [modified]; config/acceptance-map.json [new].
- **Contracts & boundaries:** Qualified receipt is dated scope, not M05/M03/M04 completion; failures may be valid characterization.
- **Acceptance criteria:**
  - 10/60-minute campaign manifest and repetitions frozen/reviewed before runs.
  - each mutating step confirmed with budget accounting and residual resource report.
  - all verifier ACs map to tests or explicit unmet gates, and findings produce separately proposed issues rather than repairs.
- **Harness gate / new tests:** make verify; make browser-test [new]; make traceability-check [new]; make scenario-results-check [new]; [new] make scenario-acceptance with explicit approved manifest configuration. No live command claimed available today.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR57: Qualify the independently released verifier

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR41, PR42, PR54 / G19.
- **Objective & scope:** Package, version and qualify the maintainer verifier independently. Prove it works with the released console/CP protocol, links to the ordinary Run route, and can be disabled/upgraded alone.
- **Layers / files:** tests/acceptance/verifier-release.test.ts, docs/verifier-release.md [new]; Makefile [modified].
- **Acceptance criteria:**
  - Independent artifact, credentials, startup and version/rollback; ordinary engineer cannot invoke its protocol directly.
  - Synthetic Tier A and separately approved live Tier B retain frozen expectations, findings and incomplete coverage.
  - Known slowdown links to the same product Run detail used by Maya; no dependency from product gate to verifier qualification.
- **Harness gate / new tests:** make verify; make scenario-results-check [new]; [new] make verifier-acceptance with exact target and approvals.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR60: Map service configuration proposals to their Git owners

- **Origin / owner:** in-scope, `perfeng-environment`.
- **Depends on / parallel with:** PR18 / G2.
- **Objective & scope:** Post-pilot: identify reviewed owner/repo/path and immutable publication receipts for service registration, suites, environment selections and policy proposals. Environment composes the mappings; it need not own the source bytes.
- **Layers / files:** docs/configuration-proposals.md and approved source-route fixtures [new].
- **Acceptance criteria:**
  - Unmapped resource types cannot be proposed.
  - Known policy bundle resolves to its reviewed source owner and separately identifies its publisher.
  - Merged but unpublished versions are not eligible for new Runs.
- **Harness gate / new tests:** make verify; route and publication fixture validation.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR61: Propose one service onboarding change for review

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR52, PR56, PR60 / G11.
- **Objective & scope:** Post-pilot: let an authorized engineer propose registration and select an existing environment and suite. Open a review-only Git PR through a separately scoped server adapter. Pin the proposal base and wait for immutable publication before launching.
- **Layers / files:** src/bff/config-proposals.ts, src/browser/onboarding.ts, tests/browser/onboarding.spec.ts [new].
- **Acceptance criteria:**
  - Check actor/service and allowlisted repo/path on every proposal; Git writer cannot merge or deploy.
  - Show diff and PR link, reject stale base, deduplicate unknown submissions, and keep credentials server-side.
  - Real reviewed publication activates the selection; merged-but-unpublished status cannot enable a Run.
- **Harness gate / new tests:** make verify; make browser-test [new]; protected source-owner review required.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

### M05-PR62: Propose versioned performance policy changes

- **Origin / owner:** in-scope, `perfeng-console`.
- **Depends on / parallel with:** PR61 / G12.
- **Objective & scope:** Post-pilot: reuse the reviewed Git flow for new policy versions, with an explicit diff and a separately authorized policy editor.
- **Layers / files:** src/bff/config-proposals.ts [modified after PR61]; src/browser/policy-proposal.ts, tests/browser/policy-proposal.spec.ts [new].
- **Acceptance criteria:**
  - Changing a threshold proposes new source bytes and version; only publication enables future Runs.
  - Historical comparison still shows the prior digest after a policy change.
  - Suite code and environment provisioning remain Git/CLI workflows.
- **Harness gate / new tests:** make verify; make browser-test [new]; immutable policy regression fixture.
- **Size:** M, 250–450 handwritten LOC including tests. Keep changes independently reversible behind the relevant capability flag.

## Traceability and explicit gaps

| Approved in-scope item | PR IDs / acceptance mapping |
|---|---|
| Durable CI identity and actual workstation link | PR43/45/52/53/55/63; product gate PR56 |
| Historical run-used baseline and policy comparison | PR25–28, PR46–48, PR54; require positive binding in P |
| Attributed rerun, service rights, audit and revoked approval | PR43–45, PR49–52, PR58–59; PR54/56 |
| Independent product/verifier artifacts and releases | PR42/56 (P), PR15/40/41/57 (V) |
| Git onboarding and published policy changes | PR60–62 (post-pilot) |
| Constraints, repository ADR, dependency discipline, M05 map | PR1–PR3, PR18 |
| Thin BFF, browser credential isolation, security tests | PR4–PR6, PR16, PR32; shared tests apply to every screen |
| Pinned/checksummed client and no runtime schema fetching | PR3, PR19–PR21, PR25–PR28 |
| S1 health/readiness/metrics/dependency gaps | PR19–PR20; S1.1–S1.4 |
| S2 catalog/registry | PR19, PR21; S2.1–S2.4 |
| S3 lookup/list as API allows | PR6; S3.1–S3.4 |
| S4 timeline/revision/failure/execution identity/artifact provenance | PR22, PR25–PR28; S4.1–S4.5; missing event/identity API remains G05 |
| S5 research §27 layout, six classes, UNKNOWN, policy/nonblocking limits | PR28; S5.1–S5.6; new WARN provider semantics not fabricated |
| S6 baseline lifecycle/revision conflicts | PR24; S6.1–S6.5; general admin remains disabled |
| S7 native presence/leases/upload reservation observability | PR7; S7.1–S7.4; actual operator APIs remain G09 |
| S8 public create/cancel | PR23; S8.1–S8.5 |
| S9 every NOT OBSERVABLE item and needed API | PR7; S9.1–S9.4 |
| Scenario schema: id/purpose/research/tier/perturbation/repetitions/two levels | PR8, PR13–PR14, PR35, PR37, PR39 |
| Pre-run expectations/review/immutability | PR8, PR13–PR14, PR35, PR37, PR39; execution blocked without review |
| Tier A unchanged ×N, all four effects/CVs, highCV, missing/unit/direction/equality | PR12–PR14 |
| Independent comparisons, confusion matrices, abstention rates | PR10–PR11, PR15 |
| Durable result JSON, partial export, crash integrity | PR9–PR11, PR16–PR17 |
| 10/60-minute budgets and predeclared repetition selection | PR14, PR17, PR35/37/39, PR41 |
| Tier B sample SUT unchanged/delay/CPU/network/DB applicability | PR30–PR35; DB N/A explicitly retained |
| Duplicate/concurrent identical creates | PR16, PR32, PR35 |
| Every cancellable state incl after dispatch/controller restart/lease expiry | PR36–PR37; missing state-window evidence/native prerequisite remains BLOCKED |
| Missing/unapproved baseline, tamper refusal, revoked approval on retry | PR38–PR39 |
| Delayed/missing evidence, failure recovery | PR9, PR17, PR36–PR39 |
| Each mutating step confirmed, disposable authority, approved cleanup | PR16–PR17, PR30–PR34, PR36, PR38 |
| Existing Kubernetes acceptance reuse without privileged bypass | PR29–PR31, safe subset in approved spec |
| S10 optional maintainer workflow, real links, historical/live distinctions | PR15–PR17, PR32, PR40–PR41; S10.1–S10.9 |
| No stale/sample data on outage; accessible interfaces | PR5–PR7, every screen PR; P/PR56 and V/PR57 separately |

**Uncovered by implementation in this plan, explicitly visible rather than forgotten:** G02 dynamic dependency health, G03 registry attestation/refresh, G04 Run/baseline list APIs, G05 durable events/execution identity, G07 provenance beyond the run-used bindings required by PR46–48, G08 new report/WARN/overall semantics, G09 operator native inventory, G10 platform-wide history/reanalysis, G11 statistical diagnosis, G12 CP-mediated Argus evidence, G13 producer p99/quality improvements and M03/M04 live qualification, G14 M06 production proofs. G01 is addressed by PR19; G06 is narrowed to PR25–PR28 authorized artifact/policy reads, not a general object browser. All remaining items have gap-panel coverage. If any becomes necessary to execute an otherwise admitted scenario, mark it blocked and request separately scoped provider work; never quietly add it to a console PR.


## Later work and limits of this release

PR60–62 cover the Git proposal and publication workflow after P. Multi-team self-service access administration, a shared baseline approval/retirement UI, scoped paginated Run discovery, longitudinal trends and complete event history need separate service-authorized contracts and future issue scopes. PR44 provides controlled operator grant/revoke, and PR24 keeps baseline administration disabled until its provenance gate passes. These are honest limits of the first pilot, not evidence that the two-year product is complete.

## Scope, rollout and open decisions

**M06 prerequisite for shared use.** PR44, PR45, PR52, PR55 and PR58 borrow only the identity, grant, revocation, audit-related integration and hosting necessary for the six-month pilot. The owning M06 milestone retains general production SSO rollout, HA, disaster recovery, multi-tenant operations and broader administrative UI. Do not mark M06 complete. PR50/51 are in-scope Run audit/lineage, not an enterprise audit platform. Existing M03/M04 native qualification may block individual V cases and never P. No temporary success stubs. Proposed cross-milestone slices: 5 of 63.

Publish contracts first, deploy additive CP migrations and protected operations behind capability flags, select exact working versions, then enable the console routes. For rollback, disable routes and consumer selections before reverting providers. Preserve immutable bindings, audit receipts and legacy owner-only reads. No backfill from current membership or policy. If a provider cannot retain the required evidence, block P until resolved; avoid weakening its positive case.

Open decisions before relevant implementation: owner-selected identity provider/trust model and pilot host; safe mapping of historical principal-owned records to services; durable evidence/audit retention and access policy; source repo and publish receipts for each configuration type; bounded network fault mechanism for V. Costs, available maintainer time and dates are unverified. Cross-repo work larger than a reviewable slice gets resliced before coding. Service discovery and longitudinal history follow demonstrated product needs; revisit the repo split only if tests cannot enforce independent packaging and privilege.

## Planning validation

Validate unique task IDs, checklist anchors, dependencies/topological groups, and product acceptance independence on each plan edit. No product, CI, cluster, deployment or platform qualification is performed by editing this plan.
