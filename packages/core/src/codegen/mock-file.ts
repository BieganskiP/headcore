import type { RenderingNode } from '../types.js';

export function renderMockFile(node: RenderingNode): string {
  return JSON.stringify(mockBody(node), null, 2) + '\n';
}

/**
 * Mock shape: { fields, params } plus nested { componentName, fields, params, ... } placeholder nodes.
 * Child `dataSource` is preserved so datasource-checked children still render in Storybook;
 * the root-level dataSource is intentionally excluded (the story template supplies a synthetic one).
 */
function mockBody(node: RenderingNode): Record<string, unknown> {
  const body: Record<string, unknown> = { fields: node.fields, params: node.params };
  const entries = Object.entries(node.placeholders).filter(([, children]) => children.length > 0);
  if (entries.length > 0) {
    body.placeholders = Object.fromEntries(
      entries.map(([key, children]) => [
        key,
        children.map((child) => ({
          componentName: child.componentName,
          ...(child.dataSource ? { dataSource: child.dataSource } : {}),
          ...mockBody(child),
        })),
      ]),
    );
  }
  return body;
}
