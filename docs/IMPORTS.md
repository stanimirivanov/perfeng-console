# Import boundaries

Cross-project imports must use a reviewed path alias or an explicitly admitted
public entry point. Relative imports stay within their owner (the project's src
for application code). Directory depth alone does not determine ownership.
The owner roots are defined by harness/project-imports.ts and matched in order:
apps/console, apps/web-e2e, each src layer, each isolated qualification package,
tools/qualification public entries, tools/user-guide, tools, harness, scripts, tests.
Root tooling and tests are not Angular projects; their internal relatives remain legal.

## Dependency direction

Browser → shared DTO types only → same-origin BFF → generated public provider
contracts and qualified server adapters. Shared contracts contain type declarations
and type-only exports. The BFF owns safe provider-to-DTO projection, including removal of private
messages and storage locations. Presentation owns pure display formatting and may
use generated provider types; other owners cannot import presentation internals. Scientific verdicts
remain provider-owned. Simulator/evaluator authority stays outside browser/BFF.

A public alias does not grant runtime authority. Existing boundaries.ts and
ownership.ts continue to restrict roles, packages, browser DTO types and runtimes.
No alias or barrel exposes the entire server to the browser. Cross-owner cycles,
including type-only cycles and reciprocal dependencies through disjoint public
entry modules, are rejected. Same-owner cycles are not addressed by
this specific rule.

## Reviewed aliases

This is the single durable alias table. `harness/imports.ts` owns the executable
map. `make check-imports` checks this table against that map before dependency-graph
inspection, in addition to Node/compiler parity. Missing, extra, duplicate, malformed
or retargeted entries fail. Keep Alias and Target cells code-formatted; an optional
parenthesized note may follow the target. Code review still governs permission changes.

| Alias | Target |
|---|---|
| `#perfeng/contracts` | `./src/shared/contracts/public-api.ts` |
| `#perfeng/bff` | `./src/bff/public-api.ts` |
| `#perfeng/bff-config` | `./src/bff/config-public-api.ts` |
| `#perfeng/bff-session` | `./src/bff/session.ts` |
| `#perfeng/bff-csp` | `./src/bff/csp.ts` |
| `#perfeng/bff-runs` | `./src/bff/runs.ts` |
| `#perfeng/validators` | `./src/generated/validators.mjs` |
| `#perfeng/server` | `./tools/public-api.ts` |
| `#perfeng/user-guide` | `./tools/user-guide/public-api.mjs` |
| `#perfeng/e2e` | `./apps/web-e2e/public-api.ts` |
| `#perfeng/harness/boundaries` | `./harness/boundaries.ts` |
| `#perfeng/harness/workspace` | `./harness/workspace.ts` |
| `#perfeng/harness/ownership` | `./harness/ownership.ts` |
| `#perfeng/harness/assets` | `./harness/assets.ts` |
| `#perfeng/harness/product-release` | `./harness/product-release.ts` |
| `#perfeng/tooling/angular-accounting` | `./scripts/angular-accounting.ts` |
| `#perfeng/tooling/generated-output` | `./scripts/generated-output.ts` |
| `#perfeng/tooling/contracts` | `./scripts/contracts.ts` |
| `#perfeng/run-transitions` | `./src/generated/transitions.ts` (BFF-owned graph projection) |
| `#perfeng/run-types` | `./src/generated/run.ts` |
| `#perfeng/harness/imports` | `./harness/imports.ts` |
| `#perfeng/harness/project-imports` | `./harness/project-imports.ts` |
| `#perfeng/harness/import-lint` | `./harness/import-lint.mjs` |

Node uses package.json imports. TypeScript uses tsconfig.paths.json for TypeScript entries. JavaScript entries
use Node imports conditions: types names the .d.mts declaration and default names
the .mjs runtime. They are deliberately absent from paths so Playwright cannot
execute a declaration file. harness/imports.ts checks exact map parity and
config inheritance. Runtime package installation does not authorize new imports.
See [public surfaces](development/import-surfaces.md) for qualification and release details.

## Explicit exceptions

Qualification packages have independent Node package scopes. They may use relative
links to exactly src/bff/config-public-api.ts and tools/qualification/public-api.ts
or public-api.mjs. Their entry modules use reviewed aliases for implementation.
No private source path is admitted by this exception.

The existing effect-codegen/oracle.mjs CLI loads the validators from its supplied
checkout using the exact expression
`pathToFileURL(join(consoleRoot, "src/generated/validators.mjs")).href`.
The scanner admits that expression only when the entire oracle file matches its
reviewed SHA-256. Changing its bindings, target or caller fails; a future oracle
change needs a reviewed hash update. This preserves its existing pinned-checkout qualification behavior.
Generated directory names grant no exclusion. All supported source extensions
under the six scanned roots are checked, and source symlinks are rejected. Only
node_modules is omitted as installed third-party code. Qualification receipts
remain separate. Missing generated clients
are recorded as unavailable qualification, never as a passing wire-conformance gate.

## Mechanical enforcement

- `perfeng/public-boundaries` is the local ESLint rule shared with the CLI scanner.
  It checks resolved relative ownership, exact alias names, import/export/type/lazy
  forms and the narrow qualification exceptions. All js/jsx/mjs/cjs/ts/tsx/mts/cts
  variants are checked. Canonical specifiers cannot encode traversal or add queries. Diagnostics link to this document.
- `no-restricted-imports` adds an immediate guard for root src escapes from top-level
  Console source and e2e test files. The owner-aware rule handles other depths.
- `@nx/enforce-module-boundaries` enforces the two Nx projects' browser/test tags.
  Lint refreshes the Nx graph first. Root layers are covered by the custom sensors;
  they are not represented as Nx libraries.
- dependency-cruiser 18.7.2 checks type-only and runtime cross-owner cycles,
  external presentation consumers and unresolved product imports. The standalone
  runner checks alias parity first, enforces the JSON receipt error count, and
  collapses resolved edges to owners to reject owner-level cycles too. Known-violation
  baselines and caching are disabled. Optional
  qualification generated clients are outside the unresolved-product gate.
- Stylesheet imports/resources are restricted by the asset policy; the sole admitted
  external style input is the existing Material use in the reviewed global stylesheet.
- Angular ESLint and eslint-plugin-import are not direct admitted dependencies;
  their optional rules are not claimed as active.

Run `pnpm lint` (or `make lint`) for ESLint plus the import/cycle gate.
Run `pnpm check:imports` (or `make check-imports`) for the scanner and graph gate.
Run `make typecheck` and `make verify` before review. The existing pre-commit hook
runs make verify on the staged tree. Console quality CI explicitly runs
make verify, which shares an early import preflight with its lint prerequisite. Negative fixtures ship with the rules.

When adding a public surface, update its exact alias/entry and ownership policy,
add an adversarial fixture, and verify compiler, Node and product-release resolution.
Never add a broad exception or suppress a failing rule to make a build green.
