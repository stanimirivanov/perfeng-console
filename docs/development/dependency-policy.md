# Console dependency policy

Use exact Node and pnpm pins, exact direct package versions and the frozen lock.
Bootstrap with lifecycle scripts disabled. Preserve release-age protections.
Any exception needs a named version, reason, expiry and human review.
A package needs an immediate repository-owned use, official license/engine/peer evidence,
maintenance and vulnerability review, a replacement boundary and its ADR admission results.
A selected candidate is not admitted solely because its peer range matches.

Angular 22.2.4 and TypeScript 6.0.3 remain the accepted framework/compiler pair.
CLI/build and Material/CDK are 22.2.6. Vitest 5.1.0 and jsdom 31.0.0 own Angular tests;
Playwright 1.65.0 owns Chromium evidence. Nx 24.0.4 schedules the standard CLI.
NgRx SignalStore 22.0.1 and Effect 4.1.2 are admitted by the scoped compile,
cancellation, CSP, keyboard and dependency evidence in stack-admission.md.
Product-level accessibility and state orchestration still require their owning slices.
SignalStore owns session presentation; Effect owns bounded cancellable reads.
Neither replaces the pinned generated client, validator or platform decisions.

Record licenses, engines and peers from exact official registry manifests.
Keep generated lock changes with their admission evidence. Run frozen bootstrap,
make verify, make build, make browser-test and make supply-chain.
H10 removes the three matured Playwright 1.65.0 age exemptions. The workspace
explicitly enforces 1440 minutes, strict age checks and missing-time refusal, with
lockfile supply-chain checks and store integrity enabled. See the
[qualification and cache boundary](ci-efficiency.md). Cache hits still perform a
frozen script-disabled install; they are not proof of admission or verification.

High/critical audit findings block delivery unless the root-only high finding matches
an explicitly reviewed, exact, time-limited risk exception described below. Critical
findings have no exception. Scanner failure remains an unavailable, failing check.
Retain lower-severity findings and optional native/WASM peer warnings for review.

Reviewed major GitHub Action tags are permitted. Keep artifact digests, contract
checksums, dependency pins and reviewed sibling checkout identities exact.
No runtime schema fetching, telemetry endpoint or remote theme/font is implicitly admitted.
No arbitrary proxy origin. No dependency gains authority from documentation examples.
CSP exceptions follow ADR 0002 and explicit owner authorization.

## Official references

