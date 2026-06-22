import { describe, it, expect } from 'vitest';
import { normalizeVariants } from '../src/codegen/variants.js';

describe('normalizeVariants', () => {
  it('prepends Default when missing and preserves order', () => {
    expect(normalizeVariants(['ThreeCard', 'FourCard'])).toEqual(['Default', 'ThreeCard', 'FourCard']);
  });

  it('keeps Default first even when supplied elsewhere in the list', () => {
    expect(normalizeVariants(['ThreeCard', 'Default', 'FourCard'])).toEqual(['Default', 'ThreeCard', 'FourCard']);
  });

  it('sanitizes names to valid PascalCase identifiers', () => {
    expect(normalizeVariants(['with background', '2col'])).toEqual(['Default', 'WithBackground', '_2col']);
  });

  it('dedupes after sanitizing', () => {
    expect(normalizeVariants(['With Background', 'with-background'])).toEqual(['Default', 'WithBackground']);
  });

  it("treats a lowercase 'default' as the Default variant and moves it first", () => {
    expect(normalizeVariants(['default', 'ThreeCard'])).toEqual(['Default', 'ThreeCard']);
  });
});
