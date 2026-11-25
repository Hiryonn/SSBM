// Combattant : états, physique, coups, réception des coups.
import { AnimPlayer, drawFrame } from './sprites.js';
import { K, knockback } from './constants.js';
import { MOVE_INFO } from '../data/defs.js';

const AIR_STATES = new Set(['air', 'helpless', 'airdodge', 'tumble']);
const STOP_AT_EDGE = new Set(['attack', 'shield', 'land', 'roll', 'dodge', 'lie', 'getup', 'shieldstun', 'dizzy', 'climb', 'jumpsquat']);

export class Fighter {
  constructor(def, bank, opts = {}) {
    this.def = def;
    this.bank = bank;
    this.port = opts.port ?? 0;
    this.costume = opts.costume ?? 0;
    this.ctrl = opts.ctrl;
    this.color = opts.color || '#fff';
    this.team = opts.team ?? this.port;
    this.scale = (def.scale || 1) * (opts.scaleMul || 1);
    this.anim = new AnimPlayer(def.anims);
    this.stocks = opts.stocks ?? 3;
    this.stats = { kos: 0, falls: 0, dealt: 0, sds: 0 };
    this.percent = 0;
    this.shieldHP = K.shieldMax;
    this.spawn(opts.x ?? 0, opts.y ?? 0, opts.facing ?? 1);
  }

  get S() { return this.def.stats; }
  get w() { return this.S.width * this.scale; }
  get h() { return this.S.height * this.scale; }

