const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer | Uint8Array | number[]): string {
  const bits: number[] = [];
  for (const b of buf) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    let val = 0;
    for (let j = 0; j < 5; j++) {
      val = (val << 1) | (bits[i + j] || 0);
    }
    result += alphabet[val];
  }
  while (result.length % 8 !== 0) result += '=';
  return result;
}

export function base32Decode(str: string): Buffer {
  str = str.replace(/=+$/, '').toUpperCase();
  const bits: number[] = [];
  for (const ch of str) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    for (let i = 4; i >= 0; i--) bits.push((idx >> i) & 1);
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}
