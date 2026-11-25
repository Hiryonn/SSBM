// Ajout / remplacement de sprites dans un pack (persos et stages).
import { inflateZlib, deflateZlib, toBase64, fromBase64 } from '../import/inflate.js';

export async function unpack(def) {
  if (!def.pack) return { blob: new Uint8Array(0), table: [] };
  const blob = await inflateZlib(fromBase64(def.pack.blob));
  return { blob, table: def.pack.sprites.map((s) => s.slice()) };
}

export async function repack(def, up) {
  let total = 0;
  for (const s of up.table) total += s[9];
  const out = new Uint8Array(total);
  let off = 0;
  const table = [];
  for (const s of up.table) {
    const src = s.data || up.blob.subarray(s[8], s[8] + s[9]);
    out.set(src, off);
    table.push([s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], off, src.length]);
    off += src.length;
  }
  def.pack = { blob: toBase64(await deflateZlib(out)), sprites: table };
  return def;
}

// Ajoute une image RGBA (Uint8ClampedArray) comme sprite g,i (remplace si existe).
export function addRGBA(up, g, i, w, h, rgba, ax, ay) {
  const entry = [g, i, w, h, ax, ay, 1, 0, 0, rgba.length];
  entry.data = new Uint8Array(rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength));
  const k = up.table.findIndex((s) => s[0] === g && s[1] === i);
  if (k >= 0) up.table[k] = entry; else up.table.push(entry);
}

export function nextFreeIndex(up, g) {
  let m = -1;
  for (const s of up.table) if (s[0] === g) m = Math.max(m, s[1]);
  return m + 1;
}

// Charge un fichier image en RGBA
export async function imageFileToRGBA(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);
    return { w: c.width, h: c.height, rgba: d.data };
  } finally { URL.revokeObjectURL(url); }
}

// Découpe une planche de sprites en cases régulières.
export function sliceSheet(img, cols, rows) {
  const out = [];
  const cw = Math.floor(img.w / cols), ch = Math.floor(img.h / rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rgba = new Uint8ClampedArray(cw * ch * 4);
    let any = false;
    for (let y = 0; y < ch; y++) {
      const src = ((r * ch + y) * img.w + c * cw) * 4;
      rgba.set(img.rgba.subarray(src, src + cw * 4), y * cw * 4);
    }
    for (let k = 3; k < rgba.length; k += 4) if (rgba[k]) { any = true; break; }
    if (any) out.push({ w: cw, h: ch, rgba });
  }
  return out;
}

// Rend transparente la couleur du pixel en haut à gauche (fond uni des planches).
export function keyOutCorner(img) {
  const d = img.rgba;
  const r = d[0], g = d[1], b = d[2], a = d[3];
  if (a === 0) return img;
  for (let k = 0; k < d.length; k += 4) if (d[k] === r && d[k + 1] === g && d[k + 2] === b) d[k + 3] = 0;
  return img;
}
