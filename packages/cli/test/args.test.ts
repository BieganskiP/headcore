import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('parses inspect command with route', () => {
    expect(parseArgs(['inspect', '/about-us'])).toEqual({
      command: 'inspect', name: undefined, route: '/about-us',
      lang: undefined, dryRun: false, force: false, variants: [],
      filter: undefined, sort: 'path', json: false, out: undefined,
    });
  });

  it('parses component command with name and flags', () => {
    expect(parseArgs(['component', 'Hero', '--route', '/about-us', '--lang', 'da', '--dry-run', '--force'])).toEqual({
      command: 'component', name: 'Hero', route: '/about-us', lang: 'da', dryRun: true, force: true, variants: [],
      filter: undefined, sort: 'path', json: false, out: undefined,
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
      filter: undefined, sort: 'path', json: false, out: undefined,
    });
  });

  it('parses the dictionary command with flags', () => {
    expect(parseArgs(['dictionary', '--lang', 'da', '--dry-run', '--force'])).toEqual({
      command: 'dictionary', name: undefined, route: undefined,
      lang: 'da', dryRun: true, force: true, variants: [],
      filter: undefined, sort: 'path', json: false, out: undefined,
    });
  });

  it('parses the routes command with all flags', () => {
    expect(parseArgs(['routes', '--lang', 'da', '--filter', '/products', '--sort', 'updated', '--json'])).toEqual({
      command: 'routes', name: undefined, route: undefined,
      lang: 'da', dryRun: false, force: false, variants: [],
      filter: '/products', sort: 'updated', json: true, out: undefined,
    });
  });

  it('defaults routes to sort by path with no filter and no json', () => {
    const parsed = parseArgs(['routes']);
    expect(parsed.command).toBe('routes');
    expect(parsed.filter).toBeUndefined();
    expect(parsed.sort).toBe('path');
    expect(parsed.json).toBe(false);
  });

  it('throws on an invalid --sort value', () => {
    expect(() => parseArgs(['routes', '--sort', 'name'])).toThrow(/--sort must be "path" or "updated"/i);
  });

  it('parses --out with a file path', () => {
    const parsed = parseArgs(['routes', '--json', '--out', 'routes.json']);
    expect(parsed.command).toBe('routes');
    expect(parsed.out).toBe('routes.json');
    expect(parsed.json).toBe(true);
  });

  it('throws when --out is missing its file path', () => {
    expect(() => parseArgs(['routes', '--out'])).toThrow(/--out requires a file path/i);
  });
});
