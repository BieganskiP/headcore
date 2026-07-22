import { describe, it, expect } from 'vitest';
import { compareDictionaries } from '../src/lib/dictionaryCompare';

describe('compareDictionaries', () => {
  it('unions keys, tracks per-side values, and counts missing entries', () => {
    const result = compareDictionaries(
      [{ key: 'shared', value: 'Hello' }, { key: 'only-base', value: 'Base' }],
      [{ key: 'shared', value: 'Hej' }, { key: 'only-other', value: 'Other' }],
    );
    expect(result.rows).toEqual([
      { key: 'only-base', base: 'Base' },
      { key: 'only-other', other: 'Other' },
      { key: 'shared', base: 'Hello', other: 'Hej' },
    ]);
    expect(result.missingInBase).toBe(1);
    expect(result.missingInOther).toBe(1);
  });

  it('keeps empty-string values distinct from missing keys', () => {
    const result = compareDictionaries([{ key: 'k', value: '' }], []);
    expect(result.rows).toEqual([{ key: 'k', base: '' }]);
    expect(result.missingInOther).toBe(1);
    expect(result.missingInBase).toBe(0);
  });

  it('handles two empty dictionaries', () => {
    expect(compareDictionaries([], [])).toEqual({ rows: [], missingInBase: 0, missingInOther: 0 });
  });
});
