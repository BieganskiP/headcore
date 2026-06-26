import { describe, it, expect } from 'vitest';
import { buildDictionary } from '../src/dictionary/build.js';

describe('buildDictionary', () => {
  it('dedupes and sorts keys alphabetically', () => {
    const result = buildDictionary([
      { key: 'Nav.Login', value: 'Log in' },
      { key: 'Home.Title', value: 'Home' },
      { key: 'Nav.Login', value: 'Log in (dup)' },
    ]);
    expect(result.keys).toEqual(['Home.Title', 'Nav.Login']);
    expect(result.warnings).toEqual([]);
  });

  it('warns when the dictionary is empty', () => {
    const result = buildDictionary([]);
    expect(result.keys).toEqual([]);
    expect(result.warnings.join('\n')).toMatch(/no dictionary entries/i);
  });
});
