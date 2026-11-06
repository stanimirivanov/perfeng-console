# M05 console / Scenario Lab task index

Plan only; all tasks unstarted. Scope, acceptance criteria, verification gates, dependencies and estimates are in [plan.md](plan.md). These IDs are not GitHub issue numbers. Create/reuse an issue only when the owner authorizes that PR-sized implementation. No issues were created by planning.

- [ ] M05-PR1: Record approved constraints and admit the console stack — perfeng-console; depends on none; G1. [Scope and gates](plan.md#m05-pr1-record-approved-constraints-and-admit-the-console-stack)
- [ ] M05-PR2: Establish the offline engineering and browser harness — perfeng-console; depends on PR1; G2. [Scope and gates](plan.md#m05-pr2-establish-the-offline-engineering-and-browser-harness)
- [ ] M05-PR3: Vendor contracts and generate the offline typed client — perfeng-console; depends on PR2; G3. [Scope and gates](plan.md#m05-pr3-vendor-contracts-and-generate-the-offline-typed-client)
- [ ] M05-PR4: Secure the fixed-origin upstream transport — perfeng-console; depends on PR3; G4. [Scope and gates](plan.md#m05-pr4-secure-the-fixed-origin-upstream-transport)
- [ ] M05-PR5: Pair a local operator session with the console shell — perfeng-console; depends on PR4; G5. [Scope and gates](plan.md#m05-pr5-pair-a-local-operator-session-with-the-console-shell)
- [ ] M05-PR6: Deliver fresh exact Run lookup — perfeng-console; depends on PR5; G6. [Scope and gates](plan.md#m05-pr6-deliver-fresh-exact-run-lookup)
- [ ] M05-PR7: Expose complete gaps and native observation limitations — perfeng-console; depends on PR6; G7. [Scope and gates](plan.md#m05-pr7-expose-complete-gaps-and-native-observation-limitations)
- [ ] M05-PR8: Define admitted scenario and result contracts — perfeng-console; depends on PR3; G4. [Scope and gates](plan.md#m05-pr8-define-admitted-scenario-and-result-contracts)
- [ ] M05-PR9: Journal campaigns and export interrupted results — perfeng-console; depends on PR8, PR2; G5. [Scope and gates](plan.md#m05-pr9-journal-campaigns-and-export-interrupted-results)
- [ ] M05-PR10: Evaluate expected versus actual independently — perfeng-console; depends on PR8, PR9; G6. [Scope and gates](plan.md#m05-pr10-evaluate-expected-versus-actual-independently)
- [ ] M05-PR11: Account for confusion cells and campaign coverage — perfeng-console; depends on PR9, PR10; G7. [Scope and gates](plan.md#m05-pr11-account-for-confusion-cells-and-campaign-coverage)
- [ ] M05-PR12: Run one synthetic case through the real analysis CLI — perfeng-console; depends on PR9, PR10; G7. [Scope and gates](plan.md#m05-pr12-run-one-synthetic-case-through-the-real-analysis-cli)
- [ ] M05-PR13: Admit synthetic semantic edge-case expectations — perfeng-console; depends on PR8, PR12; G8. [Scope and gates](plan.md#m05-pr13-admit-synthetic-semantic-edge-case-expectations)
- [ ] M05-PR14: Admit effect-by-noise synthetic campaigns — perfeng-console; depends on PR11, PR12, PR13; G9. [Scope and gates](plan.md#m05-pr14-admit-effect-by-noise-synthetic-campaigns)
- [ ] M05-PR15: Show a complete offline campaign in Scenario Lab — perfeng-console; depends on PR5, PR11, PR14; G10. [Scope and gates](plan.md#m05-pr15-show-a-complete-offline-campaign-in-scenario-lab)
- [ ] M05-PR16: Authorize one durable mutation intent at a time — perfeng-console; depends on PR9, PR15; G11. [Scope and gates](plan.md#m05-pr16-authorize-one-durable-mutation-intent-at-a-time)
- [ ] M05-PR17: Enforce campaign time and recovery budgets — perfeng-console; depends on PR16; G12. [Scope and gates](plan.md#m05-pr17-enforce-campaign-time-and-recovery-budgets)
- [ ] M05-PR18: Compose the console in the joint source workspace — perfeng-environment; depends on none; G1. [Scope and gates](plan.md#m05-pr18-compose-the-console-in-the-joint-source-workspace)
- [ ] M05-PR19: Publish typed existing operational and catalog interfaces — perfeng-contracts; depends on none; G1. [Scope and gates](plan.md#m05-pr19-publish-typed-existing-operational-and-catalog-interfaces)
- [ ] M05-PR20: Show platform serving health without false dependency health — perfeng-console; depends on PR6, PR19; G7. [Scope and gates](plan.md#m05-pr20-show-platform-serving-health-without-false-dependency-health)
- [ ] M05-PR21: Browse the authorized catalog snapshot — perfeng-console; depends on PR6, PR19; G7. [Scope and gates](plan.md#m05-pr21-browse-the-authorized-catalog-snapshot)
- [ ] M05-PR22: Inspect contract-driven Run state and artifact references — perfeng-console; depends on PR6; G7. [Scope and gates](plan.md#m05-pr22-inspect-contract-driven-run-state-and-artifact-references)
- [ ] M05-PR23: Create and cancel Runs through public operations — perfeng-console; depends on PR21, PR22, PR5; G8. [Scope and gates](plan.md#m05-pr23-create-and-cancel-runs-through-public-operations)
- [ ] M05-PR24: Inspect baseline lifecycle and conflicts safely — perfeng-console; depends on PR6; G7. [Scope and gates](plan.md#m05-pr24-inspect-baseline-lifecycle-and-conflicts-safely)
- [ ] M05-PR25: Specify authorized immutable Run evidence reads — perfeng-contracts; depends on none; G1. [Scope and gates](plan.md#m05-pr25-specify-authorized-immutable-run-evidence-reads)
- [ ] M05-PR26: Serve one authorized verified artifact body — perfeng-control-plane; depends on PR25; G2. [Scope and gates](plan.md#m05-pr26-serve-one-authorized-verified-artifact-body)
- [ ] M05-PR27: Expose exact run-used policy evidence through serving — perfeng-control-plane; depends on PR26; G3. [Scope and gates](plan.md#m05-pr27-expose-exact-run-used-policy-evidence-through-serving)
- [ ] M05-PR28: Render the report and verified provenance chain — perfeng-console; depends on PR22, PR27, PR24; G8. [Scope and gates](plan.md#m05-pr28-render-the-report-and-verified-provenance-chain)
- [ ] M05-PR29: Extract reusable acceptance primitives without behavior change — perfeng-environment; depends on none; G1. [Scope and gates](plan.md#m05-pr29-extract-reusable-acceptance-primitives-without-behavior-change)
- [ ] M05-PR30: Compose a disposable public-API scenario target — perfeng-environment; depends on PR18, PR27, PR29; G4. [Scope and gates](plan.md#m05-pr30-compose-a-disposable-public-api-scenario-target)
- [ ] M05-PR31: Execute one approved cluster step with recovery — perfeng-environment; depends on PR29, PR30; G5. [Scope and gates](plan.md#m05-pr31-execute-one-approved-cluster-step-with-recovery)
- [ ] M05-PR32: Submit and observe one real scenario via public APIs — perfeng-console; depends on PR17, PR28, PR31; G13. [Scope and gates](plan.md#m05-pr32-submit-and-observe-one-real-scenario-via-public-apis)
- [ ] M05-PR33: Add bounded sample-SUT delay perturbations — perfeng-environment; depends on PR31; G6. [Scope and gates](plan.md#m05-pr33-add-bounded-sample-sut-delay-perturbations)
- [ ] M05-PR34: Inject disposable CPU and network perturbations — perfeng-environment; depends on PR31, PR33; G7. [Scope and gates](plan.md#m05-pr34-inject-disposable-cpu-and-network-perturbations)
- [ ] M05-PR35: Admit workload and idempotency cluster scenarios — perfeng-console; depends on PR8, PR32, PR34; G14. [Scope and gates](plan.md#m05-pr35-admit-workload-and-idempotency-cluster-scenarios)
- [ ] M05-PR36: Provide controlled cancellation and restart triggers — perfeng-environment; depends on PR31; G6. [Scope and gates](plan.md#m05-pr36-provide-controlled-cancellation-and-restart-triggers)
- [ ] M05-PR37: Admit cancellation and interrupted-execution expectations — perfeng-console; depends on PR35, PR36; G15. [Scope and gates](plan.md#m05-pr37-admit-cancellation-and-interrupted-execution-expectations)
- [ ] M05-PR38: Provide evidence-integrity fault controls — perfeng-environment; depends on PR31, PR30; G6. [Scope and gates](plan.md#m05-pr38-provide-evidence-integrity-fault-controls)
- [ ] M05-PR39: Admit missing baseline and late-evidence cases — perfeng-console; depends on PR37, PR38; G16. [Scope and gates](plan.md#m05-pr39-admit-missing-baseline-and-late-evidence-cases)
- [ ] M05-PR40: Operate cluster campaigns from Scenario Lab — perfeng-console; depends on PR32, PR35, PR37, PR39, PR23, PR7; G17. [Scope and gates](plan.md#m05-pr40-operate-cluster-campaigns-from-scenario-lab)
- [ ] M05-PR41: Qualify the bounded campaign and publish operator guidance — perfeng-console; depends on PR40, PR20, PR21, PR24, PR28, PR14; G18. [Scope and gates](plan.md#m05-pr41-qualify-the-bounded-campaign-and-publish-operator-guidance)

## Human review checkpoints

- [ ] C01: PR1–3 — gates, scope/size, evidence and owner review per plan.
- [ ] C02: PR4–6 — gates, scope/size, evidence and owner review per plan.
- [ ] C03: PR7–9 — gates, scope/size, evidence and owner review per plan.
- [ ] C04: PR10–12 — gates, scope/size, evidence and owner review per plan.
- [ ] C05: PR13–15 — gates, scope/size, evidence and owner review per plan.
- [ ] C06: PR16–17 — gates, scope/size, evidence and owner review per plan.
- [ ] C07: PR18–19 — gates, scope/size, evidence and owner review per plan.
- [ ] C08: PR20–22 — gates, scope/size, evidence and owner review per plan.
- [ ] C09: PR23–25 — gates, scope/size, evidence and owner review per plan.
- [ ] C10: PR26–28 — gates, scope/size, evidence and owner review per plan.
- [ ] C11: PR29–31 — gates, scope/size, evidence and owner review per plan.
- [ ] C12: PR32–34 — gates, scope/size, evidence and owner review per plan.
- [ ] C13: PR35–37 — gates, scope/size, evidence and owner review per plan.
- [ ] C14: PR38–40 — gates, scope/size, evidence and owner review per plan.
- [ ] C15: PR41 — gates, scope/size, evidence and owner review per plan.

- [ ] Final: all spec acceptance IDs mapped; external gaps and blocked scenarios disclosed; actual campaign receipts reviewed; no false milestone-complete claim.
