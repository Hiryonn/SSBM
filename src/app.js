// État global de l'application : bibliothèque, réglages, écrans.
import * as store from './data/storage.js';
import { buildTrainingStage } from './data/builtin.js';
import { SpriteBank, drawFrame } from './engine/sprites.js';
import { Stage } from './engine/stage.js';
import { DEFAULT_KEYS, DEFAULT_PAD } from './engine/input.js';
import { K, setConstants } from './engine/constants.js';
import { volume } from './engine/audio.js';
import { clear } from './ui/dom.js';

export const app = {
  fighters: [],
  stages: [],
  settings: {
    keymaps: JSON.parse(JSON.stringify(DEFAULT_KEYS)),
    padMap: JSON.parse(JSON.stringify(DEFAULT_PAD)),
    volume: { sfx: 0.5, music: 0.45 },
    constants: { ...K },
    rules: { mode: 'stock', stocks: 3, time: 3, teams: false },
    players: null,
    stageId: null,
  },
  root: null,
  screen: null,
};

export async function loadLibrary() {
  const training = buildTrainingStage();
  const fs = await store.all('fighters');
  const ss = await store.all('stages');
  app.fighters = [...fs.filter((f) => f && f.format === 'platfight-fighter').sort((a, b) => (a.name || '').localeCompare(b.name || ''))];
  app.stages = [training, ...ss.filter((s) => s && s.format === 'platfight-stage').sort((a, b) => (a.name || '').localeCompare(b.name || ''))];
  const st = await store.get('settings', 'main');
  if (st) Object.assign(app.settings, st, { keymaps: st.keymaps || app.settings.keymaps, padMap: st.padMap || app.settings.padMap });
  applySettings();
}

export function applySettings() {
  setConstants(app.settings.constants);
  volume.sfx = app.settings.volume.sfx;
  volume.music = app.settings.volume.music;
}
export async function saveSettings() { await store.put('settings', 'main', JSON.parse(JSON.stringify(app.settings))); }

export async function saveFighter(def) {
  if (def.builtin) { def = { ...def, builtin: false, id: def.id + '-' + Date.now().toString(36), name: def.name + ' (copie)' }; }
  def.updated = Date.now();
  await store.put('fighters', def.id, def);
  const k = app.fighters.findIndex((f) => f.id === def.id);
  if (k >= 0) app.fighters[k] = def; else app.fighters.push(def);
  bankCache.delete(def.id);
  return def;
}
export async function deleteFighter(id) {
  await store.del('fighters', id);
  app.fighters = app.fighters.filter((f) => f.id !== id);
  bankCache.delete(id);
}
export async function saveStage(def) {
  if (def.builtin) { def = { ...def, builtin: false, id: def.id + '-' + Date.now().toString(36), name: def.name + ' (copie)' }; }
  def.updated = Date.now();
  await store.put('stages', def.id, def);
  const k = app.stages.findIndex((f) => f.id === def.id);
  if (k >= 0) app.stages[k] = def; else app.stages.push(def);
  thumbCache.delete(def.id);
  return def;
}
export async function deleteStage(id) {
  await store.del('stages', id);
  app.stages = app.stages.filter((f) => f.id !== id);
  thumbCache.delete(id);
}
export const isPersistent = () => store.persistent;

// ----------------------------------------------------------- banques de sprites
const bankCache = new Map();
export async function bankFor(def) {
  const key = def.id;
  let b = bankCache.get(key);
  if (b && b.def === def) return b.bank;
  const bank = await SpriteBank.load(def);
  bankCache.set(key, { def, bank });
  return bank;
}
export function forgetBank(id) { bankCache.delete(id); }

// Vignette d'un perso (portrait si dispo, sinon pose d'attente)
export async function drawFighterThumb(def, canvas, costume = 0, mode = 'portrait') {
  const bank = await bankFor(def);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const p = mode === 'portrait' ? (def.portrait || def.icon) : null;
  const s = p && bank.get(p[0], p[1], costume);
  if (s) {
    const sc = Math.min(canvas.width / s.w, canvas.height / s.h);
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.drawImage(s.img, (canvas.width - s.w * sc) / 2, (canvas.height - s.h * sc), s.w * sc, s.h * sc);
    return;
  }
  const idle = def.anims[def.states?.idle ?? 0];
  const f = idle?.frames?.[0];
  if (!f) return;
  const info = bank.info(f.g, f.i);
  const sc = info ? Math.min(3, (canvas.height * 0.85) / Math.max(20, info.h)) : 2;
  drawFrame(ctx, bank, f, canvas.width / 2, canvas.height - 4, 1, sc, costume, {});
}

const thumbCache = new Map();
export async function drawStageThumb(def, canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let st = thumbCache.get(def.id);
  if (!st || st.def !== def) { st = await Stage.load(def); thumbCache.set(def.id, st); }
  const bz = def.camera;
  const ppu = Math.max(W / (bz.right - bz.left), H / (bz.bottom - bz.top)) * 1.05;
  const cam = { x: (bz.left + bz.right) / 2, y: (bz.top + bz.bottom) / 2 + 20, ppu };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(ppu, 0, 0, ppu, W / 2 - cam.x * ppu, H / 2 - cam.y * ppu);
  const view = { W, H, left: cam.x - W / 2 / ppu, right: cam.x + W / 2 / ppu, top: cam.y - H / 2 / ppu, bottom: cam.y + H / 2 / ppu };
  st.drawBG(ctx, cam, 0, view);
  st.drawGeometry(ctx, {});
  st.drawBG(ctx, cam, 1, view);
  ctx.restore();
}

// ----------------------------------------------------------- écrans
export function show(screen) {
  if (app.screen && app.screen.leave) app.screen.leave();
  clear(app.root);
  app.screen = screen;
  document.body.dataset.ingame = screen.ingame ? '1' : '0';
  app.root.append(screen.el);
  if (screen.enter) screen.enter();
  window.scrollTo(0, 0);
}

export const screens = {};
export function go(name, ...args) {
  const make = screens[name];
  if (!make) throw new Error('Écran inconnu : ' + name);
  const s = make(...args);
  if (s && typeof s.then === 'function') s.then(show); else show(s);
}
