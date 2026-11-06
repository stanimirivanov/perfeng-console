# Perfeng Console specification

Status: approved intent and architecture, delivered incrementally under M05.

## Authority

[Confirmed intent](docs/intent/perfeng-ui.md), [constraints](CONSTRAINTS.md),
[plan](tasks/plan.md) and [accepted stack ADR](docs/decisions/0002-ui-technology-stack.md)
govern implementation. The original proposal supplies scenario detail; its earlier
verification-first navigation and separate-browser assumptions are superseded.

## Product outcome

Maya follows a durable CI link, signs in, identifies the tested revision,
approved baseline and exact policy used, and investigates a regression.
She requests a real rerun against those references using her own service-scoped
permission. The platform records her identity, source Run and resulting child.
Withdrawn inputs and revoked permission deny dispatch. Baseline approval has its
own permission. Unknown measurements and unavailable providers remain explicit.

## Architecture and ownership

Browser → same-origin thin BFF → public control-plane contracts.
The BFF holds upstream bearer credentials and validates upstream observations.
Generated clients use a vendored checksummed contract closure with offline generation.
The public platform owns lifecycle, authorization and baseline meaning.
Analysis owns reported scientific verdicts; the UI never recomputes them.
Versioned Git proposals own configuration changes after human review and publication.
Run pages retain the exact references that the Run used.

One Angular browser app contains ordinary operations and a lazy Verification area.
Verification has distinct Material color tokens plus a persistent maintainer label.
Only authorized maintainers enter; server authorization protects every operation.
Campaign results link real Runs to the same Run detail used by Maya.
Synthetic analysis has no invented platform Run identity.

The non-UI runner owns frozen manifests and the independent evaluator.
Environment-owned adapters hold disposable fault authority.
Browser and BFF have no shell, Kubernetes or object-store authority.
Without a runner, Verification shows unavailable and campaign actions are disabled.
Product acceptance and verifier acceptance are independent receipts.

## Evidence and interaction requirements

Screens follow the contract inventory in docs/design/screen-review/README.md.
Use the Material review as design guidance, keeping exported fixtures outside runtime.
Live observations expire and clear on provider outage. Explicit historical receipts
remain dated. Missing fields show UNKNOWN; missing operations identify their API gap.
Execution completion, report verdict, evaluator finding and harness integrity have
distinct meanings. Keyboard, focus, dialogs, contrast and reflow need runtime checks.

## Scope boundaries

M05 establishes local operation then the named-engineer journey after the required
contracts/control-plane identity slices ship. M06 owns production deployment and hardening.
Service configuration and policy proposals use Git review after their owning slices.
Scenario expectations precede execution and never change to fit observed outcomes.
See CONSTRAINTS.md for budgets, repetitions, authority and reporting obligations.
