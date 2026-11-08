import { inspectProjectImports } from './project-imports.ts';

export default {
  rules: {
    'public-boundaries': {
      meta: { type: 'problem', schema: [], messages: { boundary: '{{reason}}' } },
      create(context) {
        return {
          Program(node) {
            for (const reason of inspectProjectImports(context.cwd, context.filename, context.sourceCode.text))
              context.report({ node, messageId: 'boundary', data: { reason } });
          },
        };
      },
    },
  },
};
