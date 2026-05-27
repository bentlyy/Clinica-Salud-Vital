import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/shared/escape.js';

describe('escapeHtml', () => {
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns unchanged string without special chars', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('escapes &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes <', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes >', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes "', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes \'', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes all special chars together', () => {
    expect(escapeHtml('<a href="test" onclick=\'alert(1)\'>&</a>'))
      .toBe('&lt;a href=&quot;test&quot; onclick=&#039;alert(1)&#039;&gt;&amp;&lt;/a&gt;');
  });
});
