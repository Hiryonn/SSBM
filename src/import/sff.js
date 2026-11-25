// Lecture des fichiers de sprites Mugen (.sff v1 et v2).
// Sortie commune : { version, palettes: [Uint8Array(256*4) RGBA], palKeys: ["g,i"], sprites: [...] }
// sprite: { g, i, w, h, ax, ay, kind: 'idx'|'rgba', data: Uint8Array, pal: index de palette }

import { inflateZlib } from './inflate.js';

const td = new TextDecoder('latin1');

export async function parseSFF(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const sig = td.decode(u8.subarray(0, 11));
  if (sig !== 'ElecbyteSpr') throw new Error('Ce fichier n\'est pas un .sff Mugen');
  const verHi = u8[15];
  if (verHi === 2) return parseV2(u8);
  if (verHi === 1) return parseV1(u8);
  throw new Error('Version de SFF inconnue : ' + verHi);
}

// ---------------------------------------------------------------- SFF v1 (PCX)
function parseV1(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const numImages = dv.getUint32(20, true);
  let off = dv.getUint32(24, true);
  const sprites = [];
  const palettes = [];
  const palKeys = [];
  let lastPal = -1;
  for (let n = 0; n < numImages && off > 0 && off < u8.length; n++) {
    const next = dv.getUint32(off, true);
    const len = dv.getUint32(off + 4, true);
    const ax = dv.getInt16(off + 8, true);
    const ay = dv.getInt16(off + 10, true);
    const g = dv.getUint16(off + 12, true);
    const i = dv.getUint16(off + 14, true);
    const linked = dv.getUint16(off + 16, true);
    const samePal = u8[off + 18];
    const dataStart = off + 32;
    if (len === 0) {
      const src = sprites[linked];
      if (src) sprites.push({ ...src, g, i, ax, ay });
      else sprites.push(null);
    } else {
      const pcx = u8.subarray(dataStart, dataStart + len);
      const img = decodePCX(pcx, samePal ? null : true);
      let pal = lastPal;
      if (img.palette && (!samePal || lastPal < 0)) {
        palettes.push(img.palette);
        palKeys.push(palettes.length === 1 ? '1,1' : 'v1,' + palettes.length);
        pal = palettes.length - 1;
        lastPal = pal;
      }
      sprites.push({ g, i, w: img.w, h: img.h, ax, ay, kind: 'idx', data: img.data, pal: Math.max(0, pal) });
    }
    if (next <= off) break;
    off = next;
  }
  // En SFF v1, les sprites des persos partagent la palette du premier sprite (palette "1,1").
  return { version: 1, palettes, palKeys, sprites: sprites.filter(Boolean) };
}

function decodePCX(p, wantPalette) {
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const xmin = dv.getUint16(4, true), ymin = dv.getUint16(6, true);
  const xmax = dv.getUint16(8, true), ymax = dv.getUint16(10, true);
  const bpl = dv.getUint16(66, true);
  const planes = p[65];
  const w = xmax - xmin + 1, h = ymax - ymin + 1;
  const data = new Uint8Array(w * h);
  let pos = 128;
  const line = new Uint8Array(bpl * planes);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < line.length && pos < p.length) {
      let b = p[pos++];
      if ((b & 0xc0) === 0xc0) {
        const run = b & 0x3f;
        const v = p[pos++];
        for (let k = 0; k < run && x < line.length; k++) line[x++] = v;
      } else line[x++] = b;
    }
    data.set(line.subarray(0, w), y * w);
  }
  let palette = null;
  if (wantPalette && p.length >= 769 && p[p.length - 769] === 0x0c) {
    palette = new Uint8Array(1024);
    const base = p.length - 768;
    for (let c = 0; c < 256; c++) {
      palette[c * 4] = p[base + c * 3];
      palette[c * 4 + 1] = p[base + c * 3 + 1];
      palette[c * 4 + 2] = p[base + c * 3 + 2];
      palette[c * 4 + 3] = c === 0 ? 0 : 255;
    }
  }
  return { w, h, data, palette };
}

