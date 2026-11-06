# Console contributor map

Start with the issue, [constraints](CONSTRAINTS.md) and the matching entry in the [M05 task index](tasks/todo.md). Read the nearest scoped AGENTS.md before changing a layer. Use [HARNESS.md](HARNESS.md) for ownership, commands and failure handling.

For UI tasks, read the [design implementation guidance](docs/design/material-review/README.md#implementation-guidance) before using the gallery. The approved designs guide workflows, evidence states and keyboard behavior.

1. Plan. Identify the accepted task, owning layer, observable outcome and smallest failing check. Open or reuse its issue before implementation. Preserve unrelated changes.
2. Execute. Make one reviewable change at a time. Add a failing regression case before changing behavior. Keep interface changes with the provider that owns their meaning.
3. Verify. Run the focused sensor, then `make verify`. Read the first failing rule, filename and reason. Correct the source, repeat the same check and record the actual result. Report unavailable checks explicitly. Never suppress a check or rewrite expected output to get green.
4. Deliver on an issue branch. Include scope, validation, remaining findings and rollback in the PR. Human review precedes merge.

Keep architecture and sensor changes visible in review. A recurring failure earns a small executable regression and a local instruction where the mistake occurs.
