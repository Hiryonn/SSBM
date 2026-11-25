// État global de l'application : bibliothèque, réglages, écrans.
import * as store from './data/storage.js';
import { buildTrainingStage } from './data/builtin.js';
import { newMeta, uid } from './data/project.js';
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
  project: null,  // projet ouvert : { backend, meta }
  current: null,  // nom de l'écran affiché
  player: null,   // jeu exporté en cours (mode joueur), sinon null
  preview: null,  // aperçu d'un jeu depuis le logiciel : { restore }
};

const settingsKey = () => (app.player ? 'game:' + app.player.id : 'main');

// Passe en mode joueur : seuls les persos / stages du jeu sont disponibles.
export function enterPlayer(game) {
  app.player = game;
  app.fighters = game.fighters.slice();
  app.stages = game.stages.slice();
  document.title = game.name;
  document.documentElement.style.setProperty('--red', game.color || '#ff3d48');
  applySettings();
}

// Aperçu d'un jeu depuis le logiciel, puis retour à la bibliothèque.
export function startPreview(game) {
  app.preview = { fighters: app.fighters, stages: app.stages, title: document.title };
  enterPlayer(game);
}
export function endPreview() {
  if (!app.preview) return;
  const p = app.preview;
  app.preview = null; app.player = null;
  app.fighters = p.fighters; app.stages = p.stages;
  document.title = p.title;
  document.documentElement.style.removeProperty('--red');
  applySettings();
}

export async function loadPlayerSettings() {
  const st = await store.get('settings', settingsKey());
  if (st) Object.assign(app.settings, st, { keymaps: st.keymaps || app.settings.keymaps, padMap: st.padMap || app.settings.padMap });
  if (app.player?.rules && !st) app.settings.rules = { ...app.settings.rules, ...app.player.rules };
  migrateSettings();
  applySettings();
}

// Démarrage du logiciel : réglages seulement, les persos viennent du projet ouvert
export async function loadStudio() {
  const st = await store.get('settings', 'main');
  if (st) Object.assign(app.settings, st, { keymaps: st.keymaps || app.settings.keymaps, padMap: st.padMap || app.settings.padMap });
  if (!app.settings.recent) app.settings.recent = [];
  migrateSettings();
  applySettings();
}

// Ancienne bibliothèque (versions sans projets), pour la convertir en projet
export async function loadLegacy() {
  const fs = (await store.all('fighters')).filter((f) => f && f.format === 'platfight-fighter');
  const ss = (await store.all('stages')).filter((x) => x && x.format === 'platfight-stage');
  return { fighters: fs, stages: ss };
}

// ----------------------------------------------------------- projets
const byOrder = (list, order) => {
  const pos = new Map((order || []).map((id, k) => [id, k]));
  return [...list].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9) || (a.name || '').localeCompare(b.name || ''));
};

export async function openProject(backend) {
  const { meta, fighters, stages } = await backend.load();
  if (!meta || meta.format !== 'platfight-project') throw new Error('Ce dossier ne contient pas de projet PlatFight (projet.json).');
  meta.order = meta.order || { fighters: [], stages: [] };
  meta.constants = { ...K, ...(meta.constants || {}) };
  app.project = { backend, meta };
  app.fighters = byOrder(fighters, meta.order.fighters);
  app.stages = byOrder(stages, meta.order.stages);
  bankCache.clear(); thumbCache.clear();
  document.title = meta.name + ' — PlatFight Studio';
  applySettings();
  // Projets récents
  const r = { kind: backend.kind, dir: backend.dir, id: backend.id, name: meta.name, where: backend.where, t: Date.now() };
  app.settings.recent = [r, ...(app.settings.recent || []).filter((x) => (x.kind === 'disk' ? 'disk:' + x.dir : 'local:' + x.id) !== backend.key)].slice(0, 12);
  await saveSettings();
}

export function closeProject() {
  app.project = null;
  app.fighters = []; app.stages = [];
  bankCache.clear(); thumbCache.clear();
  document.title = 'PlatFight Studio';
  applySettings();
}

// Crée un projet vide (avec l'arène d'entraînement) ou à partir de persos / stages existants
export async function createProject(backend, name, { fighters = [], stages = [], extra = {} } = {}) {
  const meta = newMeta(name, extra);
  if (backend.kind === 'local') meta.id = backend.id;
  const arena = { ...buildTrainingStage(), id: 'arene', builtin: false, source: 'PlatFight Studio' };
  const allStages = [arena, ...stages];
  meta.order = { fighters: fighters.map((f) => f.id), stages: allStages.map((x) => x.id) };
  await backend.saveMeta(meta);
  for (const f of fighters) await backend.saveItem('fighters', { ...f, builtin: false });
  for (const x of allStages) await backend.saveItem('stages', { ...x, builtin: false });
  return meta;
}

