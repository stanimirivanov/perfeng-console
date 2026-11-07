# Pinned Effect adapter qualification

Issue: https://github.com/stanimirivanov/perfeng-console/issues/33
Qualification snapshot: 2026-11-07. Effect 4.1.2, TypeScript 6.0.3, Playwright 1.65.0.
Isolated tools fixture; not imported by production and not a replacement contract client.
No dependency, production transport or allowlist changes.

## Reproduce

From repository root, with the existing frozen install and pinned Chromium:

```sh
node_modules/.bin/tsc -p tools/qualification/effect-runtime/tsconfig.json
node --test tools/qualification/effect-runtime/qualification.test.mjs
node --test tools/qualification/effect-runtime/bff.test.mjs
node_modules/.bin/eslint tools/qualification/effect-runtime --max-warnings 0
```

The BFF command MUST currently exit nonzero. These are explicit isolated admission
probes outside the product test discovery, not skipped product regressions. Do not
change their assertions to make a blocked adapter appear qualified. The setSignal
failure refutes the proposed sketch; it does not block the demonstrated withScope
alternative. The Node adapter and TLS failures block that BFF candidate.

## Receipt

| Requirement | Evidence | Result |
|---|---|---|
| Browser pinned API types | Strict standalone tsc, no suppressions | PASS |
| Scoped request lifetime | HttpClient.withScope inside Effect.scoped | PASS in Chromium |
| Same-origin destinations | Absolute/scheme-relative/backslash escape attempts rejected | PASS |
| Redirect refusal | redirect:error; redirect target receives zero requests | PASS |
| Media and byte limit | Duplicate media values, error bodies and 8192-byte payload rejected | PASS for declared cases |
| Caller interruption | Before headers and during body; server observes close within 3 s | PASS |
| Whole-operation deadline | 250 ms stalled-body read fails; server observes close | PASS |
| Proposed Node adapter import | effect/platform-node/NodeHttpClient | FAIL: module absent |
| Proposed setSignal API | typeof HttpClientRequest.setSignal | FAIL: undefined |
| Explicit server CA through Fetch RequestInit | Self-signed approved local CA; ca option supplied; zero application requests arrive | FAIL: option does not establish trust |

Browser run: five subtests plus parent, six passed; zero skipped/cancelled/todo.
BFF run: three failed admission probes, zero passed/skipped/cancelled/todo.
Red-first browser evidence: the test failed because browser.ts did not exist, then
passed after implementation. Restricted execution could not create required process
streams; real Chromium/loopback tests ran with elevated execution permission.

## Security disposition

BFF admission is BLOCKED. The candidate cannot yet prove explicit CA/minimum TLS,
hostname rejection, raw duplicate-header preservation, server bearer containment,
credential-file policy, status mapping, Run identity/Ajv validation, request disconnect
or process shutdown cleanup. Existing production tests remain authoritative; their
prior results do not transfer to a different transport. No claim of full parity is made.

Effect Headers uses string values and joins array input with comma-space. The browser
probe uses exact application/json equality to reject tested duplicates; this is not a
claim of lossless raw header cardinality or full media-parameter parity. The BFF must
retain that guarantee through a qualified adapter, not the sketch's Array.isArray check.

Browser qualification is limited to HTTP primitives under local HTTP and Chromium.
Angular DI/DestroyRef, session/route teardown, epochs, one scheduler, CSP/HTTPS and
store integration remain their owning implementation/admission tests. stop() is a
fixture control, not proof that an Angular route actually calls teardown. These
fixtures contain synthetic data only and are not production data sources.

## Next decision

Qualify a separately pinned Node platform adapter (with dependency admission) or an
explicitly reviewed narrow platform bridge implementing Effect HttpClient. Neither is
admitted here. Prefer evaluating the maintained Node adapter first. Preserve explicit
CA and raw header access; if it cannot supply them, record the failure before considering
a bridge. Keep production transport, openapi-typescript and Ajv unchanged until full
security parity and the ownership sensors pass. Do not add setSignal to the design:
withScope supplies the tested lifetime mechanism.

## Source evidence

Exact installed upstream sources inspected:
- node_modules/effect/src/http/FetchHttpClient.ts: RequestInit and Fetch service,
  signal passed by HttpClient; unstable API designation.
- node_modules/effect/src/http/HttpClient.ts: withScope finalizer aborts request controller.
- node_modules/effect/src/http/Headers.ts: string-valued normalized headers.
- node_modules/effect/src/http/HttpClientRequest.ts: no setSignal export.

Official source: https://github.com/Effect-TS/effect/tree/effect%404.1.2/packages/effect/src
Official lifecycle docs: https://effect.website/docs/v4/resource-management/scope
Installed source and executed probes govern exact-version conclusions.

## Production migration follow-up (issue #33)

After owner approval, production src/bff/transport.ts composes src/bff/run-reader.ts
with @effect/platform-node 4.1.2. Root imports are now admitted only for those files;
the native transport legacy allowance is removed. Earlier unchanged-root statements
above describe the qualification snapshot. The isolated candidates remain historical
reproductions; current acceptance runs tests/integration/transport.test.ts through
make verify. openapi-typescript and Ajv remain in production.
