# Perfeng Console

This repository owns the M05 operator console and Scenario Lab coding harness. The approved implementation sequence is in [tasks/plan.md](tasks/plan.md).

Use Linux with the exact Node version in `.node-version` and pnpm version in `package.json`. Run `make bootstrap` once to install the frozen development dependencies with package scripts disabled. Run `make verify` for the offline gate. Run `make hooks` to opt into staged-tree verification before committing.

Start with the [agent map](AGENTS.md) or the [harness guide](HARNESS.md).
