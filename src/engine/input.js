// Entrées clavier et manettes, normalisées par joueur.

export const BUTTONS = ['attack', 'special', 'jump', 'shield', 'smash', 'start', 'grab'];
export const DIRS = ['left', 'right', 'up', 'down'];

export const DEFAULT_KEYS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], attack: ['KeyJ'], special: ['KeyK'], jump: ['KeyL', 'Space'], shield: ['Semicolon', 'ShiftLeft'], smash: ['KeyI'], start: ['Enter'], grab: ['KeyU'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], attack: ['Numpad1', 'Comma'], special: ['Numpad2', 'Period'], jump: ['Numpad3', 'Slash'], shield: ['Numpad0', 'ShiftRight'], smash: ['Numpad5', 'Quote'], start: ['NumpadEnter'], grab: ['Numpad4'] },
];

const keys = new Set();
const taps = new Set(); // touches enfoncées puis relâchées entre deux images
let listening = false;
export function endFrameInput() { taps.clear(); }
export function listenKeyboard(target = window) {
  if (listening) return;
  listening = true;
  target.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code);
    taps.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') { if (document.body.dataset.ingame === '1') e.preventDefault(); }
  });
  target.addEventListener('keyup', (e) => keys.delete(e.code));
  target.addEventListener('blur', () => keys.clear());
}
export const keyDown = (code) => keys.has(code);

