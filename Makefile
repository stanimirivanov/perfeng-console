.PHONY: doctor bootstrap lint typecheck architecture test verify supply-chain hooks
doctor:
	@node -e "const f=require('node:fs');if(process.versions.node!==f.readFileSync('.node-version','utf8').trim())throw Error('Use Node from .node-version')"
	@test "pnpm@$$(pnpm --version)" = "$$(node -p "require('./package.json').packageManager")" || (echo 'Use pnpm from packageManager' >&2; exit 1)

bootstrap: doctor
	pnpm install --frozen-lockfile --ignore-scripts

lint: check-imports
	NX_DAEMON=false node_modules/.bin/nx graph --file=dist/import-project-graph.json
	NX_DAEMON=false node_modules/.bin/eslint . --max-warnings 0

typecheck:
	node_modules/.bin/tsc --project tsconfig.json
	node_modules/.bin/tsc --project apps/web-e2e/tsconfig.json

architecture:
	node harness/boundaries.ts
	node harness/workspace.ts
	node harness/ownership.ts
	node harness/assets.ts

test:
	sh harness/test.sh

verify: doctor contracts-check lint typecheck architecture test component-test build

supply-chain: doctor
	pnpm audit --audit-level high

hooks:
	git config --local core.hooksPath .githooks

.PHONY: build browser-test guide
build:
	NX_DAEMON=false node_modules/.bin/nx run console:build --output-style=stream
	node harness/assets.ts --distribution

browser-test:
	node_modules/.bin/playwright test -c apps/web-e2e/playwright.config.ts

guide:
	node tools/user-guide/generate.mjs

.PHONY: component-test
component-test:
	rm -f dist/angular-tests.json
	node_modules/.bin/ng test console --watch=false
	node scripts/angular-accounting.ts

.PHONY: stack-admission
stack-admission:
	node_modules/.bin/ng build console --browser=apps/web-e2e/admission/main.ts --ts-config=apps/web-e2e/admission/tsconfig.json --output-path=dist/admission
	node_modules/.bin/playwright test -c apps/web-e2e/admission/playwright.config.ts

.PHONY: harness-self-test
harness-self-test:
	node scripts/harness-self-test.mjs


.PHONY: contracts-check contracts-generate
contracts-check:
	sh scripts/contracts-offline.sh --permission --allow-fs-read=. --allow-fs-read="$$(realpath node_modules)" --allow-child-process scripts/contracts-generate.mjs

contracts-generate:
	sh scripts/contracts-offline.sh --permission --allow-fs-read=. --allow-fs-read="$$(realpath node_modules)" --allow-fs-write=src/generated --allow-child-process scripts/contracts-generate.mjs --write

.PHONY: console-release console-isolation-check
console-release: build
	node scripts/package-console.ts

console-isolation-check: doctor
	node scripts/check-console-isolation.ts

.PHONY: check-imports
check-imports:
	node harness/check-imports.ts

.PHONY: contracts-shadow
contracts-shadow:
	@$(MAKE) --no-print-directory contracts-check >/dev/null
	@sh scripts/contracts-offline.sh scripts/contracts.ts "$(CONTRACTS_SHADOW_ASSETS)" "$(CONTRACTS_BOOTSTRAP)" "$(CONTRACTS_VERIFIER)" "$(CONTRACTS_CONTROL_PLANE_RECEIPT)"
