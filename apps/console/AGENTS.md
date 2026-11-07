# Perfeng Console

Build one browser application. Keep Verification lazy, visibly labeled and themed with local Material tokens. Require fresh same-origin confirmation before entering. The BFF must authorize actual operations. Never import the runner, server secrets or design fixtures. Read [browser guidance](../../src/browser/AGENTS.md).

Follow the [runtime ownership model](../../docs/development/runtime-ownership.md):
components, stores, operations, adapters and composition have distinct roles even
inside this single app. Register concrete role paths with their first implementation.
Verification uses the same rendering/state rules but never imports simulator authority.
Use the [pending harness rules](../../docs/development/harness-rules.md) to identify
required negative tests; do not treat this documentation as package admission.
