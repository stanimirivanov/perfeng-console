import { parseTree } from 'jsonc-parser';
import type { Node, ParseError } from 'jsonc-parser';

/** Shared strict JSON preflight; callers choose a bounded node budget, never a new grammar. */
export function strictJsonObject(text: string, bounds: {
  readonly maxNodes: number;
  readonly forbiddenMembers?: readonly string[];
}): Record<string, unknown> {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  if (!tree || tree.type !== 'object' || errors.length) throw new Error('Invalid JSON');
  let nodes = 0;
  function visit(node: Node, depth: number): void {
    if (++nodes > bounds.maxNodes || depth > 16) throw new Error('JSON bound');
    if (node.type === 'string' && (typeof node.value !== 'string' || !node.value.isWellFormed())) throw new Error('Invalid string');
    if (node.type === 'object') {
      const names = new Set<string>();
      if ((node.children?.length ?? 0) > 64) throw new Error('Member bound');
      for (const property of node.children ?? []) {
        const name = property.children?.[0]?.value;
        if (typeof name !== 'string' || names.has(name) || bounds.forbiddenMembers?.includes(name)) throw new Error('Ambiguous member');
        names.add(name);
      }
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  }
  visit(tree, 0);
  return JSON.parse(text) as Record<string, unknown>;
}
