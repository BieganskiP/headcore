import { describe, it, expect } from 'vitest';
import { renderDictionaryFile } from '../src/codegen/dictionary-file.js';
import { typecheckComponents } from './helpers/typecheck.js';

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

  it('escapes newlines, carriage returns, and tabs in keys', () => {
    const out = renderDictionaryFile(['a\nb', 'c\td']);
    expect(out).toContain("'a\\nb': 'a\\nb',");
    expect(out).toContain("'c\\td': 'c\\td',");
  });

  it('produces a dictionary-keys file that typechecks with special characters', () => {
    const out = renderDictionaryFile(['Home.Title', "It's", 'a\\b']);
    const diagnostics = typecheckComponents([
      { dir: 'Dictionary', files: [{ path: 'Dictionary.types.ts', contents: out }] },
    ]);
    expect(diagnostics).toEqual([]);
  });
});
