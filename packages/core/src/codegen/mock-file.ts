import type { RenderingNode } from '../types.js';

export function renderMockFile(node: RenderingNode): string {
  return JSON.stringify(mockBody(node), null, 2) + '\n';
}

/** Mock shape: { fields, params } plus nested { componentName, fields, params, ... } placeholder nodes. */
function mockBody(node: RenderingNode): Record<string, unknown> {
  const body: Record<string, unknown> = { fields: node.fields, params: node.params };
  const entries = Object.entries(node.placeholders).filter(([, children]) => children.length > 0);
  if (entries.length > 0) {
    body.placeholders = Object.fromEntries(
      entries.map(([key, children]) => [
        key,
        children.map((child) => ({ componentName: child.componentName, ...mockBody(child) })),
      ]),
    );
  }
  return body;
}
