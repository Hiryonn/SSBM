// Un match : boucle de jeu, collisions des coups, KO, caméra, effets, HUD.
import { Fighter } from './fighter.js';
import { Stage } from './stage.js';
import { SpriteBank, AnimPlayer, drawFrame } from './sprites.js';
import { Controller, endFrameInput } from './input.js';
import { CPU } from './ai.js';
import { K } from './constants.js';
import { sfx, playMusic, stopMusic, pauseMusic } from './audio.js';
import { PLAYER_COLORS } from '../data/defs.js';

const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

class FX {
  constructor() { this.list = []; this.shake = 0; }
  spark(x, y, power, color = '#fff') {
    const n = 6 + Math.min(10, power | 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * (1.5 + power * 0.15);
      this.list.push({ t: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 12 + Math.random() * 10, max: 22, color, size: 1.5 });
    }
    this.list.push({ t: 'ring', x, y, r: 4, vr: 1.6 + power * 0.08, life: 10, max: 10, color });
  }
  puff(x, y, s = 1) {
    for (let k = 0; k < 5; k++) this.list.push({ t: 'p', x: x + (Math.random() - 0.5) * 10 * s, y: y - 2, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.6, life: 16, max: 16, color: 'rgba(240,240,240,0.8)', size: 2.5 * s });
  }
  text(x, y, str, color) { this.list.push({ t: 'txt', x, y, str, color, life: 50, max: 50 }); }
  ko(x, y, ang, color) { this.list.push({ t: 'ko', x, y, ang, color, life: 50, max: 50 }); }
  trail(x, y, color) { this.list.push({ t: 'p', x, y, vx: 0, vy: 0, life: 14, max: 14, color, size: 2.2 }); }
  step() {
    for (const p of this.list) {
      p.life--;
      if (p.t === 'p') { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; }
      if (p.t === 'ring') p.r += p.vr;
      if (p.t === 'txt') p.y -= 0.4;
    }
    this.list = this.list.filter((p) => p.life > 0);
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.2) this.shake = 0;
  }
  draw(ctx, view) {
    for (const p of this.list) {
      const a = p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      if (p.t === 'p') { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      else if (p.t === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); }
      else if (p.t === 'txt') { ctx.fillStyle = p.color; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.str, p.x, p.y); }
      else if (p.t === 'ko') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        const len = 900, wdt = 60 * a;
        const g = ctx.createLinearGradient(0, 0, -len, 0);
        g.addColorStop(0, '#fff'); g.addColorStop(0.2, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-len, -wdt); ctx.lineTo(-len, wdt); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

class Projectile {
  constructor(owner, p) {
    this.owner = owner;
    this.def = p;
    this.facing = owner.drawFacing;
    this.scale = owner.scale;
    this.x = owner.x + (p.x || 0) * owner.scale * this.facing;
    this.y = owner.y + (p.y ?? -owner.S.height * 0.5) * owner.scale;
    this.vx = (p.vx ?? 4) * this.facing; this.vy = p.vy || 0;
    this.life = p.life ?? 90;
    this.anim = new AnimPlayer(owner.def.anims);
    this.anim.set(p.anim);
    this.hitSet = new Set();
    this.dead = false;
  }
  step() {
    this.x += this.vx; this.y += this.vy;
    if (this.def.gravity) this.vy += this.def.gravity;
    this.anim.step();
    if (--this.life <= 0) this.dead = true;
  }
  boxes() {
    const f = this.anim.frame;
    const s = this.scale;
    if (f && f.c1.length) return f.c1.map((b) => { const x1 = this.x + b[0] * s * this.facing, x2 = this.x + b[2] * s * this.facing; return [Math.min(x1, x2), this.y + b[1] * s, Math.max(x1, x2), this.y + b[3] * s]; });
    return [[this.x - 7, this.y - 7, this.x + 7, this.y + 7]];
  }
  draw(ctx) {
    drawFrame(ctx, this.owner.bank, this.anim.frame, this.x, this.y, this.facing, this.scale, this.owner.costume, {});
  }
}

export class Match {
  // cfg : { stageDef, players: [{ def, bank?, type: 'human'|'cpu', source, level, costume, name }], rules, keymaps, debug }
  static async create(cfg) {
    const m = new Match();
    m.rules = { mode: 'stock', stocks: 3, time: 180, teams: false, ...cfg.rules };
    m.debug = !!cfg.debug;
    m.training = !!cfg.training;
    m.stage = await Stage.load(cfg.stageDef);
    m.fighters = [];
    m.cpus = [];
    const banks = new Map();
    const spawns = cfg.stageDef.spawns || [[-60, 0], [60, 0], [-120, 0], [120, 0]];
    const usedCostumes = new Set();
    for (let k = 0; k < cfg.players.length; k++) {
      const p = { ...cfg.players[k] };
      // deux fois le même perso : couleurs différentes
      const nCos = p.def.costumes?.length || 1;
      let cos = p.costume || 0;
      for (let n = 0; n < nCos && usedCostumes.has(p.def.id + ':' + cos); n++) cos = (cos + 1) % nCos;
      usedCostumes.add(p.def.id + ':' + cos);
      p.costume = cos;
      let bank = p.bank || banks.get(p.def.id);
      if (!bank) { bank = await SpriteBank.load(p.def); banks.set(p.def.id, bank); }
      const ctrl = new Controller(p.type === 'cpu' ? { type: 'cpu' } : (p.source || { type: 'kb', slot: 0 }), cfg.keymaps, cfg.padMap);
      const sp = spawns[p.port ?? k] || [0, 0];
      const f = new Fighter(p.def, bank, {
        port: p.port ?? k, costume: p.costume || 0, ctrl, color: PLAYER_COLORS[(p.port ?? k) % 4],
        stocks: m.rules.mode === 'stock' ? m.rules.stocks : 99, x: sp[0], y: sp[1] - 0.5, facing: sp[0] > 0 ? -1 : 1, team: p.team,
      });
      f.tag = p.type === 'cpu' ? 'CPU' : 'J' + ((p.port ?? k) + 1);
      f.name = p.name || p.def.name;
      f.isCPU = p.type === 'cpu';
      if (p.type === 'cpu') { const ai = new CPU(f, p.level || 5); ctrl.cpu = ai.out; m.cpus.push(ai); }
      if (p.dummy) f.dummy = true;
      // Pose au sol directement
      const land = m.stage.landing(f.x, f.y - 50, f.y + 400, false);
      if (land) { f.y = land.y; f.onLand(null, land); f.setState('idle', 'idle'); }
      m.fighters.push(f);
    }
    m.projectiles = [];
    m.fx = new FX();
    m.time = 0;
    m.phase = m.training ? 'play' : 'intro';
    m.phaseT = 0;
    m.cam = { x: 0, y: -60, ppu: 3 };
    m.paused = false;
    m.koOrder = [];
    m.hitstop = 0;
    m.slow = 0;
    if (cfg.music !== false) playMusic(cfg.stageDef.music);
    return m;
  }

  sfx(kind, p) { sfx(kind, p); }

  spawnProjectile(owner, p) {
    if (p.anim == null || !owner.def.anims[p.anim]) return;
    this.projectiles.push(new Projectile(owner, p));
  }

  onHit(target, attacker, dmg, kb) {
    sfx('hit', dmg + kb / 20);
    const hb = target.hurtboxes()[0];
    this.fx.spark((hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2, dmg, kb > 100 ? '#ffd23f' : '#fff');
    if (kb > 60) this.fx.shake = Math.min(10, kb / 16);
  }

  togglePause() {
    if (this.phase !== 'play') return;
    this.paused = !this.paused;
    pauseMusic(this.paused);
  }

  step() {
    if (this.paused) return;
    this.time++;
    this.phaseT++;
    if (this.phase === 'intro') {
      if (this.phaseT % 50 === 1 && this.phaseT < 150) sfx('count');
      if (this.phaseT === 150) { sfx('go'); this.phase = 'play'; this.phaseT = 0; }
      for (const f of this.fighters) { f.ctrl.update(); f.anim.step(); }
      endFrameInput();
      this.stage.step();
      this.updateCamera(true);
      return;
    }
    if (this.phase === 'end') {
      if (this.phaseT > 150) this.phase = 'done';
      if (this.phaseT % 3 !== 0) { this.fx.step(); return; }
    }
    if (this.phase === 'done') return;
    this.stage.step();
    for (const ai of this.cpus) ai.think(this);
    for (const f of this.fighters) {
      f.ctrl.update();
      if (f.dummy) { f.ctrl.x = f.ctrl.y = 0; for (const k in f.ctrl.pressed) f.ctrl.pressed[k] = false; for (const k in f.ctrl.held) f.ctrl.held[k] = false; }
    }
    endFrameInput();
    for (const f of this.fighters) f.step(this);
    for (const p of this.projectiles) p.step();
    this.resolveHits();
    this.pushApart();
    this.checkKO();
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.fx.step();
    for (const f of this.fighters) if (f.state === 'tumble' && f.hitstun > 0 && this.time % 2 === 0) this.fx.trail(f.x, f.y - f.h / 2, f.color);
    this.updateCamera(false);
    if (this.phase === 'play' && !this.training) this.checkEnd();
  }

  enemies(a, b) { return a !== b && !(this.rules.teams && a.team === b.team); }

  resolveHits() {
    const pending = [];
    for (const f of this.fighters) {
      if (f.dead || f.hitlag > 0) continue;
      const hb = f.hitboxes();
      if (!hb) continue;
      let set = f.hitSets.get(hb.group);
      if (!set) { set = new Set(); f.hitSets.set(hb.group, set); }
      for (const t of this.fighters) {
        if (!this.enemies(f, t) || !t.canBeHit || set.has(t)) continue;
        const hurt = t.hurtboxes();
        if (hb.boxes.some((b) => hurt.some((h) => overlap(b, h)))) {
          set.add(t);
          pending.push([t, hb.hit, f, f.drawFacing, { chargeMul: 1 + 0.4 * (f.chargeT / 60) }]);
        }
      }
    }
    for (const p of this.projectiles) {
      const boxes = p.boxes();
      for (const t of this.fighters) {
        if (!this.enemies(p.owner, t) || !t.canBeHit || p.hitSet.has(t)) continue;
        if (boxes.some((b) => t.hurtboxes().some((h) => overlap(b, h)))) {
          p.hitSet.add(t);
          const hit = { dmg: p.def.dmg ?? 6, angle: p.def.angle ?? 40, bkb: p.def.bkb ?? 20, kbg: p.def.kbg ?? 50 };
          pending.push([t, hit, p.owner, Math.sign(p.vx) || p.facing, {}]);
          if (!p.def.pierce) p.dead = true;
        }
      }
    }
    for (const [t, hit, f, dir, o] of pending) t.takeHit(this, hit, f, dir, o);
  }

  pushApart() {
    const fs = this.fighters.filter((f) => !f.dead && f.grounded);
    for (let a = 0; a < fs.length; a++) for (let b = a + 1; b < fs.length; b++) {
      const A = fs[a], B = fs[b];
      const d = B.x - A.x, min = (A.w + B.w) * 0.3;
      if (Math.abs(d) < min && Math.abs(A.y - B.y) < 10) {
        const push = (min - Math.abs(d)) * 0.15 * (Math.sign(d) || 1);
        A.x -= push; B.x += push;
      }
    }
  }

  checkKO() {
    const bz = this.stage.def.blast;
    for (const f of this.fighters) {
      if (f.dead) continue;
      const out = f.x < bz.left || f.x > bz.right || f.y > bz.bottom || (f.y - f.h < bz.top && (f.state === 'tumble' || f.state === 'hitstun'));
      if (f.y - f.h < bz.top - 60) f.y = bz.top - 60 + f.h;
      if (!out) continue;
      const cx = Math.max(bz.left, Math.min(bz.right, f.x)), cy = Math.max(bz.top, Math.min(bz.bottom, f.y - f.h / 2));
      const ang = Math.atan2(cy - (this.cam.y), cx - this.cam.x);
      this.fx.ko(cx, cy, ang, f.color);
      this.fx.shake = 10;
      sfx('ko');
      const killer = f.lastHit && this.time - f.lastHit.t < 600 ? this.fighters.find((o) => o.port === f.lastHit.port) : null;
      if (killer && killer !== f) killer.stats.kos++;
      else f.stats.sds++;
      f.stats.falls++;
      if (this.training) { f.stocks++; }
      f.die(this);
      if (f.stocks <= 0 && this.rules.mode === 'stock') this.koOrder.push(f);
    }
  }

  checkEnd() {
    if (this.rules.mode === 'stock') {
      const alive = this.fighters.filter((f) => f.stocks > 0);
      const sides = new Set(alive.map((f) => (this.rules.teams ? 'T' + f.team : f.port)));
      if (sides.size <= 1) { this.phase = 'end'; this.phaseT = 0; this.winnerSide = alive[0] || null; }
    } else if (this.time >= (this.rules.time * 60) + 150) {
      this.phase = 'end'; this.phaseT = 0;
    }
  }

  results() {
    const score = (f) => (this.rules.mode === 'stock' ? f.stocks * 1000 + (this.koOrder.indexOf(f) + 1) * 10 - 0 : (f.stats.kos - f.stats.falls - f.stats.sds) * 1000 - f.percent);
    const rank = [...this.fighters].sort((a, b) => score(b) - score(a));
    return rank.map((f, k) => ({ place: k + 1, name: f.name, port: f.port, color: f.color, kos: f.stats.kos, falls: f.stats.falls, sds: f.stats.sds, dealt: Math.round(f.stats.dealt), def: f.def, costume: f.costume, bank: f.bank }));
  }

  // ----------------------------------------------------------------- caméra
  updateCamera(snap) {
    const live = this.fighters.filter((f) => !f.dead);
    const cb = this.stage.def.camera;
    const W = this.viewW || 960, H = this.viewH || 540;
    let minX, maxX, minY, maxY;
    if (!live.length) { minX = -100; maxX = 100; minY = -150; maxY = 20; }
    else {
      minX = Math.min(...live.map((f) => f.x)) - 70;
      maxX = Math.max(...live.map((f) => f.x)) + 70;
      minY = Math.min(...live.map((f) => f.y - f.h)) - 50;
      maxY = Math.max(...live.map((f) => f.y)) + 40;
    }
    const ppuMax = H / 290, ppuMin = Math.min(W / (cb.right - cb.left), H / (cb.bottom - cb.top));
    let ppu = Math.min(W / (maxX - minX), H / (maxY - minY));
    ppu = Math.max(ppuMin, Math.min(ppuMax, ppu));
    let x = (minX + maxX) / 2, y = (minY + maxY) / 2;
    const hw = W / ppu / 2, hh = H / ppu / 2;
    x = cb.right - cb.left <= hw * 2 ? (cb.left + cb.right) / 2 : Math.max(cb.left + hw, Math.min(cb.right - hw, x));
    y = cb.bottom - cb.top <= hh * 2 ? (cb.top + cb.bottom) / 2 : Math.max(cb.top + hh, Math.min(cb.bottom - hh, y));
    const c = this.cam;
    if (snap) { c.x = x; c.y = y; c.ppu = ppu; return; }
    c.x += (x - c.x) * 0.08; c.y += (y - c.y) * 0.08; c.ppu += (ppu - c.ppu) * 0.05;
  }

  // ----------------------------------------------------------------- dessin
  draw(ctx, W, H) {
    this.viewW = W; this.viewH = H;
    const c = this.cam;
    const sh = this.fx.shake;
    const ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(c.ppu, 0, 0, c.ppu, W / 2 - c.x * c.ppu + ox, H / 2 - c.y * c.ppu + oy);
    const view = { W, H, left: c.x - W / 2 / c.ppu, right: c.x + W / 2 / c.ppu, top: c.y - H / 2 / c.ppu, bottom: c.y + H / 2 / c.ppu };
    this.stage.drawBG(ctx, c, 0, view);
    this.stage.drawGeometry(ctx, { debug: this.debug });
    const order = [...this.fighters].sort((a, b) => (a.state === 'attack') - (b.state === 'attack'));
    for (const f of order) f.draw(ctx, this, { debug: this.debug });
    for (const p of this.projectiles) {
      p.draw(ctx);
      if (this.debug) { ctx.strokeStyle = '#f44'; for (const b of p.boxes()) ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
    }
    this.stage.drawBG(ctx, c, 1, view);
    this.fx.draw(ctx, view);
    if (this.debug) {
      const bz = this.stage.def.blast;
      ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2 / c.ppu;
      ctx.strokeRect(bz.left, bz.top, bz.right - bz.left, bz.bottom - bz.top);
    }
    // Indicateurs hors-écran
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of this.fighters) {
      if (f.dead) continue;
      const sx = W / 2 + (f.x - c.x) * c.ppu, sy = H / 2 + (f.y - f.h / 2 - c.y) * c.ppu;
      if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) continue;
      const cx = Math.max(28, Math.min(W - 28, sx)), cy = Math.max(28, Math.min(H - 120, sy));
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.clip();
      drawFrame(ctx, f.bank, f.anim.frame, cx, cy + 16, f.drawFacing, 0.5 * f.scale, f.costume, {});
      ctx.restore();
    }
    if (!this.noHUD) this.drawHUD(ctx, W, H);
  }

  drawHUD(ctx, W, H) {
    const n = this.fighters.length;
    const cw = Math.min(220, (W - 40) / n);
    const x0 = W / 2 - (cw * n) / 2;
    ctx.textAlign = 'left';
    this.fighters.forEach((f, k) => {
      const x = x0 + k * cw + 6, y = H - 86;
      ctx.fillStyle = 'rgba(8,10,20,0.62)';
      roundRect(ctx, x, y, cw - 12, 74, 10); ctx.fill();
      ctx.fillStyle = f.color; ctx.fillRect(x, y, 6, 74);
      // portrait
      const icon = f.def.icon || f.def.portrait;
      ctx.save();
      roundRect(ctx, x + 12, y + 8, 46, 46, 6); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 12, y + 8, 46, 46);
      if (icon) {
        const s = f.bank.get(icon[0], icon[1], f.costume);
        if (s) { const sc = Math.min(46 / s.w, 46 / s.h); ctx.imageSmoothingEnabled = sc < 1; ctx.drawImage(s.img, x + 12 + (46 - s.w * sc) / 2, y + 8 + (46 - s.h * sc) / 2, s.w * sc, s.h * sc); ctx.imageSmoothingEnabled = false; }
      } else drawFrame(ctx, f.bank, f.def.anims[f.def.states?.idle ?? 0]?.frames[0], x + 35, y + 50, 1, 0.75 * f.scale, f.costume, {});
      ctx.restore();
      // pourcentage
      const p = Math.round(f.percent);
      const heat = Math.min(1, p / 150);
      ctx.fillStyle = f.dead && f.stocks <= 0 && this.rules.mode === 'stock' ? '#666' : `rgb(255,${Math.round(255 - heat * 190)},${Math.round(255 - heat * 230)})`;
      ctx.font = '800 34px "Archivo Black", system-ui, sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = '#000';
      const pt = f.dead && f.stocks <= 0 && this.rules.mode === 'stock' ? '—' : p + '%';
      ctx.strokeText(pt, x + 66, y + 42); ctx.fillText(pt, x + 66, y + 42);
      ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText((f.tag ? f.tag + ' · ' : '') + f.name, x + 14, y + 68, cw - 30);
      if (this.training) {
        ctx.fillText('Vies infinies', x + 70, y + 58);
      } else if (this.rules.mode === 'stock') {
        for (let s = 0; s < Math.min(f.stocks, 6); s++) { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x + 70 + s * 11, y + 54, 4, 0, Math.PI * 2); ctx.fill(); }
        if (f.stocks > 6) { ctx.fillText('×' + f.stocks, x + 70 + 6 * 11, y + 58); }
      } else {
        ctx.fillText('KO ' + f.stats.kos + ' · Chutes ' + (f.stats.falls), x + 66, y + 58);
      }
    });
    // Chrono
    if (this.rules.mode === 'time' && !this.training) {
      const left = Math.max(0, this.rules.time * 60 - (this.phase === 'intro' ? 0 : this.time - 150));
      const s = Math.ceil(left / 60);
      ctx.font = '800 28px "Archivo Black", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
      const t = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      ctx.strokeText(t, W / 2, 40); ctx.fillText(t, W / 2, 40);
    }
    // Intro / fin
    ctx.textAlign = 'center';
    let big = null;
    if (this.phase === 'intro') big = ['3', '2', '1'][Math.floor(this.phaseT / 50)] || 'GO!';
    else if (this.phase === 'play' && this.phaseT < 40 && !this.training) big = 'GO!';
    else if (this.phase === 'end' || this.phase === 'done') big = 'GAME!';
    if (big) {
      ctx.font = '900 96px "Archivo Black", system-ui, sans-serif';
      ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.fillStyle = big === 'GAME!' ? '#ffd23f' : '#fff';
      ctx.strokeText(big, W / 2, H / 2); ctx.fillText(big, W / 2, H / 2);
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '900 56px "Archivo Black", system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText('PAUSE', W / 2, H / 2 - 10);
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText('Entrée / Start : reprendre   ·   Échap / B : quitter le match', W / 2, H / 2 + 26);
    }
  }

  destroy() { stopMusic(); }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
