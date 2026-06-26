import { describe, it, expect } from 'vitest';
import { renderTypedTFile } from '../src/codegen/typed-t-file.js';

describe('renderTypedTFile', () => {
  it('imports useI18n from the configured package and constrains keys', () => {
    const out = renderTypedTFile('next-localization');
    expect(out).toContain("import { useI18n } from 'next-localization';");
    expect(out).toContain("import type { DictionaryKey } from './dictionary-keys';");
    expect(out).toContain('export function useTypedT()');
    expect(out).toContain('const { t } = useI18n();');
    expect(out).toContain('key: DictionaryKey');
  });

  it('respects a custom i18n package', () => {
    const out = renderTypedTFile('@my/i18n');
    expect(out).toContain("import { useI18n } from '@my/i18n';");
  });
});