let layoutMap = null;
try { navigator.keyboard?.getLayoutMap?.().then((m) => { layoutMap = m; }).catch(() => {}); } catch (e) { /* rien */ }
export function keyLabel(code) {
  const v = layoutMap?.get?.(code);
  if (v) return v.toUpperCase();
  const names = { Space: 'Espace', ShiftLeft: 'Maj G', ShiftRight: 'Maj D', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Entrée', NumpadEnter: 'Entrée pavé', Semicolon: 'M', Comma: ',', Period: '.', Slash: '/', Quote: 'Ù' };
  if (names[code]) return names[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Numpad')) return 'Pavé ' + code.slice(6);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

// Boutons de manette par défaut (disposition « standard » du navigateur :
// 0 = bas, 1 = droite, 2 = gauche, 3 = haut, 4/5 = bumpers, 6/7 = gâchettes, 8 = select, 9 = start)
export const DEFAULT_PAD = { attack: [1], special: [0], jump: [2, 3], shield: [4, 6, 7], grab: [5], smash: [], start: [9] };
export const PAD_NAMES = ['Bas (A·B·✕)', 'Droite (B·A·○)', 'Gauche (X·Y·□)', 'Haut (Y·X·△)', 'LB·L·L1', 'RB·R·R1', 'LT·ZL·L2', 'RT·ZR·R2', 'Select', 'Start', 'Clic stick G', 'Clic stick D', 'Croix ↑', 'Croix ↓', 'Croix ←', 'Croix →', 'Home'];
export const padButtonName = (n) => PAD_NAMES[n] || 'Bouton ' + n;

export function getPads() {
  try { return [...(navigator.getGamepads?.() || [])].filter(Boolean); } catch (e) { return []; }
}

// Un contrôleur : source = { type: 'kb', slot: 0|1 } | { type: 'pad', index } | { type: 'cpu' }
export class Controller {
  constructor(source, keymaps, padMap) {
    this.source = source;
    this.keymaps = keymaps || DEFAULT_KEYS;
    this.padMap = padMap || DEFAULT_PAD;
    this.x = 0; this.y = 0; this.cx = 0; this.cy = 0;
    this.held = {}; this.prev = {}; this.pressed = {};
    this.xFlick = 99; this.yFlick = 99; this.lastFlickDir = 0; this.prevFlickAge = 99;
    this.px = 0; this.py = 0;
    this.cpu = null;
  }

  readRaw() {
    const s = this.source;
    let x = 0, y = 0, cx = 0, cy = 0;
    const b = {};
    if (s.type === 'kb') {
      const km = this.keymaps[s.slot] || {};
      const any = (list) => (list || []).some((c) => keys.has(c) || taps.has(c));
      x = (any(km.right) ? 1 : 0) - (any(km.left) ? 1 : 0);
      y = (any(km.down) ? 1 : 0) - (any(km.up) ? 1 : 0);
      for (const k of BUTTONS) b[k] = any(km[k]);
    } else if (s.type === 'pad') {
      const pad = getPads().find((p) => p.index === s.index);
      if (pad) {
        const ax = pad.axes;
        const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
        x = dz(ax[0] || 0); y = dz(ax[1] || 0);
        cx = dz(ax[2] || 0); cy = dz(ax[3] || 0);
        const bt = (n) => !!pad.buttons[n]?.pressed;
        if (bt(14)) x = -1; if (bt(15)) x = 1; if (bt(12)) y = -1; if (bt(13)) y = 1;
        const pm = this.padMap;
        const anyB = (list) => (list || []).some(bt);
        b.attack = anyB(pm.attack); b.special = anyB(pm.special); b.jump = anyB(pm.jump);
        b.shield = anyB(pm.shield);
        b.smash = anyB(pm.smash) || Math.abs(cx) > 0.5 || Math.abs(cy) > 0.5;
        b.start = anyB(pm.start);
        b.grab = anyB(pm.grab);
      }
    } else if (s.type === 'cpu' && this.cpu) {
      const c = this.cpu;
      x = c.x; y = c.y;
      for (const k of BUTTONS) b[k] = !!c[k];
      cx = c.cx || 0; cy = c.cy || 0;
    }
    return { x, y, cx, cy, b };
  }

  update() {
    const r = this.readRaw();
    this.prev = this.held;
    this.held = r.b;
    this.pressed = {};
    this.buf = this.buf || {};
    for (const k of BUTTONS) {
      if (this.held[k] && !this.prev[k]) this.buf[k] = 0;
      else if (this.buf[k] != null) this.buf[k]++;
      // un appui reste valable 5 images tant qu'il n'a pas été utilisé (tampon d'entrée)
      this.pressed[k] = this.buf[k] != null && this.buf[k] <= 5;
    }
    // Détection des "flicks" (direction enfoncée brusquement) pour les smashs et la course.
    this.xFlick++; this.yFlick++; this.prevFlickAge++;
    if (Math.abs(r.x) >= 0.7 && Math.abs(this.px) < 0.4) {
      const dir = Math.sign(r.x);
      this.prevFlickAge = this.lastFlickDir === dir ? this.xFlick : 99;
      this.lastFlickDir = dir;
      this.xFlick = 0;
    }
    if (Math.abs(r.y) >= 0.7 && Math.abs(this.py) < 0.4) this.yFlick = 0;
    // Attaque smash au clavier : direction "tapée" en même temps que l'attaque
    if (this.buf.attack === 0) this.smashTap = Math.min(this.xFlick, this.yFlick) <= 3;
    else if (this.buf.attack != null && this.buf.attack <= 2 && (this.xFlick === 0 || this.yFlick === 0)) this.smashTap = true;
    this.px = this.x; this.py = this.y;
    this.x = r.x; this.y = r.y; this.cx = r.cx; this.cy = r.cy;
    this.cPressed = (Math.abs(r.cx) > 0.5 || Math.abs(r.cy) > 0.5) && !(Math.abs(this.pcx || 0) > 0.5 || Math.abs(this.pcy || 0) > 0.5);
    this.pcx = r.cx; this.pcy = r.cy;
  }

  consume(...ks) { for (const k of (ks.length ? ks : BUTTONS)) { if (this.buf) this.buf[k] = 99; this.pressed[k] = false; } }

  // Raccourcis
  get left() { return this.x < -0.3; }
  get right() { return this.x > 0.3; }
  get up() { return this.y < -0.5; }
  get down() { return this.y > 0.5; }
}
