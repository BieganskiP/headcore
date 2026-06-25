import { describe, it, expect } from 'vitest';
import { mergeContracts } from '../src/contract/merge.js';
import type { RenderingNode } from '../src/types.js';

function node(fields: Record<string, unknown>, extra: Partial<RenderingNode> = {}): RenderingNode {
  return { componentName: 'Card', params: {}, fields, placeholders: {}, ...extra };
}

describe('mergeContracts', () => {
  it('marks a field optional when it is absent from some instances', () => {
    const { contract } = mergeContracts(
      [node({ heading: { value: 'A' } }), node({ heading: { value: 'B' }, subtitle: { value: 'S' } })],
      {},
    );
    const subtitle = contract.fields.find((f) => f.name === 'subtitle')!;
    expect(subtitle.optional).toBe(true);
    expect(contract.fields.find((f) => f.name === 'heading')!.optional).toBe(false);
  });

  it('lets a concrete renderer win over an empty value, and marks it optional', () => {
    const { contract } = mergeContracts(
      [node({ heading: { value: '' } }), node({ heading: { value: 'Hello' } })],
      {},
    );
    const heading = contract.fields.find((f) => f.name === 'heading')!;
    expect(heading.renderer).toBe('Text');
    expect(heading.optional).toBe(true);
  });

  it('prefers RichText over Text when HTML appears on any instance', () => {
    const { contract } = mergeContracts(
      [node({ body: { value: 'plain' } }), node({ body: { value: '<p>rich</p>' } })],
      {},
    );
    expect(contract.fields.find((f) => f.name === 'body')!.renderer).toBe('RichText');
  });

  it('falls back to Field<string> raw and warns on a hard renderer conflict', () => {
    const { contract, warnings } = mergeContracts(
      [
        node({ media: { value: { src: 'a.jpg' } } }),
        node({ media: { value: { href: '/x' } } }),
      ],
      {},
    );
    const media = contract.fields.find((f) => f.name === 'media')!;
    expect(media.tsType).toBe('Field<string>');
    expect(media.renderer).toBe('raw');
    expect(warnings.join('\n')).toMatch(/Card\.media.*conflicting/i);
  });

  it('unions params and placeholders across instances', () => {
    const { contract } = mergeContracts(
      [
        node({}, { params: { variant: 'a' }, placeholders: { left: [] } }),
        node({}, { params: { color: 'b' }, placeholders: { right: [] } }),
      ],
      {},
    );
    expect(contract.params.sort()).toEqual(['color', 'variant']);
    expect(contract.placeholders.sort()).toEqual(['left', 'right']);
  });

  it('recursively merges Cards itemFields across instances, marking partial items optional', () => {
    const item = (extra: Record<string, unknown> = {}) => ({ fields: { label: { value: 'x' }, ...extra } });
    const { contract } = mergeContracts(
      [
        node({ items: { value: [item()] } }),                                  // label only
        node({ items: { value: [item({ icon: { value: { src: 'a.jpg' } } })] } }), // label + icon
      ],
      {},
    );
    const items = contract.fields.find((f) => f.name === 'items')!;
    expect(items.renderer).toBe('Cards');
    expect(items.itemFields!.find((f) => f.name === 'label')!.optional).toBe(false);
    expect(items.itemFields!.find((f) => f.name === 'icon')!.optional).toBe(true);
  });
});
