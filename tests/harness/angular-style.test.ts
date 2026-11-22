import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const lint = new ESLint();
const sourcePath = 'apps/console/src/shell/style-probe.ts';
const templatePath = 'apps/console/src/shell/style-probe.html';

async function ruleIds(source: string, filePath: string) {
  const [result] = await lint.lintText(source, { filePath });
  assert.ok(result);
  return result.messages.map(message => message.ruleId);
}

test('Angular lint enforces selectors, injection, standalone, OnPush and signal conventions', async () => {
  const invalid = `import { ChangeDetectionStrategy, Component, Directive, ElementRef, EventEmitter, Input, Output } from '@angular/core';
@Component({ selector: 'badName', standalone: false, changeDetection: ChangeDetectionStrategy.Eager })
class StyleProbe {
  @Input() value = '';
  @Output() saved = new EventEmitter<void>();
  constructor(readonly element: ElementRef) {}
  ngOnInit() { console.log(this.value); }
}
@Directive({ selector: '[bad-name]' })
class StyleDirective {}
export { StyleProbe, StyleDirective };`;
  const invalidRules = await ruleIds(invalid, sourcePath);
  for (const rule of ['component-selector', 'directive-selector', 'prefer-inject', 'prefer-standalone','prefer-on-push-component-change-detection', 'prefer-signals', 'prefer-output-readonly', 'use-lifecycle-interface']) {
    assert.ok(invalidRules.includes('@angular-eslint/' + rule), rule);
  }
  const outOfOrder = `import { Component, ElementRef, inject } from '@angular/core';
@Component({ selector: 'app-style-probe' })
export class StyleProbe { readonly status = 'ready'; readonly element = inject(ElementRef); }`;
  assert.ok((await ruleIds(outOfOrder, sourcePath)).includes('@angular-eslint/inject-at-top'));
  const valid = `import { Component, Directive, ElementRef, inject, input, output } from '@angular/core';
@Component({ selector: 'app-style-probe', templateUrl: './style-probe.html', styleUrl: './style-probe.css' })
export class StyleProbe {
  protected readonly element = inject(ElementRef);
  readonly value = input('');
  readonly saved = output<void>();
}
@Directive({ selector: '[appStyle]' })
export class StyleDirective {}`;
  assert.deepEqual(await ruleIds(valid, sourcePath), []);
});

test('external templates require modern control flow, strict comparison and typed expressions', async () => {
  const invalid = '<p *ngIf="$any(value) == 1">Ready</p>';
  const rules = await ruleIds(invalid, templatePath);
  for (const rule of ['prefer-control-flow', 'eqeqeq', 'no-any']) {
    assert.ok(rules.includes('@angular-eslint/template/' + rule), rule);
  }
  assert.deepEqual(await ruleIds('@if (value === 1) { <p>Ready</p> }', templatePath), []);
});

test('UI TypeScript rejects implicit type imports, legacy modules and compressed control flow', async () => {
  for (const [source, rule] of [
    ['import { OnInit } from "@angular/core"; export type Hook = OnInit;', '@typescript-eslint/consistent-type-imports'],
    ['import path = require("./other"); export = path;', 'no-restricted-syntax'],
    ['export const enum Value { One }', 'no-restricted-syntax'],
    ['export namespace Values { export const one = 1; }', '@typescript-eslint/no-namespace'],
    ['export var value = 1;', 'no-var'],
    ['let value = 1; export function read() { return value; }', 'prefer-const'],
    ['const a = 1, b = 2; export { a, b };', 'one-var'],
    ['export function run(ok: boolean) { if (ok) return; }', 'curly'],
  ] as const) {
    assert.ok((await ruleIds(source, sourcePath)).includes(rule), source);
  }
  assert.deepEqual(await ruleIds('import type { OnInit } from "@angular/core"; export type { OnInit };', sourcePath), []);
  assert.ok(!(await ruleIds('export function run(ok: boolean) { if (ok) return; }', 'src/bff/style-probe.ts')).includes('curly'));
});

test('the browser compiler requires type-only re-exports for erased types', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'type-only-exports-'));
  try {
    const config = ts.readConfigFile('tsconfig.base.json', ts.sys.readFile);
    const { options, errors } = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, process.cwd());
    assert.deepEqual(errors, []);
    const source = join(fixture, 'probe.ts');
    for (const [specifier, expectedCodes] of [['type { View }', []], ['{ View }', [1205]]] as const) {
      writeFileSync(source, `interface View { title: string }\nexport ${specifier};`);
      const program = ts.createProgram([source], options);
      assert.deepEqual(program.getSemanticDiagnostics(program.getSourceFile(source)).map(item => item.code), expectedCodes);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