- [Angular CSP](https://angular.dev/best-practices/security#content-security-policy)
- [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store)
- [Pinned package metadata](https://registry.npmjs.org/)

## Node adapter admission — issue #33

@effect/platform-node 4.1.2 is admitted for the BFF Run reader and the narrowly
qualified [token POST adapter](token-post-transport.md), paired with
Effect 4.1.2. MIT; Node >=22.19.0; current Node pin is 26.13.0. The exact registry
metadata, resolved fixture licenses and qualification history are recorded under
tools/qualification/effect-node. The root lock now pins the actual production graph.
Undici and Redis peers increase installed dependency weight; no Redis authority or
service is added. The selected Node HTTP backend exposes source.headersDistinct;
upgrades must repeat TLS, raw-header and cleanup tests before pin changes.
Existing peer warnings concern openapi-typescript's TypeScript range and optional
WASM @emnapi peers. They are not suppressed by this admission; keep them visible.

## Import harness admission — issue #41

Development-only dependency-cruiser 18.7.2 (MIT; Node ^22 || ^24 || >=26)
owns cross-owner cycle and forbidden graph-edge checks. User approved the pin.
@nx/eslint-plugin 24.0.4 (MIT) matches Nx 24.0.4 and supplies the requested
module-boundary lint rule. Registry peers are @typescript-eslint/parser ^8 and
eslint-config-prettier ^10; the frozen graph resolves the plugin.
That issue added neither Angular ESLint nor eslint-plugin-import.
Both tools are replaceable behind make check-imports / make lint and add no runtime
authority. Install scripts remain disabled; release-age settings remain unchanged.
The existing openapi-typescript/TypeScript and optional @emnapi peer warnings remain
visible. Admission verification uses frozen bootstrap, full verify, audit and
negative fixtures proving lint/graph failure; receipts are reported with the change.

Official sources: [dependency-cruiser](https://github.com/sverweij/dependency-cruiser),
[Nx boundary rule](https://nx.dev/docs/kb/enforce-module-boundaries). Exact license,
engine and peer metadata was read from the npm registry for these versions.

## Private JWT verifier admission — issues #81 and #119

[ADR 0004](../adr/0004-qualify-jwt-verification-before-runtime-adoption.md)
is accepted for the private snapshot verifier. Root dependencies jose 6.2.17 and
jsonc-parser 3.3.1 have immediate, exact adapter consumers; browser/session/network
activation remains unadmitted. Both are MIT, declare no engines, peers or runtime
dependencies, and satisfy the unchanged 1440-minute release-age floor. Exact official
registry metadata was rechecked on 2026-11-18; the root frozen lock records integrity.
Metadata and earlier evidence: [candidate record](../../tools/qualification/identity-jwt/admission.json).
No install lifecycle scripts are admitted. Root and nested package graphs retain
their own audits; an isolated audit cannot certify root-resolved production imports.
See [the admission guide](snapshot-verifier.md) for ownership and replacement gates.

## TypeScript formatting admission — issue #83

Development-only @stylistic/eslint-plugin 5.9.0 is pinned for immediately used
interface/type-member layout, semicolon delimiters, indentation and trailing-space
rules. [ADR 0005](../adr/0005-enforce-readable-typescript-formatting.md) records
MIT/Node/ESLint peers, matured release-age evidence, dependency weight, experimental
rule qualification and replacement boundary. Generated/vendor byte ownership and
all existing security/import checks remain active. No release-age exception.

## JavaScript documentation admission — issue #91

Development-only eslint-plugin-jsdoc 65.4.5 (BSD-3-Clause) owns the explicitly
selected JavaScript boundary documentation checks. Its exact Node/ESLint peers,
matured release date and replacement tests are recorded in the
[JavaScript documentation guide](javascript-documentation.md). No age exception,
implicit recommended configuration or runtime dependency admission.

## Angular lint admission — issue #161

[ADR 0006](../adr/0006-enforce-console-style-guides.md) records the pinned
Angular ESLint 22.8.0 TypeScript plugin, template plugin, and template parser.
They resolve against the existing TypeScript 6 and ESLint 10 pins. Their usage is
scoped to the Console. The existing ESLint command and CI run the selected rules.

## Historical picomatch risk exception — issue #113; retired in #121

Retired 2026-11-18: [GitHub withdrew GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
at 15:38:56Z and the raw audit stopped reporting it. The unchanged unused-entry rule
then blocked delivery, as designed. Issue #121 removes the dormant JSON record;
the evaluator, thresholds, negative tests and fail-closed behavior remain unchanged.
Withdrawal is not proof of a package fix; #111 stays open for upstream investigation.
The raw audit still reports lower findings. The original acceptance terms below
are historical evidence, not a currently active waiver.

### Original proposal — issue #113

This is a **review proposal**, not a remediation or an already approved waiver.
Human review and merge of its separate PR record acceptance; no approver/signature
is fabricated in configuration. Branch checks exercise the proposed policy, but it
does not change main or unblock PR #112 before that review/merge. Upstream remediation
[issue #111](https://github.com/stanimirivanov/perfeng-console/issues/111) stays open.

| Bound | Proposed acceptance |
|---|---|
| Advisory | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) |
| Package/version/severity | picomatch **4.0.7**, exactly; **high**, never critical |
| Scope | Root development findings only: every finding dev=true and bundled=false |
| Start | 2026-11-18T00:00:00.000Z, inclusive |
| Expiry | 2026-12-02T00:00:00.000Z, exclusive; no automatic renewal |
| Follow-up/owner | #111; repository owner reviews remediation/retirement |

No patched version was listed when prepared. This accepts residual denial-of-service
risk in development/CI glob tooling; it does not remove the vulnerability or assert
zero exposure. Repository-controlled patterns and bounded CI jobs reduce exposure,
but a hostile or newly introduced pattern can still consume development resources.
The existing product dependency allowlist/isolated package gate excludes picomatch.
The isolated credential-verification graphs do not depend on it and keep their own
raw audits without this exception. Production/bundled report flags or another
version/severity fail the audit exception. Native dev=true alone does not prove
absence from shipped code: runtime picomatch imports are independently forbidden
by the product closure and isolated-package gates, which must remain active.
Their passing receipt substantiates this proposal's current product boundary.

`make supply-chain` invokes `harness/supply-chain.ts` from the canonical repository
root. It executes unchanged `pnpm audit --json`, with bounded scanner time/output,
then validates the complete current pnpm report, finding flags/paths/versions,
severity counts and exit-status consistency. Network/API errors, malformed or
incomplete data, unknown severities and unexpected scanner exits fail closed.
Raw `pnpm audit --audit-level high` still fails on the vulnerability. The policy
check instead prints every advisory and an explicit **RISK ACCEPTED**, path count,
expiry and #111 link when this exact exception applies; it never prints a clean audit.

The JSON record [audit-exceptions.json](../../harness/audit-exceptions.json) has one
exact version/advisory, reason, review marker, tracking issue and canonical UTC window.
The evaluator caps windows at 14 days, refuses before start and at/after expiry, and
rejects unused entries. It accepts no CLI policy/clock overrides and refuses foreign
working directories before scanner dispatch. A native advisory-ignore setting cannot
express version, scope, expiry and retirement, so no ignore flag/config or threshold
reduction is used. Lower findings remain visible; any unrelated high/critical blocks.

Retire the record as soon as an upstream fix is admitted through normal license/peer,
release-age, frozen-lock and conformance checks and the advisory clears. Its now-unused
entry deliberately fails until removed. At expiry, investigate #111 and either fix/
remove it or bring a separately reviewed new proposal; never extend automatically.
Revert the proposal to restore the previous raw high-severity gate if acceptance is
declined. No dependency, lockfile, release-age exception or production code changes
are part of this proposal.
