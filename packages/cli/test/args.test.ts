import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('parses inspect command with route', () => {
    expect(parseArgs(['inspect', '/about-us'])).toEqual({
      command: 'inspect', name: undefined, route: '/about-us',
      lang: undefined, dryRun: false, force: false, variants: [],
    });
  });

  it('parses component command with name and flags', () => {
    expect(parseArgs(['component', 'Hero', '--route', '/about-us', '--lang', 'da', '--dry-run', '--force'])).toEqual({
      command: 'component', name: 'Hero', route: '/about-us', lang: 'da', dryRun: true, force: true, variants: [],
    });
  });

  it('parses a comma-separated --variants list, trimming whitespace', () => {
    const parsed = parseArgs(['component', 'GridModule', '--route', '/x', '--variants', 'ThreeCard, FourCard']);
    expect(parsed.variants).toEqual(['ThreeCard', 'FourCard']);
  });

  it('defaults variants to an empty array when the flag is absent', () => {
    expect(parseArgs(['component', 'GridModule', '--route', '/x']).variants).toEqual([]);
  });

  it('throws on unknown command', () => {
    expect(() => parseArgs(['frobnicate'])).toThrow(/unknown command/i);
  });

  it('throws when no command given', () => {
    expect(() => parseArgs([])).toThrow(/usage/i);
  });

  it('parses page command with route as a positional', () => {
    expect(parseArgs(['page', '/about-us', '--lang', 'da', '--dry-run'])).toEqual({
      command: 'page', name: undefined, route: '/about-us', lang: 'da', dryRun: true, force: false, variants: [],
    });
  });
});
