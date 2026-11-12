# Console server and tooling

`serve-console.ts` composes CLI settings, certificate reads, the qualified BFF
transport and incoming listener. `console-server.ts` owns loopback HTTPS, static
serving, pairing/session boundaries and request-disconnect cancellation.
`preview.mjs` is a local browser-test/development listener with no pairing or
upstream authority; never make it a production entry. `public-api.ts` exports only
startConsole from its owning server.

Follow [runtime ownership](../docs/development/runtime-ownership.md) and the
[H7 receipt](../docs/development/harness-rules.md#h7-tools-ownership-receipt).
Register new executable helpers explicitly; nested/generated/spec-like names do
not bypass the tools scan. Symlinked files and roots are forbidden. Only the exact
preview.mjs JavaScript entry is admitted; parsing it is not JavaScript typechecking.
The explicit tools/tsconfig.json compiler gate still covers production TypeScript.

harness/tools-ownership.ts owns exact module/member imports and native globals.
Use reviewed named imports; listener createServer admission never permits native
upstream request/get or namespace/lazy module imports. The existing incoming
listener's setTimeout method is a connection deadline, not global timer admission.
Do not import Effect execution into an incoming adapter; upstream transport remains
behind the qualified BFF entry. New permissions require negative fixtures and review,
not broad adapter/module allowlists or hash exceptions.

Run make verify and the affected browser/console-isolation-check gates; tools source
and package closure are independent checks. Preserve TLS, fixed-origin upstream,
private bearer, local CSRF, cookie, CSP and empty-environment installation behavior.

Qualification and user-guide are separate owners with their existing import and
qualification/guide gates. They are explicitly outside this incoming-tools role
scan; that exclusion grants no permission to import them into product tools.
