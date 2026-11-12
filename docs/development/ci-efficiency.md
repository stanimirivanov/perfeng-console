# H10 CI efficiency and release-age disposition

Issue [#67](https://github.com/stanimirivanov/perfeng-console/issues/67), measured
2026-11-12. This change removes duplicate scheduling and caches dependency data;
it does not cache a passing verification verdict or reduce the staged quality bar.

## Hosted baseline

Completed [quality run 43229878273](https://github.com/stanimirivanov/perfeng-console/actions/runs/43229878273)
at main f96031188527fece3c809a799ac828f40fc3de37 reported these step durations:

| Job / step | Seconds | Disposition |
|---|---:|---|
| verify: standalone import preflight | 3 | Removed: verify shares one early check-imports prerequisite with lint |
| verify: bootstrap | 12 | Store caching enabled; frozen install still runs |
| browser: bootstrap | 15 | Same shared bootstrap policy |
| supply-chain: bootstrap | 12 | Same shared bootstrap policy |
| verify: make verify | 81 | Retained in full |
| browser: make build | 5 | Retained: its independent job needs actual browser output |
| browser: console-isolation-check | 8 | Retained: product-only rebuild/install is its acceptance condition |
| browser: stack-admission | 5 | Retained independent fixture |
| browser: harness-self-test | 190 | Retained aggregate-positive and injected-negative wiring proof |

The operator-guide workflow already selects tagged journeys and proves its own
source/build provenance; it is not replaced by a cached browser result. Job names,
PR/main triggers, independent audit and the existing read-only permissions remain.
No hosted after-change timings or cache hits have been claimed; observe the reviewed
workflow before asserting a critical-path improvement. The removed step costs 3 s
in this baseline; retained fault probes remain the dominant measured browser cost.

## Cache boundary

The existing [pnpm/action-setup v6 action](https://github.com/pnpm/action-setup/blob/v6/action.yml)
caches the directory returned by pnpm store path. Its
[implementation](https://github.com/pnpm/action-setup/blob/v6/src/cache-restore/run.ts)
keys by runner OS, architecture and the selected pnpm-lock.yaml hash, with an
older-store prefix fallback. It does not select node_modules, build outputs, test results or credential
directories as cache inputs; it never caches a verification verdict. setup-node's separate automatic
package cache remains disabled; no second competing cache is enabled.

Every job still runs make bootstrap (frozen lock, disabled scripts), even after an
exact cache hit. Store integrity and lockfile supply-chain checks remain enabled.
A store is reusable dependency data, not an authorization boundary or an attestation:
[verifyStoreIntegrity](https://github.com/pnpm/pnpm/blob/v12.16.1/pnpm/docs/settings/store.md#verifystoreintegrity)
can detect corruption but cannot secure metadata and contents both controlled by
an attacker. Preserve GitHub cache access restrictions and the existing event/
permission boundaries; do not place secrets in this shared store.

## Release-age exceptions

Removed all three exclusions, which had no recorded expiry and are now unnecessary. No historical
authorization, reason or expiry is invented. Official npm time metadata checked on
2026-11-12 gives:

| Pin | Published (UTC) | Disposition |
|---|---|---|
| [@playwright/test 1.65.0](https://registry.npmjs.org/@playwright%2ftest) | 2026-11-05 18:30:18.050 | Mature beyond 1440 minutes; exclusion removed |
| [playwright 1.65.0](https://registry.npmjs.org/playwright) | 2026-11-05 18:28:14.786 | Mature; exclusion removed |
| [playwright-core 1.65.0](https://registry.npmjs.org/playwright-core) | 2026-11-05 20:17:40.688 | Mature; exclusion removed |

[pnpm 12.16.1 policy](https://github.com/pnpm/pnpm/blob/v12.16.1/pnpm/docs/settings/dependency-resolution.md#minimumreleaseage)
has a built-in 1440-minute window whose implicit form is non-strict. The workspace
now explicitly sets that same window and strict enforcement, refuses missing time
metadata, retains trustLockfile: false and verifyStoreIntegrity: true. This makes
the intended age protection explicit, rather than silently relying on a fallback.
Direct versions and the frozen lock remain unchanged. Future exceptions still need
named versions, reasons, expiry and human review; the current regression guard
requires no active exclusions, so a new exception also requires reviewed guard changes.

## Local qualification and staged verification

Two new temporary checkouts used identical root package/lock/workspace files and
separate node_modules, sharing only one temporary store. The first store was empty.
Both ran pnpm install --frozen-lockfile --ignore-scripts with the final policy and
pnpm 12.16.1. Results: cold 9.041 s; warm 0.139 s; both exit 0 and lock unchanged.
The lock SHA-256 was 73c02e224b0678199954cebe21cc80b2ea97c4d8f9b91531076ce2a1edd13dd3.
Actual make bootstrap passed too. A third clean temporary checkout using the
already populated local store raised only its temporary age floor to 10,000,000
minutes: frozen installation exited 1 with an age-policy rejection. This negative
qualification proves cached package availability did not override the stricter
policy; the repository floor stayed 1440 and its lock remained unchanged. These single-machine samples include warm local
filesystem/registry metadata effects; they do not predict hosted cache restore time.

Guide verification used a clean checkout-index copy of the staged tracked files,
matching CI. The developer checkout has pre-existing installed qualification
node_modules links under tools, which its strict source digest refuses; those
files were left untouched and no source-integrity exception was added. Two tagged
guide journeys passed from the clean snapshot. All 24 product Chromium journeys,
independent installation and the pinned stack fixture passed separately.

The .githooks/pre-commit implementation is unchanged: checkout-index to a temporary
tree, link installed dependencies, then full make verify. No changed-files-only,
fast, cache-hit or unstaged-working-tree alternative is introduced. A disposable
Git-index regression executes the actual hook: staged bad/unstaged good fails;
staged good/unstaged bad passes every fixture verification stage without changing
the working tree. Real make verify and harness fault probes remain separate gates.

Rollback the workflow/cache settings, policy guards and guidance together. Cache
misses fall back to normal downloads; disabling cache needs no cache-data migration.
Do not restore the removed age exclusions merely to keep an immature install green.
