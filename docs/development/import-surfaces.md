# Public import surfaces (Phase 3)

Issue #41 establishes exact aliases for the current consumers. Phase 4 enforces the
[import policy](../IMPORTS.md) through lint, graph checks and CI. Existing layer, ownership,
browser and product-release sensors remain mandatory.

## Resolution

`package.json#imports` supplies native Node resolution. `tsconfig.paths.json`
supplies matching compiler paths to both root and Angular configurations. Explicit
`.mjs` entries use package imports types/default conditions for declarations and
runtime respectively; they are omitted from paths to preserve Playwright execution. The
reviewed map in `harness/imports.ts` checks parity and rejects consumer overrides.
The central paths file cannot inherit another config or set baseUrl. Standalone
packaging checks its actual Node/compiler maps before bundling; the architecture
gate additionally checks the browser, test and root config inheritance.
Use exact names, not wildcard aliases. `baseUrl` is unnecessary: paths resolve
relative to the config file. No runtime loader or dependency was added.

References: [Node package imports](https://nodejs.org/api/packages.html#subpath-imports)
and [TypeScript paths](https://www.typescriptlang.org/tsconfig/paths.html).
TypeScript paths alone do not rewrite runtime imports.

## Surfaces

| Alias | Entry |
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

Each exact alias is an explicit public module surface; existing focused modules
such as session and CSP keep their own entry rather than loading an umbrella BFF
barrel. The transport, shared DTOs, server composition, e2e reporters and guide
utilities have named re-export entry files. No browser component is exported:
consumers exercise the Console through its UI.

Browser code can import only `#perfeng/contracts`, using declaration-level
`import type`. Shared DTOs remain data-only and generated provider contracts/Ajv
remain authoritative. BFF transport and qualification-config public entries may only make named
re-exports of their exact reviewed owner and cannot own a runtime.
The former browser-to-observation relative-path admissions are retired. Aliases do not grant browser access to server or test modules.
Same-project relative imports remain unchanged.

Qualification packages have independent package.json scopes and cannot inherit
root Node imports. Their relative imports target `src/bff/config-public-api.ts`
and `tools/qualification/public-api.ts` / `public-api.mjs`. These expose config,
generated Run types and the selected existing validators without loading the
production transport or changing qualification dependency pins. The entry modules
own their relative links to implementation. Generated files remain untouched.

## Verification

Run `make typecheck`, `make architecture`, `make verify`, `make browser-test`, and
`make console-isolation-check`. Alias fixtures reject map drift, compiler overrides,
server imports from the browser, runtime DTO imports and executable entry modules.
The owner-aware Phase 4 gate rejects cross-owner relatives except the documented qualification public-entry links.
