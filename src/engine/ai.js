// IA simple pour les joueurs CPU (niveau 1 à 9).
export class CPU {
  constructor(fighter, level = 5) {
    this.f = fighter;
    this.level = Math.max(1, Math.min(9, level));
    this.out = { x: 0, y: 0, attack: false, special: false, jump: false, shield: false, smash: false };
    this.cool = 0;
    this.plan = null;
    this.holdJump = 0;
    this.shieldT = 0;
  }

  think(match) {
    const f = this.f, o = this.out;
    o.attack = o.special = o.jump = o.smash = false;
    if (this.holdJump > 0) { this.holdJump--; o.jump = this.holdJump > 0 ? 'hold' : false; }
    if (f.dead) { o.x = 0; o.y = 0; return this.flush(); }
    const st = match.stage;
    const main = st.blocks[0];
    const reaction = 26 - this.level * 2.4;

    // Cible : l'adversaire vivant le plus proche
    let tgt = null, best = 1e9;
    for (const e of match.fighters) {
      if (e === f || e.dead || (match.rules.teams && e.team === f.team)) continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y);
      if (d < best) { best = d; tgt = e; }
    }

    // Accroché au rebord : remonter
    if (f.state === 'ledge') {
      o.x = 0; o.y = 0;
      if (f.ledgeT > 12 + (9 - this.level) * 3) {
        const r = Math.random();
        if (r < 0.4) o.jump = true;
        else if (r < 0.7) { o.y = -1; }
        else o.attack = true;
      }
      return this.flush();
    }
    if (f.state === 'respawn') { o.x = 0; o.y = 0; if (f.stateT > 40) o.x = main && f.x < (main.x1 + main.x2) / 2 ? 1 : -1; return this.flush(); }
    if (f.state === 'lie') { o.x = Math.random() < 0.5 ? 1 : -1; return this.flush(); }

    // Hors du terrain : récupération
    const off = main && (f.x < main.x1 - 4 || f.x > main.x2 + 4 || (!f.grounded && f.y > main.y1 + 10));
    if (off && main) {
      const cx = f.x < main.x1 ? main.x1 : f.x > main.x2 ? main.x2 : f.x;
      o.x = Math.sign(cx - f.x) || 0; o.y = 0;
      const below = f.y > main.y1 - 10;
      if (['air', 'tumble'].includes(f.state) && f.hitstun <= 0 && f.vy > -1) {
        if (f.jumpsLeft > 0 && below) { o.jump = true; this.holdJump = 8; }
        else if (f.jumpsLeft <= 0 && (below || Math.abs(cx - f.x) > 40) && f.y > main.y1 - 30) { o.special = true; o.y = -1; o.x = Math.sign(cx - f.x) * 0.3; }
      }
      return this.flush();
    }

    if (!tgt) { o.x = 0; o.y = 0; return this.flush(); }

    const dx = tgt.x - f.x, dy = (tgt.y - tgt.h / 2) - (f.y - f.h / 2);
    const adx = Math.abs(dx);
    const reach = Math.max(f.w * 1.6, 36 * f.scale);

    // Bouclier en réaction aux attaques proches
    if (this.shieldT > 0) {
      this.shieldT--;
      o.shield = this.shieldT > 0; o.x = 0; o.y = 0;
      return this.flush();
    }
    if (f.grounded && tgt.state === 'attack' && adx < reach * 1.5 && Math.random() < this.level * 0.012) {
      this.shieldT = 10 + Math.floor(Math.random() * 12);
      o.shield = true;
      return this.flush();
    }
    o.shield = false;

    if (this.cool > 0) this.cool--;
    // Déplacement
    const nearEdge = main && f.grounded && ((f.x < main.x1 + 18 && dx < 0) || (f.x > main.x2 - 18 && dx > 0));
    if (adx > reach * 0.8 && !nearEdge) o.x = Math.sign(dx) * (adx > 90 ? 1 : 0.6);
    else o.x = 0;
    o.y = 0;

    if (f.grounded && dy < -45 && Math.random() < 0.04) { o.jump = true; this.holdJump = 10; }

    if (this.cool <= 0 && adx < reach && Math.abs(dy) < f.h * 0.9 && tgt.canBeHit) {
      this.cool = reaction + Math.random() * 12;
      const facingOk = Math.sign(dx) === f.facing || adx < 6;
      if (!f.grounded) {
        if (dy < -12) { o.y = -1; o.attack = true; }
        else if (dy > 14) { o.y = 1; o.attack = true; }
        else { o.x = facingOk ? f.facing : -f.facing; o.attack = true; }
      } else {
        const r = Math.random();
        if (!facingOk) { o.x = Math.sign(dx); this.cool = 2; }
        else if (dy < -16) { o.y = -0.6; if (tgt.percent > 80 && r < 0.4) o.smash = true; else o.attack = true; }
        else if (tgt.percent > 90 && r < 0.35) { o.x = f.facing * 0.6; o.smash = true; }
        else if (r < 0.15) { o.special = true; o.x = r < 0.08 ? f.facing : 0; }
        else if (r < 0.45) { o.attack = true; }
        else if (r < 0.75) { o.x = f.facing * 0.6; o.attack = true; }
        else { o.y = 0.6; o.attack = true; }
      }
    }
    // Projectiles de temps en temps à distance
    if (this.cool <= 0 && f.grounded && adx > 100 && Math.random() < 0.01 * this.level) { o.special = true; o.x = 0; o.y = 0; this.cool = 40; }
    return this.flush();
  }

  flush() {
    const o = this.out;
    if (o.jump === 'hold') o.jump = true;
    return o;
  }
}
