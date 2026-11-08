# Presentation types

Keep display transformations and formatting pure. Shared browser–BFF DTOs live in ../shared/contracts; do not re-export them here. Distinguish UNKNOWN, unavailable and zero. Define presentation semantics without querying providers or recomputing scientific conclusions.

Read the [layer matrix](../../HARNESS.md) and run `make architecture` after changing dependencies.

Follow [runtime ownership](../../docs/development/runtime-ownership.md). Use plain
TypeScript for deterministic formatting and mappings. Do not import Angular, NgRx,
Effect runtime, timers or I/O. Public view models carry safe data, not runtime handles.
Generated types and boundary validation remain authoritative.
