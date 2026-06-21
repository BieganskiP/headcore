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

  it('infers a plain array (no inner fields) as ItemReference[] raw', () => {
    expect(inferField('cards', { value: [{ id: '1' }] }, {}).tsType).toBe('ItemReference[]');
  });

  it('infers an array of item references as typed Cards', () => {
    const r = inferField('Tabs', [{ id: '1', fields: { Name: { value: 'Services' }, Icon: { value: '' } } }], {});
    expect(r).toMatchObject({
      name: 'Tabs',
      tsType: 'TabsItem[]',
      renderer: 'Cards',
      itemTypeName: 'TabsItem',
    });
    expect(r.itemFields?.map((f) => f.name)).toEqual(['Name', 'Icon']);
    expect(r.itemFields?.[0]).toMatchObject({ renderer: 'Text', tsType: 'Field<string>' });
    expect(r.itemFields?.[1].optional).toBe(true); // empty Icon value
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

  it('infers rich text field when value looks like HTML', () => {
    const r = inferField('description', { value: '<p>Rich</p>' }, {});
    expect(r).toMatchObject({ tsType: 'Field<string>', optional: false, renderer: 'RichText', sitecoreImport: 'RichText' });
  });

  it('plain string (no HTML) still infers as Text', () => {
    const r = inferField('heading', { value: 'Hello World' }, {});
    expect(r).toMatchObject({ tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' });
  });
});
