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
