# ID/initial-access JWT qualification — PR52g

Issue: https://github.com/stanimirivanov/perfeng-console/issues/81
Qualification date: 2026-11-15. Base production main: 52d3df1.

**Isolated qualification PASS; production admission NOT_ADMITTED.** Root dependencies,
contracts/Ajv, login operation, session and route behavior are unchanged. This fixture
qualifies a candidate wrapper, not raw library defaults or a real identity deployment.

## Pins, sources and supply chain

- jose 6.2.17, MIT, published 2026-11-09T18:41:21.700Z. Official
  [JWT verification](https://github.com/panva/jose/blob/v6.2.17/docs/jwt/verify/functions/jwtVerify.md)
  and [source](https://github.com/panva/jose/tree/v6.2.17).
- jsonc-parser 3.3.1, MIT, published 2024-06-24T21:12:45.445Z. Microsoft's
  [parser API](https://github.com/microsoft/node-jsonc-parser/tree/v3.3.1) retains
  property nodes/decoded names so duplicate detection does not depend on JSON.parse.
- Official npm manifests declare no engines, runtime dependencies or peer dependencies
  for either selected version. This is not an assertion of all-runtime compatibility;
  imports, WebCrypto and types are exercised on pinned Node 26.13.0 / TS 6.0.3.
  admission.json records exact metadata, including development/build scripts.
- The isolated manifest and integrity-locked graph contain only these two runtime
  packages. pnpm's pinned tool distribution has its own generated lock document.
  Installs disable scripts, enforce the existing 1440-minute release age (both pins
  exceed it), refuse missing release times and verify store integrity. No exemptions.
  Candidate audit reports no known vulnerabilities. Root audit remains separate.

## Exact candidate contract

The only key source is an explicit **trusted public JWK snapshot** supplied by the
fixture. There is no remote JWK resolver, discovery, token-selected fetch, introspection,
cache, background scheduler or authority from token roles. The snapshot is cloned
before asynchronous work. Both config and token contain only synthetic fixture data.

1. Bound compact JWS to 16384 characters; require canonical unpadded base64url in
   all three segments and strict UTF-8 in JSON. Header is exactly alg/typ/kid;
   require RS256/JWT and a bounded key ID. Unknown/critical/remote-key headers refuse.
2. Parse JSON into a syntax tree with comments/trailing commas/empty content disabled.
   Reject decoded-name duplicates at **every depth**, malformed strings, more than
   64 members per object, 512 nodes or depth 16. Native JSON parsing and jose still
   perform their own JSON parsing; no custom JSON grammar or RSA primitive is built.
3. Require one matching public RSA signing key, exponent 65537 and 2048–8192-bit
   canonical modulus, no private/secret parameters and verification-only key_ops
   if supplied. Duplicate key IDs and invalid trusted key material refuse. Missing
   kid is invalid_token; stale/future/invalid snapshot dates are unavailable.
4. Require exact configured canonical HTTPS realm issuer. ID tokens have scalar
   audience perfeng-console-login, typ ID and exact expected nonce; initial access
   tokens have scalar audience perfeng-console-delegate and typ Bearer. Both require
   azp perfeng-console-login, nonempty subject of at most 256 UTF-16 units without
   ASCII space/control characters, and integral iat/exp/optional nbf.
5. jose verifies the actual RS256 signature, required issuer/subject/audience/iat/exp,
   algorithm, token age and not-before/expiry with maximum 30-second tolerance.
   Wrapper limits positive exp-iat to 300 seconds and key freshness to 300000 ms.
   Exact snapshot freshness equality passes; expiry at exp+30 is refused (strict
   expiry), and future iat/nbf beyond 30 seconds refuse. Bounds are never increased.
6. Return only issuer/subject/profile after success; never return claims, roles,
   tokens, backend errors or an enrolled HUMAN/CI label on failure or success.

Header/body preflight happens before signature verification but confers no trust.
The only successful projection follows library signature/claim verification. Outcomes
are generic invalid_token or unavailable with no partial subject. This is a per-token
proof: code-pair subject equality and binding to the live callback/operation are **not**
qualified by two independent successes.

## Refutations and remaining admission gates

Raw jose accepts duplicate member names; a regression demonstrates that default and
requires wrapper refusal. A second RED demonstrated a noncanonical signature encoding
alias could verify; explicit canonical checks now refuse it. These are stricter Perfeng
profile requirements, not claims that the library violates its own RFC behavior.

Eight tests use independently Node-signed RSA fixtures, wrong keys and attacker inputs.
They cover both token profiles, nested/escaped duplicates and malformed syntax, algorithm/
issuer/audience/client/type/nonce substitution, lifetime/age/skew/freshness, unsafe keys,
canonical encodings and defensive snapshot/config ownership. They perform no network I/O
and generate keys only in test memory. No real Keycloak receipt is claimed.

Before production adoption: review the wrapper/API/runtime ownership and dependency ADR;
qualify fixed-origin key fetching, a bounded shared fresh-key cache and actual rotation/
outage; bind ID/access subjects and conservative validity to the consumed code flow;
validate current enrollment/caller/service policy at its owning provider; preserve
server credential custody, session fixation/CSRF/logout, cancellation/late-result fencing;
obtain actual Keycloak/BFF/browser and shared-pilot receipts. No session is granted here.
The isolated async verifier is not permission to add an unscoped Promise runtime to BFF.

## Reproduction and rollback

Initial bootstrap (network required only for uncached packages):

```sh
pnpm --dir tools/qualification/identity-jwt install --ignore-workspace --frozen-lockfile --ignore-scripts
make identity-jwt-qualification
pnpm --dir tools/qualification/identity-jwt audit --audit-level high
```

The make target repeats frozen script-disabled **offline** installation, strict fixture
compilation and all tests. A goal-specific CI workflow runs these gates and the candidate
audit. Root make verify/supply-chain continue independently. No generic JSON parser or
JWT verification package becomes a production dependency by passing this target.

Rollback removes this isolated fixture, explicit target and qualification workflow.
Production behavior/lockfiles, identity provider, credentials and persisted state stay intact.

The boundary/maintenance decision is recorded in
[proposed ADR 0004](../../../docs/decisions/0004-qualify-jwt-verification-before-runtime-adoption.md).
