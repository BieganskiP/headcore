import { describe, it, expect } from 'vitest';
import { toCsv } from '../src/lib/export';

describe('toCsv', () => {
  it('joins header and rows with newlines', () => {
    expect(toCsv(['a', 'b'], [['1', '2'], ['3', '4']])).toBe('a,b\n1,2\n3,4\n');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(toCsv(['k'], [['a,b'], ['say "hi"'], ['line1\nline2']]))
      .toBe('k\n"a,b"\n"say ""hi"""\n"line1\nline2"\n');
  });

  it('handles an empty row set', () => {
    expect(toCsv(['only', 'header'], [])).toBe('only,header\n');
  });
});
