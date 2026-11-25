// Banque de sprites à l'exécution : décompresse le pack et crée les images à la demande, par costume.
import { inflateZlib, fromBase64 } from '../import/inflate.js';
import { huePalette } from '../import/mugen.js';

export class SpriteBank {
  static async load(def) {
    const bank = new SpriteBank();
    bank.blob = await inflateZlib(fromBase64(def.pack.blob));
    bank.table = new Map();
    for (const s of def.pack.sprites) bank.table.set(s[0] + ',' + s[1], s);
    bank.palettes = (def.palettes || []).map(fromBase64);
    bank.palBase = def.palBase ?? 0;
    bank.swap = new Set(def.palSwap && def.palSwap.length ? def.palSwap : [bank.palBase]);
    bank.costumes = def.costumes || [{ pal: 0, hue: 0 }];
    bank.cache = new Map();
    bank.costumePals = new Map();
    return bank;
  }

  has(g, i) { return this.table.has(g + ',' + i); }
  info(g, i) {
    const s = this.table.get(g + ',' + i);
    return s ? { w: s[2], h: s[3], ax: s[4], ay: s[5] } : null;
  }

  costumePalette(c) {
    if (this.costumePals.has(c)) return this.costumePals.get(c);
    const cos = this.costumes[c] || this.costumes[0] || { pal: 0, hue: 0 };
    let pal = this.palettes[cos.pal] || this.palettes[0];
    if (pal && cos.hue) pal = huePalette(pal, cos.hue);
    this.costumePals.set(c, pal);
    return pal;
  }

  // Renvoie { img (canvas), ax, ay, w, h } ou null
  get(g, i, costume = 0) {
    const key = g + ',' + i + ',' + costume;
    let e = this.cache.get(key);
    if (e !== undefined) return e;
    const s = this.table.get(g + ',' + i);
    if (!s) { this.cache.set(key, null); return null; }
    const [, , w, h, ax, ay, kind, palIdx, off, len] = s;
    if (w === 0 || h === 0) { this.cache.set(key, null); return null; }
    const data = this.blob.subarray(off, off + len);
    const rgba = new Uint8ClampedArray(w * h * 4);
    if (kind === 1) rgba.set(data.subarray(0, w * h * 4));
    else {
      const pal = this.swap.has(palIdx) ? this.costumePalette(costume) : (this.palettes[palIdx] || this.palettes[0]);
      if (pal) {
        for (let k = 0, n = w * h; k < n; k++) {
          const c = data[k];
          if (c === 0) continue;
          const p = c * 4, q = k * 4;
          rgba[q] = pal[p]; rgba[q + 1] = pal[p + 1]; rgba[q + 2] = pal[p + 2]; rgba[q + 3] = 255;
        }
      }
    }
    const cv = makeCanvas(w, h);
    cv.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    e = { img: cv, ax, ay, w, h };
    this.cache.set(key, e);
    return e;
  }

  // Version blanche (pour les flashs de charge / invincibilité)
  getWhite(g, i, costume = 0) {
    const key = 'w' + g + ',' + i;
    let e = this.cache.get(key);
    if (e !== undefined) return e;
    const base = this.get(g, i, costume);
    if (!base) { this.cache.set(key, null); return null; }
    const cv = makeCanvas(base.w, base.h);
    const cx = cv.getContext('2d');
    cx.drawImage(base.img, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, base.w, base.h);
    e = { ...base, img: cv };
    this.cache.set(key, e);
    return e;
  }
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Lecteur d'animation Mugen (élément courant, temps, boucle)
export class AnimPlayer {
  constructor(anims) { this.anims = anims; this.set(null); }
  set(no, force = false) {
    if (!force && no === this.no) return;
    this.no = no;
    this.anim = no != null ? this.anims[no] : null;
    this.elem = 0; this.time = 0; this.total = 0; this.ended = false; this.looped = false;
  }
  get frame() { return this.anim ? this.anim.frames[this.elem] : null; }
  step() {
    const a = this.anim;
    if (!a || !a.frames.length) { this.ended = true; return; }
    this.total++;
    const f = a.frames[this.elem];
    if (f.t < 0) return;
    this.time++;
    if (this.time >= Math.max(1, f.t)) {
      this.time = 0;
      if (this.elem + 1 < a.frames.length) this.elem++;
      else { this.ended = true; this.looped = true; this.elem = a.loop || 0; }
    }
  }
  // Durée totale en frames (sans boucle). -1 si infinie
  static length(anim) {
    if (!anim) return 0;
    let t = 0;
    for (const f of anim.frames) { if (f.t < 0) return -1; t += Math.max(1, f.t); }
    return t;
  }
}

export function drawFrame(ctx, bank, frame, x, y, facing, scale, costume = 0, opts = {}) {
  if (!frame || frame.g < 0) return;
  const spr = opts.white ? bank.getWhite(frame.g, frame.i, costume) : bank.get(frame.g, frame.i, costume);
  if (!spr) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  ctx.translate(frame.ox, frame.oy);
  if (frame.fh) ctx.scale(-1, 1);
  if (frame.fv) ctx.scale(1, -1);
  if (frame.trans === 'add') ctx.globalCompositeOperation = 'lighter';
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  ctx.drawImage(spr.img, -spr.ax, -spr.ay);
  ctx.restore();
}
