# M05 — Perfeng Console and Scenario Lab implementation plan

## Summary and status

**Approved for publication on 2026-11-06.** The source proposal is the workspace document `perfeng-console-spec-2026-11-05.md`. Milestone: **M05 — Operator Visibility and Diagnostics**. Stable workstream IDs are `M05-PR1` … `M05-PR41`; they are not GitHub issue or PR numbers. This is the console/Scenario Lab workstream, not a claim to close all M05 telemetry, alerts and correlation outcomes.

Read-only exploration preceded this document. `perfeng-console` HEAD was `56cddb48cf95f929423f090bb223c455104e4b4d`, clean, containing LICENSE only (Apache-2.0); no prior task files or local contribution rules exist. No code, installs, branches, commits, GitHub issues or cluster actions were performed. These two planning files are the only repository additions. The milestone rules prohibit implementation before review; therefore issue-first means create/reuse an issue **when its implementation is authorized**, not publishing 41 issues during this planning turn. [todo.md](todo.md) is the local task target until that point; replace entries with actual issue links as authorized.

Deliverables: secure thin BFF and supporting S1–S9 screens, primary Scenario Lab, independent evaluator, immutable two-level expectations, bounded synthetic and live campaigns, complete findings/coverage records. Existing public API gaps are visible; only the minimum typed operational/catalog and protected evidence APIs enter this plan. No new Run listing, native operator inventory, durable event history, statistics, WARN semantics or production deployment is quietly included.

### Source findings and responsible owners

| Evidence inspected | Planning consequence |
|---|---|
| Console LICENSE only, no Makefile/package/tests | PR1–PR3 supply governance, exact dependency admission, executable gates and contract snapshots; no existing console test command claimed |
| Environment `workspace.json`, `tests/test_workspace.py` | Cloned console is not yet a workspace manifest member; PR18 owns that change |
| Environment dependency policy and AGENTS/CONTRIBUTING | Exact pins, explicit live mutation, issue-first implementation and human review; do not copy Python-only dependency requirements to Node |
| CP HTTP service/catalog handlers, Run API and objectstore reader | Existing health/catalog need typed contracts; artifact metadata is not authorized content; PR25–PR27 add minimum protected evidence surface |
| Analysis README report CLI and policy semantics | Adapter uses `perfeng-report`, not the normalization CLI or imported comparison oracle; quality/threshold expectations must cite source meaning |
| `charts/sample-sut/files/server.py` | Python functional HTTP fixture, no database and no configured delay mode; add bounded delay, report DB N/A |
| `scripts/kubernetes_acceptance/` and acceptance guide | Existing privileged benchmark workflow is not safe to invoke wholesale; reuse isolated primitives and retain original safety checks |
| Roadmap M05/M03/M04/M06 | M05 owns this consumer work; native/kube-burner qualification and production readiness remain external gates |

## Prior art and adoption analysis

Research consulted official upstream documentation and repositories before slicing. Versions below are deliberately not invented: PR1 must select exact compatible releases, inspect transitive licenses/security and retain them in frozen lockfiles. Approval of this plan does not admit an arbitrary latest package. No external service is needed at runtime.

