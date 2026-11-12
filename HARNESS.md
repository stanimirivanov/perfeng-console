# Working with the console harness

Start at [AGENTS.md](AGENTS.md), then read the task and owning layer guide.
This map covers the current Angular Console, BFF, independently released verifier
boundaries and verification commands. Use the [harness-rule index](docs/development/harness-rules.md)
for scanner coverage, active admission and remaining hardening; executable policy
is authoritative for enforcement. Historical receipts below retain their scope/date.

## Repository map

```text
AGENTS.md                    issue-first Plan / Execute / Verify loop
CONSTRAINTS.md               project invariants and scenario evidence rules
HARNESS.md                   commands, ownership and enforcement status
tasks/{plan,todo}.md         approved task scopes and dependency graph
src/
  browser/AGENTS.md          browser principal and UI state
  bff/AGENTS.md              session, credential and public HTTP boundary
  presentation/AGENTS.md     display models and formatting
  shared/AGENTS.md           browser–BFF data contracts
  generated/AGENTS.md        reviewed contract-generated source
  scenarios/AGENTS.md        independent oracle
  simulator/AGENTS.md        runner and approved environment adapter client
harness/boundaries.ts        executable import policy and source scanner
tests/harness/               isolated valid and invalid module fixtures
Makefile                     shared local and CI entry points
eslint.config.mjs            lint rules and suppression controls
tsconfig.json                strict compiler checks
.node-version                pinned Node runtime
package.json, pnpm-lock.yaml exact tooling and dependency integrity
.githooks/pre-commit         opt-in staged snapshot check
.github/workflows/quality.yml  aggregate, browser/isolation and audit jobs
.github/workflows/user-guide.yml  guide artifact from tagged journeys
.github/pull_request_template.md  evidence, semantic review and rollback
```

## Application ownership specification