// ---------------------------------------------------------------- SFF v2
async function parseV2(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const sprOff = dv.getUint32(36, true);
  const numSpr = dv.getUint32(40, true);
  const palOff = dv.getUint32(44, true);
  const numPal = dv.getUint32(48, true);
  const ldataOff = dv.getUint32(52, true);
  const tdataOff = dv.getUint32(60, true);

  const palettes = [];
  const palKeys = [];
  const palNodes = [];
  for (let n = 0; n < numPal; n++) {
    const o = palOff + n * 16;
    palNodes.push({
      g: dv.getInt16(o, true), i: dv.getInt16(o + 2, true),
      cols: dv.getUint16(o + 4, true), link: dv.getUint16(o + 6, true),
      off: dv.getUint32(o + 8, true), len: dv.getUint32(o + 12, true),
    });
  }
  for (let n = 0; n < numPal; n++) {
    let node = palNodes[n];
    let guard = 0;
    while (node.len === 0 && guard++ < 50 && palNodes[node.link] && palNodes[node.link] !== node) node = palNodes[node.link];
    const pal = new Uint8Array(1024);
    const base = ldataOff + node.off;
    const cols = Math.min(256, node.len / 4 | 0);
    for (let c = 0; c < cols; c++) {
      pal[c * 4] = u8[base + c * 4];
      pal[c * 4 + 1] = u8[base + c * 4 + 1];
      pal[c * 4 + 2] = u8[base + c * 4 + 2];
      pal[c * 4 + 3] = c === 0 ? 0 : 255;
    }
    palettes.push(pal);
    palKeys.push(palNodes[n].g + ',' + palNodes[n].i);
  }

  const nodes = [];
  for (let n = 0; n < numSpr; n++) {
    const o = sprOff + n * 28;
    nodes.push({
      g: dv.getUint16(o, true), i: dv.getUint16(o + 2, true),
      w: dv.getUint16(o + 4, true), h: dv.getUint16(o + 6, true),
      ax: dv.getInt16(o + 8, true), ay: dv.getInt16(o + 10, true),
      link: dv.getUint16(o + 12, true), fmt: u8[o + 14], depth: u8[o + 15],
      off: dv.getUint32(o + 16, true), len: dv.getUint32(o + 20, true),
      pal: dv.getUint16(o + 24, true), flags: dv.getUint16(o + 26, true),
    });
  }

  const decoded = new Array(numSpr);
  const decodeOne = async (n, depth = 0) => {
    if (decoded[n] !== undefined) return decoded[n];
    const s = nodes[n];
    if (s.len === 0) {
      if (depth > 50 || s.link === n || !nodes[s.link]) return (decoded[n] = null);
      const src = await decodeOne(s.link, depth + 1);
      return (decoded[n] = src ? { kind: src.kind, data: src.data, w: src.w, h: src.h, pal: src.pal } : null);
    }
    const base = ((s.flags & 1) ? tdataOff : ldataOff) + s.off;
    const raw = u8.subarray(base, base + s.len);
    try {
      let res;
      switch (s.fmt) {
        case 0: res = { kind: 'idx', data: raw.slice(0, s.w * s.h) }; break;
        case 2: res = { kind: 'idx', data: rle8(raw.subarray(4), s.w * s.h) }; break;
        case 3: res = { kind: 'idx', data: rle5(raw.subarray(4), s.w * s.h) }; break;
        case 4: res = { kind: 'idx', data: lz5(raw.subarray(4), s.w * s.h) }; break;
        case 10: case 11: case 12: res = await decodePNG(raw.subarray(4)); break;
        default: res = null;
      }
      if (res) { res.w = res.w || s.w; res.h = res.h || s.h; res.pal = s.pal; }
      return (decoded[n] = res);
    } catch (e) {
      return (decoded[n] = null);
    }
  };

  const sprites = [];
  for (let n = 0; n < numSpr; n++) {
    const d = await decodeOne(n);
    if (!d) continue;
    const s = nodes[n];
    sprites.push({ g: s.g, i: s.i, w: d.w, h: d.h, ax: s.ax, ay: s.ay, kind: d.kind, data: d.data, pal: d.pal });
  }
  return { version: 2, palettes, palKeys, sprites };
}

function rle8(src, size) {
  const out = new Uint8Array(size);
  let i = 0, j = 0;
  while (i < src.length && j < size) {
    const ch = src[i++];
    if ((ch & 0xc0) === 0x40) {
      const c = src[i++];
      for (let k = 0; k < (ch & 0x3f) && j < size; k++) out[j++] = c;
    } else out[j++] = ch;
  }
  return out;
}

