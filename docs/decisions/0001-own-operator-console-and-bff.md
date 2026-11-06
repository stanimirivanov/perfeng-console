# ADR 0001 — Console, BFF and independent simulation runner

Status: accepted architecture, recorded by M05-PR1 from confirmed owner intent.

## Decision

perfeng-console owns one Angular UI and its thin BFF. Verification → Scenario Lab
is a distinctly themed maintainer area inside that UI. The runner is a separate
non-UI process, independently installed, upgraded and qualified.
The Console remains operational with that runner absent.

The browser uses same-origin BFF calls. The BFF holds bearer credentials and validates
the public control-plane responses. Contracts own operation and schema semantics.
Environment owns approved disposable perturbation adapters. The runner's evaluator
compares immutable expected outcomes with public observations independently of analysis.
Actual platform Runs open the ordinary Console Run route.

## Alternatives and consequences

A separate verifier browser duplicates navigation and obscures the shared Run journey.
An embedded fault runner places privileged execution inside the browser product's lifecycle.
The selected structure keeps one operator experience and independent fault authority.
It requires authorization at the BFF and runner; hiding a navigation link cannot authorize a request.
No provider state is reproduced in a console database.

## References

- [Confirmed intent](../intent/perfeng-ui.md)
- [Implementation plan](../../tasks/plan.md)
- [Stack selection and admission gates](0002-ui-technology-stack.md)
