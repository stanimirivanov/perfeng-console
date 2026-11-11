# Contributing

Start with AGENTS.md, CONSTRAINTS.md and the owning M05 task.
Reuse or create a bounded issue before implementation. Work on feature/issue-N.
Record scope, dependencies, acceptance criteria and verification requirements.
Write the failing behavioral regression before its implementation.
Preserve unrelated changes and provider ownership.

Run make bootstrap for a frozen install with lifecycle scripts disabled.
Run make verify and make supply-chain before delivery.
Browser changes also require make build and make browser-test.
Narrated journey changes require make guide; generated guides stay outside Git.
Report failed or unavailable checks with their actual cause.
Never suppress failures, lower thresholds or edit scenario expectations to obtain green.
Include issue linkage, validation, limitations and rollback in the pull request.
The owner reviews and merges. Do not merge on the owner's behalf.

Dependency additions must pass docs/development/dependency-policy.md.
Design exports are guidelines; implement real Angular components and runtime checks.

## Rationale comments and review

Comments explain a non-obvious invariant or why a decision exists; they do not
narrate the next line. Security-sensitive allowlists and pins should name the threat
and the review issue/decision. A temporary allowance names its owning issue and
retirement condition, for example `TODO(issue-49): ...`; avoid unticketed promises.
Do not add comments to every function or enforce comment counts with a regex.
This policy is a human review duty, not an active comment-quality linter.

When fixing a recurring agent mistake, record its smallest violating example,
the regression/sensor that catches it and the local guide that prevents it.
The [PR template](.github/pull_request_template.md) captures this steering loop.
Documentation-only work has no behavioral RED/GREEN requirement; review facts,
links and the applicable gates instead. Do not add artificial tests or claim a
future sensor is already active.

Reviewers judge scope, misunderstood requirements, unnecessary features and
abstraction cost alongside deterministic results. Optional isolated AI review is
advisory and requires its own authorization; it cannot replace human review or
turn passing structural checks into proof of semantics. See the
[enforcement index](docs/development/harness-rules.md#semantic-review-duties).
