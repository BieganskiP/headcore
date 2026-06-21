import type { ComponentContract, RenderingNode } from '../types.js';
import { inferField } from './infer.js';

export function buildContract(
  node: RenderingNode,
  overrides: Record<string, string>,
): ComponentContract {
  return {
    name: node.componentName,
    fields: Object.entries(node.fields).map(([name, raw]) => inferField(name, raw, overrides)),
    params: Object.keys(node.params),
    placeholders: Object.keys(node.placeholders),
  };
}