  spawn(x, y, facing) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kbVx = 0; this.kbVy = 0;
    this.facing = facing; this.grounded = false; this.ground = null;
    this.jumpsLeft = this.S.jumps - 1;
    this.airdodgeUsed = false; this.sideBUsed = false; this.fastFall = false;
    this.hitlag = 0; this.hitstun = 0; this.invuln = 0; this.intangible = false;
    this.dropT = 0; this.regrab = 0; this.ledge = null; this.ledgeT = 0;
    this.move = null; this.moveId = null; this.hitSets = new Map(); this.chargeT = 0;
    this.projDone = new Set(); this.impulseDone = false;
    this.lastHit = null; this.dead = false; this.flash = 0; this.techWindow = 0;
    this.attackFlip = false;
    this.setState('air', 'fall');
  }

  // ------------------------------------------------------------------ outils
  animNo(slot) {
    const s = this.def.states?.[slot];
    return s != null && this.def.anims[s] ? s : (this.def.anims[0] ? 0 : null);
  }
  setState(state, animSlot, animNo) {
    this.state = state;
    this.stateT = 0;
    if (animNo != null) this.anim.set(animNo, true);
    else if (animSlot) this.anim.set(this.animNo(animSlot), true);
  }
  setAnimSlot(slot) { const n = this.animNo(slot); if (n !== this.anim.no) this.anim.set(n); }
  get drawFacing() { return this.facing * (this.attackFlip ? -1 : 1); }

  // ------------------------------------------------------------------ boucle
  step(match) {
    const c = this.ctrl;
    if (this.dead) { this.stepDead(match); return; }
    if (this.hitlag > 0) { this.hitlag--; return; }
    if (this.invuln > 0) this.invuln--;
    if (this.flash > 0) this.flash--;
    if (this.regrab > 0) this.regrab--;
    if (this.dropT > 0) this.dropT--;
    if (this.techWindow > 0) this.techWindow--;
    if (c.pressed.shield) this.techWindow = 12;
    if (this.state !== 'shield' && this.state !== 'shieldstun') this.shieldHP = Math.min(K.shieldMax, this.shieldHP + 0.08);
    this.stateT++;
    this.intangible = false;

    const handler = this['st_' + this.state];
    if (handler) handler.call(this, match, c);

    // L'animation avance (sauf pendant la charge d'un smash)
    if (!this.holdAnim) this.anim.step();
    this.holdAnim = false;

    this.physics(match);
  }

  // ------------------------------------------------------------------ actions au sol
  groundActions(match, c, fromRun = false) {
    if (c.pressed.jump) { c.consume('jump'); this.setState('jumpsquat', 'jumpSquat'); return true; }
    if (c.held.shield && this.state !== 'shield') { c.consume('shield'); this.setState('shield', 'shield'); return true; }
    if (this.groundAttack(match, c, fromRun)) { c.consume('attack', 'special', 'smash'); return true; }
    if (K.tapJump && c.yFlick <= 1 && c.up) { this.setState('jumpsquat', 'jumpSquat'); return true; }
    return false;
  }

  groundAttack(match, c, fromRun) {
    if (c.pressed.special) {
      if (c.up) return this.startMove('upB');
      if (c.down) return this.startMove('downB');
      if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); return this.startMove('sideB'); }
      return this.startMove('neutralB');
    }
    const smashDir = this.smashInput(c);
    if (smashDir) {
      if (smashDir === 'up') return this.startMove('usmash');
      if (smashDir === 'down') return this.startMove('dsmash');
      this.facing = smashDir === 'right' ? 1 : -1;
      return this.startMove('fsmash');
    }
    if (c.pressed.attack) {
      if (fromRun) return this.startMove('dash');
      if (c.up) return this.startMove('utilt');
      if (c.down) return this.startMove('dtilt');
      if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); return this.startMove('ftilt'); }
      return this.startMove('jab');
    }
    return false;
  }

  smashInput(c) {
    if (c.cPressed) {
      if (Math.abs(c.cy) > Math.abs(c.cx)) return c.cy < 0 ? 'up' : 'down';
      return c.cx > 0 ? 'right' : 'left';
    }
    const smashBtn = c.pressed.smash;
    const tapped = c.pressed.attack && c.smashTap;
    if (!smashBtn && !tapped) return null;
    if (smashBtn && Math.abs(c.x) < 0.3 && Math.abs(c.y) < 0.3) return this.facing > 0 ? 'right' : 'left';
    if (c.up) return 'up';
    if (c.down) return 'down';
    if (Math.abs(c.x) > 0.3) return c.x > 0 ? 'right' : 'left';
    return null;
  }

  airActions(match, c) {
    if (c.pressed.special) {
      c.consume('special');
      if (c.up) return this.startMove('upB');
      if (c.down) return this.startMove('downB');
      if (Math.abs(c.x) > 0.5 && !this.sideBUsed) { this.facing = Math.sign(c.x); this.sideBUsed = true; return this.startMove('sideB'); }
      if (Math.abs(c.x) <= 0.5) return this.startMove('neutralB');
    }
    let dir = null;
    if (c.cPressed) dir = Math.abs(c.cy) > Math.abs(c.cx) ? (c.cy < 0 ? 'u' : 'd') : (Math.sign(c.cx) === this.facing ? 'f' : 'b');
    else if (c.pressed.attack || c.pressed.smash) {
      if (c.up) dir = 'u';
      else if (c.down) dir = 'd';
      else if (Math.abs(c.x) > 0.4) dir = Math.sign(c.x) === this.facing ? 'f' : 'b';
      else dir = 'n';
    }
    if (dir) { c.consume('attack', 'smash'); return this.startMove({ n: 'nair', f: 'fair', b: 'bair', u: 'uair', d: 'dair' }[dir]); }
    if ((c.pressed.jump || (K.tapJump && c.yFlick === 0 && c.up)) && this.jumpsLeft > 0) {
      c.consume('jump');
      this.jumpsLeft--;
      this.vy = -this.S.doubleJumpForce;
      this.vx = c.x * this.S.airSpeed;
      if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
      this.fastFall = false;
      this.setState('air', 'doubleJump');
      this.doubleJumped = true;
      match?.fx.puff(this.x, this.y, 0.7);
      return true;
    }
    if (c.pressed.shield && !this.airdodgeUsed) {
      c.consume('shield');
      this.airdodgeUsed = true;
      const len = Math.hypot(c.x, c.y);
      if (len > 0.4) { this.vx = (c.x / len) * 4.2; this.vy = (c.y / len) * 4.2; this.adDir = true; }
      else this.adDir = false;
      this.setState('airdodge', 'airdodge');
      return true;
    }
    return false;
  }

  startMove(id) {
    const m = this.def.moves?.[id];
    if (!m || m.anim == null || !this.def.anims[m.anim]) return false;
    this.move = m; this.moveId = id;
    this.hitSets = new Map(); this.chargeT = 0; this.projDone = new Set(); this.impulseDone = false;
    this.attackFlip = !!m.flip;
    this.setState('attack', null, m.anim);
    if (this.grounded && !['dash'].includes(id)) this.vx *= 0.5;
    return true;
  }

  // ------------------------------------------------------------------ états
  st_idle(match, c) {
    this.setAnimSlot('idle');
    if (this.groundActions(match, c)) return;
    if (c.down) {
      if (c.yFlick <= 1 && this.ground && this.ground.y1 === undefined) return this.dropThrough();
      return this.setState('crouch', 'crouch');
    }
    if (Math.abs(c.x) > 0.3) {
      this.facing = Math.sign(c.x);
      if (c.xFlick <= 1 && Math.abs(c.x) > 0.7) { this.setState('run', 'run'); this.vx = this.facing * this.S.runSpeed * 0.9; }
      else this.setState('walk', 'walk');
    }
  }
  st_walk(match, c) {
    if (this.groundActions(match, c)) return;
    if (c.down) return this.setState('crouch', 'crouch');
    if (Math.abs(c.x) <= 0.3) return this.setState('idle', 'idle');
    if (c.xFlick <= 1 && c.prevFlickAge < 14) { this.facing = Math.sign(c.x); this.setState('run', 'run'); return; }
    this.facing = Math.sign(c.x);
    const target = c.x * this.S.walkSpeed * (Math.abs(c.x) > 0.8 && this.ctrl.source.type === 'pad' ? 1.3 : 1);
    this.vx += Math.sign(target - this.vx) * Math.min(0.25, Math.abs(target - this.vx));
  }
  st_run(match, c) {
    if (this.groundActions(match, c, true)) return;
    if (c.down) return this.setState('crouch', 'crouch');
    if (Math.abs(c.x) <= 0.3) return this.setState('idle', 'idle');
    if (Math.sign(c.x) !== this.facing) { this.facing = Math.sign(c.x); this.vx *= -0.3; }
    const target = this.facing * this.S.runSpeed;
    this.vx += Math.sign(target - this.vx) * Math.min(0.35, Math.abs(target - this.vx));
  }
  st_crouch(match, c) {
    if (c.yFlick <= 1 && this.ground && this.ground.y1 === undefined) return this.dropThrough();
    if (this.groundActions(match, c)) return;
    if (!c.down) this.setState('idle', 'idle');
  }
  dropThrough() {
    this.grounded = false; this.ground = null; this.dropT = 12; this.y += 2; this.vy = 1;
    this.setState('air', 'fall');
  }
  st_jumpsquat(match, c) {
    // Smash haut / spécial haut pendant l'impulsion (saut avec la direction haut)
    if (this.stateT <= 3 && (c.pressed.attack || c.pressed.special || c.pressed.smash) && c.up && !c.held.jump) {
      if (this.groundAttack(match, c, false)) { c.consume('attack', 'special', 'smash'); return; }
    }
    if (this.stateT >= 4) {
      const full = c.held.jump || (K.tapJump && c.up);
      this.vy = -(full ? this.S.jumpForce : this.S.shortHopForce);
      this.vx = Math.max(-this.S.airSpeed * 1.1, Math.min(this.S.airSpeed * 1.1, this.vx + c.x * 0.6));
      this.grounded = false; this.ground = null;
      this.doubleJumped = false;
      this.setState('air', 'jump');
      match?.fx.puff(this.x, this.y, 0.6);
    }
  }
  st_land(match, c) {
    this.setAnimSlot('land');
    if (this.stateT >= (this.landLag || 3)) { this.landLag = 0; this.setState('idle', 'idle'); this.st_idle(match, c); }
  }
  st_air(match, c) {
    if (this.airActions(match, c)) return;
    this.airDrift(c, 1);
    if (this.vy >= 0 && c.yFlick <= 2 && c.down && !this.fastFall) { this.fastFall = true; this.vy = this.S.fastFallSpeed; }
    if (this.vy < 0) this.setAnimSlot(this.doubleJumped ? 'doubleJump' : 'jump');
    else this.setAnimSlot('fall');
    this.tryLedge(match);
  }
  st_helpless(match, c) {
    this.setAnimSlot('helpless');
    this.airDrift(c, 0.6);
    this.tryLedge(match);
  }
  st_airdodge(match, c) {
    this.intangible = this.stateT >= 2 && this.stateT <= 26;
    if (this.adDir) { this.vx *= 0.9; this.vy *= 0.9; }
    if (this.stateT >= 32) { this.setState('air', 'fall'); }
  }
  st_attack(match, c) {
    const m = this.move;
    const f = this.anim.frame;
    // Charge des smashs
    if (m.charge != null && this.anim.elem === m.charge && this.chargeT < 60 && (c.held.attack || c.held.smash || Math.abs(c.cx) > 0.5 || Math.abs(c.cy) > 0.5)) {
      if (this.anim.time >= Math.max(0, (f?.t || 1) - 1)) { this.holdAnim = true; this.chargeT++; if (this.chargeT % 8 < 4) this.flash = 2; }
    }
    // Impulsion
    if (!this.impulseDone && this.anim.elem >= (m.at || 0)) {
      this.impulseDone = true;
      if (m.vx) this.vx = m.vx * this.drawFacing;
      if (m.vy) { this.vy = m.vy; if (this.grounded) { this.grounded = false; this.ground = null; this.y -= 1; } }
    }
    // Projectile
    if (m.proj && m.proj.anim != null && !this.projDone.has(this.anim.elem) && this.anim.elem === (m.proj.at || 0) && this.anim.time === 0) {
      this.projDone.add(this.anim.elem);
      match?.spawnProjectile(this, m.proj);
    }
    if (!this.grounded) {
      this.airDrift(c, 0.8);
      if (this.vy >= 0 && c.yFlick <= 2 && c.down && !this.fastFall) { this.fastFall = true; this.vy = this.S.fastFallSpeed; }
      if (this.moveId === 'upB' || this.moveId === 'sideB') this.tryLedge(match, true);
    }
    const ended = this.anim.ended || (f && f.t < 0 && this.anim.time > 0) || this.stateT > 400;
    if (ended) {
      this.attackFlip = false;
      const helpless = m.helpless && !this.grounded;
      this.move = null; this.moveId = null;
      if (this.grounded) this.setState('idle', 'idle');
      else this.setState(helpless ? 'helpless' : 'air', helpless ? 'helpless' : 'fall');
    }
  }
  st_shield(match, c) {
    this.intangible = false;
    this.shieldHP -= 0.13;
    if (this.shieldHP <= 0) return this.shieldBreak(match);
    if (c.pressed.jump || (K.tapJump && c.yFlick === 0 && c.up)) { c.consume('jump'); this.setState('jumpsquat', 'jumpSquat'); return; }
    if (c.xFlick <= 1 && Math.abs(c.x) > 0.6) { this.rollDir = Math.sign(c.x); this.setState('roll', 'roll'); return; }
    if (c.yFlick <= 1 && c.down) { this.setState('dodge', 'dodge'); return; }
    if (!c.held.shield) { this.setState('shielddrop', 'shield'); }
  }
  st_shielddrop() { if (this.stateT >= 7) this.setState('idle', 'idle'); }
  st_shieldstun() { if (this.stateT >= this.stunT) this.setState('shield', 'shield'); }
  st_roll() {
    this.intangible = this.stateT >= 4 && this.stateT <= 18;
    this.vx = this.stateT < 22 ? this.rollDir * 2.6 : this.vx * 0.7;
    this.facing = -this.rollDir;
    if (this.stateT >= 28) { this.facing = -this.rollDir; this.setState('idle', 'idle'); }
  }
  st_dodge() {
    this.intangible = this.stateT >= 3 && this.stateT <= 17;
    if (this.stateT >= 24) this.setState('idle', 'idle');
  }
  st_hitstun(match, c) {
    this.setAnimSlot(this.grounded ? 'hurt' : 'hurtAir');
    if (--this.hitstun <= 0) this.setState(this.grounded ? 'idle' : 'air', this.grounded ? 'idle' : 'fall');
  }
  st_tumble(match, c) {
    this.setAnimSlot('tumble');
    if (this.hitstun > 0) this.hitstun--;
    else {
      // Fin de l'étourdissement : on peut agir en l'air
      if (this.airActions(match, c)) return;
      this.airDrift(c, 0.7);
      this.tryLedge(match);
    }
  }
  st_lie(match, c) {
    this.setAnimSlot('lie');
    if (this.stateT > 20 && (Math.abs(c.x) > 0.5 || c.pressed.jump || c.up || c.pressed.attack || this.stateT > 90)) {
      if (c.pressed.attack) { c.consume('attack'); this.setState('idle', 'idle'); this.invuln = Math.max(this.invuln, 12); this.startMove('getupAtk'); return; }
      this.setState('getup', 'getup');
      this.invuln = Math.max(this.invuln, 20);
    }
  }
  st_getup() { if (this.stateT >= 18) this.setState('idle', 'idle'); }
  st_dizzy(match, c) {
    this.setAnimSlot('dizzy');
    if (this.stateT >= this.dizzyT) this.setState('idle', 'idle');
  }
  st_ledge(match, c) {
    this.setAnimSlot('ledge');
    this.ledgeT++;
    this.vx = 0; this.vy = 0; this.kbVx = 0; this.kbVy = 0;
    const L = this.ledge;
    const toward = -L.side;
    if (this.ledgeT > 8) {
      if (c.pressed.jump || (K.tapJump && c.yFlick === 0 && c.up)) {
        c.consume('jump');
        this.releaseLedge();
        this.y = L.y - 2; this.x = L.x - L.side * 4;
        this.vy = -this.S.jumpForce * 0.95; this.vx = toward * 1;
        this.setState('air', 'jump'); this.doubleJumped = false;
        return;
      }
      if (c.pressed.attack) { c.consume('attack'); this.climb(L); this.startMove('ledgeAtk'); return; }
      if ((c.y < -0.5 && c.yFlick < 10) || (Math.sign(c.x) === toward && Math.abs(c.x) > 0.6 && c.xFlick < 10)) { this.climbT = 0; this.setState('climb', 'jumpSquat'); return; }
      if (c.down || (Math.sign(c.x) === -toward && Math.abs(c.x) > 0.6) || c.pressed.shield) { this.releaseLedge(); this.regrab = 30; this.x += L.side * 3; this.setState('air', 'fall'); return; }
    }
    if (this.ledgeT > K.ledgeTime) { this.releaseLedge(); this.regrab = 60; this.setState('air', 'fall'); }
  }
  st_climb() {
    this.intangible = true;
    if (this.stateT >= 14) { const L = this.ledge; this.climb(L); this.setState('idle', 'idle'); }
  }
  climb(L) {
    if (!L) return;
    this.releaseLedge();
    this.x = L.x - L.side * (this.w * 0.6 + 4);
    this.y = L.y; this.vx = 0; this.vy = 0;
    this.grounded = true; this.ground = L.block;
  }
  releaseLedge() { if (this.ledge) this.ledge.owner = null; this.ledge = null; }

  tryLedge(match, any = false) {
    if (!match || this.regrab > 0 || (this.vy < 0 && !any)) return false;
    const hw = this.w * 0.5;
    for (const L of match.stage.ledges) {
      if (L.owner && L.owner !== this) continue;
      const handY = this.y - this.h * 0.8;
      const dx = (this.x - L.x) * L.side; // > 0 : à l'extérieur
      if (dx < -hw * 0.6 || dx > hw + 16) continue;
      if (handY < L.y - 14 || handY > L.y + 22) continue;
      if (match.fighters.some((o) => o !== this && o.ledge === L)) continue;
      L.owner = this;
      if (!L.block) L.block = match.stage.blocks.find((b) => (L.side < 0 ? b.x1 : b.x2) === L.x && b.y1 === L.y);
      this.ledge = L; this.ledgeT = 0;
      this.x = L.x + L.side * (hw + 1); this.y = L.y + this.h * 0.8;
      this.facing = -L.side; this.vx = this.vy = this.kbVx = this.kbVy = 0;
      this.grounded = false; this.ground = null;
      this.jumpsLeft = this.S.jumps - 1; this.airdodgeUsed = false; this.sideBUsed = false; this.fastFall = false;
      this.attackFlip = false; this.move = null; this.moveId = null;
      this.invuln = Math.max(this.invuln, 36);
      this.setState('ledge', 'ledge');
      return true;
    }
    return false;
  }

  airDrift(c, mul) {
    const max = this.S.airSpeed * mul;
    if (Math.abs(c.x) > 0.2) {
      this.vx += c.x * this.S.airAccel;
      if (Math.abs(this.vx) > max) this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx) - max, 0.1);
    } else this.vx *= 0.985;
  }

  shieldBreak(match) {
    this.shieldHP = K.shieldMax * 0.4;
    this.grounded = false; this.ground = null; this.y -= 1;
    this.vy = -6; this.dizzyT = Math.max(120, 300 - this.percent);
    this.setState('dizzyfly', 'tumble');
    match?.fx.text(this.x, this.y - this.h - 10, 'BOUCLIER BRISÉ', '#7cf');
  }
  st_dizzyfly() { this.setAnimSlot('tumble'); }

  // ------------------------------------------------------------------ physique
  physics(match) {
    const st = this.stage = match?.stage;
    const oldX = this.x, oldY = this.y;
    if (this.state === 'ledge' || this.state === 'climb' || this.state === 'respawn') return;

    if (this.grounded) {
      const moving = ['walk', 'run'].includes(this.state) || (this.state === 'attack' && this.move && this.move.vx && this.anim.elem >= (this.move.at || 0));
      const roll = this.state === 'roll';
      if (!moving && !roll) this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), this.S.traction);
      if (this.kbVx) this.kbVx -= Math.sign(this.kbVx) * Math.min(Math.abs(this.kbVx), this.S.traction * 1.5);
      this.kbVy = 0;
      this.vy = 0;
      this.x += this.vx + this.kbVx;
      if (st && !st.stillOn(this.ground, this.x)) {
        if (STOP_AT_EDGE.has(this.state) && Math.abs(this.kbVx) < 0.5) {
          const g = this.ground;
          this.x = Math.max(g.x1, Math.min(g.x2, this.x));
          this.vx = 0;
        } else {
          this.grounded = false; this.ground = null;
          if (['idle', 'walk', 'run', 'crouch', 'land', 'getup'].includes(this.state)) this.setState('air', 'fall');
        }
      }
    } else {
      if (this.state !== 'airdodge' || !this.adDir) {
        this.vy += this.S.gravity * (this.state === 'tumble' || this.state === 'hitstun' ? 1 : 1);
        const maxFall = this.fastFall ? this.S.fastFallSpeed : this.S.fallSpeed;
        if (this.vy > maxFall) this.vy = Math.max(maxFall, this.vy - 0.5);
      }
      // Décroissance de l'éjection
      const kb = Math.hypot(this.kbVx, this.kbVy);
      if (kb > 0) {
        const nk = Math.max(0, kb - K.decay);
        this.kbVx *= nk / kb; this.kbVy *= nk / kb;
      }
      const ny = this.y + this.vy + this.kbVy;
      const nx = this.x + this.vx + this.kbVx;
      const fallingDown = this.vy + this.kbVy >= 0;
      const land = st && fallingDown ? st.landing(nx, this.y, ny, this.dropT > 0 || (this.ctrl.down && this.state !== 'tumble' && this.state !== 'hitstun' && this.fastFall)) : null;
      this.x = nx;
      if (land) {
        this.y = land.y;
        this.onLand(match, land);
      } else this.y = ny;
    }
    if (st) st.solidCollide(this, oldX, oldY);
  }

  onLand(match, land) {
    const vyHit = this.vy + this.kbVy;
    // Rebond si on s'écrase fort en vrille
    if ((this.state === 'tumble' || this.state === 'hitstun') && this.hitstun > 0 && this.kbVy > 3.5) {
      if (this.techWindow > 0) return this.tech(match, land);
      this.kbVy = -this.kbVy * 0.7; this.vy = 0;
      match?.fx.puff(this.x, this.y, 1.2);
      return;
    }
    this.grounded = true;
    this.ground = land.ref;
    this.vy = 0; this.kbVy = 0;
    this.fastFall = false;
    this.jumpsLeft = this.S.jumps - 1;
    this.airdodgeUsed = false; this.sideBUsed = false; this.doubleJumped = false;
    switch (this.state) {
      case 'air': this.landLag = 3; this.setState('land', 'land'); break;
      case 'attack':
        if (this.move && this.move.landLag) { this.landLag = this.move.landLag; this.attackFlip = false; this.move = null; this.moveId = null; this.setState('land', 'land'); }
        break;
      case 'helpless': this.landLag = 14; this.setState('land', 'land'); break;
      case 'airdodge': this.landLag = 10; this.vx *= 0.4; this.setState('land', 'land'); break;
      case 'tumble': case 'dizzyfly':
        if (this.state === 'dizzyfly') { this.setState('dizzy', 'dizzy'); break; }
        if (this.techWindow > 0) { this.tech(match, land); break; }
        this.setState('lie', 'lie'); this.hitstun = 0; this.kbVx *= 0.3;
        match?.fx.puff(this.x, this.y, 1);
        break;
      case 'hitstun': break;
      default: break;
    }
  }

  tech(match, land) {
    this.grounded = true; this.ground = land.ref; this.y = land.y;
    this.vy = 0; this.kbVy = 0; this.kbVx = 0; this.hitstun = 0;
    this.invuln = Math.max(this.invuln, 20);
    this.setState('getup', 'getup');
    match?.fx.text(this.x, this.y - this.h - 6, 'TECH', '#fff');
  }

  // ------------------------------------------------------------------ combat
  hitboxes() {
    if (this.state !== 'attack' || !this.move) return null;
    const f = this.anim.frame;
    if (!f || !f.c1.length) return null;
    const e = this.anim.elem;
    let gi = -1;
    const hits = this.move.hits || [];
    for (let k = 0; k < hits.length; k++) if (e >= hits[k].from && e <= hits[k].to) { gi = k; break; }
    if (gi < 0) return null;
    return { boxes: f.c1.map((b) => this.toWorld(b)), hit: hits[gi], group: gi };
  }
  hurtboxes() {
    const f = this.anim.frame;
    if (f && f.c2.length) return f.c2.map((b) => this.toWorld(b, true));
    return [[this.x - this.w / 2, this.y - this.h, this.x + this.w / 2, this.y]];
  }
  toWorld(b, plain = false) {
    const s = this.scale, fc = this.drawFacing;
    const x1 = this.x + b[0] * s * fc, x2 = this.x + b[2] * s * fc;
    return [Math.min(x1, x2), this.y + b[1] * s, Math.max(x1, x2), this.y + b[3] * s];
  }
  get canBeHit() { return !this.dead && !this.intangible && this.invuln <= 0 && this.state !== 'respawn'; }

  takeHit(match, hit, attacker, dirFacing, opts = {}) {
    const chargeMul = opts.chargeMul || 1;
    const dmg = Math.round(hit.dmg * chargeMul * 10) / 10;
    // Bouclier
    if ((this.state === 'shield' || this.state === 'shieldstun') && !opts.unblockable) {
      this.shieldHP -= dmg * 1.15;
      this.stunT = Math.floor(dmg * 0.8) + 3;
      this.kbVx = dirFacing * Math.min(3, 0.6 + dmg * 0.12);
      this.hitlag = Math.min(12, Math.floor(dmg * 0.3 + 3));
      if (this.shieldHP <= 0) this.shieldBreak(match);
      else this.setState('shieldstun', 'shield');
      match?.sfx('shield', dmg);
      return 'shield';
    }
    this.percent = Math.min(999, this.percent + dmg);
    if (attacker) attacker.stats.dealt += dmg;
    const kb = knockback(this.percent, dmg, this.S.weight, hit.bkb ?? 20, hit.kbg ?? 80);
    let ang = hit.angle ?? 45;
    if (ang === 361) ang = kb < 32 ? 0 : 40;
    let rad = (ang * Math.PI) / 180;
    // Influence directionnelle (DI)
    const c = this.ctrl;
    if (Math.hypot(c.x, c.y) > 0.3 && kb > 40) {
      const lx = Math.cos(rad) * dirFacing, ly = -Math.sin(rad);
      const perp = lx * c.y - ly * c.x; // composante perpendiculaire
      const di = (K.di * Math.PI) / 180 * Math.max(-1, Math.min(1, perp));
      rad += di * dirFacing;
    }
    const v = kb * K.launch;
    this.kbVx = Math.cos(rad) * v * dirFacing;
    this.kbVy = -Math.sin(rad) * v;
    this.vx = 0; this.vy = 0;
    this.releaseLedge();
    if (this.grounded && (this.kbVy < -0.01 || kb >= K.tumbleKB)) { this.grounded = false; this.ground = null; this.y -= 1; if (this.kbVy > 0) this.kbVy = -this.kbVy * 0.8; }
    this.hitstun = Math.floor(kb * K.hitstun);
    const hl = Math.min(20, Math.floor(dmg * 0.38 + 4));
    this.hitlag = hl;
    if (attacker) attacker.hitlag = hl;
    this.attackFlip = false; this.move = null; this.moveId = null; this.fastFall = false;
    if (kb >= K.tumbleKB) this.setState('tumble', 'tumble');
    else this.setState('hitstun', this.grounded ? 'hurt' : 'hurtAir');
    this.jumpsLeft = Math.max(this.jumpsLeft, this.S.jumps - 1);
    this.airdodgeUsed = false;
    this.lastHit = attacker ? { port: attacker.port, t: match?.time ?? 0 } : null;
    match?.onHit(this, attacker, dmg, kb);
    return 'hit';
  }

  // ------------------------------------------------------------------ mort / réapparition
  die(match) {
    this.dead = true; this.deadT = 0; this.releaseLedge();
    this.stocks--;
  }
  stepDead(match) {
    this.deadT++;
    if (this.stocks <= 0 && match.rules.mode === 'stock') return;
    if (this.deadT === 70) {
      const r = match.stage.def.respawn || [0, -120];
      this.spawn(r[0], r[1], 1);
      this.percent = 0;
      this.dead = false;
      this.state = 'respawn'; this.stateT = 0;
      this.anim.set(this.animNo('idle'), true);
      this.invuln = 9999;
    }
  }
  st_respawn(match, c) {
    this.vx = this.vy = 0; this.kbVx = this.kbVy = 0;
    this.holdAnim = false;
    this.platY = this.y;
    if (this.stateT > 30 && (Math.abs(c.x) > 0.5 || c.y > 0.5 || c.pressed.jump || c.pressed.attack || c.pressed.special || this.stateT > 240)) {
      this.invuln = K.respawnInvuln;
      this.setState('air', 'fall');
      if (c.pressed.jump) { this.vy = -this.S.doubleJumpForce; this.setState('air', 'jump'); }
    }
  }

  // ------------------------------------------------------------------ dessin
  draw(ctx, match, opts = {}) {
    if (this.dead) return;
    const f = this.anim.frame;
    let alpha = 1;
    if (this.invuln > 0 && this.invuln < 9000 && (match.time >> 2) % 2) alpha = 0.55;
    if (this.intangible) alpha = 0.6;
    const shakeX = this.hitlag > 0 && this.state !== 'attack' ? ((match.time % 2) ? 1.5 : -1.5) : 0;
    if (this.state === 'respawn') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(this.x - 22, this.y, 44, 4);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 22, this.y + 4, 44, 2);
    }
    drawFrame(ctx, this.bank, f, this.x + shakeX, this.y, this.drawFacing, this.scale, this.costume, { alpha });
    if (this.flash > 0 || (this.invuln > 0 && this.invuln < 9000 && (match.time >> 1) % 4 === 0)) {
      ctx.save(); ctx.globalAlpha = 0.5 * alpha;
      drawFrame(ctx, this.bank, f, this.x + shakeX, this.y, this.drawFacing, this.scale, this.costume, { white: true });
      ctx.restore();
    }
    if (this.state === 'shield' || this.state === 'shieldstun') {
      const r = (this.h * 0.45) * (0.45 + 0.55 * this.shieldHP / K.shieldMax);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y - this.h * 0.5, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    if (opts.debug) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(80,140,255,0.9)';
      for (const b of this.hurtboxes()) ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
      const hb = this.hitboxes();
      if (hb) { ctx.strokeStyle = 'rgba(255,60,60,0.95)'; for (const b of hb.boxes) ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
      ctx.strokeStyle = '#ff0'; ctx.strokeRect(this.x - this.w / 2, this.y - this.h, this.w, this.h);
    }
    // Indicateur de joueur
    if (!opts.noTag) {
      const ty = this.y - this.h - 10;
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.moveTo(this.x - 4, ty - 5); ctx.lineTo(this.x + 4, ty - 5); ctx.lineTo(this.x, ty); ctx.fill();
      ctx.font = 'bold 7px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.tag || ('J' + (this.port + 1)), this.x, ty - 7);
    }
  }
}

export { MOVE_INFO };
