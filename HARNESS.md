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

## Ownership and allowed edges

Within-layer imports are allowed. The matrix lists cross-layer dependencies. External packages and Node built-ins require an exact entry in the executable policy. Keep package admission and permission to import that package separate in review.

| Owner | Owns | May import |
|---|---|---|
| browser | Render state, accessible intents, same-origin BFF calls | presentation, generated |
| bff | Server session, fixed-origin calls, safe errors | presentation, generated |
| presentation | Pure display models | generated |
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

The application roots now live in apps/console and apps/scenario-lab. make architecture checks their TypeScript dependency boundaries in addition to the original src layer policy. make typecheck covers the harness and E2E helpers; Angular strict template checks run through make build for each app. CI runs both builds, browser tests and the guide publication pipeline. The standalone Scenario Lab shell is a foundation for later simulator work. The preview HTTP server is test-only.
