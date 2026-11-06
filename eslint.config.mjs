import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', '.pnpm-store/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    linterOptions: { noInlineConfig: true },
    rules: {
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
