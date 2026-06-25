import type { RenderingNode, RenderingTree } from '../types.js';

/** Flattens a parsed layout tree into every rendering it contains, depth-first. */
export function collectRenderings(tree: RenderingTree): RenderingNode[] {
  const acc: RenderingNode[] = [];
  const walk = (placeholders: Record<string, RenderingNode[]>): void => {
    for (const renderings of Object.values(placeholders)) {
      for (const node of renderings) {
        acc.push(node);
        walk(node.placeholders);
      }
    }
  };
  walk(tree.placeholders);
  return acc;
}
