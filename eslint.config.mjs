import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import nxPlugin from '@nx/eslint-plugin';
import imports from '#perfeng/harness/import-lint';

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
        'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true,
      }],
      'no-restricted-syntax': ['error',
        {selector: "CallExpression[callee.property.name=/^(skip|only|todo)$/]", message: 'Run every declared check.'},
      ],
    },
  },
];
