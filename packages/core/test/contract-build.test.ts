import { describe, it, expect } from 'vitest';
import { buildContract } from '../src/contract/build.js';
import type { RenderingNode } from '../src/types.js';

const hero: RenderingNode = {
  componentName: 'Hero',
  dataSource: '/Data/Hero',
  fields: {
    heading: { value: 'About' },
    image: { value: { src: 'a.jpg', alt: 'a', width: 1, height: 1 } },
  },
  params: { variant: 'dark', backgroundColor: '#000' },
  placeholders: { cards: [] },
};

describe('buildContract', () => {
  it('maps name, fields, params, placeholders', () => {
    const c = buildContract(hero, {});
    expect(c.name).toBe('Hero');
    expect(c.fields.map((f) => f.name)).toEqual(['heading', 'image']);
    expect(c.fields[1].tsType).toBe('ImageField');
    expect(c.params).toEqual(['variant', 'backgroundColor']);
    expect(c.placeholders).toEqual(['cards']);
  });

  it('passes overrides through to inference', () => {
    const c = buildContract(hero, { heading: 'LinkField' });
    expect(c.fields[0].tsType).toBe('LinkField');
  });
});
