import { describe, it, expect } from 'vitest';
import { renderDictionaryFile } from '../src/codegen/dictionary-file.js';

describe('renderDictionaryFile', () => {
  it('emits a const map and a derived key type', () => {
    const out = renderDictionaryFile(['Home.Title', 'Nav.Login']);
    expect(out).toContain('export const dictionaryKeys = {');
    expect(out).toContain("'Home.Title': 'Home.Title',");
    expect(out).toContain("'Nav.Login': 'Nav.Login',");
    expect(out).toContain('} as const;');
    expect(out).toContain('export type DictionaryKey = keyof typeof dictionaryKeys;');
    expect(out).toContain('AUTO-GENERATED');
  });

  it('escapes single quotes and backslashes in keys', () => {
    const out = renderDictionaryFile(["It's", 'a\\b']);
    expect(out).toContain("'It\\'s': 'It\\'s',");
    expect(out).toContain("'a\\\\b': 'a\\\\b',");
  });

  it('emits a valid empty map when there are no keys', () => {
    const out = renderDictionaryFile([]);
    expect(out).toContain('export const dictionaryKeys = {} as const;');
    expect(out).toContain('export type DictionaryKey = keyof typeof dictionaryKeys;');
  });
});
