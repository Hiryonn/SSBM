// Stage à l'exécution : décor (calques Mugen), sols, plateformes, zones de KO.
import { SpriteBank, AnimPlayer, drawFrame } from './sprites.js';

export class Stage {
  static async load(def) {
    const st = new Stage();
    st.def = def;
    st.bank = def.pack ? await SpriteBank.load({ ...def, costumes: [{ pal: 0, hue: 0 }], palBase: -1 }) : null;
    st.players = (def.bg || []).map((el) => (el.type === 'anim' && el.anim != null ? new AnimPlayer(def.anims || {}) : null));
    st.players.forEach((p, k) => p && p.set(def.bg[k].anim));
    st.time = 0;
    st.rebuild();
    return st;
  }

  rebuild() {
    const d = this.def;
    this.blocks = (d.ground || []).map((g) => ({ ...g, x1: Math.min(g.x1, g.x2), x2: Math.max(g.x1, g.x2), y1: Math.min(g.y1, g.y2), y2: Math.max(g.y1, g.y2) }));
    this.plats = (d.platforms || []).map((p) => ({ ...p, x1: Math.min(p.x1, p.x2), x2: Math.max(p.x1, p.x2) }));
    this.ledges = [];
    for (const b of this.blocks) {
      if (b.noLedge) continue;
      this.ledges.push({ x: b.x1, y: b.y1, side: -1, owner: null });
      this.ledges.push({ x: b.x2, y: b.y1, side: 1, owner: null });
    }
  }

  step() {
    this.time++;
    for (const p of this.players) if (p) p.step();
  }

  // Surface sur laquelle on se pose en descendant de y0 à y1 à l'abscisse x.
  landing(x, y0, y1, dropThrough) {
    let best = null;
    for (const b of this.blocks) {
      if (x >= b.x1 && x <= b.x2 && y0 <= b.y1 + 0.01 && y1 >= b.y1 && (!best || b.y1 < best.y)) best = { y: b.y1, solid: true, ref: b };
    }
    if (!dropThrough) {
      for (const p of this.plats) {
        if (x >= p.x1 && x <= p.x2 && y0 <= p.y + 0.01 && y1 >= p.y && (!best || p.y < best.y)) best = { y: p.y, solid: false, ref: p };
      }
    }
    return best;
  }

  // Le sol existe-t-il encore sous x pour cette surface ?
  stillOn(ref, x) { return ref && x >= ref.x1 && x <= ref.x2; }
  surfaceY(ref) { return ref.y1 != null ? ref.y1 : ref.y; }

  // Collisions latérales / plafond avec les blocs pleins. Corrige pos/vel du perso.
  solidCollide(f, oldX, oldY) {
    const hw = f.def.stats.width * 0.35 * f.scale;
    const h = f.def.stats.height * f.scale;
    for (const b of this.blocks) {
      const top = f.y - h, bottom = f.y;
      if (bottom <= b.y1 + 0.5 || top >= b.y2) continue;
      if (f.x + hw <= b.x1 || f.x - hw >= b.x2) continue;
      // Venait d'en dessous : plafond
      if (oldY - h >= b.y2 - 0.5) { f.y = b.y2 + h; if (f.vy < 0) f.vy = 0; if (f.kbVy < 0) f.kbVy = -f.kbVy * 0.4; continue; }
      // Côtés
      if (oldX <= b.x1) { f.x = b.x1 - hw; if (f.vx > 0) f.vx = 0; if (f.kbVx > 0) f.kbVx = -f.kbVx * 0.4; }
      else if (oldX >= b.x2) { f.x = b.x2 + hw; if (f.vx < 0) f.vx = 0; if (f.kbVx < 0) f.kbVx = -f.kbVx * 0.4; }
      else { f.y = b.y1; }
    }
  }

  // ----------------------------------------------------------------- dessin
  drawBG(ctx, cam, layer, view) {
    const d = this.def;
    if (layer === 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (d.sky && d.sky.length === 2) {
        const g = ctx.createLinearGradient(0, 0, 0, view.H);
        g.addColorStop(0, d.sky[0]); g.addColorStop(1, d.sky[1]);
        ctx.fillStyle = g;
      } else ctx.fillStyle = d.bgColor || '#000';
      ctx.fillRect(0, 0, view.W, view.H);
      ctx.restore();
    }
    if (!this.bank) return;
    const zo = d.zoffset ?? 200;
    const lcH = (d.localcoord && d.localcoord[1]) || 240;
    const cx = cam.x, cy = cam.y - (lcH / 2 - zo);
    const range = (base, size, count, vmin, vmax) => {
      if (!count) return [0];
      if (count !== 1) return Array.from({ length: count }, (_, n) => n);
      const out = [];
      const a = Math.floor((vmin - base) / size) - 1, b = Math.ceil((vmax - base) / size) + 1;
      for (let n = a; n <= b && out.length < 400; n++) out.push(n);
      return out;
    };
    (d.bg || []).forEach((el, k) => {
      if ((el.layer || 0) !== layer || el.hidden) return;
      const vel = el.velocity || [0, 0];
      const bx = el.start[0] + vel[0] * this.time + cx * (1 - el.delta[0]);
      const by = el.start[1] + vel[1] * this.time - zo + cy * (1 - el.delta[1]);
      const sx = el.scale?.[0] || 1, sy = el.scale?.[1] || 1;
      const frame = el.type === 'anim' ? this.players[k]?.frame
        : { g: el.spr[0], i: el.spr[1], ox: 0, oy: 0, fh: false, fv: false, trans: el.trans };
      if (!frame || frame.g < 0) return;
      const info = this.bank.info(frame.g, frame.i);
      if (!info) return;
      const tw = Math.max(1, (info.w + (el.tilespacing?.[0] || 0)) * sx);
      const th = Math.max(1, (info.h + (el.tilespacing?.[1] || 0)) * sy);
      ctx.save();
      if (el.trans === 'add') ctx.globalCompositeOperation = 'lighter';
      for (const nx of range(bx, tw, el.tile?.[0] || 0, view.left, view.right)) {
        for (const ny of range(by, th, el.tile?.[1] || 0, view.top, view.bottom)) {
          ctx.save();
          ctx.translate(bx + nx * tw, by + ny * th);
          ctx.scale(sx, sy);
          drawFrame(ctx, this.bank, frame, 0, 0, 1, 1, 0, {});
          ctx.restore();
        }
      }
      ctx.restore();
    });
  }

  drawGeometry(ctx, opts = {}) {
    for (const b of this.blocks) {
      if (b.style === 'none' && !opts.debug) continue;
      if (b.style === 'edge' && !opts.debug) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(b.x1, b.y1 - 1, b.x2 - b.x1, 2);
        continue;
      }
      const g = ctx.createLinearGradient(0, b.y1, 0, b.y2);
      g.addColorStop(0, b.color || '#5b6b8c');
      g.addColorStop(1, '#1b2236');
      ctx.fillStyle = opts.debug ? 'rgba(80,200,255,0.25)' : g;
      ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      ctx.fillStyle = opts.debug ? '#5cf' : '#dfe8ff';
      ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, 2);
    }
    for (const p of this.plats) {
      if (p.style === 'none' && !opts.debug) continue;
      ctx.fillStyle = opts.debug ? '#fc5' : (p.color || 'rgba(230,240,255,0.9)');
      ctx.fillRect(p.x1, p.y - 1, p.x2 - p.x1, 3);
      if (!opts.debug) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(p.x1 + 2, p.y + 2, p.x2 - p.x1 - 4, 3);
      }
    }
  }
}

