# Independent scenario evaluator

Compare frozen, reviewed expectations with immutable observations. Separate research targets from current obligations. Record every mismatch. Keep analyzer comparison logic, process execution, private storage and mutation credentials outside the evaluator.

Read the [layer matrix](../../HARNESS.md) and run `make architecture` after changing dependencies.

The [runtime ownership model](../../docs/development/runtime-ownership.md) preserves
independent evaluation. Use pure comparisons of frozen expectations and observations;
console runtime adoption grants no I/O or mutation authority to this layer.
