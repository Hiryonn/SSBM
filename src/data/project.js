// Projets : un jeu = un projet.
// Version Windows : un dossier sur le disque
//   MonJeu/projet.json, MonJeu/persos/<id>.pfchar.json, MonJeu/stages/<id>.pfstage.json
// Navigateur : le même contenu rangé dans le stockage du navigateur.
import * as store from './storage.js';
import { desktop } from './game.js';
import { K } from '../engine/constants.js';

const DIRS = { fighters: 'persos', stages: 'stages' };
const EXT = { fighters: '.pfchar.json', stages: '.pfstage.json' };
const safeId = (id) => String(id).replace(/[^\w.-]+/g, '_').slice(0, 80) || 'sans-nom';

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function newMeta(name, extra = {}) {
  return {
    format: 'platfight-project', formatVersion: 1,
    id: uid('p'), name: name || 'Mon jeu', subtitle: '', author: '', version: '1.0',
    color: '#ff3d48', logo: null, titleMode: 'demo', titleImage: null, titleStage: null, training: true,
    rules: { mode: 'stock', stocks: 3, time: 3, teams: false },
    constants: { ...K, gameSpeed: 1 },
    order: { fighters: [], stages: [] },
    created: Date.now(),
    ...extra,
  };
}

// ------------------------------------------------------------------ dossier sur le disque
export class DiskProject {
  constructor(dir) { this.dir = dir; this.kind = 'disk'; }
  get key() { return 'disk:' + this.dir; }
  get where() { return this.dir; }
  async load() {
    const r = await desktop().projectLoad(this.dir);
    if (r.error) throw new Error(r.error);
    const parse = (list, label) => list.map((f) => {
      try { return JSON.parse(f.text); } catch (e) { console.warn('Fichier illisible', f.name); return null; }
    }).filter((x) => x && x.format === label);
    return {
      meta: JSON.parse(r.meta),
      fighters: parse(r.fighters, 'platfight-fighter'),
      stages: parse(r.stages, 'platfight-stage'),
    };
  }
  async saveMeta(meta) { await this.write('projet.json', JSON.stringify(meta, null, 2)); }
  async saveItem(kind, def) { await this.write(DIRS[kind] + '/' + safeId(def.id) + EXT[kind], JSON.stringify(def)); }
  async deleteItem(kind, id) {
    const r = await desktop().projectDelete(this.dir, DIRS[kind] + '/' + safeId(id) + EXT[kind]);
    if (r && r.error) throw new Error(r.error);
  }
  async write(rel, text) {
    const r = await desktop().projectWrite(this.dir, rel, text);
    if (r && r.error) throw new Error(r.error);
  }
}

// ------------------------------------------------------------------ stockage du navigateur
export class LocalProject {
  constructor(id) { this.id = id; this.kind = 'local'; }
  get key() { return 'local:' + this.id; }
  get where() { return 'Dans ce navigateur'; }
  async load() {
    const meta = await store.get('projects', this.id);
    if (!meta) throw new Error('Projet introuvable dans ce navigateur');
    return {
      meta,
      fighters: await store.allPrefix('pitems', this.id + ':fighters:'),
      stages: await store.allPrefix('pitems', this.id + ':stages:'),
    };
  }
  async saveMeta(meta) { await store.put('projects', this.id, JSON.parse(JSON.stringify(meta))); }
  async saveItem(kind, def) { await store.put('pitems', this.id + ':' + kind + ':' + def.id, def); }
  async deleteItem(kind, id) { await store.del('pitems', this.id + ':' + kind + ':' + id); }
  static async list() { return (await store.all('projects')).filter((m) => m && m.format === 'platfight-project'); }
  static async remove(id) {
    for (const kind of ['fighters', 'stages']) for (const d of await store.allPrefix('pitems', id + ':' + kind + ':')) await store.del('pitems', id + ':' + kind + ':' + d.id);
    await store.del('projects', id);
  }
}

export function backendFromRecent(r) {
  return r.kind === 'disk' ? new DiskProject(r.dir) : new LocalProject(r.id);
}
