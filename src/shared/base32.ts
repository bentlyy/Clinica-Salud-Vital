import { encode, decode } from 'hi-base32';

export function base32Encode(buf: Buffer | Uint8Array | number[]): string {
  return encode(buf).replace(/=+$/, '');
}

export function base32Decode(str: string): Buffer {
  return Buffer.from(decode(str));
}
