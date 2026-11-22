# Contributing

Use the workflow in [AGENTS.md](AGENTS.md), and read [CONSTRAINTS.md](CONSTRAINTS.md)
for product and verification requirements. Preserve unrelated changes and provider
ownership. Link delivery PRs to the issue when applicable and record validation,
limitations and rollback. The owner reviews and merges.

Run make bootstrap for a frozen install with lifecycle scripts disabled.
Run make verify and make supply-chain before delivery.
Browser changes also require make build and make browser-test.
Narrated journey changes require make guide; generated guides stay outside Git.
Report failed or unavailable checks with their actual cause.
Never suppress failures, lower thresholds or edit scenario expectations to obtain green.

Dependency additions must pass docs/development/dependency-policy.md.
Design exports are guidelines; implement real Angular components and runtime checks.

## Code style

Follow the [Angular coding style guide](https://angular.dev/style-guide) for Angular
code and the [Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html)
for handwritten TypeScript. Apply them when adding or editing code, with repository
ownership, import, and lint rules taking precedence where they differ. Keep style
consistent within each file and leave generated and vendored files to their owners.
See the [console guide](apps/console/AGENTS.md#component-layout-and-generation)
for component layout and Angular CLI examples.

## Rationale comments and review

Comments explain a non-obvious invariant or why a decision exists; they do not
narrate the next line. Security-sensitive allowlists and pins should name the threat
and the review issue/decision. A temporary allowance names its owning issue and
retirement condition, for example `TODO(issue-49): ...`; avoid unticketed promises.
Do not add comments to every function or enforce comment counts with a regex.
This policy is a human review duty, not an active comment-quality linter.

Reviewers judge scope, misunderstood requirements, unnecessary features and
abstraction cost alongside deterministic results. Optional isolated AI review is
advisory and requires its own authorization; it cannot replace human review or
turn passing structural checks into proof of semantics. See the
[enforcement index](docs/development/harness-rules.md#semantic-review-duties).

JavaScript boundary documentation is enforced by the scoped rules in
[the module documentation guide](docs/development/javascript-documentation.md):
exported functions and named top-level utilities need meaningful purpose, typed
parameter descriptions and returned-value documentation. Callbacks/nested helpers
are not blanket targets. Throws/rationale accuracy remains human review; generated
inputs are not reformatted and no comment-count quota is used.
