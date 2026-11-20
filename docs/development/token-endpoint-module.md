# Shared token-endpoint layout — issue #157

## Decision and observed dependencies

T9 moves only the token POST and envelope/response admission modules into
`src/bff/login/token-endpoint/`. Both `code-exchange.ts` and
`delegated-exchange.ts` consume the same POST/response modules. Putting these files
under either flow would misstate that shared ownership. The namespace remains
inside login; the lower-level byte reader stays neutral under BFF transport.

The previous adapter-role graph also permitted these shared modules to import
flow-specific protocol adapters or verification context ports. No such wrong
production import was found. The concrete change is a new enforced dependency
contract: OWN-14 rejects those edges, including type imports, before the mechanical
move. Moving files alone would not supply that protection.

```text
src/bff/
  login/
    code-exchange.ts          -> token-endpoint
    delegated-exchange.ts     -> token-endpoint
    login-contracts.ts        # neutral feature types
    token-endpoint/
      token-post.ts           -> login-contracts, transport/bounded-body
      token-response.ts       -> token-envelope, login-contracts
      token-envelope.ts       # no internal dependencies
    identity/                 # shared key types remain neutral here
  transport/bounded-body.ts
```

OWN-14 names the three exact source modules and their reviewed internal targets.
It grants no directory-wide role or package/native authority. Existing per-file
external permissions still apply; the POST's read-only maxHeaderSize admission
transfers to its exact new location, and the old location loses that admission.
There is no new barrel, compatibility wrapper, runtime or HTTP interface.

## Stable interfaces and mechanical verification

The public aliases `#perfeng/bff-token-post`, `#perfeng/bff-token-envelope` and
`#perfeng/bff-token-response` retain their names and exports. Node, compiler,
harness and documentation maps change targets atomically. Within-owner callers
and the moved files adjust only relative module specifiers. Whole-file comparisons
against the pre-move sources permit exactly those specifier rewrites and require
all other bytes to remain equal. Transport/profile/lifecycle behavior is unchanged.

Tests stay at the existing ownership/import scanners and adapter/decoder aliases.
The flow-dependency regression is RED before OWN-14 and GREEN afterward; the
retired-location native-admission fixture is RED before moving the exact permission
and GREEN afterward. Existing TLS/decoder, snapshot and lifecycle suites remain
behavioral verification; no assertion requires a particular function implementation.

## Qualification, release and rollback

Provider qualification recursively guards/hashes `src/bff/login`; the new subtree
is already inside that closure. Source paths contribute to its v2 framed digest,
so the move changes provenance without changing the framing algorithm. Existing
qualification bridges and aliases reach the same public interfaces. Historical
receipts are not reinterpreted as proof of the new source layout.

These modules remain unmounted and outside the shipped listener source inventory.
Run import/architecture/type checks, focused decoder/TLS tests, identity and
signing-key qualification, make verify, supply-chain and installed-release isolation.
Do not add dormant login modules to the product merely to satisfy a move.

The separate dependency-rule commit and mechanical-move commit keep review and
rollback distinct. Revert the move with all exact maps/admissions/callers; the
rule can then be reverted separately if needed. Auth-code, delegation, custody and
identity-wide reshuffles remain deferred: their shared types and qualification
entries need a separately justified change, not an automatic continuation of this
three-file move. No provider, route, session or contract change is included.
