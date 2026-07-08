import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs — library commands', () => {
  it('parses list', () => {
    const a = parseArgs(['list']);
    expect(a.command).toBe('list');
  });

  it('parses info with a component name', () => {
    const a = parseArgs(['info', 'Tabs']);
    expect(a.command).toBe('info');
    expect(a.name).toBe('Tabs');
  });

  it('parses add with a name and flags', () => {
    const a = parseArgs(['add', 'Tabs', '--dry-run', '--force']);
    expect(a.command).toBe('add');
    expect(a.name).toBe('Tabs');
    expect(a.dryRun).toBe(true);
    expect(a.force).toBe(true);
  });
});
