import { describe, it, expect } from 'vitest';
import { inferField } from '../src/contract/infer.js';

describe('inferField', () => {
  it('infers string field', () => {
    const r = inferField('heading', { value: 'Hello' }, {});
    expect(r).toMatchObject({ name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text' });
  });

  it('infers image field', () => {
    const r = inferField('image', { value: { src: 'x.jpg', alt: 'a', width: 10, height: 5 } }, {});
    expect(r).toMatchObject({ tsType: 'ImageField', renderer: 'Image', sitecoreImport: 'Image' });
  });

  it('infers link field', () => {
    const r = inferField('ctaLink', { value: { href: '/x', text: 'go' } }, {});
    expect(r).toMatchObject({ tsType: 'LinkField', renderer: 'Link', sitecoreImport: 'Link' });
  });

  it('infers boolean and number', () => {
    expect(inferField('on', { value: true }, {}).tsType).toBe('Field<boolean>');
    expect(inferField('n', { value: 3 }, {}).tsType).toBe('Field<number>');
  });

  it('infers array as ItemReference[]', () => {
    expect(inferField('cards', { value: [{ id: '1' }] }, {}).tsType).toBe('ItemReference[]');
  });

  it('marks null/absent value optional with TODO renderer raw', () => {
    const r = inferField('maybe', { value: null }, {});
    expect(r.optional).toBe(true);
    expect(r.renderer).toBe('raw');
  });

  it('applies fieldTypeOverrides by field name', () => {
    const r = inferField('promo', { value: 'x' }, { promo: 'LinkField' });
    expect(r.tsType).toBe('LinkField');
  });
});
