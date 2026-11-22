import jsdoc from 'eslint-plugin-jsdoc';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import nxPlugin from '@nx/eslint-plugin';
import imports from '#perfeng/harness/import-lint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default [
  { ignores: ['node_modules/**', '.pnpm-store/**', 'dist/**', '.nx/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  { plugins: { perfeng: imports, '@nx': nxPlugin } },
  {
    files: ['apps/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        depConstraints: [
          { sourceTag: 'type:browser', onlyDependOnLibsWithTags: ['type:browser'] },
          { sourceTag: 'type:test', onlyDependOnLibsWithTags: ['type:test'] },
        ],
      }],
    },
  },
  {
    files: ['apps/console/src/*.ts', 'apps/web-e2e/tests/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['../../../src/**'], message: 'Use the reviewed public alias. See docs/IMPORTS.md.' }] }] },
  },
  // Handwritten types remain readable; generated contracts retain byte-for-byte ownership.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: ['src/generated/**', 'vendor/**', 'tools/qualification/**/generated/**', 'tools/qualification/effect-codegen/*-http*.ts'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/exp-list-style': ['error', {
        overrides: {
          TSInterfaceBody: { singleLine: { maxItems: 1 }, multiline: { minItems: 0 } },
          TSTypeLiteral: { singleLine: { maxItems: 1 }, multiline: { minItems: 0 } },
        },
      }],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: true },
      }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-trailing-spaces': 'error',
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    ignores: ['src/generated/**', 'vendor/**', 'tools/qualification/**/generated/**'],
    plugins: { '@stylistic': stylistic, jsdoc },
    rules: {
      '@stylistic/exp-list-style': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/padding-line-between-statements': ['error',{ blankLine: 'always', prev: 'import', next: '*' },{ blankLine: 'any', prev: 'import', next: 'import' },{ blankLine: 'always', prev: '*', next: 'function' },{ blankLine: 'always', prev: '*', next: 'export' },],
      'jsdoc/require-jsdoc': ['error', {
        'require': { FunctionDeclaration: false },
        contexts: [
          'Program > FunctionDeclaration',
          'ExportNamedDeclaration > FunctionDeclaration',
          'ExportDefaultDeclaration > FunctionDeclaration',
          'Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
          'Program > VariableDeclaration > VariableDeclarator > FunctionExpression',
          'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
          'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression',
          'ExportDefaultDeclaration > ArrowFunctionExpression',
          'ExportDefaultDeclaration > FunctionExpression',
        ],
      }],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/valid-types': 'error',
    },
  },
  // Compiler-owned output is byte-checked offline; Ajv emits unused validation context arguments.
  { files: ['src/generated/validators.mjs'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },

  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    linterOptions: { noInlineConfig: true },
    rules: {
      'perfeng/public-boundaries': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': true,
        'ts-ignore': true,
        'ts-nocheck': true,
      }],
      'no-restricted-syntax': ['error',{ selector: "CallExpression[callee.property.name=/^(skip|only|todo)$/]", message: 'Run every declared check.' },],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: ['src/generated/**', 'vendor/**', 'tools/qualification/**/generated/**', 'tools/qualification/effect-codegen/*-http*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.property.name=/^(skip|only|todo)$/]", message: 'Run every declared check.' },
        { selector: 'TSImportEqualsDeclaration, TSExportAssignment', message: 'Use ECMAScript imports and exports.' },
        { selector: 'TSEnumDeclaration[const=true]', message: 'Use regular enums or literal types instead of const enums.' },
      ],
    },
  },
  {
    files: ['apps/console/src/**/*.ts'],
    plugins: { '@angular-eslint': angular },
    rules: {
      curly: ['error', 'all'],
      'one-var': ['error', 'never'],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/inject-at-top': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',
    },
  },
  {
    files: ['apps/console/src/**/*.html'],
    ignores: ['apps/console/src/index.html'],
    languageOptions: { parser: angularTemplateParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    linterOptions: { noInlineConfig: true },
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
    },
  },
];