export async function saveProjectMeta() {
  if (!app.project) return;
  app.project.meta.order = { fighters: app.fighters.map((f) => f.id), stages: app.stages.map((x) => x.id) };
  app.project.meta.updated = Date.now();
  await app.project.backend.saveMeta(app.project.meta);
  document.title = app.project.meta.name + ' — PlatFight Studio';
}

// Mise à niveau des réglages enregistrés par une ancienne version
function migrateSettings() {
  const S = app.settings;
  if (!S.constants) S.constants = { ...K };
  if (S.constants.physVer !== 2) Object.assign(S.constants, { launch: 0.048, decay: 0.08, ssfAirdodge: true, physVer: 2 });
  (S.keymaps || []).forEach((k, i) => { if (k && !k.grab && DEFAULT_KEYS[i]) k.grab = [...DEFAULT_KEYS[i].grab]; });
  if (S.padMap && !S.padMap.grab) {
    S.padMap.grab = [5];
    S.padMap.shield = (S.padMap.shield || []).filter((n) => n !== 5);
  }
}

export function applySettings() {
  // La physique est celle du jeu (jeu exporté) ou du projet ouvert.
  const src = app.player ? app.player.constants : app.project ? app.project.meta.constants : null;
  setConstants(src ? { ...app.settings.constants, ...src, gameSpeed: src.gameSpeed ?? 1 } : app.settings.constants);
  volume.sfx = app.settings.volume.sfx;
  volume.music = app.settings.volume.music;
}
export async function saveSettings() { if (app.preview) return; await store.put('settings', settingsKey(), JSON.parse(JSON.stringify(app.settings))); }

const copyOf = (def, p) => ({ ...def, builtin: false, id: uid(p), name: def.name + ' (copie)' });

export async function saveFighter(def) {
  if (def.builtin) def = copyOf(def, 'f');
  def.updated = Date.now();
  const k = app.fighters.findIndex((f) => f.id === def.id);
  if (app.project) await app.project.backend.saveItem('fighters', def);
  else await store.put('fighters', def.id, def);
  if (k >= 0) app.fighters[k] = def; else { app.fighters.push(def); await saveProjectMeta(); }
  bankCache.delete(def.id);
  return def;
}
export async function deleteFighter(id) {
  if (app.project) await app.project.backend.deleteItem('fighters', id);
  else await store.del('fighters', id);
  app.fighters = app.fighters.filter((f) => f.id !== id);
  bankCache.delete(id);
  await saveProjectMeta();
}
export async function saveStage(def) {
  if (def.builtin) def = copyOf(def, 's');
  def.updated = Date.now();
  const k = app.stages.findIndex((f) => f.id === def.id);
  if (app.project) await app.project.backend.saveItem('stages', def);
  else await store.put('stages', def.id, def);
  if (k >= 0) app.stages[k] = def; else { app.stages.push(def); await saveProjectMeta(); }
  thumbCache.delete(def.id);
  return def;
}
export async function deleteStage(id) {
  if (app.project) await app.project.backend.deleteItem('stages', id);
  else await store.del('stages', id);
  app.stages = app.stages.filter((f) => f.id !== id);
  thumbCache.delete(id);
  await saveProjectMeta();
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
// La coque (barre latérale du projet) est fournie par ui/shell.js
export const hooks = { wrap: null };

export function show(screen) {
  if (app.screen && app.screen.leave) app.screen.leave();
  clear(app.root);
  app.screen = screen;
  document.body.dataset.ingame = screen.ingame ? '1' : '0';
  const inShell = app.project && !app.player && !screen.ingame && !screen.noShell && hooks.wrap;
  app.root.append(inShell ? hooks.wrap(screen.el, app.current) : screen.el);
  if (screen.enter) screen.enter();
  window.scrollTo(0, 0);
}

export const screens = {};
export function go(name, ...args) {
  // Dans le logiciel, l'« écran titre » est le tableau de bord du projet (ou l'accueil des projets)
  if (name === 'title' && !app.player) name = app.project ? 'dashboard' : 'home';
  const make = screens[name];
  if (!make) throw new Error('Écran inconnu : ' + name);
  app.current = name;
  const s = make(...args);
  if (s && typeof s.then === 'function') s.then(show); else show(s);
}
