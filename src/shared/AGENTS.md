# Shared browser–BFF contracts

Own the data-only DTOs in contracts/. Keep provider wire contracts and Ajv validation
in src/generated and their existing adapters. Shared DTOs do not confer authorization
or recompute scientific verdicts.

No Angular, Effect, Node APIs, I/O, timers, runtime handles, BFF implementations or
simulator dependencies. Register each module with the contract role in
harness/ownership.ts. Browser admission remains type-only for the exact reviewed
public-api module via #perfeng/contracts. The public entry exports types only.
See docs/development/import-surfaces.md for Phase 3 alias resolution.

Run make architecture and make typecheck after changes. Keep release inventories
in harness/product-release.ts and scripts/check-console-isolation.ts aligned.
