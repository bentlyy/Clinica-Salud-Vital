import { describe, it, expect } from 'vitest';
import { base32Encode, base32Decode } from '../../src/shared/base32.js';

describe('base32', () => {
  it('encodes a buffer to base32 without padding', () => {
    const buf = Buffer.from('hello');
    const encoded = base32Encode(buf);
    expect(encoded).toBe('NBSWY3DP');
    expect(encoded).not.toContain('=');
  });

  it('encodes Uint8Array', () => {
    const arr = new Uint8Array([104, 101, 108, 108, 111]);
    const encoded = base32Encode(arr);
    expect(encoded).toBe('NBSWY3DP');
  });

  it('encodes number array', () => {
    const encoded = base32Encode([104, 101, 108, 108, 111]);
    expect(encoded).toBe('NBSWY3DP');
  });

  it('decodes base32 string to buffer', () => {
    const buf = base32Decode('NBSWY3DP');
    expect(buf.toString()).toBe('hello');
  });

  it('round-trips encode and decode', () => {
    const original = 'test-data-123';
    const encoded = base32Encode(Buffer.from(original));
    const decoded = base32Decode(encoded);
    expect(decoded.toString()).toBe(original);
  });

  it('handles empty buffer', () => {
    const encoded = base32Encode(Buffer.alloc(0));
    const decoded = base32Decode(encoded);
    expect(decoded.length).toBe(0);
  });

  it('decodes with padding', () => {
    const buf = base32Decode('NBSWY3DP');
    expect(buf.toString()).toBe('hello');
  });
});
