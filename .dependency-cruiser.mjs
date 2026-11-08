import { ownerPatterns } from '#perfeng/harness/project-imports';

export default {
  forbidden: [
    {
      name: 'no-unresolved-product-imports', severity: 'error',
      from: { path: '^(apps/|src/|harness/|scripts/|tools/(?!qualification/))' }, to: { couldNotResolve: true },
    },
    ...ownerPatterns.map((path, index) => ({
      name: 'no-cross-owner-cycle-' + index,
      severity: 'error', comment: 'Cross-owner cycles violate docs/IMPORTS.md.',
      from: { path }, to: { circular: true, pathNot: path },
    })),
    {
      name: 'no-external-presentation-consumer', severity: 'error',
      comment: 'Shared DTOs belong in shared/contracts. See docs/IMPORTS.md.',
      from: { pathNot: '^src/presentation/' }, to: { path: '^src/presentation/' },
    },
    {
      name: 'presentation-no-runtime-dependency', severity: 'error',
      comment: 'Presentation may depend only on its own files and generated provider types.',
      from: { path: '^src/presentation/' },
      to: { pathNot: '^src/(presentation|generated)/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' }, tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)node_modules/' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'node', 'default'] },
  },
};
