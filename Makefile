.PHONY: doctor bootstrap lint typecheck architecture test verify supply-chain hooks
doctor:
	@node -e "const f=require('node:fs');if(process.versions.node!==f.readFileSync('.node-version','utf8').trim())throw Error('Use Node from .node-version')"
	@test "pnpm@$$(pnpm --version)" = "$$(node -p "require('./package.json').packageManager")" || (echo 'Use pnpm from packageManager' >&2; exit 1)

bootstrap: doctor
	pnpm install --frozen-lockfile --ignore-scripts

lint:
	node_modules/.bin/eslint . --max-warnings 0

typecheck:
	node_modules/.bin/tsc --project tsconfig.json
	node_modules/.bin/tsc --project apps/web-e2e/tsconfig.json

architecture:
	node harness/boundaries.ts
	node harness/workspace.ts

test:
	sh harness/test.sh

verify: doctor lint typecheck architecture test component-test

supply-chain: doctor
	pnpm audit --audit-level high

hooks:
	git config --local core.hooksPath .githooks

.PHONY: build browser-test guide
build:
	NX_DAEMON=false node_modules/.bin/nx run-many -t build

browser-test:
	node_modules/.bin/playwright test -c apps/web-e2e/playwright.config.ts

guide:
	node tools/user-guide/generate.mjs

.PHONY: component-test
component-test:
	node_modules/.bin/ng test console --watch=false

.PHONY: stack-admission
stack-admission:
	node_modules/.bin/ng build console --browser=apps/web-e2e/admission/main.ts --ts-config=apps/web-e2e/admission/tsconfig.json --output-path=dist/admission
	node_modules/.bin/playwright test -c apps/web-e2e/admission/playwright.config.ts
