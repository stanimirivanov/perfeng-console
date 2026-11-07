# ADR 0003 — Qualify Effect contract consumers within separate authority boundaries

Status: Proposed. Implements approved migration slice C5a, pending human review.
Date: 2026-11-07.

## Context

The approved migration proposes Effect-generated Schema and client modules while
preserving public contracts, reviewed snapshot bytes and the independent evaluator.
ADR 0002 currently requires Ajv and the existing generated OpenAPI types.
Contracts authoring uses Effect 3; the Console uses Effect 4. Runtime schema objects
cannot cross that version boundary without qualification.

## Decision

Permit only the exact effect/Schema package entry inside src/generated/schemas.
This is a browser-safe namespace for future qualified schema modules. Existing API
types and validators remain authoritative. A generated schema cannot import a BFF
client, directly, through a barrel, or as a type. It cannot create URL resources or
own stylesheets. The current Angular app's narrower source boundary also remains
enforced until an actual consumer is reviewed.

Server-generated clients belong under src/bff/generated, whose external imports
require their own explicit admission. They cannot be reached from browser,
presentation or generated-schema layers. Tree shaking cannot substitute for that
source boundary. Browser bundles never contain provider bearer credentials or Node
platform adapters.

ADR 0002's sentence forbidding replacement of Ajv/OpenAPI clients is superseded
only for a surface with passing C5b/C5c and final-pin C7 receipts. Until then the
existing implementation stays selected. Neither this ADR nor candidate package
availability authorizes replacement. The first candidate generation failed, as
recorded separately in C5b; no candidate runtime module is installed by C5a.

The public platform remains authoritative. A generated HttpApi is an isolated
qualification fixture. Adopting a deployed Effect HTTP server needs a separate ADR.
M05-PR4's secure fixed-origin transport can proceed using current types/validators.

## Qualification contract

- Receipts bind inputs, tools, adapter/config and exact output inventory.
- Source keyword coverage includes conditionals, tuples, uniqueness, refs, formats,
  constraints and unknown-property handling. Compare acceptance, decoded value,
  mutation and re-encoded JSON separately. Missing fidelity blocks retirement.
- Client checks use M05-PR4's actual transport plus recording fixtures and raw
  HttpApi requests. Assert status, headers, dispatch count, cancellation and error
  behavior. No mutation retry may be inferred from Effect interruption.
- C7 reruns the entire affected-family suite against the final adopted hashes.
  Old qualification cannot approve a newly bundled or renamed module.
- Generated inventories reject orphans and remove only owned files on regeneration.
- Matched workloads compare one schema, several schemas and server clients. The
  existing zero-import product build is a separate observation.

## Alternatives

Admitting Effect imports throughout generated code would allow server client
authority into browser-reachable modules. Keeping Ajv forever would avoid this
migration but would forgo independently qualified alternatives. The selected
approach permits measured replacement per surface and preserves working consumers
when candidate qualification fails.

## Sources and consequences

The boundary adds no provider operation, package or browser behavior. It prepares
an explicit source namespace; a passing source graph is one admission criterion.
Component/API fidelity and performance still need C5b/C5c evidence.

- [Accepted stack](0002-ui-technology-stack.md).
- [Baseline contract and receipts](../development/qualification/c5a/README.md).
- https://effect.website/docs/v4/api/effect/Schema
- https://github.com/Effect-TS/effect/tree/main/packages/tools/openapi-generator
