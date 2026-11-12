# Generation lock recovery

The generator creates `src/generated/.generation.lock` exclusively before any
write. Read-only checks refuse an existing lock too. A collision leaves the other
writer's lock, outputs and manifest untouched; it is not permission to retry with
force, delete outputs or overwrite the lock. Lock contents are never printed.

1. Stop launching competing generation commands for this checkout. Wait for the
   owner to finish normally, then rerun `make contracts-check`. A writer removes
   only the lock it acquired in its normal cleanup path.
2. If the lock remains, confirm no writer uses this checkout, including processes
   in other terminals, containers or hosts sharing it. The lock has no reliable
   process-owner metadata. Its age or an absent local PID does not prove abandonment.
   If ownership is uncertain, stop and coordinate with the checkout owner.
3. Only after confirming abandonment, preserve the lock outside generated output
   and review `git diff -- src/generated` and the generated manifest against the
   reviewed pin. The owner may then explicitly remove the confirmed abandoned
   lock. Recovery is a human decision; the harness never unlinks another writer's
   lock automatically and supplies no blind removal command.
4. Run `make contracts-check` before any regeneration. If it reports drift, edited
   bytes or unowned output, keep that evidence and investigate. Do not hand-edit
   generated files, remove the ledger or regenerate merely to obtain a green check.
   After reviewing a deliberate pin/generator change, use `make contracts-generate`
   followed by `make contracts-check` and `make verify`.

A failed or interrupted writer can leave partial output. The existing manifest and
preflight checks remain authoritative; clearing a lock alone never makes that
output trusted. If recovery is unclear, preserve the checkout and investigate
rather than weakening the ownership or hash checks.
