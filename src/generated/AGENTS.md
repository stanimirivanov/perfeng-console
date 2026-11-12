# Generated contracts

Regenerate only from the checksummed, offline reference closure. Keep generator inputs, version and byte provenance reviewable. Never patch generated types to accept an incompatible provider payload.

Read the [layer matrix](../../HARNESS.md) and run `make architecture` after changing dependencies.

Use make contracts-generate after a reviewed pin update, then make contracts-check.
Read docs/development/contracts.md for provenance and generator adaptations.

A .generation.lock failure is not permission to delete a lock or regenerate.
Read [safe recovery](../../docs/development/generation-locks.md). Confirm no writer
uses the checkout before any coordinated recovery; retain edited output/ledger
as evidence and run make contracts-check before considering reviewed regeneration.
