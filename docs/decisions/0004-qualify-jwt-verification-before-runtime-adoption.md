# ADR 0004 — Qualify JWT verification before runtime adoption

Status: Proposed; isolated candidate only, pending owner review.
Date: 2026-11-15. Issue: #81; M05-PR52g.

## Context

Accepted control-plane ADR 0046 fixes the issuer/client/time/nonce trust model.
The Console currently returns private unverified code candidates. A generic
JWT library's defaults are not evidence of Perfeng's stricter duplicate-name,
algorithm, audience, key-freshness or profile requirements. Root dependency
policy requires pinned, scoped admission before a package gains runtime authority.

## Proposed decision

Qualify jose 6.2.17 for signature/standard JWT validation and Microsoft's
jsonc-parser 3.3.1 for strict, bounded syntax-tree/decoded-duplicate preflight in
an isolated package. Use explicit trusted public RSA snapshots only; no remote
resolver, issuer discovery or token-selected key URL. Preserve the existing flat
OAuth-envelope decoder and production dependencies unchanged.

The [qualification contract and evidence](../../tools/qualification/identity-jwt/README.md)
records metadata, locks, source references, exact bounds, refutations and commands.
Both packages are MIT, have no declared runtime dependencies/peers/engines, exceed
the release-age floor and pass the fixture on the pinned Node/TypeScript runtime.
This does not establish interoperability on other runtimes or real Keycloak.

## Tradeoffs and adoption gate

Use maintained library crypto/claims and a real JSON syntax tree rather than
building JWT/RSA/general JSON grammars. Raw jose permits duplicate claims and
noncanonical signature aliases; the narrow wrapper supplies the stricter profile.
Two candidate dependencies and preflight logic add maintenance and repeat-upgrade
qualification cost. A full OIDC client library could reduce later protocol glue,
but its transport/custody/admission is not qualified by this slice.

Passing isolated tests is **not production admission**. Before importing either
package into BFF, review the owning API/Effect boundary, fresh fixed-origin keys,
code-pair subject/validity binding, actual provider behavior and all remaining
browser/session/policy gates. No HUMAN/CI enrollment or service grant comes from
JWT role fields. Runtime adoption requires its own scoped PR; this proposal adds
no production import or activation. Rollback removes the isolated fixture/gate.
