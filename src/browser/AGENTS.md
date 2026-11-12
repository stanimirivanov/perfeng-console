# Browser presentation

Render accessible, escaped view models. Read only same-origin BFF routes. Clear expired provider values. Keep bearer credentials, storage grants, server imports and shell authority out of the browser.

Build production components from [ADR 0002](../../docs/decisions/0002-ui-technology-stack.md) and the pinned contracts. Preserve the approved workflows, evidence states, and keyboard and focus behavior. Do not copy the gallery’s exported markup, styles, scripts or fixture data into the application. See the [design implementation guidance](../../docs/design/material-review/README.md#implementation-guidance).

Read the [layer matrix](../../HARNESS.md) and run `make architecture` after changing dependencies.

Read [runtime ownership](../../docs/development/runtime-ownership.md) and the
[harness specification](../../docs/development/harness-rules.md). Components render
and emit intents; Angular signals own local interactions. SignalStore is the single
writer of shared observations. Effect operations own polling, bounded reads and
cleanup behind the same-origin adapter. Bridge Angular DI/destruction to explicit
route/session scopes; create runtimes only at registered integration boundaries.
Reject late results by identity/epochs even after interruption. Do not add component
HTTP, independent timers, duplicate caches or mutation retries. Production NgRx/Effect
imports require narrow admission and behavioral proof. The existing
[Run-detail admission](../../docs/development/runtime-ownership.md#run-detail-browser-admission-m05-pr22)
permits specific production paths, not component-owned runtimes generally.
`main.ts` is bootstrap only; app.config.ts configures application providers. Components
consume feature-local readonly UI ports. Their Component.providers metadata installs
feature facades and stores; facades inject DestroyRef. Never construct stores manually
or pass component lifetime handles through root factories. Read the feature map in
[console guidance](../../apps/console/AGENTS.md). H5 retires H4 fences/assembly edges.
Use the public session epoch port for cross-feature invalidation. Pair/replacement,
logout and authoritative local-session denial advance the epoch before clearing
observations; capture it alongside each reader's local generation. A scoped resource
or capability denial must not fabricate global logout. Keep presentation owners
component-scoped; the application coordinator owns only epochs/subscriptions.
Verification now uses a separate adapter/facade/store with no legacy exception.
See the [H6 receipt](../../docs/development/harness-rules.md#h6-shared-session-receipt).

Use reviewed `.ts` source; alternate executable JS/TS formats are rejected even
under nested or spec-like paths. Native microtask/immediate/frame/idle/task APIs
are scheduling authority, not a component rendering shortcut. Prefer Angular
render hooks; keep direct schedulers in reviewed adapters with teardown proof.
See [native scheduling scope](../../docs/development/harness-rules.md#native-scheduling-scope).
