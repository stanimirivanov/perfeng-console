# Working with the console harness

Start at [AGENTS.md](AGENTS.md). Read the one task and layer guide that own the change. The planning baseline contains the license and two M05 planning documents. This bootstrap introduces strict TypeScript, native Node ESM, pnpm, ESLint, the TypeScript compiler and Node's test runner for the harness. Product libraries enter through the M05 dependency review. Layer directories currently contain guides.

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
.github/workflows/harness.yml  pull request and main verification
```

## Application ownership specification

Read [runtime and state ownership](docs/development/runtime-ownership.md) for the
Angular/SignalStore/Effect split and [harness rules](docs/development/harness-rules.md)
for required proof. Structural ownership sensors now run in make architecture; the rule specification records remaining behavioral and production-admission gaps.
The following layer matrix describes the existing coarse policy; it does not admit
production Effect adapters or replace the finer ownership requirements.

## Ownership and allowed edges

Within-layer imports are allowed. The matrix lists cross-layer dependencies. External packages and Node built-ins require an exact entry in the executable policy. Keep package admission and permission to import that package separate in review.

| Owner | Owns | May import |
|---|---|---|
| browser | Render state, accessible intents, same-origin BFF calls | presentation, shared, generated |
| bff | Server session, fixed-origin calls, safe errors | presentation, shared, generated |
| presentation | Pure display models | generated |
| shared | Browser–BFF DTOs | none |
| generated | Vendored-contract bindings | own layer |
| scenarios | Frozen expectations and independent comparisons | generated |
| simulator | Journal, approval, public-API driver, offline analysis adapter | scenarios, generated |

Public Perfeng contracts belong to perfeng-contracts. The control plane owns platform state and authorization. Environment owns disposable fault injection. Use a fixed local protocol between BFF and simulator. Exception requests change the policy and a negative test together and identify the new authority granted.

Write native ESM with explicit file extensions. Use PascalCase for types, camelCase for functions and kebab-case for new module filenames. Keep state and side effects with their owner. Type untrusted data at its parsing boundary. Prefer a narrow function to a forwarding class. Keep focused tests beside their architectural concern under tests/. Naming and clarity are review criteria.

## Sensors and failure handling

| Sensor | Exact command | What stops the change |
|---|---|---|
| Toolchain | `make doctor` | Node or pnpm differs from the exact pins |
| Bootstrap | `make bootstrap` | Frozen lock/install fails. Lifecycle scripts are disabled |
| Lint | `make lint` | ESLint error or warning, inline config suppression, forbidden TS directive, eval or focused/skipped method |
| Types | `make typecheck` | Strict type errors across harness, tests and present product TS |
| Architecture | `make architecture` | Unknown source owner, unadmitted package/edge, computed import, CommonJS loader, source symlink or missing scoped guide |
| Behavior | `make test` | A Node test fails, the suite is empty, or TAP reports any skipped or todo cases. Boundary tests exercise actual TS syntax on temporary source trees |
| Local aggregate | `make verify` | Any offline sensor above fails after explicit bootstrap |
| Supply chain | `make supply-chain` | Registry audit reports high/critical vulnerability or the check cannot complete |
| Pre-commit | `make hooks` once per checkout | Verifies the staged snapshot with the installed modules. Unstaged edits cannot mask a bad staged source |
| Hosted CI | job `verify` in Console harness | Fresh frozen bootstrap, same aggregate and registry audit. Read-only GitHub permissions, pinned actions, ten-minute deadline |

The hook uses the checkout's installed development tools. Rebootstrap after a lock change. CI installs the committed lock on a clean runner. A repository administrator can require the hosted job in branch rules and require human review of sensor changes. Installing the local hook does not change GitHub branch settings.

A typical diagnostic reads `src/browser/view.ts:1 [layer] browser cannot import bff`. Locate the credential or upstream operation in the BFF and consume its safe view model through the local protocol. Run `make architecture`, then `make verify`. For a type failure fix the schema/type boundary and rerun `make typecheck`. For a behavior failure preserve the reproduction and rerun `make test`. Capture the failing rule and the results of the corrected run in the PR.

The architecture sensor checks static module syntax, including exports, type references and literal dynamic imports. It cannot prove runtime secrecy, detect every form of global access or establish exactly-once external effects. Those properties require process isolation, negative integration tests, credential canaries and human review. The scenario restrictions are product obligations until implemented and tested.

## Dependency review

The installed packages are development-only. TypeScript (Apache-2.0) supplies both strict typechecking and its AST for import inspection. ESLint, typescript-eslint and Node types (MIT) supply lint and pinned runtime declarations. Node's built-in test runner avoids another runtime dependency. Use the full graph in pnpm-lock.yaml for dependency upgrades and retain audit output. The 26.13.0 runtime and pnpm 12.16.1 pins match this console bootstrap machine. The adjacent Playwright repository has its own Node 24 policy.

At bootstrap the registry reported a moderate minimatch advisory through ESLint and typescript-eslint. Their compatible ranges still select major 10. Lint processes repository-controlled patterns in the bounded verification job. Recheck upstream compatible releases on each toolchain update. The high/critical audit threshold remains active and lower-severity findings remain visible. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Progressive hardening

| When | Promote guide to sensor | Required negative proof |
|---|---|---|
| Bootstrap, this PR | Source ownership, literal import graph, strict compiler, lint and staged/hosted gates | Forbidden browser/server edge fails with path, allowed edge passes, evaluator cannot import runner |
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
the dedicated test config discovers only its own stack.spec.ts. The root policy allows
NgRx/Effect and TestBed only in Angular spec files until production consumers are reviewed.
See docs/development/stack-admission.md for the gate receipt and remaining obligations.

## M05-PR2 failure propagation

make verify now includes the production AOT build and its distribution scan.
Angular's JSON reporter is deleted before each component run and must report a
nonempty suite with every test passed and no skipped/todo cases. Vitest retries
are disabled. Playwright accounting retains every attempt and rejects skipped,
empty or retried runs independently of guide tags. Node accounting stays separate.
Official interfaces: https://vitest.dev/guide/reporters#json-reporter and
https://playwright.dev/docs/api/class-reporter.

make harness-self-test copies source into a temporary directory, links the installed
toolchain and proves actual command failures for invalid template bindings,
component assertions, Angular skips and Playwright skips/failures. It never edits
the working checkout and removes the temporary fixture on completion.
CI runs it in the browser job with installed pinned Chromium.

Browser build inputs are explicitly reviewed in harness/assets.ts. The current
scaffold permits inline component templates, one local Material Sass import and
no copied asset scripts. Extending that boundary needs focused negative tests.
The distribution guard scans lazy chunks, maps and other emitted files for known
secret/fixture markers. This is a regression sensor, not a general secret detector.
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
This guard does not activate the blocked Effect candidate or retire Ajv.

## Fixed-origin upstream transport

The BFF currently exposes one typed Run read at its upstream boundary.
Deployment configuration provides the approved HTTPS origin, CA file and
bearer file. Load the files at transport construction and reconstruct the
transport to rotate either. On Linux with procfs, use canonical absolute
paths under root- or service-user-owned directories without group or other
write access. The files must be private, singly linked regular files owned
by the effective service user. Keep them outside source and build output.

The defaults cap the whole read at three seconds and one MiB. The transport
uses explicit TLS trust, refuses redirects, and returns bounded reason codes
for failures. The integration test uses OpenSSL and loopback HTTPS. Session
binding and safe browser presentation belong to later slices.

## Effect Node transport admission (issue #33)

The production composition entry is src/bff/transport.ts; src/bff/run-reader.ts builds
lazy scoped reads through @effect/platform-node 4.1.2. Raw Node response headers enforce
duplicate cardinality. Per-read agents retain non-pooled behavior. Exact import paths
are admitted; native HTTP imports and the transport legacy allowance are removed.
make verify runs the production parity tests, including real TLS1.1 rejection with a
positive control, duplicate headers, limits, cancellation and a child-process shutdown.
The lifecycle test host is a fixture, not a new production BFF server/auth route.
See tools/qualification/effect-node/README.md for the qualification history.
