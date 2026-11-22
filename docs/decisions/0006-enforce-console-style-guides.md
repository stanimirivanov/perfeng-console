# 0006. Enforce Console style guides

Proposed for owner review in issue #161. [The harness](../../HARNESS.md#code-style-and-review)
records the checks, their scope, and the judgments that belong in review.

## Decision

Use the Angular ESLint TypeScript plugin, template plugin, and template parser at
22.8.0. The existing flat config enables selected rules only for Console source
and external templates. Root dev dependencies are the Console's tooling boundary
in this workspace. Both the Angular build and backend tooling use TypeScript
6.0.3 under [ADR 0002](0002-ui-technology-stack.md). Keep that shared pin.

Keep component styles next to their source as CSS and link them with `styleUrl`.
Angular's default emulated encapsulation scopes the rules to the component.
The workspace guard validates matching regular siblings and literal template and
style paths. `apps/console/src/styles.scss` owns the shared Material theme and
page defaults. Angular uses the existing CSP nonce for both Material and
component styles. A browser test checks that the lazy Verification component's
style applies and that its style element carries the nonce from the response.

## Dependency admission

The exact Angular ESLint 22.8.0 packages are MIT licensed, from the maintained
Angular ESLint project, and were published on 2026-11-18. This satisfies the
existing 1440-minute release-age floor. The plugins and parser declare no explicit
Node engine range. Their ESLint peer range is `^9 || ^10`, and their TypeScript
peer is `*`. The plugins' TypeScript ESLint `types` and `utils` peers use the
existing 8.72.1 release line. `utils` supports TypeScript `>=4.8.4 <6.1` and Node
`^18.18 || ^20.9 || >=21.1`, including the project's TypeScript and Node pins.

The lock adds seven packages: the three Angular ESLint entries, their MIT
compiler/parser utility packages, and Apache-2.0 `aria-query@5.3.2` and
`axobject-query@4.1.0`. It reuses the locked TypeScript ESLint peers. They are
lint-only development inputs. The frozen, script-disabled install and audit
remain required. The current audit reports the existing low esbuild and moderate
minimatch advisories, with more dependency paths to minimatch. The existing
openapi-typescript and optional WASM peer warnings remain visible.

To replace the linter, keep the rule behavior covered by
`tests/harness/angular-style.test.ts` and the existing import and verification
gates. `tests/harness/workspace.test.ts` owns the resource validation cases.
The Angular CLI stays the project's scaffold generator.

Official metadata: [TypeScript plugin](https://registry.npmjs.org/@angular-eslint%2feslint-plugin/22.8.0),
[template plugin](https://registry.npmjs.org/@angular-eslint%2feslint-plugin-template/22.8.0),
[template parser](https://registry.npmjs.org/@angular-eslint%2ftemplate-parser/22.8.0),
[TypeScript ESLint utils](https://registry.npmjs.org/@typescript-eslint%2futils/8.72.1).
