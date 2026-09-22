import { describe, expect, it } from 'vitest';
import { formatCents, parseAmountToCents } from './money';

describe('formatCents', () => {
  it('formats integer cents as currency', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(5)).toBe('$0.05');
  });
});

describe('parseAmountToCents', () => {
  it.each([
    ['12.34', 1234],
    ['12,34', 1234],
    ['7', 700],
    ['0.1', 10],
    [' 3.50 ', 350],
  ])('parses %s to %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '-1', '0', '1.234', '1e3'])('rejects %s', (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });
});
