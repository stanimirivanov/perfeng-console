# 0005: Enforce readable handwritten TypeScript formatting

Status: Proposed for owner review in PR #90; enforcement qualified on the pinned stack.

## Decision

Use development-only `@stylistic/eslint-plugin` **5.9.0** inside the existing ESLint
flat config. Enforce separate lines for multi-member interfaces/type literals,
semicolon member delimiters (including the final member), two-space indentation
and no trailing spaces. Preserve compact single-member types. Only interfaces and
type literals have a one-member threshold; ordinary objects/arguments/imports do
not receive that threshold. The supported rule also normalizes inconsistent
existing list whitespace according to its defaults (including arrays and calls).
This broader whitespace normalization is part of the handwritten-TypeScript pass,
not a new object-size/wrapping policy. Existing security/import rules
remain active and inline configuration remains forbidden.

The stable 5.9.0 package exposes the list-layout rule as **exp-list-style**. It is
experimental within that stable release; this is explicit opt-in, not a prerelease
plugin admission. The exact options and automatic fixes are covered by regression
tests for compressed/mixed interfaces and type literals, positive formatting,
delimiters/indent/trailing whitespace and fix idempotence. Upgrade only with these
checks; do not assume current unversioned documentation matches the pin. In this
version node overrides use `multiline` whereas the outer option uses `multiLine`.

Formatting applies to handwritten TS/TSX/MTS/CTS throughout apps, src, tools,
harness, scripts and tests, including authored qualification fixtures. The existing
formatting override excludes generated contracts, vendor inputs and qualification
generated output; their byte/generation ownership remains authoritative. All other
applicable lint rules continue to run on those paths.

## Admission evidence and tradeoffs

Official npm manifest for 5.9.0: MIT; Node `^18.18.0 || ^20.9.0 || >=21.1.0`;
ESLint peer `^9.0.0 || ^10.0.0`. Checked with Node 26.13.0, ESLint 10.14.0,
typescript-eslint 8.72.1 and TypeScript 6.0.3. Published 2026-02-19T11:35:05.022Z,
well beyond the 1440-minute release age; no exemption or scripts were enabled.

The lock delta adds the plugin, espree 10.4.0 and eslint-visitor-keys 4.2.1;
other transitive dependencies reuse the already locked graph. Resolved espree is
BSD-2-Clause and eslint-visitor-keys is Apache-2.0 (verified package manifests). This is tooling
weight only and adds no browser/server runtime authority. The project is maintained
by ESLint Stylistic; the later release line remains active, but we chose a matured
stable pin rather than adopting the newly published major or a beta for this fix.

The replacement boundary is `eslint.config.mjs` plus `tests/harness/formatting.test.ts`.
A future stable equivalent can replace the experimental rule only if these tests
and the repository gates still pass. No custom formatting parser or duplicate
formatter is introduced. Broad mechanical diffs are an explicit cost of adopting
a consistent repository-wide rule; application behavior and test expectations are
not changed to obtain a passing lint result.

Verification and audit results are recorded in PR #90. Original compressed examples
failed the new tests before enforcement; the preferred form and convergent fixes
pass after admission.

## Official sources checked

- [Exact npm manifest](https://registry.npmjs.org/@stylistic%2feslint-plugin/5.9.0)
- [Exact published source archive](https://registry.npmjs.org/@stylistic/eslint-plugin/-/eslint-plugin-5.9.0.tgz)
- [Rule documentation](https://eslint.style/rules/list-style)
- [Member delimiter documentation](https://eslint.style/rules/member-delimiter-style)

Documentation currently describes the 6.x line in places; exact installed 5.9.0 source
and tests were used to verify export names/options instead of copying those examples.
