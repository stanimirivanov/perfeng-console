# M05 task index — product first, non-UI runner independently released

Scenario Lab lives inside the Console under Verification, with a distinct Material theme and a visible maintainer label. Runner installation and acceptance remain independent.

[Plan and release criteria](plan.md) · [Confirmed intent](../docs/intent/perfeng-ui.md) · [Accepted UI stack](../docs/decisions/0002-ui-technology-stack.md). IDs identify proposed PR-sized scopes, not GitHub numbers. Check off only after verifying the full scope. PR1/2 build on existing governance and harness.

## Product

- [x] [M05-PR1 — Record approved constraints and admit the console stack](plan.md#m05-pr1-record-approved-constraints-and-admit-the-console-stack) · perfeng-console · depends on — · G1 · verified merged [Console #16](https://github.com/stanimirivanov/perfeng-console/pull/16)
- [ ] [M05-PR18 — Compose the console in the joint source workspace](plan.md#m05-pr18-compose-the-console-in-the-joint-source-workspace) · perfeng-environment · depends on — · G1
- [ ] [M05-PR43 — Publish service-scoped identity and CI Run discovery semantics](plan.md#m05-pr43-publish-service-scoped-identity-and-ci-run-discovery-semantics) · perfeng-contracts · depends on — · G1
- [x] [M05-PR2 — Establish the offline engineering and browser harness](plan.md#m05-pr2-establish-the-offline-engineering-and-browser-harness) · perfeng-console · depends on PR1 · G2 · verified merged [Console #18](https://github.com/stanimirivanov/perfeng-console/pull/18)
- [ ] [M05-PR44 — Persist service ownership and revocable grants](plan.md#m05-pr44-persist-service-ownership-and-revocable-grants) · perfeng-control-plane · depends on PR43 · G2
- [ ] [M05-PR46 — Define an immutable Run comparison projection](plan.md#m05-pr46-define-an-immutable-run-comparison-projection) · perfeng-contracts · depends on PR43 · G2
- [ ] [M05-PR58 — Verify named human and CI identities at the provider](plan.md#m05-pr58-verify-named-human-and-ci-identities-at-the-provider) · perfeng-control-plane · depends on PR43 · G2
- [x] [M05-PR3 — Vendor contracts and generate the offline typed client](plan.md#m05-pr3-vendor-contracts-and-generate-the-offline-typed-client) · perfeng-console · depends on PR2 · G3 · verified merged [Console #20](https://github.com/stanimirivanov/perfeng-console/pull/20)
- [ ] [M05-PR25 — Specify authorized immutable Run evidence reads](plan.md#m05-pr25-specify-authorized-immutable-run-evidence-reads) · perfeng-contracts · depends on PR43, PR46 · G3
- [x] [M05-PR42 — Isolate the product build and release entry point](plan.md#m05-pr42-isolate-the-product-build-and-release-entry-point) · perfeng-console · depends on PR2 · G3 · verified merged [Console #38](https://github.com/stanimirivanov/perfeng-console/pull/38)
- [ ] [M05-PR45 — Authorize cross-principal Run access and CI resolution](plan.md#m05-pr45-authorize-cross-principal-run-access-and-ci-resolution) · perfeng-control-plane · depends on PR44, PR58 · G3
- [ ] [M05-PR47 — Capture exact report-time comparison bindings](plan.md#m05-pr47-capture-exact-report-time-comparison-bindings) · perfeng-control-plane · depends on PR44, PR46 · G3
- [ ] [M05-PR49 — Specify attributed rerun and audit receipt](plan.md#m05-pr49-specify-attributed-rerun-and-audit-receipt) · perfeng-contracts · depends on PR43, PR46 · G3
- [x] [M05-PR4 — Secure the fixed-origin upstream transport](plan.md#m05-pr4-secure-the-fixed-origin-upstream-transport) · perfeng-console · depends on PR3 · G4 · verified merged [Console #34](https://github.com/stanimirivanov/perfeng-console/pull/34)
- [ ] [M05-PR26 — Serve one authorized verified artifact body](plan.md#m05-pr26-serve-one-authorized-verified-artifact-body) · perfeng-control-plane · depends on PR25, PR45 · G4
- [ ] [M05-PR50 — Store immutable rerun intent and audit receipts](plan.md#m05-pr50-store-immutable-rerun-intent-and-audit-receipts) · perfeng-control-plane · depends on PR44, PR49 · G4
- [x] [M05-PR5 — Pair a local operator session with the console shell](plan.md#m05-pr5-pair-a-local-operator-session-with-the-console-shell) · perfeng-console · depends on PR4 · G5 · verified merged [Console #36](https://github.com/stanimirivanov/perfeng-console/pull/36)
- [ ] [M05-PR27 — Expose exact run-used policy evidence through serving](plan.md#m05-pr27-expose-exact-run-used-policy-evidence-through-serving) · perfeng-control-plane · depends on PR26 · G5
- [ ] [M05-PR59 — Fence rerun execution to the approved source binding](plan.md#m05-pr59-fence-rerun-execution-to-the-approved-source-binding) · perfeng-control-plane · depends on PR47, PR49, PR50 · G5
- [x] [M05-PR6 — Deliver fresh exact Run lookup](plan.md#m05-pr6-deliver-fresh-exact-run-lookup) · perfeng-console · depends on PR5, PR42 · G6 · verified merged [Console #40](https://github.com/stanimirivanov/perfeng-console/pull/40)
- [ ] [M05-PR48 — Serve service-authorized comparisons by native Run ID](plan.md#m05-pr48-serve-service-authorized-comparisons-by-native-run-id) · perfeng-control-plane · depends on PR45, PR46, PR47, PR27 · G6
- [ ] [M05-PR52 — Sign in to the console with a service-scoped identity](plan.md#m05-pr52-sign-in-to-the-console-with-a-service-scoped-identity) · perfeng-console · depends on PR5, PR43, PR58 · G6
- [ ] [M05-PR22 — Inspect contract-driven Run state and artifact references](plan.md#m05-pr22-inspect-contract-driven-run-state-and-artifact-references) · perfeng-console · depends on PR6 · G7
- [ ] [M05-PR51 — Admit and serve the real audited rerun](plan.md#m05-pr51-admit-and-serve-the-real-audited-rerun) · perfeng-control-plane · depends on PR45, PR48, PR49, PR50, PR59 · G7
- [ ] [M05-PR53 — Publish and open the canonical CI Run link](plan.md#m05-pr53-publish-and-open-the-canonical-ci-run-link) · perfeng-console · depends on PR6, PR43, PR45, PR52, PR42 · G7
- [ ] [M05-PR28 — Render the report and verified provenance chain](plan.md#m05-pr28-render-the-report-and-verified-provenance-chain) · perfeng-console · depends on PR22, PR27, PR48 · G8
- [ ] [M05-PR55 — Select a shared console qualification environment](plan.md#m05-pr55-select-a-shared-console-qualification-environment) · perfeng-environment · depends on PR18, PR45, PR48, PR51, PR52 · G8
- [ ] [M05-PR54 — Compare the CI Run and request an audited rerun](plan.md#m05-pr54-compare-the-ci-run-and-request-an-audited-rerun) · perfeng-console · depends on PR22, PR28, PR48, PR51, PR53 · G9
- [ ] [M05-PR63 — Emit the deep link from a real CI acceptance job](plan.md#m05-pr63-emit-the-deep-link-from-a-real-ci-acceptance-job) · perfeng-environment · depends on PR53, PR55 · G9
- [ ] [M05-PR56 — Qualify the console-only Maya journey](plan.md#m05-pr56-qualify-the-console-only-maya-journey) · perfeng-console · depends on PR42, PR53, PR54, PR55, PR63 · G10

## Supporting UI

- [ ] [M05-PR19 — Publish typed existing operational and catalog interfaces](plan.md#m05-pr19-publish-typed-existing-operational-and-catalog-interfaces) · perfeng-contracts · depends on — · G1
- [ ] [M05-PR7 — Expose complete gaps and native observation limitations](plan.md#m05-pr7-expose-complete-gaps-and-native-observation-limitations) · perfeng-console · depends on PR6 · G7
- [ ] [M05-PR20 — Show platform serving health without false dependency health](plan.md#m05-pr20-show-platform-serving-health-without-false-dependency-health) · perfeng-console · depends on PR6, PR19 · G7
- [ ] [M05-PR21 — Browse the authorized catalog snapshot](plan.md#m05-pr21-browse-the-authorized-catalog-snapshot) · perfeng-console · depends on PR6, PR19 · G7
- [ ] [M05-PR24 — Inspect baseline lifecycle and conflicts safely](plan.md#m05-pr24-inspect-baseline-lifecycle-and-conflicts-safely) · perfeng-console · depends on PR6 · G7
- [ ] [M05-PR23 — Create and cancel Runs through public operations](plan.md#m05-pr23-create-and-cancel-runs-through-public-operations) · perfeng-console · depends on PR21, PR22, PR5 · G8

## Verifier

- [ ] [M05-PR29 — Extract reusable acceptance primitives without behavior change](plan.md#m05-pr29-extract-reusable-acceptance-primitives-without-behavior-change) · perfeng-environment · depends on — · G1
- [ ] [M05-PR8 — Define admitted scenario and result contracts](plan.md#m05-pr8-define-admitted-scenario-and-result-contracts) · perfeng-console · depends on PR3, PR42 · G4
- [ ] [M05-PR9 — Journal campaigns and export interrupted results](plan.md#m05-pr9-journal-campaigns-and-export-interrupted-results) · perfeng-console · depends on PR8, PR2 · G5
- [ ] [M05-PR10 — Evaluate expected versus actual independently](plan.md#m05-pr10-evaluate-expected-versus-actual-independently) · perfeng-console · depends on PR8, PR9 · G6
- [ ] [M05-PR30 — Compose a disposable public-API scenario target](plan.md#m05-pr30-compose-a-disposable-public-api-scenario-target) · perfeng-environment · depends on PR18, PR27, PR29 · G6
- [ ] [M05-PR11 — Account for confusion cells and campaign coverage](plan.md#m05-pr11-account-for-confusion-cells-and-campaign-coverage) · perfeng-console · depends on PR9, PR10 · G7
- [ ] [M05-PR12 — Run one synthetic case through the real analysis CLI](plan.md#m05-pr12-run-one-synthetic-case-through-the-real-analysis-cli) · perfeng-console · depends on PR9, PR10 · G7
- [ ] [M05-PR31 — Execute one approved cluster step with recovery](plan.md#m05-pr31-execute-one-approved-cluster-step-with-recovery) · perfeng-environment · depends on PR29, PR30 · G7
- [ ] [M05-PR13 — Admit synthetic semantic edge-case expectations](plan.md#m05-pr13-admit-synthetic-semantic-edge-case-expectations) · perfeng-console · depends on PR8, PR12 · G8
- [ ] [M05-PR33 — Add bounded sample-SUT delay perturbations](plan.md#m05-pr33-add-bounded-sample-sut-delay-perturbations) · perfeng-environment · depends on PR31 · G8
- [ ] [M05-PR36 — Provide controlled cancellation and restart triggers](plan.md#m05-pr36-provide-controlled-cancellation-and-restart-triggers) · perfeng-environment · depends on PR31 · G8
- [ ] [M05-PR38 — Provide evidence-integrity fault controls](plan.md#m05-pr38-provide-evidence-integrity-fault-controls) · perfeng-environment · depends on PR31, PR30 · G8
- [ ] [M05-PR14 — Admit effect-by-noise synthetic campaigns](plan.md#m05-pr14-admit-effect-by-noise-synthetic-campaigns) · perfeng-console · depends on PR11, PR12, PR13 · G9
- [ ] [M05-PR34 — Inject disposable CPU and network perturbations](plan.md#m05-pr34-inject-disposable-cpu-and-network-perturbations) · perfeng-environment · depends on PR31, PR33 · G9
- [ ] [M05-PR15 — Show a complete offline campaign in Scenario Lab](plan.md#m05-pr15-show-a-complete-offline-campaign-in-scenario-lab) · perfeng-console · depends on PR5, PR11, PR14 · G10
- [ ] [M05-PR16 — Authorize one durable mutation intent at a time](plan.md#m05-pr16-authorize-one-durable-mutation-intent-at-a-time) · perfeng-console · depends on PR9, PR15 · G11
- [ ] [M05-PR17 — Enforce campaign time and recovery budgets](plan.md#m05-pr17-enforce-campaign-time-and-recovery-budgets) · perfeng-console · depends on PR16 · G12
- [ ] [M05-PR32 — Submit and observe one real scenario via public APIs](plan.md#m05-pr32-submit-and-observe-one-real-scenario-via-public-apis) · perfeng-console · depends on PR17, PR28, PR31 · G13
- [ ] [M05-PR35 — Admit workload and idempotency cluster scenarios](plan.md#m05-pr35-admit-workload-and-idempotency-cluster-scenarios) · perfeng-console · depends on PR8, PR32, PR34 · G14
- [ ] [M05-PR37 — Admit cancellation and interrupted-execution expectations](plan.md#m05-pr37-admit-cancellation-and-interrupted-execution-expectations) · perfeng-console · depends on PR35, PR36 · G15
- [ ] [M05-PR39 — Admit missing baseline and late-evidence cases](plan.md#m05-pr39-admit-missing-baseline-and-late-evidence-cases) · perfeng-console · depends on PR37, PR38 · G16
- [ ] [M05-PR40 — Operate cluster campaigns from Scenario Lab](plan.md#m05-pr40-operate-cluster-campaigns-from-scenario-lab) · perfeng-console · depends on PR32, PR35, PR37, PR39, PR7, PR54 · G17
- [ ] [M05-PR41 — Qualify the bounded campaign and publish operator guidance](plan.md#m05-pr41-qualify-the-bounded-campaign-and-publish-operator-guidance) · perfeng-console · depends on PR40, PR14 · G18
- [ ] [M05-PR57 — Qualify the independently released verifier](plan.md#m05-pr57-qualify-the-independently-released-verifier) · perfeng-console · depends on PR41, PR42, PR54 · G19

## Post-pilot

- [ ] [M05-PR60 — Map service configuration proposals to their Git owners](plan.md#m05-pr60-map-service-configuration-proposals-to-their-git-owners) · perfeng-environment · depends on PR18 · G2
- [ ] [M05-PR61 — Propose one service onboarding change for review](plan.md#m05-pr61-propose-one-service-onboarding-change-for-review) · perfeng-console · depends on PR52, PR56, PR60 · G11
- [ ] [M05-PR62 — Propose versioned performance policy changes](plan.md#m05-pr62-propose-versioned-performance-policy-changes) · perfeng-console · depends on PR61 · G12

## Review checkpoints

Review bounded groups as their dependencies clear. Require the owning repo’s checks, actual evidence and a human review for each PR.

- [ ] Review PRs 1, 2, 42.
- [ ] Review PRs 3–6 (client/transport then session/lookup).
- [ ] Review PRs 43, 44, 58.
- [ ] Review PRs 45, 46, 25.
- [ ] Review PRs 26, 27, 47.
- [ ] Review PRs 48, 49, 50.
- [ ] Review PRs 59, 51, 52.
- [ ] Review PRs 22, 28, 53.
- [ ] Review PRs 54, 18, 55.
- [ ] Review PRs 63, 56 — P: CI link, attributable real rerun and verifier-absent install.
- [ ] Review PRs 7, 19, 20.
- [ ] Review PRs 21, 23, 24.
- [ ] Review PRs 8–10.
- [ ] Review PRs 11–13.
- [ ] Review PRs 14–16.
- [ ] Review PRs 17, 29, 30.
- [ ] Review PRs 31–33.
- [ ] Review PRs 34–36.
- [ ] Review PRs 37–39.
- [ ] Review PRs 40, 41, 57 — V: maintainer-only independent campaign and compatibility.
- [ ] Review PRs 60–62 — post-pilot Git proposals.
