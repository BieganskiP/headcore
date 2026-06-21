import type { RenderingNode, RenderingTree } from '../types.js';

function renderNode(node: RenderingNode, lines: string[], indent: string): void {
  lines.push(`${indent}- ${node.componentName}`);
  if (node.dataSource) lines.push(`${indent}  datasource: ${node.dataSource}`);
  const fieldNames = Object.keys(node.fields);
  if (fieldNames.length) {
    lines.push(`${indent}  fields:`);
    for (const f of fieldNames) lines.push(`${indent}    ${f}`);
  }
  const paramNames = Object.keys(node.params);
  if (paramNames.length) {
    lines.push(`${indent}  params:`);
    for (const p of paramNames) lines.push(`${indent}    ${p}`);
  }
  for (const [key, children] of Object.entries(node.placeholders)) {
    lines.push(`${indent}  placeholder: ${key}`);
    for (const child of children) renderNode(child, lines, `${indent}    `);
  }
}

export function formatTree(tree: RenderingTree): string {
  const lines: string[] = [`Route: ${tree.route}`, ''];
  for (const [key, renderings] of Object.entries(tree.placeholders)) {
    lines.push(`Placeholder: ${key}`);
    for (const node of renderings) renderNode(node, lines, '');
    lines.push('');
  }
  return lines.join('\n');
}
