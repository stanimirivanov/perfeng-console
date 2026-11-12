# Console contributor map

Read [contribution rules](CONTRIBUTING.md), [product scope](SPEC.md) and the [dependency admission policy](docs/development/dependency-policy.md).

Start with the issue, [constraints](CONSTRAINTS.md) and the matching entry in the [M05 task index](tasks/todo.md). Read the nearest scoped AGENTS.md before changing a layer. Use [HARNESS.md](HARNESS.md) for ownership, commands and failure handling.

For UI tasks, read the [design implementation guidance](docs/design/material-review/README.md#implementation-guidance) before using the gallery. The approved designs guide workflows, evidence states and keyboard behavior.

1. Plan. Identify the accepted task, owning layer, observable outcome and smallest failing check. Open or reuse its issue before implementation. Preserve unrelated changes.
2. Execute. Make one reviewable change at a time. Add a failing regression case before changing behavior. Keep interface changes with the provider that owns their meaning.
3. Verify. Run the focused sensor, then `make verify`. Read the first failing rule, filename and reason. Correct the source, repeat the same check and record the actual result. Report unavailable checks explicitly. Never suppress a check or rewrite expected output to get green.
4. Deliver on an issue branch. Include scope, validation, remaining findings and rollback in the PR. Human review precedes merge.

Keep architecture and sensor changes visible in review. A recurring failure earns a small executable regression and a local instruction where the mistake occurs.

Nx owns one Angular browser application in apps/console. Verification is a distinctly themed, labeled maintainer area; keep runner code, fault adapters and credentials outside the browser. apps/web-e2e owns browser regressions and tagged guide journeys. Read its scoped instructions before changing capture. Run make build and make browser-test after browser changes, and make guide after narrated journey changes. Generated guide output stays outside Git.

## Commands

Use the repository gates for the build (`make build`), tests (`make test`),
type checking (`make typecheck`), and lint (`make lint`). Run `make verify`
before handoff. Run `make supply-chain` for delivery.
`make verify` does not include browser, installation or harness-self-test gates;
see the [gate map](HARNESS.md#sensors-and-failure-handling) for those CI duties.

## Architecture and code style

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

## Review checklist

- No relative import crosses a project or layer boundary except the documented public-entry links; cross-layer contract types live in shared/contracts, not presentation.
- Identify the state writer, operation owner, runtime scope and authority boundary.
- Verify teardown, late-result rejection and safe failure projection where relevant.
- Preserve credential, TLS, deadline, response-limit and contract guarantees.
- Add a negative fixture with each new mechanical rule; report enforcement gaps.
- Explain security rationale and subtle invariants without restating code.
- Run the applicable gates and distinguish planned rules from verified behavior.

## Reference files

- [Runtime and state ownership](docs/development/runtime-ownership.md)
- [Harness rule specification](docs/development/harness-rules.md)
- [BFF ownership](src/bff/AGENTS.md)
- [Browser ownership](src/browser/AGENTS.md)
- [Fixed-origin acceptance](HARNESS.md#fixed-origin-upstream-transport)

Qualified BFF examples: [lazy reader](src/bff/run-reader.ts) and
[composition boundary](src/bff/transport.ts). The
[Run-detail admission](docs/development/runtime-ownership.md#run-detail-browser-admission-m05-pr22)
is narrow; [H5 runtime boundaries](docs/development/harness-rules.md#h5-runtime-boundary-receipt)
are enforced, while shared-session coordination remains pending.
