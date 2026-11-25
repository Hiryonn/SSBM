// Lecture des archives .zip (méthodes "stockée" et "deflate").
async function inflateRaw(u8) {
  const res = new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
  return new Uint8Array(await res.arrayBuffer());
}

export async function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archive zip invalide');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  const utf8 = new TextDecoder('utf-8'), latin = new TextDecoder('latin1');
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = (flags & 0x800 ? utf8 : latin).decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commLen;
    if (name.endsWith('/')) continue;
    const lNameLen = dv.getUint16(local + 26, true), lExtra = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtra;
    const raw = u8.subarray(start, start + csize);
    let data;
    if (method === 0) data = raw.slice();
    else if (method === 8) data = await inflateRaw(raw);
    else continue;
    out.push({ name, data });
  }
  return out;
}
