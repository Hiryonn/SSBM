// Navigation dans les menus à la manette : stick / croix pour se déplacer,
// bouton bas (A Xbox) pour valider, bouton droit (B Xbox) pour revenir.
import { getPads } from '../engine/input.js';
import { app } from '../app.js';

const prev = new Map(); // index manette -> état précédent
let repeatAt = 0, lastDir = null;
let capture = null; // fonction qui reçoit (padIndex, bouton) en priorité (réglage des boutons)

export function capturePadButton(fn) { capture = fn; }

function focusables() {
  const modal = document.querySelector('.modal-wrap:last-of-type');
  const root = modal || app.root;
  return [...root.querySelectorAll('button, select, input, [tabindex]:not([tabindex="-1"]), a[href]')]
    .filter((el) => !el.disabled && el.offsetParent !== null && el.type !== 'file' && !el.closest('[hidden]'));
}

function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r]; }

function move(dir) {
  const list = focusables();
  if (!list.length) return;
  const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { focus(list[0]); return; }
  // Réglage des listes et curseurs avec gauche / droite
  if ((dir === 'left' || dir === 'right') && cur.tagName === 'SELECT') {
    const n = cur.options.length;
    cur.selectedIndex = (cur.selectedIndex + (dir === 'right' ? 1 : -1) + n) % n;
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if ((dir === 'left' || dir === 'right') && cur.tagName === 'INPUT' && (cur.type === 'range' || cur.type === 'number')) {
    const step = parseFloat(cur.step) || 1;
    const v = (parseFloat(cur.value) || 0) + (dir === 'right' ? step : -step);
    const mn = cur.min !== '' ? parseFloat(cur.min) : -Infinity, mx = cur.max !== '' ? parseFloat(cur.max) : Infinity;
    cur.value = String(Math.max(mn, Math.min(mx, +v.toFixed(4))));
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const [cx, cy, cr] = center(cur);
  let best = null, bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const [x, y, r] = center(el);
    let main, side;
    if (dir === 'right') { if (r.left < cr.right - 4) continue; main = r.left - cr.right; side = Math.abs(y - cy); }
    else if (dir === 'left') { if (r.right > cr.left + 4) continue; main = cr.left - r.right; side = Math.abs(y - cy); }
    else if (dir === 'down') { if (r.top < cr.bottom - 4) continue; main = r.top - cr.bottom; side = Math.abs(x - cx); }
    else { if (r.bottom > cr.top + 4) continue; main = cr.top - r.bottom; side = Math.abs(x - cx); }
    const score = Math.max(0, main) + side * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) focus(best);
}

function focus(el) {
  document.body.classList.add('pad-mode');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function back() {
  const modal = document.querySelector('.modal-wrap');
  if (modal) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return; }
  const b = app.root.querySelector('.bar .btn.ghost');
  if (b) b.click();
}

function confirm(padIndex) {
  const el = document.activeElement;
  if (!el || el === document.body) { const l = focusables(); if (l[0]) focus(l[0]); return; }
  if (app.screen?.padOwner) app.screen.padOwner(padIndex);
  if (el.tagName === 'SELECT') {
    const n = el.options.length;
    el.selectedIndex = (el.selectedIndex + 1) % n;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio') {
    el.select?.();
  } else el.click();
}

export function startPadNav() {
  const tick = () => {
    requestAnimationFrame(tick);
    const pads = getPads();
    const now = performance.now();
    let dir = null;
    for (const p of pads) {
      const was = prev.get(p.index) || [];
      const b = p.buttons.map((x) => !!x.pressed);
      prev.set(p.index, b);
      const pressed = (n) => b[n] && !was[n];
      // Capture d'un bouton (écran Options)
      if (capture) {
        const n = b.findIndex((v, k) => v && !was[k]);
        if (n >= 0) { const fn = capture; capture = null; fn(p.index, n); }
        continue;
      }
      if (app.screen?.ingame) continue;
      // Un écran peut gérer lui-même un appui (ex. rejoindre la partie)
      const any = b.findIndex((v, k) => v && !was[k]);
      if (any >= 0 && app.screen?.padPress && app.screen.padPress(p.index, any)) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b[12] || ay < -0.6) dir = 'up';
      else if (b[13] || ay > 0.6) dir = 'down';
      else if (b[14] || ax < -0.6) dir = 'left';
      else if (b[15] || ax > 0.6) dir = 'right';
      if (pressed(0)) confirm(p.index);
      if (pressed(1)) back();
      if (pressed(9) && app.screen?.padStart) app.screen.padStart(p.index);
    }
    if (dir) {
      if (dir !== lastDir) { move(dir); repeatAt = now + 350; }
      else if (now >= repeatAt) { move(dir); repeatAt = now + 110; }
    }
    lastDir = dir;
  };
  requestAnimationFrame(tick);
  // La souris ou le clavier font disparaître le surlignage manette
  window.addEventListener('mousemove', () => document.body.classList.remove('pad-mode'), { passive: true });
}
