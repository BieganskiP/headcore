import { describe, it, expect } from 'vitest';
import { runInfo } from '../src/commands/info.js';

describe('runInfo', () => {
  it('prints details and Sitecore instructions for Tabs', () => {
    const out = runInfo({ name: 'Tabs' });
    expect(out).toContain('Tabs');
    expect(out).toContain('Files:');
    expect(out).toContain('Sitecore setup for Tabs');
    expect(out).toContain('headcore-tabs');
  });

  it('throws when name is missing', () => {
    expect(() => runInfo({ name: undefined })).toThrow(/name/i);
  });

  it('throws for an unknown component', () => {
    expect(() => runInfo({ name: 'nope' })).toThrow(/nope/);
  });
});
