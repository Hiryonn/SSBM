// Compression zlib via les flux natifs du navigateur (et de Node 18+).
async function pipe(data, stream) {
  const res = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
export const inflateZlib = (u8) => pipe(u8, new DecompressionStream('deflate'));
export const deflateZlib = (u8) => pipe(u8, new CompressionStream('deflate'));

export function toBase64(u8) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}
export function fromBase64(b64) {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}