| Target feature/problem | OSS project / pattern | Recommendation and integration | Licensing, weight and architectural fit |
|---|---|---|---|
| OSS1: typed public API consumer | [openapi-typescript](https://openapi-ts.dev/introduction), [openapi-fetch](https://openapi-ts.dev/openapi-fetch/api) | Adopt generator as dev dependency and fetch client as runtime dependency behind fixed-origin wrapper | MIT; generated types have no runtime cost, fetch wrapper avoids handwritten wire types. Generator reads checked local files only; types do not replace runtime validation |
| OSS2: untrusted schema validation | [Ajv standalone](https://github.com/ajv-validator/ajv/blob/master/docs/standalone.md), [security guidance](https://github.com/ajv-validator/ajv/blob/master/docs/security.md), [license](https://github.com/ajv-validator/ajv) | Adopt build-time validator dependency, generate offline validators; interface wrapper rejects remote refs | MIT; build-only code generation can avoid browser runtime compiler/unsafe-eval and reduce runtime dependency weight. Review schema dialect/formats and output size; no CSP weakening |
| OSS3: BFF transport/server | [Fastify](https://github.com/fastify/fastify), [injection testing](https://github.com/fastify/fastify/blob/main/docs/Reference/Server.md) | Candidate runtime dependency with explicit TLS/session/route wrappers; final exact package admission PR1 | MIT; smaller purpose than full-stack SSR framework, but transitive graph still reviewed. HTTP injection tests supplement, never replace actual TLS/browser tests. Do not compile arbitrary upstream schemas at runtime |
| OSS4: browser rendering | [Lit standalone templates](https://lit.dev/docs/libraries/standalone-templates/) | Candidate `lit-html` dependency and minimal navigation adapter; avoid full SSR framework unless justified in PR1 | [BSD-3-Clause](https://github.com/lit/lit/blob/main/LICENSE), release license rechecked in PR1. Small rendering-only scope, native semantic HTML and no unsafeHTML; evaluate strict CSP compatibility before adoption |
| OSS5: browser verification | [Playwright assertions](https://playwright.dev/docs/test-assertions) and [retry semantics](https://playwright.dev/docs/test-retries) | Adopt development-only test dependency with exact browser release and local providers | [Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE); browser binaries are heavy, runtime product remains unaffected. Auto-wait UI assertions are useful; full-test retries must not hide a failing attempt; retain first-failure evidence |
| Durable operations | Write-ahead intent, idempotent request key, optimistic revision | Adapt pattern with standard Node filesystem and existing CP semantics; custom bounded simulator journal | No new database dependency; must prove flush/crash semantics, UNKNOWN reconciliation and partial export. Generic queues do not guarantee exactly-once mutations |
| Fault campaigns | Existing Kubernetes acceptance primitives and scoped perturbation adapters | Adapt existing code; reject wholesale chaos framework adoption for this initial scope | Existing repository license retained; avoids new cluster controllers/CRDs and broad permissions. Network injection mechanism is a separate admission risk, not an assumed `tc` capability |
| Scenario oracle and confusion matrices | Explicit expectation tables and independent binary accounting | Custom domain logic, standard math, independent test fixtures | No analysis-comparator import, statistical package or copied provider algorithm. Nonbinary outcomes and denominators explicit; synthetic results are not measured real-world significance |

## Sequencing, sizing and gates

Each PR has one mergeable purpose, tests with changed behavior, and a target of ~200–500 handwritten lines excluding lockfiles/generated data and the approved spec copy. S = ~150–250; M = ~250–450. Estimates include behavioral tests. No L task is knowingly planned. If implementation evidence pushes a slice above 500 lines **and** across independent layers, reslice before coding instead of bundling hidden foundations. Small frontend/BFF/test vertical changes can fit one PR; security foundations have multiple downstream consumers.

No synthetic success stubs are proposed. A typed NOT OBSERVABLE state is required product behavior, not a stub to be silently retired. Scenario definitions may be present but BLOCKED until their real prerequisites exist. Incomplete implementations never return successful fixtures in production.

**DAG:** `Depends on` is authoritative; parallel group Gk is the earliest topological depth, not a requirement to wait for unrelated work in earlier groups. Merge any PR after its dependencies, pinned releases and checks pass. Same-repository file overlap still requires serial merge/rebase. Contracts must be published and immutable provider releases selected, not merely merged, before dependent live execution. Numerically ordered IDs are a valid topological merge order; group order exposes independent lanes.

### Exact verification command inventory

Commands below are future implementation gates, **not commands run during this planning task**. Prefix `cd /home/izanagi/sources/perfeng/<repo>` is the working directory, not a chained shell instruction. Every per-PR command is scoped to its owning repo unless explicitly noted.

- Console: every Make target is **[new]**. PR2 adds `make doctor`, `make verify`, `make browser-test`, `make supply-chain`; PR3 adds `make contracts-check`; PR7 adds `make traceability-check`; PR8 adds `make scenario-contracts-check`; PR9 adds `make scenario-results-check`; PR12 adds `make scenario-offline-check`; PR32 adds `make scenario-cluster-contract-check`; PR41 adds `make scenario-acceptance`. The latter consumes an explicit operator-approved manifest/config and refuses implicit cluster execution. Exact recipes/tool flags are a foundation deliverable, not fabricated existing commands. Proposed gates are missing until their owning PR merges. New focused test files are named per PR; `make verify` runs the full relevant offline suite.
- Contracts existing: `make verify`; validation is Python/Effect/JSON Schema plus API conformance. PR19 adds its named validator.
- CP existing: `make verify`, `make race`, `go test -vet=off -count=1 ./internal/httpapi ./internal/objectstore ./internal/app`. PostgreSQL `make db-validate` requires an explicitly configured disposable database; never point at local retained data. Add DB tests only if actual persistence behavior changes.
- Environment existing: `make verify`, `make render-check`, `uv run --locked --offline python -m unittest tests.test_workspace -v`, and the focused modules listed below. PR30 adds `make scenario-fixture-check`. Existing `task kubernetes:acceptance` is offline preview, **not** authorization to append live flags. Rendering requires existing Helm; unavailable tool is NOT RUN.
- Analysis adapter existing command, from analysis repo: `uv run --locked --offline perfeng-report --candidate normalized-result.json --candidate-artifact normalized-artifact.json --policy performance-policy.json --producer-image REGISTRY/IMAGE@sha256:ACTUAL-DIGEST --output analysis-result.json`. File paths are runtime **[new] campaign inputs**, REGISTRY/IMAGE and digest must be actual reviewed producer identity, not literal placeholders. Repeat `--baseline BASELINE_ID VERSION reference-result.json reference-artifact.json` only for declared inputs. Runner uses the equivalent argument array in its isolated working directory and pinned interpreter; no shell expansion. This command writes only requested external campaign results during authorized execution. Existing `make verify` in analysis also builds distributions; it was not run for read-only planning.

All behavior implementation uses RED → GREEN → refactor, focused tests then full repository checks. Do not apply TDD's green target to Perfeng characterization: a correctly functioning evaluator must retain platform FINDINGS. Before executing an actual expectation set, adversarial review its sources and exact digest, offer the required optional cross-model review, reconcile and record approval. No such per-case approval is claimed by this plan.

## Summary table

| ID | Title | Owning repo | Depends on | Parallel group | Size | Origin |
|---|---|---|---|---|---|---|
| M05-PR1 | Record approved constraints and admit the console stack | perfeng-console | — | G1 | M | in-scope |
| M05-PR2 | Establish the offline engineering and browser harness | perfeng-console | PR1 | G2 | M | in-scope |
| M05-PR3 | Vendor contracts and generate the offline typed client | perfeng-console | PR2 | G3 | M | in-scope |
| M05-PR4 | Secure the fixed-origin upstream transport | perfeng-console | PR3 | G4 | M | in-scope |
| M05-PR5 | Pair a local operator session with the console shell | perfeng-console | PR4 | G5 | M | in-scope |
| M05-PR6 | Deliver fresh exact Run lookup | perfeng-console | PR5 | G6 | M | in-scope |
| M05-PR7 | Expose complete gaps and native observation limitations | perfeng-console | PR6 | G7 | M | in-scope |
| M05-PR8 | Define admitted scenario and result contracts | perfeng-console | PR3 | G4 | M | in-scope |
| M05-PR9 | Journal campaigns and export interrupted results | perfeng-console | PR8, PR2 | G5 | M | in-scope |
| M05-PR10 | Evaluate expected versus actual independently | perfeng-console | PR8, PR9 | G6 | M | in-scope |
| M05-PR11 | Account for confusion cells and campaign coverage | perfeng-console | PR9, PR10 | G7 | M | in-scope |
| M05-PR12 | Run one synthetic case through the real analysis CLI | perfeng-console | PR9, PR10 | G7 | M | in-scope |
| M05-PR13 | Admit synthetic semantic edge-case expectations | perfeng-console | PR8, PR12 | G8 | M | in-scope |
| M05-PR14 | Admit effect-by-noise synthetic campaigns | perfeng-console | PR11, PR12, PR13 | G9 | M | in-scope |
| M05-PR15 | Show a complete offline campaign in Scenario Lab | perfeng-console | PR5, PR11, PR14 | G10 | M | in-scope |
| M05-PR16 | Authorize one durable mutation intent at a time | perfeng-console | PR9, PR15 | G11 | M | in-scope |
| M05-PR17 | Enforce campaign time and recovery budgets | perfeng-console | PR16 | G12 | M | in-scope |
| M05-PR18 | Compose the console in the joint source workspace | perfeng-environment | — | G1 | S | in-scope |
| M05-PR19 | Publish typed existing operational and catalog interfaces | perfeng-contracts | — | G1 | M | in-scope |
| M05-PR20 | Show platform serving health without false dependency health | perfeng-console | PR6, PR19 | G7 | M | in-scope |
| M05-PR21 | Browse the authorized catalog snapshot | perfeng-console | PR6, PR19 | G7 | M | in-scope |
| M05-PR22 | Inspect contract-driven Run state and artifact references | perfeng-console | PR6 | G7 | M | in-scope |
| M05-PR23 | Create and cancel Runs through public operations | perfeng-console | PR21, PR22, PR5 | G8 | M | in-scope |
| M05-PR24 | Inspect baseline lifecycle and conflicts safely | perfeng-console | PR6 | G7 | M | in-scope |
| M05-PR25 | Specify authorized immutable Run evidence reads | perfeng-contracts | — | G1 | M | in-scope |
| M05-PR26 | Serve one authorized verified artifact body | perfeng-control-plane | PR25 | G2 | M | in-scope |
| M05-PR27 | Expose exact run-used policy evidence through serving | perfeng-control-plane | PR26 | G3 | M | in-scope |
| M05-PR28 | Render the report and verified provenance chain | perfeng-console | PR22, PR27, PR24 | G8 | M | in-scope |
| M05-PR29 | Extract reusable acceptance primitives without behavior change | perfeng-environment | — | G1 | M | in-scope |
| M05-PR30 | Compose a disposable public-API scenario target | perfeng-environment | PR18, PR27, PR29 | G4 | M | in-scope |
| M05-PR31 | Execute one approved cluster step with recovery | perfeng-environment | PR29, PR30 | G5 | M | in-scope |
| M05-PR32 | Submit and observe one real scenario via public APIs | perfeng-console | PR17, PR28, PR31 | G13 | M | in-scope |
| M05-PR33 | Add bounded sample-SUT delay perturbations | perfeng-environment | PR31 | G6 | M | in-scope |
| M05-PR34 | Inject disposable CPU and network perturbations | perfeng-environment | PR31, PR33 | G7 | M | in-scope |
| M05-PR35 | Admit workload and idempotency cluster scenarios | perfeng-console | PR8, PR32, PR34 | G14 | M | in-scope |
| M05-PR36 | Provide controlled cancellation and restart triggers | perfeng-environment | PR31 | G6 | M | in-scope |
| M05-PR37 | Admit cancellation and interrupted-execution expectations | perfeng-console | PR35, PR36 | G15 | M | in-scope |
| M05-PR38 | Provide evidence-integrity fault controls | perfeng-environment | PR31, PR30 | G6 | M | in-scope |
| M05-PR39 | Admit missing baseline and late-evidence cases | perfeng-console | PR37, PR38 | G16 | M | in-scope |
| M05-PR40 | Operate cluster campaigns from Scenario Lab | perfeng-console | PR32, PR35, PR37, PR39, PR23, PR7 | G17 | M | in-scope |
| M05-PR41 | Qualify the bounded campaign and publish operator guidance | perfeng-console | PR40, PR20, PR21, PR24, PR28, PR14 | G18 | M | in-scope |

## Per-PR scope

All paths below are relative to the owning repository. **[new] means absent in the current checkout**, including files that an earlier planned PR will create; later PRs modify those planned files rather than creating duplicates. `[modified]` means an existing source path/directory. Tests and docs ship with code. No file moves are proposed. Each row inherits the security, immutable expectation, bounded budget and honest-reporting constraints.

### M05-PR1: Record approved constraints and admit the console stack

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS5; admission only.
- **Depends on / parallel with:** none / PR18, PR19, PR25, PR29 (G1).
- **Objective & scope:** Promote the approved proposal into durable repository governance and decide exact supported toolchain/package pins with license, security and replacement review.
- **Not in this PR:** product behavior or installations on operator machines.
- **Layers / files:** CONSTRAINTS.md [new]; SPEC.md [new, approved document copy]; AGENTS.md [new]; CONTRIBUTING.md [new]; docs/decisions/0001-own-operator-console-and-bff.md [new]; docs/development/dependency-policy.md [new]; package.json [new]; pnpm-lock.yaml [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Constraints preserve all eleven requirements and proposed gates are explicitly unenforced until PR2/PR8.
  - ADR records separate simulator process and ownership.
  - exact versions/licenses/engines and issue-first/human-review workflow are recorded without executable stubs.
- **Harness gate / new tests:** No existing console gate. Human compare SPEC/CONSTRAINTS against approved source; PR2 supplies executable admission and lock gates.
- **Size:** M, 250–400 plus approved spec copy handwritten LOC including tests, excluding generated/locked files.

### M05-PR2: Establish the offline engineering and browser harness

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS4–OSS5; tools are development dependencies.
- **Depends on / parallel with:** M05-PR1 / PR26 (G2).
- **Objective & scope:** Provide strict TypeScript build, formatting, unit/contract tests, real-browser test harness and blocking CI with exact pins. Foundation is consumed by every later slice.
- **Not in this PR:** scenario or screen implementation.
- **Layers / files:** Makefile [new]; tsconfig.json [new]; playwright.config.ts [new]; scripts/ [new]; tests/harness/ [new]; .github/workflows/verify.yml [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Commands install nothing implicitly and refuse missing tools.
  - fresh checkout can run pinned checks after explicit bootstrap.
  - test-provider smoke and secret/import-boundary checks fail on known bad fixtures, retries do not erase failures.
- **Harness gate / new tests:** [new] make doctor; [new] make verify; [new] make browser-test; [new] make supply-chain. CI tests failure propagation; browser harness must actually launch pinned Chromium.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR3: Vendor contracts and generate the offline typed client

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2; wrapped generation and standalone validators.
- **Depends on / parallel with:** M05-PR2 / PR27 (G3).
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

### M05-PR4: Secure the fixed-origin upstream transport

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS3; wrap HTTP transport, reuse platform TLS.
- **Depends on / parallel with:** M05-PR3 / PR8, PR30 (G4).
- **Objective & scope:** Implement server-only bearer loading, reviewed destination/TLS policy and bounded allowlisted transport.
- **Not in this PR:** browser sessions or generic proxying.
- **Layers / files:** src/bff/transport.ts [new]; src/bff/config.ts [new]; tests/integration/transport.test.ts [new].
- **Contracts & boundaries:** Security boundary: fixed origin/principal; no browser-selectable URL.
- **Acceptance criteria:**
  - Unsafe credential files/ancestors, wrong CA, redirects and unapproved destinations fail closed.
  - response bounds/deadlines are enforced.
  - canary credentials never enter safe errors or logs.
- **Harness gate / new tests:** make verify [new]; make supply-chain [new]; TLS integration tests and canary-secret assertions.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR5: Pair a local operator session with the console shell

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS3–OSS5.
- **Depends on / parallel with:** M05-PR4 / PR9, PR31 (G5).
- **Objective & scope:** Deliver loopback HTTPS pairing, expiry, CSRF and an accessible navigation shell.
- **Not in this PR:** platform mutation controls or SSO.
- **Layers / files:** src/bff/session.ts [new]; src/browser/shell.ts [new]; tests/browser/session.spec.ts [new].
- **Contracts & boundaries:** Local single-user session only; configured certificate required.
- **Acceptance criteria:**
  - Single-use pairing expiry/attempt limits and idle/absolute session expiry follow spec.
  - Host/Origin/CSRF and route allowlists block bypass.
  - browser bundle/network/storage/log checks show no upstream credentials.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; real-browser cross-origin/expiry/keyboard tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR6: Deliver fresh exact Run lookup

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5.
- **Depends on / parallel with:** M05-PR5 / PR10, PR33, PR36, PR38 (G6).
- **Objective & scope:** Implement S3 exact lookup with common freshness envelopes and generation invalidation. Foundation freshness is reused by all screens.
- **Not in this PR:** Run listing or invented history.
- **Layers / files:** src/bff/runs.ts [new]; src/presentation/observation.ts [new]; src/browser/runs.ts [new]; tests/browser/runs.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S3.1–S3.4: current response only, explicit listing gap and scoped not-found.
  - 3s deadline/10s expiry clear values.
  - delayed old-generation responses and reconnect cannot resurrect data.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; controlled clock and disconnect/reconnect browser sequence.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR7: Expose complete gaps and native observation limitations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom traceability; adapt audit evidence.
- **Depends on / parallel with:** M05-PR6 / PR11, PR12, PR20, PR21, PR22, PR24, PR34 (G7).
- **Objective & scope:** Deliver S9 plus S7 unsupported-state panels using the audit inventory, not invented worker APIs.
- **Not in this PR:** native discovery, leases or operator inventory provider work.
- **Layers / files:** config/audit-map.json [new]; src/browser/gaps.ts [new]; src/browser/native-workers.ts [new]; scripts/traceability-check.ts [new]; tests/contract/audit-map.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Every audit NOT OBSERVABLE clause maps to owner/API/milestone.
  - S7.1–S7.4 and S9.1–S9.4 hold without worker mutation calls.
  - live outage overlays do not remove clearly static gap definitions.
- **Harness gate / new tests:** [new] make traceability-check; make verify [new]; make browser-test [new]; completeness omissions and leaked capability fixtures fail.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR8: Define admitted scenario and result contracts

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS2; independent JSON Schema contracts.
- **Depends on / parallel with:** M05-PR3 / PR4, PR30 (G4).
- **Objective & scope:** Create versioned scenario/result/review schemas with both expectation levels, source digests and total accounting. Shared foundation for runner/evaluator/UI.
- **Not in this PR:** execute scenarios or approve actual expectations.
- **Layers / files:** contracts/scenario.schema.json [new]; contracts/result.schema.json [new]; contracts/review.schema.json [new]; src/scenarios/admission.ts [new]; tests/scenarios/admission.test.ts [new].
- **Contracts & boundaries:** Versioned persisted local protocol; no competing Perfeng domain schemas.
- **Acceptance criteria:**
  - Unreviewed/tampered manifests are rejected before dispatch.
  - required provenance/seeds/repetitions/tolerances and explicit N/A are validated.
  - provider verdicts remain separate from evaluator statuses and research targets.
- **Harness gate / new tests:** [new] make scenario-contracts-check; make contracts-check [new]; make verify [new]; negative admission and incompatible-version fixtures.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR9: Journal campaigns and export interrupted results

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt write-ahead intent/append-only receipt pattern; Node filesystem, no DB dependency.
- **Depends on / parallel with:** M05-PR8, M05-PR2 / PR5, PR31 (G5).
- **Objective & scope:** Implement append/flush journaling and an independent read-only partial exporter before a runner exists.
- **Not in this PR:** mutation dispatch or a mutable result cache.
- **Layers / files:** src/simulator/journal.ts [new]; src/simulator/export.ts [new]; tests/scenarios/journal.test.ts [new].
- **Contracts & boundaries:** Persisted schema from PR8; output directory owner-controlled, redacted and bounded.
- **Acceptance criteria:**
  - Crash/truncated record/hash mismatch tests preserve acknowledged evidence and mark corruption.
  - partial export works with runner/evaluator stopped.
  - all declared repetitions have records or explicit interruption/not-executed reasons.
- **Harness gate / new tests:** [new] make scenario-results-check; make verify [new]; process-termination and exclusive-finalization tests.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR10: Evaluate expected versus actual independently

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom oracle; cannot import perfeng-analysis comparison code.
- **Depends on / parallel with:** M05-PR8, M05-PR9 / PR6, PR33, PR36, PR38 (G6).
- **Objective & scope:** Implement comparisons at both expectation levels using source-derived explicit values and tolerances.
- **Not in this PR:** analysis algorithms, synthetic generators or actual execution.
- **Layers / files:** src/scenarios/evaluator.ts [new]; tests/scenarios/evaluator.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Independent fixtures yield MATCH/FINDING/NOT_OBSERVABLE without modifying inputs.
  - lifecycle partial order and missing event evidence do not invent history.
  - known bugs remain findings and research gaps remain visible.
- **Harness gate / new tests:** make verify [new]; make scenario-results-check [new]; independent mutation fixtures alter actual verdict/hash to force findings.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR11: Account for confusion cells and campaign coverage

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom domain accounting; no scientific statistics dependency.
- **Depends on / parallel with:** M05-PR9, M05-PR10 / PR7, PR12, PR20, PR21, PR22, PR24, PR34 (G7).
- **Objective & scope:** Produce per-effect/noise TP/TN/FP/FN, abstentions and separate integrity/coverage/conformance axes.
- **Not in this PR:** statistical significance or aggregate platform PASS.
- **Layers / files:** src/scenarios/accounting.ts [new]; tests/scenarios/accounting.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - All four confusion cells have independent fixtures.
  - zero denominators are UNKNOWN and nonbinary results never become TN.
  - declared N/A and unexecuted repetitions remain in coverage and two expectation levels remain separate.
- **Harness gate / new tests:** make verify [new]; make scenario-results-check [new]; shuffled/incomplete/duplicate repetition tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR12: Run one synthetic case through the real analysis CLI

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Reuse perfeng-report CLI; subprocess interface wrapper, no analysis source changes.
- **Depends on / parallel with:** M05-PR9, M05-PR10 / PR7, PR11, PR20, PR21, PR22, PR24, PR34 (G7).
- **Objective & scope:** Add an allowlisted perfeng-report adapter and bounded Tier A runner returning observed bytes to the independent evaluator.
- **Not in this PR:** output-derived expectations or baseline discovery.
- **Layers / files:** src/simulator/offline.ts [new]; tests/scenarios/offline.test.ts [new]; docs/development/analysis-adapter.md [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Uses pinned analysis checkout/tool/image identity and exclusive output.
  - subprocess failure/timeouts become results not dropped cases.
  - one pre-reviewed case executes through actual CLI with synthetic labels and no fabricated CP Run ID.
- **Harness gate / new tests:** make verify [new]; [new] make scenario-offline-check; real CLI adapter test requires explicitly bootstrapped analysis environment. Existing invocation documented in gate inventory below.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR13: Admit synthetic semantic edge-case expectations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt contract/policy semantics; independent hand-derived oracle.
- **Depends on / parallel with:** M05-PR8, M05-PR12 / PR23, PR28 (G8).
- **Objective & scope:** Add reviewed unchanged, high-CV, missing metric/baseline, units, direction and equality case sets.
- **Not in this PR:** effect/noise sweeps or edits to analysis behavior.
- **Layers / files:** scenarios/offline/semantics/ [new]; scenarios/reviews/ [new]; tests/scenarios/semantics.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Every expected rule/classification cites source clauses and pinned policy.
  - quality precedence and validation-vs-report failures are explicit.
  - reviewer approval precedes execution and every mismatch is retained.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make scenario-offline-check [new]; make verify [new]. Review expectation digest before any real analyzer case run.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR14: Admit effect-by-noise synthetic campaigns

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom seeded fixture generation using standard math, not analysis implementation.
- **Depends on / parallel with:** M05-PR11, M05-PR12, M05-PR13 / none at this depth (G9).
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

### M05-PR15: Show a complete offline campaign in Scenario Lab

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS5; fixed local service wrapper.
- **Depends on / parallel with:** M05-PR5, M05-PR11, M05-PR14 / none at this depth (G10).
- **Objective & scope:** Deliver scenario selection, immutable manifest review, launch and expected/actual matrices through a fixed simulator protocol.
- **Not in this PR:** cluster mutations or raw filesystem access.
- **Layers / files:** contracts/simulator.openapi.json [new]; src/bff/simulator.ts [new]; src/browser/scenario-lab.ts [new]; tests/browser/scenario-offline.spec.ts [new].
- **Contracts & boundaries:** New authenticated simulator protocol, bounded IDs and data; no arbitrary commands.
- **Acceptance criteria:**
  - S10.1–S10.3/S10.5/S10.6/S10.9 offline paths work.
  - synthetic labels and both phase outcomes survive export.
  - simulator outage clears live status while separately requested dated receipts remain explicitly historical.
- **Harness gate / new tests:** make contracts-check [new]; make verify [new]; make browser-test [new]; actual offline CLI acceptance after expectation approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR16: Authorize one durable mutation intent at a time

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt idempotent intent and capability binding patterns.
- **Depends on / parallel with:** M05-PR9, M05-PR15 / none at this depth (G11).
- **Objective & scope:** Implement simulator step approvals bound to target/manifest/parameters and durable dispatch state.
- **Not in this PR:** cluster credentials or real fault adapters.
- **Layers / files:** src/simulator/approval.ts [new]; src/browser/step-approval.ts [new]; tests/scenarios/approval.test.ts [new]; tests/browser/approval.spec.ts [new].
- **Contracts & boundaries:** Persisted approvals; single use does not promise exactly-once external effects.
- **Acceptance criteria:**
  - Expired/replayed/changed/concurrent approvals cannot redispatch.
  - crash-after-dispatch yields UNKNOWN and blocks retry pending reconciliation.
  - browser cannot choose credentials or arbitrary commands.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; process crash tests at pre-dispatch/ack boundaries.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR17: Enforce campaign time and recovery budgets

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Custom budget policy; standard monotonic clock.
- **Depends on / parallel with:** M05-PR16 / none at this depth (G12).
- **Objective & scope:** Add declared duration admission, active-time union accounting and residual-work handling.
- **Not in this PR:** automatic cleanup authority or dynamic repetition reduction.
- **Layers / files:** src/simulator/budget.ts [new]; tests/scenarios/budget.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - 600/3600s limits count baseline/setup/recovery and overlapping waits.
  - only quiescent approval waits/shared initial provisioning are excluded.
  - exhausted budget blocks new work but separately approved recovery records overruns.
- **Harness gate / new tests:** make verify [new]; make scenario-results-check [new]; controlled monotonic clock and restart tests.
- **Rollout/rollback:** retain journal and original target identity; stop new dispatch on incompatibility. Reverting source is not cleanup authorization. Unknown external effects block retry and every recovery mutation needs explicit approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR18: Compose the console in the joint source workspace

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt existing workspace schema.
- **Depends on / parallel with:** none / PR1, PR19, PR25, PR29 (G1).
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

### M05-PR19: Publish typed existing operational and catalog interfaces

- **Origin / owner:** in-scope, M05; `perfeng-contracts`.
- **OSS prior art / leveraged pattern:** OSS1/OpenAPI; adapt existing handlers.
- **Depends on / parallel with:** none / PR1, PR18, PR25, PR29 (G1).
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

### M05-PR20: Show platform serving health without false dependency health

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2, OSS5.
- **Depends on / parallel with:** M05-PR6, M05-PR19 / PR7, PR11, PR12, PR21, PR22, PR24, PR34 (G7).
- **Objective & scope:** Pin operational contract and implement S1 with bounded metrics parsing.
- **Not in this PR:** inferred dependency readiness or rate estimates from one sample.
- **Layers / files:** vendor/perfeng-contracts/ [new]; src/bff/health.ts [new]; src/browser/health.ts [new]; tests/browser/health.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S1.1–S1.4: startup-only signal labeled accurately.
  - unavailable metrics/unknown dependencies never green.
  - counter resets, bounded parsing and outage expiry are tested.
- **Harness gate / new tests:** make contracts-check [new]; make verify [new]; make browser-test [new].
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR21: Browse the authorized catalog snapshot

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5.
- **Depends on / parallel with:** M05-PR6, M05-PR19 / PR7, PR11, PR12, PR20, PR22, PR24, PR34 (G7).
- **Objective & scope:** Deliver S2 with complete bounded cursor traversal and read-only refs/hashes.
- **Not in this PR:** registry publication or refresh actions.
- **Layers / files:** src/bff/catalog.ts [new]; src/browser/catalog.ts [new]; tests/browser/catalog.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S2.1–S2.4 reject mixed/duplicate/expired snapshots.
  - 410 clears old pages before restarting.
  - absent registry attestation stays NOT OBSERVABLE.
- **Harness gate / new tests:** make contracts-check [new]; make verify [new]; make browser-test [new].
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR22: Inspect contract-driven Run state and artifact references

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt pinned transition graph; no state-machine library needed.
- **Depends on / parallel with:** M05-PR6 / PR7, PR11, PR12, PR20, PR21, PR24, PR34 (G7).
- **Objective & scope:** Deliver S4 state graph, revision/failure fields and artifact claims with honest session observation logs.
- **Not in this PR:** durable timeline API, content retrieval or invented execution identity.
- **Layers / files:** src/browser/run-detail.ts [new]; src/bff/artifacts.ts [new]; tests/browser/run-detail.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S4.1–S4.5 graph topology follows pinned transitions.
  - skipped revisions do not invent events.
  - hashes are claims until bytes verified and COMPLETED remains distinct from PASS.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; changed transition graph fixture and cross-run artifact tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR23: Create and cancel Runs through public operations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, idempotency pattern.
- **Depends on / parallel with:** M05-PR21, M05-PR22, M05-PR5 / PR13, PR28 (G8).
- **Objective & scope:** Deliver S8 with stable intent keys and honest uncertain outcomes.
- **Not in this PR:** scenario batching or cancellation optimism.
- **Layers / files:** src/browser/run-actions.ts [new]; src/bff/run-actions.ts [new]; tests/browser/run-actions.spec.ts [new].
- **Contracts & boundaries:** BEHAVIOR-ADJACENT: explicit enablement for mutations; defaults deny.
- **Acceptance criteria:**
  - S8.1–S8.5 test same-key replay/body conflict, authorization and terminal races.
  - direct disabled routes refuse.
  - lost response does not create a new intent automatically.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; no live submission without separate approval.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR24: Inspect baseline lifecycle and conflicts safely

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1; optimistic concurrency pattern.
- **Depends on / parallel with:** M05-PR6 / PR7, PR11, PR12, PR20, PR21, PR22, PR34 (G7).
- **Objective & scope:** Deliver S6 read lifecycle and disabled-by-default mutation boundary; test conflict-aware adapter without enabling administration.
- **Not in this PR:** provenance defect repair or broad baseline administration.
- **Layers / files:** src/browser/baselines.ts [new]; src/bff/baselines.ts [new]; tests/browser/baselines.spec.ts [new].
- **Contracts & boundaries:** Admin remains off until separate provenance qualification; tests do not activate it.
- **Acceptance criteria:**
  - S6.1–S6.5 preserve actor/reason/time.
  - guarded transition tests preserve expectedRevision and require new decision after409.
  - unverified provenance blocks approval and listing stays a gap.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; lost-response and direct-route-denial tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR25: Specify authorized immutable Run evidence reads

- **Origin / owner:** in-scope, M05; `perfeng-contracts`.
- **OSS prior art / leveraged pattern:** OpenAPI and immutable artifact pattern.
- **Depends on / parallel with:** none / PR1, PR18, PR19, PR29 (G1).
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

### M05-PR26: Serve one authorized verified artifact body

- **Origin / owner:** in-scope, M05; `perfeng-control-plane`.
- **OSS prior art / leveraged pattern:** Adapt existing objectstore reader; no new storage SDK assumed.
- **Depends on / parallel with:** M05-PR25 / PR2 (G2).
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

### M05-PR27: Expose exact run-used policy evidence through serving

- **Origin / owner:** in-scope, M05; `perfeng-control-plane`.
- **OSS prior art / leveraged pattern:** Adapt existing registry/objectstore configuration.
- **Depends on / parallel with:** M05-PR26 / PR3 (G3).
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

### M05-PR28: Render the report and verified provenance chain

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1–OSS2, OSS5.
- **Depends on / parallel with:** M05-PR22, M05-PR27, M05-PR24 / PR13, PR23 (G8).
- **Objective & scope:** Pin evidence API and deliver S5 six-section report with exact policy/artifact association.
- **Not in this PR:** generating WARN/overall verdict or computing missing metrics.
- **Layers / files:** vendor/perfeng-contracts/ [new]; src/bff/report.ts [new]; src/browser/report.ts [new]; tests/browser/report.spec.ts [new].
- **Contracts & boundaries:** No local report upload fallback; report classification remains provider-owned.
- **Acceptance criteria:**
  - S5.1–S5.6: six sections/six visual verdict classes plus UNKNOWN, old-schema WARN rejected.
  - raw→normalized→report edges require verified refs.
  - gaps, nonblocking and point-estimate limitations stay visible.
- **Harness gate / new tests:** make contracts-check [new]; make verify [new]; make browser-test [new]; tamper/cross-run/policy mismatch and outage tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR29: Extract reusable acceptance primitives without behavior change

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt existing acceptance primitives.
- **Depends on / parallel with:** none / PR1, PR18, PR19, PR25 (G1).
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

### M05-PR30: Compose a disposable public-API scenario target

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse environment composition and accepted fixture lifetime pattern.
- **Depends on / parallel with:** M05-PR18, M05-PR27, M05-PR29 / PR4, PR8 (G4).
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

### M05-PR31: Execute one approved cluster step with recovery

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt environment fencing and receipt patterns.
- **Depends on / parallel with:** M05-PR29, M05-PR30 / PR5, PR9 (G5).
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

### M05-PR32: Submit and observe one real scenario via public APIs

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, reuse environment protocol.
- **Depends on / parallel with:** M05-PR17, M05-PR28, M05-PR31 / none at this depth (G13).
- **Objective & scope:** Implement Tier B driver with real public create/lookup/evidence operations and environment adapter protocol.
- **Not in this PR:** bypassing evidence gaps or importing privileged scripts into BFF.
- **Layers / files:** src/simulator/cluster.ts [new]; src/simulator/environment-client.ts [new]; tests/scenarios/cluster.test.ts [new].
- **Contracts & boundaries:** No CP credential in browser; simulator principal separate and minimal.
- **Acceptance criteria:**
  - Pre-reviewed unchanged case can be submitted with approval and evaluated from public observations.
  - lost response preserves key/UNKNOWN state.
  - injector receipt only proves perturbation, never Perfeng outcome.
- **Harness gate / new tests:** make verify [new]; make scenario-results-check [new]; [new] make scenario-cluster-contract-check against protocol test servers. Live verification reserved for PR41.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR33: Add bounded sample-SUT delay perturbations

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse standard-library sample server.
- **Depends on / parallel with:** M05-PR31 / PR6, PR10, PR36, PR38 (G6).
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

### M05-PR34: Inject disposable CPU and network perturbations

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt Kubernetes resource patches; reject full chaos framework for current bounded cases.
- **Depends on / parallel with:** M05-PR31, M05-PR33 / PR7, PR11, PR12, PR20, PR21, PR22, PR24 (G7).
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

### M05-PR35: Admit workload and idempotency cluster scenarios

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt public idempotency semantics and declared perturbation model.
- **Depends on / parallel with:** M05-PR8, M05-PR32, M05-PR34 / none at this depth (G14).
- **Objective & scope:** Freeze unchanged/delay/CPU/network expectations plus duplicate/concurrent identical creates.
- **Not in this PR:** timing conclusions derived from measured campaign results.
- **Layers / files:** scenarios/cluster/workload/ [new]; scenarios/cluster/idempotency/ [new]; scenarios/reviews/ [new]; tests/scenarios/cluster-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Expected paths/rules/research targets cite pinned clauses and tolerate workload uncertainty explicitly.
  - each concurrent request has a separately approved intent before coordinated dispatch.
  - same key/body maps to one resource while N/A DB remains counted.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify [new]; adversarial expectation approval before any live run; schema/independent expected-value tests.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR36: Provide controlled cancellation and restart triggers

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Reuse acceptance lifecycle fencing.
- **Depends on / parallel with:** M05-PR31 / PR6, PR10, PR33, PR38 (G6).
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

### M05-PR37: Admit cancellation and interrupted-execution expectations

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt transition/lease contracts; independent partial-order oracle.
- **Depends on / parallel with:** M05-PR35, M05-PR36 / none at this depth (G15).
- **Objective & scope:** Add contract-derived cancellation cases for every cancellable state, after-dispatch restart and lease expiry.
- **Not in this PR:** implementing missing native/runtime capabilities.
- **Layers / files:** scenarios/cluster/lifecycle/ [new]; scenarios/reviews/ [new]; tests/scenarios/lifecycle-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Coverage enumerates states from transitions and never handcodes an assumed subset.
  - missed/unobservable windows are distinct from execution failures.
  - restart/lease expectations distinguish available current guarantees and research targets.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify [new]; contract mutation removes/adds state and coverage gate responds. Review each expectation set before execution.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR38: Provide evidence-integrity fault controls

- **Origin / owner:** in-scope, M05; `perfeng-environment`.
- **OSS prior art / leveraged pattern:** Adapt disposable transport fault pattern; no general proxy service dependency assumed.
- **Depends on / parallel with:** M05-PR31, M05-PR30 / PR6, PR10, PR33, PR36 (G6).
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

### M05-PR39: Admit missing baseline and late-evidence cases

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Adapt policy, artifact and approval contracts.
- **Depends on / parallel with:** M05-PR37, M05-PR38 / none at this depth (G16).
- **Objective & scope:** Freeze missing/unapproved baseline, tampered checksum, revoked approval on retry and delayed/missing evidence expectations.
- **Not in this PR:** change platform code or lower expected outcomes after failures.
- **Layers / files:** scenarios/cluster/evidence/ [new]; scenarios/reviews/ [new]; tests/scenarios/evidence-expectations.test.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - Current-phase source obligations and requested research target remain distinct, including INCONCLUSIVE vs failed Run.
  - tamper refusal evaluated only from public evidence.
  - missing observability never converts into MATCH.
- **Harness gate / new tests:** make scenario-contracts-check [new]; make verify [new]; adversarial review before live execution; independent fixtures model mismatch and absent outcome.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR40: Operate cluster campaigns from Scenario Lab

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** OSS1, OSS5; reuse existing simulator protocol.
- **Depends on / parallel with:** M05-PR32, M05-PR35, M05-PR37, M05-PR39, M05-PR23, M05-PR7 / none at this depth (G17).
- **Objective & scope:** Complete S10 cluster UI with per-step approval, progress, findings, real Run links and explicit partial receipts.
- **Not in this PR:** unattended mutations or full platform-health inference.
- **Layers / files:** src/browser/scenario-cluster.ts [new]; src/bff/simulator.ts [new]; tests/browser/scenario-cluster.spec.ts [new].
- **Contracts & boundaries:** Additive consumer behavior; no provider semantic change.
- **Acceptance criteria:**
  - S10.1–S10.9 all cluster paths are covered.
  - CP-down recovery is narrowly distinguished from disabled new work.
  - missing API/native/DB cases and historical receipts cannot appear as current successful evidence.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; make traceability-check [new]; crash/outage/resume/expiry browser fixtures.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

### M05-PR41: Qualify the bounded campaign and publish operator guidance

- **Origin / owner:** in-scope, M05; `perfeng-console`.
- **OSS prior art / leveraged pattern:** Reuse all admitted harnesses; independent evidence qualification.
- **Depends on / parallel with:** M05-PR40, M05-PR20, M05-PR21, M05-PR24, M05-PR28, M05-PR14 / none at this depth (G18).
- **Objective & scope:** Run separately approved live acceptance and document observed findings/coverage with reproducible external receipts. Add the operator qualification harness and runbook.
- **Not in this PR:** committing secrets/receipts or fixing platform findings.
- **Layers / files:** docs/scenario-lab-acceptance.md [new]; tests/acceptance/scenario-campaign.test.ts [new]; Makefile [new]; config/acceptance-map.json [new].
- **Contracts & boundaries:** Qualified receipt is dated scope, not M05/M03/M04 completion; failures may be valid characterization.
- **Acceptance criteria:**
  - 10/60-minute campaign manifest and repetitions frozen/reviewed before runs.
  - each mutating step confirmed with budget accounting and residual resource report.
  - all ACs map to tests or explicit unmet gates, and findings produce separately proposed issues rather than repairs.
- **Harness gate / new tests:** make verify [new]; make browser-test [new]; make traceability-check [new]; make scenario-results-check [new]; [new] make scenario-acceptance with explicit approved manifest configuration. No live command claimed available today.
- **Size:** M, 300–450 handwritten LOC including tests, excluding generated/locked files.

## Traceability and explicit gaps

| Approved in-scope item | PR IDs / acceptance mapping |
|---|---|
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
| S9 every NOT OBSERVABLE item and needed API | PR7, PR41; S9.1–S9.4 |
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
| S10 primary workflow, real links, historical/live distinctions | PR15–PR17, PR32, PR40–PR41; S10.1–S10.9 |
| No stale/sample data on outage; accessible interfaces | PR5–PR7, every screen PR, PR40–PR41 shared browser gate |

**Uncovered by implementation in this plan, explicitly visible rather than forgotten:** G02 dynamic dependency health, G03 registry attestation/refresh, G04 Run/baseline list APIs, G05 durable events/execution identity, G07 full provider provenance/baseline integrity repair, G08 new report/WARN/overall semantics, G09 operator native inventory, G10 platform-wide history/reanalysis, G11 statistical diagnosis, G12 CP-mediated Argus evidence, G13 producer p99/quality improvements and M03/M04 live qualification, G14 M06 production proofs. G01 is addressed by PR19; G06 is narrowed to PR25–PR28 authorized artifact/policy reads, not a general object browser. All remaining items have gap-panel coverage. If any becomes necessary to execute an otherwise admitted scenario, mark it blocked and request separately scoped provider work; never quietly add it to a console PR.

## Checkpoints and merge order

Topological parallel groups above are the merge schedule. The following review checkpoints group at most three related slices; they do not add dependency edges between otherwise independent lanes. At every checkpoint: changed repositories' gates pass, receipts/tests distinguish mocks from live, slice boundaries remain under the size cap, and owner reviews before authorizing the next implementation group.

- C01 PR1–PR3: foundation, real browser harness and offline generated client.
- C02 PR4–PR6: protected session and fresh Run lookup with outage proof.
- C03 PR7–PR9: complete gap inventory, admitted schema and durable partial export.
- C04 PR10–PR12: independent oracle through one real analysis CLI case.
- C05 PR13–PR15: first useful offline Scenario Lab campaign, frozen semantics/effect matrix.
- C06 PR16–PR17: crash-safe approvals and budget accounting; fake adapter only.
- C07 PR18–PR19: workspace composition and published operational contract.
- C08 PR20–PR22: health, catalog and contract-derived detail.
- C09 PR23–PR25: public actions, safe baseline view and reviewed evidence contract.
- C10 PR26–PR28: actual authorized serving evidence and report/provenance screen.
- C11 PR29–PR31: unchanged old acceptance plus new bounded disposable adapter.
- C12 PR32–PR34: public scenario runner and scoped workload perturbations.
- C13 PR35–PR37: reviewed workload and lifecycle expectation sets with explicit blocked cells.
- C14 PR38–PR40: evidence faults and complete cluster Scenario Lab UX.
- C15 PR41: reviewed dated campaign receipts, findings and full traceability. Valid characterization can expose platform failures; do not claim full M05 acceptance from a correct gap panel.

## Cross-repository and cross-milestone work

Ownership is cross-repository, not automatically cross-milestone. All 41 planned PRs are M05 in-scope. Contracts owns PR19/25; CP owns PR26/27; environment owns PR18/29/30/31/33/34/36/38; console owns the rest. Analysis is a read-only CLI dependency, no analysis behavior patch is planned. No M06 production work, M03 qualification implementation or M04 completion is absorbed. Thus **0/41 PRs are cross-milestone additions**, below the 25% warning threshold.

External gates: qualified native environment from M03 is needed to actually execute native lease-expiry cases; selected Kubernetes/runtime acceptance from M04 is needed for the corresponding live flows. Their owning milestone scopes remain unchanged. These are prerequisites to execution, not newly scheduled prerequisite PRs. If future investigation requires implementing them within this workstream, add an explicit `[Prerequisite from M03/M04]` slice and recompute the boundary ratio before authorization.

**Stubs to retire: none.** No interface stubs pretending to provide later behavior. BLOCKED/NOT OBSERVABLE branches are truthful final first-release behavior and do not count as implementation of missing APIs.

Rollout order: contracts publication → provider tested immutable release → environment exact selection → console snapshot upgrade → operator explicit configuration → reviewed scenario manifest → individual mutation approvals. Revert optional consumer first; retain campaign evidence; disable new serving read permission when unused. Cleanup is separately approved and ownership-fenced.

## Assumptions and judgment calls

1. The owner approval adopts the revised proposal's defaults: new console repo, local HTTPS/pairing, TypeScript/Node/pnpm, missing API panels, baseline admin off. Fastify/lit-html remain package-admission candidates, not hidden decisions already implemented.
2. Initial console and simulator are separate processes in one repo; environment retains privileged adapters. A BFF never shells out even though the simulator may call an allowlisted CLI.
3. Protected artifact/policy reads are narrowly included to make real report evidence evaluable; all broader provider additions remain separate. No provider semantics, policy decisions or analysis algorithms change to satisfy a scenario.
4. Expectation packs are bounded PRs because they are independently reviewed product inputs with tests, not one PR per case/file. Exact numeric expectations and repetitions require pinned source clauses/duration assumptions in those PRs; plan does not invent them.
5. A source scan confirms no DB in the current sample server: DB scenario is N/A, not a task to add a DB. Native expiry can be defined/reviewed without claiming current live executability.
6. Successful local implementation and hosted/offline checks do not constitute a live receipt. No commands were run against a cluster while planning. Test commands that build/write caches were not run in this read-only exploration.
7. PR1 approved spec copying is excluded from handwritten sizing. Other data definitions/review notes count toward the estimate unless generated. There is no allowance to hide a large handwritten scenario corpus as generated.

## Open questions and risks

1. **Package admission:** confirm exact runtime/tool versions and rendering/server choices in PR1. Recommended default: minimal Lit templates, Fastify, OpenAPI tooling and build-time Ajv; reject if strict CSP or lock/security review fails. This affects implementation details, not current module boundaries.
2. **Exact run-used policy retention:** CP may not retain enough immutable identity to resolve policy bytes through a public route. Recommended default: explicit unavailable response and blocked dependent checks; if persistence is required, split PR27 into independently reviewed provider contract/persistence slices before coding.
3. **Deterministic state windows:** cancellation at every state cannot be guaranteed by polling or human response time. Recommended default: approve each exact operation in advance with expiry/target binding, then dispatch on its reviewed observable condition; otherwise record missed/BLOCKED. No hidden operator approval for a whole campaign.
4. **Network/artifact interception:** supported mechanism, cluster privilege budget and GitOps ownership must be established before PR34/38. Recommended default: narrow disposable delivery/proxy boundary and owned overlay, never host-wide changes or shared bucket tampering. Unsupported capabilities remain blocked.
5. **Native and baseline prerequisites:** M03 native fixture and the audit's baseline provenance concern may prevent some live cases. Recommended default: keep those cases explicit and unresolved; do not enable general baseline administration or repair platform behavior under this plan.

Remaining risk: 41 bounded slices span four repositories; publication/selection and human mutation approvals may dominate elapsed delivery time. Do not compress the security/contract boundaries into one implementation PR. Conversely, if actual code shows two adjacent slices cannot be independently tested and both are small, propose merging their issue scope before implementation while preserving the DAG and full criteria.

## Planning validation

Read-only repository inspection and upstream documentation research completed. No baseline test suite was run: console has no harness; existing suites may write build outputs/caches, and this task did not authorize installs or runtime activity. The plan's dependency graph, local existing-path annotations and task index are checked mechanically as planning artifacts. Execution gates remain NOT RUN until implementation. Create each implementation issue when the owner authorizes its task.
