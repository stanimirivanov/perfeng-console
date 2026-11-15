# JavaScript module readability and documentation

Issue #91 extends the existing formatting harness to authored JS/JSX/MJS/CJS.
The applicable pinned Stylistic rules enforce list-layout consistency, two-space
indentation, no trailing spaces, separation after import groups and before named
function/export statements. Imports within one group need no blank line. A JSDoc
block remains attached to its declaration. TypeScript-only member rules remain in
the TypeScript override. Generated contracts, vendored inputs and generated
qualification clients remain outside these formatting/documentation overrides;
all other applicable security/import checks continue to apply.

JSDoc is required for exported function declarations/default functions and named
module-level function declarations or variables initialized to functions/arrows.
It is not required for every callback, nested helper or object method. This selector
scope does not claim to recognize every CommonJS module.exports assignment as a
public API. Existing code is ESM; a new export shape needs matching review/tests.

At a selected boundary, explain purpose, parameter names/types/descriptions,
optional defaults and returned-value type/description. Value-less functions do not
need a fabricated return. Validate tag spelling, type syntax and parameter names.
Write comments manually: empty autofix skeletons or generic descriptions are not
completion. Throws tags are a human review duty, especially for filesystem link,
ownership, unsupported-entry and cleanup failures; the sensor does not infer all
possible exceptions or judge prose truthfulness. No coverage quota or comment-count
regex is introduced.

`tools/user-guide/source.mjs` documents exactly the current digest behavior and its
known unframed serialization limitation. Issue #88 owns the algorithm/version
change; this formatting work does not fix it or reinterpret old receipts. Safe
output deletion checks likewise retain their behavior and explain link refusal.

Run `pnpm exec eslint . --fix` to apply layout, then fill accurate documentation
and run `make verify`. `tests/harness/javascript-style.test.ts` proves missing and
incomplete docs fail, preferred docs pass, nested callbacks remain outside the
requirement, exported declarations remain visually separated and fixes converge.
Existing noInlineConfig and security checks remain enabled.

## Dependency admission

Development-only eslint-plugin-jsdoc **65.4.5**, BSD-3-Clause, published
2026-11-06T18:47:11.404Z. Official engines: Node `^22.22.2 || >=24.15.0`;
ESLint peer accepts versions 7–10, and TypeScript peer is `*`. Qualified against
Node 26.13.0, ESLint 10.14.0 and TypeScript 6.0.3. Chosen over newer nearby releases
for a matured stable pin; strict 1440-minute age protections and missing-time refusal
remain, installs use frozen locks/scripts disabled, and no exception was added.

The lock delta adds twenty-one development graph nodes including the plugin,
comment/type parsers, import/export parsers and license-expression utilities. This
is material tooling weight and adds no browser/server runtime authority. The generated lockfile records the resolved graph; audit and
full harness results belong in the PR. The replacement boundary is the ESLint
JavaScript override and its positive/negative fixtures. No shared recommended
config was enabled implicitly: only the reviewed rules are active.

Official references checked: [exact npm manifest](https://registry.npmjs.org/eslint-plugin-jsdoc/65.4.5),
[project/rule documentation](https://github.com/gajus/eslint-plugin-jsdoc),
[require-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-jsdoc.md),
[padding rule](https://eslint.style/rules/padding-line-between-statements).
Exact installed 65.4.5 source/schema, rather than current defaults, qualified the
contexts/options. Audit passing does not prove prose semantics; review remains required.