Read [runtime and state ownership](docs/development/runtime-ownership.md) for the
Angular/SignalStore/Effect split and [harness rules](docs/development/harness-rules.md)
for required proof. Structural ownership sensors now run in make architecture; the rule specification records remaining behavioral and production-admission gaps.
The coarse `src` layer policy is not the Angular app admission policy. The
following map describes effective public boundaries, not permission to import every
module in a listed layer. Use the [canonical alias table](docs/IMPORTS.md#reviewed-aliases)
and exact role/package policies for concrete edges.

## Ownership and allowed edges

Within-owner relative imports still obey the role policy. External packages and
Node built-ins require exact executable-policy admission. Installing or admitting
a package does not permit every module to import it.

| Owner | Owns | Effective boundary |
|---|---|---|
| apps/console | Angular rendering and narrow admitted browser reads/state | Local reviewed roles/packages and shared DTOs through declaration-level import type; no provider runtime or runner |
| src/browser | Reserved browser layer | No permission to bypass the narrower shared-DTO boundary or app admission |
| bff | Session, qualified fixed-origin reads, safe DTO projection | Reviewed shared/generated inputs; exact adapter/package admission |
| presentation | Pure display formatting | Own modules/generated types; external consumers are currently forbidden by the graph gate |
| shared/contracts | Data-only browser–BFF DTOs | Type declarations and type-only imports/exports |
| generated | Offline bindings and validators | Compiler-owned inventory; schema/consumer package exceptions are separately scoped |
| scenarios | Frozen expectations and independent comparisons | Own layer/generated contracts; no runner authority |
| simulator | Journal, approved driver and analysis adapter | Scenarios/generated contracts; no authority in browser/BFF |

Public Perfeng contracts belong to perfeng-contracts. The control plane owns
platform state and authorization. Environment owns disposable fault injection.
Any future BFF–simulator integration requires its reviewed local protocol; it is
not implemented or admitted by this map. Exception requests change the policy and
a negative test together and identify the new authority granted.

Use native Node ESM with explicit file extensions for Node-executed source.
Angular bundler code currently uses extensionless within-owner imports; preserve
that convention rather than changing resolution globally. Cross-owner imports use
reviewed aliases. Use PascalCase for types, camelCase for functions and kebab-case
for modules. Keep state and side effects with their owner and parse untrusted data
at its boundary. Colocate Angular `.spec.ts` files with their feature; Node harness
and integration tests live under `tests/`. Follow the
[rationale-comment policy](CONTRIBUTING.md#rationale-comments-and-review).

## Sensors and failure handling

| Sensor | Exact command | What stops the change |
|---|---|---|
| Toolchain | `make doctor` | Node or pnpm differs from the exact pins |
| Bootstrap | `make bootstrap` | Frozen lock/install fails. Lifecycle scripts are disabled |
| Lint | `make lint` | ESLint error or warning, inline config suppression, forbidden TS directive, eval or focused/skipped method |
| Types | `make typecheck` | Explicit strict production-tools Node program, root Node and e2e programs; qualification packages retain separate configs |
| Architecture | `make architecture` | Unknown source owner, unadmitted package/edge, computed import, CommonJS loader, source symlink or missing scoped guide |
| Behavior | `make test` | A Node test fails, the suite is empty, or TAP reports any skipped or todo cases. Boundary tests exercise actual TS syntax on temporary source trees |
| Local aggregate | `make verify` | Toolchain, offline contracts, lint/imports, types, architecture, Node tests, Angular tests/accounting and production build/distribution scan |
| Browser | `make browser-test` | Chromium journeys or browser accounting fail |
| Installation | `make console-isolation-check` | Product-only build, archive install or startup with verifier absent fails |
| Stack fixture | `make stack-admission` | Pinned Material/CSP/runtime qualification fixture fails |
| Harness faults | `make harness-self-test` | An injected fault fails to trigger its intended product/accounting gate |
| Guide artifact | `make guide` | Tagged journey/capture/provenance fails; output stays outside Git |
| Supply chain | `make supply-chain` | Registry audit reports high/critical vulnerability or the check cannot complete |
| Pre-commit | `make hooks` once per checkout | Verifies the staged snapshot with the installed modules. Unstaged edits cannot mask a bad staged source |
| Hosted CI | `quality.yml` jobs `verify`, `browser`, `supply-chain` | Frozen bootstrap; aggregate, browser/installation/stack/self-test and audit respectively; read-only contents permission and ten-minute job limits |

When a release-build harness module gains a local import, update the explicit input
manifest in scripts/check-console-isolation.ts and run this installation gate.
A normal workspace build cannot prove that the isolated source closure is complete.

`make verify` does not run browser, installation, stack-admission, guide or
harness-self-test targets. Quality CI runs browser, installation, stack-admission and self-test separately; the
[user-guide workflow](.github/workflows/user-guide.yml) publishes passing tagged journeys.
The self-test itself invokes verify; making it a verify dependency would recurse.

The hook uses the checkout's installed development tools. Rebootstrap after a lock change. CI installs the committed lock on a clean runner. A repository administrator can require the hosted job in branch rules and require human review of sensor changes. Installing the local hook does not change GitHub branch settings.

A typical diagnostic reads `src/browser/view.ts:1 [layer] browser cannot import bff`. Locate the credential or upstream operation in the BFF and consume its safe view model through the local protocol. Run `make architecture`, then `make verify`. For a type failure fix the schema/type boundary and rerun `make typecheck`. For a behavior failure preserve the reproduction and rerun `make test`. Capture the failing rule and the results of the corrected run in the PR.

H8 diagnostics include source/rule, a corrective next step, the targeted rerun and
a guide. Source-path/specifier control characters are escaped into a single log
line; alias config failures omit raw values/parser snippets and distribution errors
never print matched secret bytes. Fix the source ownership, not the sensor threshold.
`make check-imports` also checks the reviewed alias table in docs/IMPORTS.md; it does
not automatically authorize or rewrite new public surfaces.

The architecture sensor checks static module syntax, including exports, type references and literal dynamic imports. It cannot prove runtime secrecy, detect every form of global access or establish exactly-once external effects. Those properties require process isolation, negative integration tests, credential canaries and human review. The scenario restrictions are product obligations until implemented and tested.

## Dependency review

Runtime dependencies now include Angular/Material, NgRx, Effect and the qualified
Node adapter; installed packages are not all development-only. Read the
[dependency policy](docs/development/dependency-policy.md) and the separate
[product release closure](harness/product-release.ts) before admitting dependencies.
Use the exact pins and frozen lock, not sibling-repository defaults. The Node
version is in `.node-version`, pnpm in `package.json`; their current values are
26.13.0 and 12.16.1. TypeScript supplies compiler/AST checks; Node's test runner,
Angular's test builder and Playwright have distinct accounting gates.

Node tests use `--test-isolation=none`. Tests that mutate cwd, environment or globals
must restore them with finally/framework teardown. This is a review obligation,
not proof that arbitrary state leaks are mechanically detected.

At bootstrap the registry reported a moderate minimatch advisory through ESLint and typescript-eslint. Their compatible ranges still select major 10. Lint processes repository-controlled patterns in the bounded verification job. Recheck upstream compatible releases on each toolchain update. The high/critical audit threshold remains active and lower-severity findings remain visible. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Progressive hardening

| When | Promote guide to sensor | Required negative proof |
|---|---|---|
| Original bootstrap receipt | Source ownership, literal import graph, strict compiler, lint and staged/hosted gates | Forbidden browser/server edge fails with path, allowed edge passes, evaluator cannot import runner |
| M05 PR2–PR6, provider client and browser available | Real browser gate, checksum closure, offline generation parity, TLS/CSRF/session and freshness | Modified schema digest, wrong CA, stale late response and credential canary all fail |
| M05 PR8–PR17, simulator available | Reviewed manifest admission, independent result accounting, crash journal and budget clock | Edited expectation rejected, all repetitions accounted, uncertain mutation never redispatched |
| M05 PR29–PR41, disposable target available | Reviewed public-API fixture, target-bound fault approvals and dated acceptance receipts | Wrong target refused, outage clears live state, partial journal exported after crash |
| Repeated real agent mistake | Reduce to the smallest violating example, add a failing check, publish its correction in the nearest guide | Reviewer sees failing and corrected transcript. Mark remaining manual review duties explicitly |

## Design references

The scoped files provide guides and the failing checks provide sensors, following the distinction described by Birgitta Böckeler. [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)

The short entry map points to deeper constraints while mechanical checks enforce dependency direction, following the repository-map approach in OpenAI's engineering account. [Harness engineering](https://openai.com/index/harness-engineering/)

Recurring mistakes become focused automated checks, following Mitchell Hashimoto's practice of improving agent instructions and tooling after a concrete failure. [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey)

## Nx scaffold extension

The Angular app in apps/console owns ordinary operations and the Verification route. The independently installed runner owns execution. Browser regression fixtures simulate only the BFF grant; the loopback preview has no backend and grants no access. make architecture checks literal imports, including type-only and lazy edges. make verify runs Angular unit tests alongside harness checks. The quality workflow also builds the production distribution and exercises Chromium. The guide workflow publishes a separate artifact from passing tagged journeys.

## Stack admission

Run make stack-admission to compile the isolated pinned-stack fixture and exercise
Material overlays in Chromium under the BFF-owned nonce renderer. CI's browser job
runs it after the product browser suite. The fixture is outside the production entry;
the dedicated test config discovers only its own stack.spec.ts. The Angular workspace admits NgRx only in the exact Run, session, epoch and capability stores and Effect
only in the exact adapters, operation and integrations. App/ConsoleHome render
feature-local readonly ports. Component metadata provides each facade and SignalStore
in the component injector; facades inject DestroyRef. Main only bootstraps app.config.
Cross-feature imports use reviewed entries; provider functions are admitted only in
Component.providers metadata (OWN-11/12).
H4 mixed-role fences and assembly exceptions are retired. See the
[H5 receipt](docs/development/harness-rules.md#h5-runtime-boundary-receipt) and
[active boundary and debt](docs/development/harness-rules.md#current-baseline).
See docs/development/stack-admission.md for the gate receipt and remaining obligations.
H6 adds shared local-session epoch invalidation and splits Verification adapter,
facade and store, retiring the last mixed-ownership allowance. Read the
[denial-scope receipt](docs/development/harness-rules.md#h6-shared-session-receipt)
before changing session or capability handling.

H7 extends role/native-admission checks to incoming server, CLI and preview tools.
Read [tools guidance](tools/AGENTS.md) and the
[tools receipt](docs/development/harness-rules.md#h7-tools-ownership-receipt).
Qualification and guide tools remain separate owners; the preview JS parser check
is not a JavaScript compiler gate. Product installation still has its own target.

## M05-PR2 failure propagation

make verify now includes the production AOT build and its distribution scan.
Angular's JSON reporter is deleted before each component run and must report a
nonempty suite with every test passed and no skipped/todo cases. Vitest retries
are disabled. Playwright accounting retains every attempt and rejects skipped,
empty or retried runs independently of guide tags. Node accounting stays separate.
Official interfaces: https://vitest.dev/guide/reporters#json-reporter and
https://playwright.dev/docs/api/class-reporter.

make harness-self-test copies source into a temporary directory, links the installed
toolchain and proves actual command failures for injected production CLI/server
type errors, invalid template bindings,
component assertions, Angular skips and Playwright skips/failures. It never edits
the working checkout and removes the temporary fixture on completion.
CI runs it in the browser job with installed pinned Chromium.

Browser build inputs are explicitly reviewed in harness/assets.ts. The current
scaffold permits inline component templates, one local Material Sass import and
no copied asset scripts. Extending that boundary needs focused negative tests.
The distribution guard scans lazy chunks, maps and other emitted files for known
secret/fixture/execution markers in every regular file, including binary data.
It uses bounded byte reads with overlap, checks raw ASCII and UTF-16LE/BE at both
alignments, and never skips an extension, MIME class or NUL-containing file. Roots,
links and special entries fail closed. No archive/decompression/base64 expansion
or general secret-detection guarantee is claimed. See the
[H9 receipt](docs/development/harness-rules.md#h9-byte-safe-distribution-receipt).
No production fixture, arbitrary Sass import or server resource is permitted.
The strict-template mechanism is documented at
https://angular.dev/tools/cli/template-typecheck.

## Offline contract gate

make verify begins with make contracts-check. The gate verifies vendored inventory,
hashes and local references, then compares regenerated types and validators.
make contracts-generate is the explicit write command. Both require util-linux
unshare with Linux user/network namespaces and retain Node filesystem permissions.
Read docs/development/contracts.md before updating provider or generator pins.

## C5a generated-consumer authority

Only src/generated/schemas may import effect/Schema. Server-generated clients
remain BFF-owned and cannot be imported by schemas, presentation or browser code.
Negative tests include barrel/type imports and resource escapes. This policy does
not admit any replacement validator. See ADR 0003 and the C5a baseline receipt.
Benchmark commands are explicit and install no tools.

## Generated-file ownership

The contract generator owns only the names/hashes in generated-manifest.json,
plus the current deterministic output set. AGENTS.md remains handwritten.
contracts-check rejects orphan modules, missing outputs, symlinks and stale bytes.
Explicit regeneration refuses edited previous output and unowned files, then
removes unchanged retired outputs. A local exclusive lock prevents concurrent
writers; interruption or a failed check requires review rather than forced cleanup.
Read [generation lock recovery](docs/development/generation-locks.md) before any
manual recovery. A collision never authorizes automatic lock removal, output
overwrite or regeneration just to get green.
This guard does not activate the blocked Effect candidate or retire Ajv.

## Fixed-origin upstream transport

The BFF supports exact Run and bound artifact-list reads at its upstream boundary.
Artifact metadata/digests are claims; this does not qualify artifact-body transfer.
Deployment configuration provides the approved HTTPS origin, CA file and
bearer file. Load the files at transport construction and reconstruct the
transport to rotate either. On Linux with procfs, use canonical absolute
paths under root- or service-user-owned directories without group or other
write access. The files must be private, singly linked regular files owned
by the effective service user. Keep them outside source and build output.

The defaults cap the whole read at three seconds and one MiB. The transport
uses explicit TLS trust, refuses redirects, and returns bounded reason codes
for failures. The integration test uses OpenSSL and loopback HTTPS. Session
binding and safe browser presentation are implemented for the local paired
Run-detail slice; shared identity and general session coordination remain separate.

## Effect Node transport admission (issue #33)

The production composition entry is src/bff/transport.ts; src/bff/run-reader.ts builds
lazy scoped reads through @effect/platform-node 4.1.2. Raw Node response headers enforce
duplicate cardinality. Per-read agents retain non-pooled behavior. Exact import paths
are admitted; native HTTP imports and the transport legacy allowance are removed.
make verify runs the production parity tests, including real TLS1.1 rejection with a
positive control, duplicate headers, limits, cancellation and a child-process shutdown.
The lifecycle test host is a fixture, not a new production BFF server/auth route.
See tools/qualification/effect-node/README.md for the qualification history.