function rle5(src, size) {
  const out = new Uint8Array(size);
  let i = 0, j = 0;
  while (i < src.length && j < size) {
    let rl = src[i++];
    let dl = src[i++] ?? 0;
    let c = 0;
    if (dl & 0x80) c = src[i++];
    dl &= 0x7f;
    for (let k = 0; k <= rl && j < size; k++) out[j++] = c;
    for (let d = 0; d < dl && i < src.length; d++) {
      const b = src[i++];
      c = b & 0x1f;
      rl = b >> 5;
      for (let k = 0; k <= rl && j < size; k++) out[j++] = c;
    }
  }
  return out;
}

function lz5(src, size) {
  const p = new Uint8Array(size);
  if (!src.length) return p;
  let i = 0, j = 0, n = 0;
  let ct = src[i], cts = 0, rb = 0, rbc = 0;
  if (src.length > 1) i++;
  while (j < size && i < src.length) {
    let d = src[i++];
    if (ct & (1 << cts)) {
      if ((d & 0x3f) === 0) {
        d = ((d << 2) | src[i++]) + 1;
        n = src[i++] + 2;
      } else {
        rb |= ((d & 0xc0) >> rbc);
        rbc += 2;
        n = d & 0x3f;
        if (rbc < 8) {
          d = src[i++] + 1;
        } else {
          d = rb + 1;
          rb = 0; rbc = 0;
        }
      }
      for (;;) {
        if (j < size) { p[j] = j - d >= 0 ? p[j - d] : 0; j++; }
        n--;
        if (n < 0) break;
      }
    } else {
      if ((d & 0xe0) === 0) {
        n = src[i++] + 8;
      } else {
        n = d >> 5;
        d &= 0x1f;
      }
      for (; n > 0 && j < size; n--) p[j++] = d;
    }
    cts++;
    if (cts >= 8) {
      if (i >= src.length) break;
      ct = src[i++]; cts = 0;
    }
  }
  return p;
}

// Décodeur PNG minimal (on a besoin des index de palette, que le navigateur ne donne pas).
export async function decodePNG(png) {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let w = 0, h = 0, bitDepth = 8, colorType = 0, interlace = 0;
  const idat = [];
  let plte = null, trns = null;
  while (pos + 8 <= png.length) {
    const len = dv.getUint32(pos);
    const type = td.decode(png.subarray(pos + 4, pos + 8));
    const body = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = dv.getUint32(pos + 8); h = dv.getUint32(pos + 12);
      bitDepth = png[pos + 16]; colorType = png[pos + 17]; interlace = png[pos + 20];
    } else if (type === 'PLTE') plte = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('PNG entrelacé non géré');
  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  let o = 0;
  for (const c of idat) { z.set(c, o); o += c.length; }
  const raw = await inflateZlib(z);
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = Math.max(1, (chans * bitDepth) >> 3);
  const stride = (w * chans * bitDepth + 7) >> 3;
  const img = new Uint8Array(stride * h);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = img.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
    prev = cur;
  }
  if (colorType === 3) {
    const data = new Uint8Array(w * h);
    if (bitDepth === 8) data.set(img.subarray(0, w * h));
    else {
      const per = 8 / bitDepth, mask = (1 << bitDepth) - 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const byte = img[y * stride + ((x / per) | 0)];
        data[y * w + x] = (byte >> ((per - 1 - (x % per)) * bitDepth)) & mask;
      }
    }
    return { kind: 'idx', data, w, h };
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let k = 0, n = w * h; k < n; k++) {
    if (colorType === 6) { rgba.set(img.subarray(k * 4, k * 4 + 4), k * 4); }
    else if (colorType === 2) {
      rgba[k * 4] = img[k * 3]; rgba[k * 4 + 1] = img[k * 3 + 1]; rgba[k * 4 + 2] = img[k * 3 + 2]; rgba[k * 4 + 3] = 255;
    } else if (colorType === 0) { const v = img[k]; rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = v; rgba[k * 4 + 3] = 255; }
    else if (colorType === 4) { const v = img[k * 2]; rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = v; rgba[k * 4 + 3] = img[k * 2 + 1]; }
  }
  return { kind: 'rgba', data: rgba, w, h };
}

// Fichier .act (palette Photoshop, 256 couleurs RGB, stockée à l'envers pour Mugen).
export function parseACT(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const pal = new Uint8Array(1024);
  for (let c = 0; c < 256; c++) {
    const src = (255 - c) * 3;
    pal[c * 4] = u8[src]; pal[c * 4 + 1] = u8[src + 1]; pal[c * 4 + 2] = u8[src + 2];
    pal[c * 4 + 3] = c === 0 ? 0 : 255;
  }
  return pal;
}
