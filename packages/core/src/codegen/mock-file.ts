import type { RenderingNode } from '../types.js';

export function renderMockFile(node: RenderingNode): string {
  return JSON.stringify({ fields: node.fields, params: node.params }, null, 2) + '\n';
}
