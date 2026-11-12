import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkOwnership, roles as productionRoles, type Role } from '#perfeng/harness/ownership';

function inspect(files: Record<string, string>, roles: Readonly<Record<string, Role>> = productionRoles) {
  const root = mkdtempSync(join(tmpdir(), 'ownership-'));
  try {
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    }
    return checkOwnership(root, roles).join('\n');
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const file = 'apps/console/src/view.ts';
test('unregistered production modules and alternate executable extensions fail closed', () => {
  assert.match(inspect({ [file]: 'export {};' }, {}), /OWN-01/);
  assert.match(inspect({ 'apps/console/src/hidden.mts': 'fetch("/")' }, {}), /OWN-01/);
});
for (const code of [
  'fetch("/")', 'globalThis.fetch("/")', 'window["fetch"]("/")',
  'const send = fetch; send("/")', 'const { fetch: send } = globalThis; send("/")',
  'new AbortController()', 'AbortSignal.timeout(10)', 'setInterval(() => {}, 1000)',
]) test('component rejects ambient authority: ' + code, () => {
  assert.match(inspect({ [file]: code }, { [file]: 'component' }), /OWN-03/);
});
for (const code of [
  "import { Effect as E } from 'effect'; E.runFork(job);",
  "import { runPromise as execute } from 'effect/Effect'; execute(job);",
  "import * as Runtime from 'effect/ManagedRuntime'; Runtime.make(layer);",
]) test('operation rejects hidden runtime entry: ' + code, () => {
  assert.match(inspect({ [file]: code }, { [file]: 'operation' }), /OWN-02/);
});
test('role edges reject barrels and type/lazy imports of adapters', () => {
  for (const code of ["export * from './adapter.ts';", "type A = import('./adapter.ts').A;", "import('./adapter.ts')"]) {
    assert.match(inspect({ [file]: code, 'apps/console/src/adapter.ts': 'export {};' },
      { [file]: 'store', 'apps/console/src/adapter.ts': 'adapter' }), /OWN-01/);
  }
});
test('compiler path aliases resolve to the actual owner', () => {
  assert.match(inspect({ 'tsconfig.json': '{"compilerOptions":{"baseUrl":".","paths":{"@io":["apps/console/src/adapter.ts"]}}}',
    [file]: "import '@io';", 'apps/console/src/adapter.ts': 'export {};'},
    { [file]: 'component', 'apps/console/src/adapter.ts': 'adapter' }), /OWN-01/);
});
test('permitted component to store and adapter I/O; runtime only in composition', () => {
  assert.equal(inspect({ [file]: "import './store.ts';", 'apps/console/src/store.ts': 'export {};',
    'apps/console/src/io.ts': 'fetch("/")', 'apps/console/src/root.ts': "import { Effect } from 'effect'; Effect.runFork(job);" },
    { [file]: 'component', 'apps/console/src/store.ts': 'store', 'apps/console/src/io.ts': 'adapter',
      'apps/console/src/root.ts': 'composition' }), '');
});
test('native HTTP is refused outside an admitted adapter', () => {
  assert.match(inspect({ 'src/bff/new.ts': "import { request } from 'node:https';" }, { 'src/bff/new.ts': 'operation' }), /OWN-03/);
});
for (const code of [
  "import { ManagedRuntime as M } from 'effect'; M.make(layer)",
  "import { Effect as E } from 'effect'; E[method](job)",
  'const g = globalThis; g[method]("/")',
]) test('computed or aliased authority is refused: ' + code, () => {
  assert.match(inspect({ [file]: code }, { [file]: 'operation' }), /OWN-02|OWN-03/);
});
test('an adapter role alone does not grant native HTTP dispatch', () => {
  assert.match(inspect({ 'src/bff/config.ts': "import 'node:https'" }, { 'src/bff/config.ts': 'adapter' }), /OWN-03/);
});
test('presentation rejects runtime dependencies', () => {
  assert.match(inspect({ 'src/presentation/view.ts': "import { Effect } from 'effect';" }, { 'src/presentation/view.ts': 'presentation' }), /OWN-04/);
});
test('legacy allowance cannot admit edited source', () => {
  const root = mkdtempSync(join(tmpdir(), 'legacy-ownership-'));
  try {
    mkdirSync(join(root, 'apps/console/src/verification'), { recursive: true });
    writeFileSync(join(root, 'apps/console/src/verification/access.ts'), 'export const changed = true;');
    assert.match(checkOwnership(root).join('\n'), /legacy source changed/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('namespace-import runtime authority cannot hide behind computed access', () => {
  assert.match(inspect({ [file]: "import * as R from 'effect/Effect'; R[method](job)" }, { [file]: 'operation' }), /OWN-02|OWN-03/);
});

test('production transport has no native-dispatch legacy allowance', () => {
  const root = mkdtempSync(join(tmpdir(), 'transport-retired-'));
  try {
    mkdirSync(join(root, 'src/bff'), { recursive: true });
    writeFileSync(join(root, 'src/bff/transport.ts'), "import { request } from 'node:https';");
    assert.match(checkOwnership(root).join('\n'), /Native dispatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('composition may accept an AbortSignal type without constructing native abort machinery', () => {
  assert.equal(inspect({ [file]: 'export function run(signal?: AbortSignal) { return signal?.aborted; }' }, { [file]: 'composition' }), '');
  assert.match(inspect({ [file]: 'new AbortController()' }, { [file]: 'composition' }), /OWN-03/);
});

test('shared contracts are scanned for unregistered code and ambient authority', () => {
  assert.match(inspect({ 'src/shared/contracts/hidden.ts': 'export {};' }, {}), /OWN-01/);
  const root = mkdtempSync(join(tmpdir(), 'dto-ownership-'));
  try {
    mkdirSync(join(root, 'src/shared/contracts'), { recursive: true });
    for (const source of ['fetch("/")', "import { Effect } from 'effect';"]) {
      writeFileSync(join(root, 'src/shared/contracts/observation.ts'), source);
      assert.match(checkOwnership(root).join('\n'), /OWN-03|OWN-04/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('contracts contain only type declarations and admit no runtime consumers', () => {
  const dto = 'src/shared/contracts/observation.ts';
  for (const source of ['export const marker = 1;', 'export function work() {}', 'export class Runtime {}']) {
    assert.match(inspect({ [dto]: source }, { [dto]: 'contract' }), /OWN-04/);
  }
  assert.equal(inspect({ [dto]: 'export interface Value { id: string }\nexport type Id = string;' }, { [dto]: 'contract' }), '');
  assert.match(inspect({ [dto]: 'export interface Value {}', [file]: "import '../../../src/shared/contracts/observation.ts';" },
    { [dto]: 'contract', [file]: 'component' }), /OWN-04/);
});

test('the BFF public entry re-exports composition without becoming a runtime owner', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-entry-'));
  try {
    mkdirSync(join(root, 'src/bff'), { recursive: true });
    writeFileSync(join(root, 'src/bff/transport.ts'), 'export function createRunTransport() {}');
    const entry = join(root, 'src/bff/public-api.ts');
    writeFileSync(entry, "export { createRunTransport } from './transport.ts';");
    assert.deepEqual(checkOwnership(root), []);
    writeFileSync(entry, "export const runtime = 1;");
    assert.match(checkOwnership(root).join('\n'), /OWN-01/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('qualification config entry contains only named re-exports of its config owner', () => {
  const root = mkdtempSync(join(tmpdir(), 'config-entry-'));
  try {
    mkdirSync(join(root, 'src/bff'), { recursive: true });
    writeFileSync(join(root, 'src/bff/config.ts'), 'export const loadUpstreamConfig = () => ({});');
    const entry = join(root, 'src/bff/config-public-api.ts');
    writeFileSync(entry, "export { loadUpstreamConfig } from './config.ts';");
    assert.deepEqual(checkOwnership(root), []);
    writeFileSync(entry, 'setTimeout(() => {}, 1);');
    assert.match(checkOwnership(root).join('\n'), /OWN-01/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const schedulingCases = [
  ...['queueMicrotask', 'setImmediate', 'requestAnimationFrame', 'requestIdleCallback'].flatMap(name => [
    `${name}(() => {});`, `globalThis.${name}(() => {});`, `window['${name}'](() => {});`,
    `const schedule = ${name}; schedule(() => {});`,
    `const { ${name}: schedule } = globalThis; schedule(() => {});`,
    `const { ['${name}']: schedule } = globalThis; schedule(() => {});`,
  ]),
  'scheduler.postTask(() => {});', 'globalThis.scheduler.postTask(() => {});',
  "const s = scheduler; s['postTask'](() => {});",
  'const { postTask: schedule } = scheduler; schedule(() => {});',
  "import { setImmediate as schedule } from 'node:timers'; schedule(() => {});",
  "import * as timers from 'node:timers'; timers['setImmediate'](() => {});",
];
for (const role of ['component', 'store', 'operation', 'composition'] as const) {
  test(role + ' cannot own native microtask, immediate, rendering or task scheduling', () => {
    const files = Object.fromEntries(schedulingCases.map((code, index) =>
      ['apps/console/src/case-' + index + '.ts', code]));
    const registry = Object.fromEntries(Object.keys(files).map(name => [name, role]));
    const errors = inspect(files, registry);
    for (const name of Object.keys(files)) {
      assert.ok(errors.split('\n').some(error => error.startsWith(name + ':') && error.includes('[OWN-03]')), name);
    }
  });
}
test('an explicitly registered adapter can schedule but does not gain an Effect runtime', () => {
  const files = Object.fromEntries(schedulingCases.map((code, index) =>
    ['apps/console/src/adapter-' + index + '.ts', code]));
  assert.equal(inspect(files, Object.fromEntries(Object.keys(files).map(name => [name, 'adapter' as const]))), '');
  assert.match(inspect({ [file]: "import { Effect } from 'effect'; Effect.runFork(job);" },
    { [file]: 'adapter' }), /OWN-02/);
});
test('framework rendering hooks and pure Effect descriptions do not confer native scheduling authority', () => {
  assert.equal(inspect({ [file]: "import { afterNextRender } from '@angular/core'; afterNextRender(() => {});" },
    { [file]: 'component' }), '');
  assert.equal(inspect({ [file]: "import { Effect } from 'effect'; export const wait = Effect.sleep(10);" },
    { [file]: 'operation' }), '');
});

test('computed scheduler authority cannot hide behind assigned or destructured aliases', () => {
  for (const code of [
    'const s = scheduler; s[method](() => {});',
    "const { ['scheduler']: s } = globalThis; s[method](() => {});",
  ]) {
    assert.match(inspect({ [file]: code }, { [file]: 'component' }), /OWN-03/);
  }
  assert.match(inspect({ [file]: 'const s = scheduler; s[method](() => {});' },
    { [file]: 'adapter' }), /Computed authority/);
});

test('composition assembly no longer needs H4 mixed-component exceptions', () => {
  assert.equal(productionRoles['apps/console/src/app.ts'], 'component');
  assert.equal(productionRoles['apps/console/src/console-home.ts'], 'component');
  const app = 'apps/console/src/app.ts';
  assert.match(inspect({ 'apps/console/src/other.ts': "import './app.ts';", [app]: 'export {};' },
    { 'apps/console/src/other.ts': 'composition', [app]: 'composition' }), /OWN-01.*composition/);
});
for (const role of ['composition', 'integration', 'adapter', 'store', 'operation', 'port'] as const) {
  test(role + ' cannot conceal a component or directive declaration', () => {
    for (const code of [
      "import { Component as View } from '@angular/core'; @View({}) class Screen {}",
      "import * as ng from '@angular/core'; @ng.Directive({}) class Screen {}",
      "import * as ng from '@angular/core'; const View = ng['Component']; @View({}) class Screen {}",
    ]) assert.match(inspect({ [file]: code }, { [file]: role }), /OWN-01.*component|OWN-01.*directive/i);
  });
}
test('registered framework integration executes Effects without gaining native I/O', () => {
  assert.equal(inspect({ [file]: "import { Effect } from 'effect'; Effect.runFork(job);" },
    { [file]: 'integration' }), '');
  assert.match(inspect({ [file]: 'fetch("/")' }, { [file]: 'integration' }), /OWN-03/);
});

test('component declarations retain their component role', () => {
  assert.equal(inspect({ [file]: "import { Component as View } from '@angular/core'; @View({}) class Screen {}" },
    { [file]: 'component' }), '');
});

test('a re-exported decorator alias cannot conceal a component in an integration', () => {
  assert.match(inspect({
    [file]: "import { Screen } from './barrel.ts'; @Screen({}) class Hidden {}",
    'apps/console/src/barrel.ts': "export { Component as Screen } from './decorator.ts';",
    'apps/console/src/decorator.ts': 'export function Component(_options: unknown) { return (_target: unknown) => {}; }',
  }, { [file]: 'integration', 'apps/console/src/barrel.ts': 'port', 'apps/console/src/decorator.ts': 'port' }), /OWN-01.*component/);
});
