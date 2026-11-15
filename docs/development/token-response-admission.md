# Unverified token-response admission — M05-PR52e

## Scope and trust boundary

[Issue #77](https://github.com/stanimirivanov/perfeng-console/issues/77) adds pure,
private response decoders for the future code and delegated exchanges under
accepted [control-plane ADR 0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/decisions/0046-select-issuer-and-bff-delegation-trust.md).
The [qualified POST adapter](token-post-transport.md) establishes wire bounds;
these decoders establish envelope bounds. Neither establishes identity.

The input is untrusted credential-bearing JSON. Success carries only known
private token candidates labeled `unverified-code` or `unverified-delegated`.
Tests deliberately use compact candidates with no valid signed claims. A passing
decoder therefore cannot grant a session, caller identity or service permission.
Only trusted server operations may consume these results; never serialize them
into browser responses, diagnostics, audit, URLs or persistent receipts.

## Common envelope profile

- Reject non-text inputs without backend type diagnostics. Bound the source to 65536 UTF-8 bytes before native JSON parsing. Require a
  flat object with at most 32 fields, bounded well-formed member names and only
  finite numbers or well-formed strings up to 16384 characters as values.
  Arrays, nested objects, null and boolean extensions are outside this profile.
- Native JSON.parse owns syntax. After syntax/flat-shape validation, scan complete
  JSON string tokens followed by a colon and compare their **decoded** names.
  Duplicate keys, including escaped aliases and unknown extension duplicates,
  refuse. Quoted key-looking text inside string values is not a member name.
  This is a bounded duplicate check, not a custom general JSON grammar/parser.
- Require case-insensitive Bearer and integral expires_in in 1–300 seconds,
  including 300. Reject error/error_description/error_uri in a success envelope.
  Compact three-segment base64url token shape is a Keycloak profile requirement;
  it does not establish canonical encoding, algorithm, signature or claims.
- Optional scope uses the OAuth scope-token grammar and cannot contain
  offline_access. It is never projected as a permission or service grant.
  Optional refresh_expires_in must be a nonnegative safe integer; it does not
  confer a refresh lifetime. Unknown string/number extensions are ignored only
  after shape and duplicate checks, and are never copied to the public result.
- All refusal returns exactly `{ ok: false, reason: 'invalid_response' }`, with no
  partial token, raw parser diagnostic, body echo or retained state.

These checks draw on [RFC 6749 §5.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.1).
The flat string/number and compact-token restrictions are deliberately narrower
than a generic OAuth response. Structured/boolean/null extensions fail closed;
interoperability with the exact supported Keycloak release must be qualified
before activation. This is not a claim of complete RFC client conformance.

## Separate response phases

`decodeCodeTokens` requires access_token and id_token and refuses
issued_token_type. An optional initial refresh_token remains an unverified private
candidate for later custody/lifecycle admission. No refresh operation, scheduling,
expiry or impersonation capability is created. Missing optional expiry metadata
cannot make a refresh credential trusted.

`decodeDelegatedTokens` requires exactly the access-token issued_token_type from
[RFC 8693 §2.2.1](https://www.rfc-editor.org/rfc/rfc8693.html#section-2.2.1).
It refuses every ID/refresh-token field, including empty values. If present,
refresh_expires_in must be zero. It returns no refresh/ID token or issued-type
field. This enforces envelope-phase separation; a signed ID token put into the
access_token slot is a later cryptographic type/claim-verification obligation.

## Lifetime and authority remain unverified

The five-minute envelope limit matches the conservative pilot access-token
profile. It is metadata, not a renewed lease beginning when parsing finishes.
The later operation must bind observation/dispatch time and verified JWT iat/exp,
using the earlier applicable validity bound. Never extend signed lifetime from
expires_in, refresh_expires_in, current registry state or receipt time.

Remaining gates include signature/algorithm and fresh trusted-key verification,
exact issuer/audience/client/token type, nonempty stable subject, ID-token nonce,
clock/skew/age, independent HUMAN/CI and caller policy, current service grants,
request cancellation and late-result refusal. No claim is inferred by decoding
JWT payloads here. Real code/delegated exchange, refresh/session lifecycle,
Keycloak/BFF/browser/shared-pilot receipts and named serving remain pending.

## Verification, choices and rollback

Five node:test groups cover both envelopes, duplicate/escaped keys, safe refusal,
syntax/shape/size/member limits, Unicode well-formedness, escaped string values,
known-field projection, duration equality/types and phase/offline-access confusion.
No new dependency, Effect runtime, network/filesystem permission or generated
schema change is needed for synchronous pure validation. Existing alias/compiler/
ownership gates register this private BFF adapter; Ajv remains unchanged.

Source/field/token-size caps, flat extensions and the initial five-minute envelope
profile are conservative admission choices, not measured provider capacities.
No initial refresh lifetime or refresh implementation is selected here. Rollback
removes the decoders, public alias and tests without altering transport, local
pairing, cookies, provider state, routes or persistence.
