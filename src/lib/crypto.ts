export const URL_SECRET = process.env.NEXT_PUBLIC_URL_SECRET || 'linehai-secret-change-in-prod';

function toCharCodes(s: string): number[] {
  const arr: number[] = [];
  for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i));
  return arr;
}

function fromCharCodes(codes: number[]): string {
  return String.fromCharCode(...codes);
}

function b64url(data: number[]): string {
  return btoa(fromCharCodes(data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str: string): number[] {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const raw = atob(str);
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) out.push(raw.charCodeAt(i));
  return out;
}

export function encryptId(text: string): string {
  try {
    const key = toCharCodes(URL_SECRET);
    const input = toCharCodes(text);
    const iv = Date.now() & 0xffff;
    const result: number[] = [iv >> 8, iv & 0xff];
    for (let i = 0; i < input.length; i++) {
      result.push(input[i] ^ key[i % key.length] ^ ((iv + i) & 0xff));
    }
    return b64url(result);
  } catch { return text; }
}

export function decryptId(encoded: string): string {
  try {
    const key = toCharCodes(URL_SECRET);
    const data = unb64url(encoded);
    if (data.length < 2) return encoded;
    const iv = (data[0] << 8) | data[1];
    const result: number[] = [];
    for (let i = 2; i < data.length; i++) {
      result.push(data[i] ^ key[(i - 2) % key.length] ^ ((iv + (i - 2)) & 0xff));
    }
    return fromCharCodes(result);
  } catch { return encoded; }
}
