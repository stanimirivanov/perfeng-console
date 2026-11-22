# Console agent guide

## Agent skills

Use `mattpocock/skills` as the primary workflow for planning, ticketing,
implementation, TDD, review, and pull requests. The skills take precedence where
contributor guidance covers the same steps. Follow the repository's technical
requirements, CI gates, and authorization boundaries.

### Issue tracker

Use GitHub Issues in `stanimirivanov/perfeng-console`. See [issue tracker configuration](docs/agents/issue-tracker.md).

### Triage labels

Use the default Matt Pocock label mapping. See [triage labels](docs/agents/triage-labels.md).

### Domain docs

Single context with a root glossary and ADRs in `docs/adr/`. See [domain docs](docs/agents/domain.md).

## Ownership

Read [CONSTRAINTS.md](CONSTRAINTS.md) for product and verification constraints.
Use [SPEC.md](SPEC.md) for scope and the [dependency admission policy](docs/development/dependency-policy.md)
when changing dependencies. For UI work, follow the [design implementation guidance](docs/design/material-review/README.md#implementation-guidance).

Nx owns the Angular application in `apps/console`. Keep Verification lazy and
visibly distinct. Its runner, fault adapters and credentials stay outside the
browser. Read the nearest module guide before changing a layer. Browser journeys
and guide capture belong to `apps/web-e2e`.

## Commands

Use the repository gates for the build (`make build`), tests (`make test`),
type checking (`make typecheck`), and lint (`make lint`). Run `make verify`
before handoff. Run `make supply-chain` for delivery. Browser changes also
require `make build` and `make browser-test`. Run `make guide` after changing
narrated journeys and keep generated guide output outside Git.
`make verify` does not include browser, installation or harness-self-test gates;
see the [gate map](HARNESS.md#sensors-and-failure-handling) for those CI duties.

## Architecture and code style

When writing TypeScript or Angular code, follow the [code style guidance](CONTRIBUTING.md#code-style).

Read [runtime ownership](docs/development/runtime-ownership.md) before adding state,
I/O, concurrency or resource lifetimes. Angular owns rendering and local interaction;
SignalStore owns shared observations; Effect owns scoped asynchronous operations.
Keep pure transformations in plain TypeScript. Use the owning layer guide for details.

[Harness rules](docs/development/harness-rules.md) specify the required sensors and
explicitly identify pending enforcement. Existing passing gates do not admit a new
adapter or prove the full ownership model. Preserve generated contracts and Ajv.

## Imports

Follow [import boundaries](docs/IMPORTS.md). Use reviewed public aliases across owners.
Keep within-owner relative imports local. Run `pnpm lint`, which includes the
import/cycle gate; use `pnpm check:imports` for a focused import check.

## Reference files

- [Runtime and state ownership](docs/development/runtime-ownership.md)
- [Harness rule specification](docs/development/harness-rules.md)
- [BFF ownership](src/bff/AGENTS.md)
- [Browser ownership](src/browser/AGENTS.md)
- [Incoming server, CLI and preview ownership](tools/AGENTS.md)
- [Fixed-origin acceptance](HARNESS.md#fixed-origin-upstream-transport)

## Formatting

Handwritten TypeScript formatting is enforced by ESLint: multi-member interfaces
and type literals use one member per line, semicolon member delimiters, two-space
indentation and no trailing spaces. Run `pnpm exec eslint . --fix` before verification.
Generated contracts and vendored sources retain byte ownership; never reformat them.
