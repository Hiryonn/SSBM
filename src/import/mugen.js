// Conversion d'un perso / stage Mugen vers le format PlatFight.
import { parseSFF, parseACT } from './sff.js';
import { parseINI, section, nums, parseAIR, parseCMDStates } from './text.js';
import { deflateZlib, toBase64 } from './inflate.js';
import { MOVE_SLOTS, MOVE_INFO, STATE_SLOTS, DEFAULT_STATS } from '../data/defs.js';

const latin = new TextDecoder('latin1');
const baseName = (p) => p.replace(/\\/g, '/').split('/').pop().toLowerCase();

// files : tableau de { name, data: Uint8Array }
export function makeResolver(files) {
  const map = new Map();
  for (const f of files) {
    const full = f.name.replace(/\\/g, '/').toLowerCase();
    map.set(full, f.data);
    if (!map.has(baseName(full))) map.set(baseName(full), f.data);
  }
  return (name) => {
    if (!name) return null;
    const n = name.replace(/\\/g, '/').toLowerCase().trim();
    return map.get(n) || map.get(baseName(n)) || null;
  };
}

export async function packSprites(sff) {
  let total = 0;
  for (const s of sff.sprites) total += s.data.length;
  const blob = new Uint8Array(total);
  const table = [];
  let off = 0;
  const seen = new Set();
  for (const s of sff.sprites) {
    const key = s.g + ',' + s.i;
    if (seen.has(key)) continue;
    seen.add(key);
    blob.set(s.data, off);
    table.push([s.g, s.i, s.w, s.h, s.ax, s.ay, s.kind === 'rgba' ? 1 : 0, s.pal, off, s.data.length]);
    off += s.data.length;
  }
  const z = await deflateZlib(blob.subarray(0, off));
  return { blob: toBase64(z), sprites: table };
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function pickAnim(anims, list) {
  for (const n of list) if (anims[n] && anims[n].frames.length) return n;
  return null;
}

const hasHit = (anim) => anim && anim.frames.some((f) => f.c1.length);

// Découpe une anim en groupes de coups (suites d'éléments avec Clsn1).
export function autoHits(anim, base) {
  const runs = [];
  let start = -1;
  anim.frames.forEach((f, k) => {
    if (f.c1.length && start < 0) start = k;
    if (!f.c1.length && start >= 0) { runs.push([start, k - 1]); start = -1; }
  });
  if (start >= 0) runs.push([start, anim.frames.length - 1]);
  if (!runs.length) return [];
  if (runs.length === 1) return [{ from: runs[0][0], to: runs[0][1], ...base }];
  const n = runs.length;
  const each = Math.max(1, Math.round((base.dmg * 0.6) / (n - 1)));
  return runs.map(([a, b], k) => k < n - 1
    ? { from: a, to: b, dmg: each, angle: 80, bkb: 8, kbg: 10 }
    : { from: a, to: b, ...base, dmg: Math.max(1, Math.round(base.dmg * 0.4 + 1)) });
}

export function makeMove(slot, animNo, anims) {
  const info = MOVE_INFO[slot];
  const anim = animNo != null ? anims[animNo] : null;
  const m = {
    anim: animNo,
    hits: anim ? autoHits(anim, { ...info.d }) : [],
    landLag: info.cat === 'air' ? 9 : 0,
    charge: null, vx: 0, vy: 0, at: 0, helpless: false, flip: false, proj: null,
  };
  if (info.cat === 'smash' && anim) {
    const first = anim.frames.findIndex((f) => f.c1.length);
    m.charge = Math.max(0, first - 1);
  }
  if (slot === 'bair' || slot === 'bthrow') m.flip = true;
  if (slot === 'upB') { m.vy = -8.5; m.helpless = true; }
  if (slot === 'sideB') { m.vx = 3; }
  return m;
}

function autoMoves(anims, cmdStates) {
  const moves = {};
  const used = new Set();
  const take = (slot, n) => {
    if (moves[slot] || n == null || !anims[n]) return;
    moves[slot] = makeMove(slot, n, anims);
    used.add(n);
  };
  const dirs = ['holddown', 'holdup', 'holdfwd', 'holdback', 'down', 'up', 'fwd', 'back'];
  const find = (btn, dir, air) => cmdStates.find((s) => s.cmds.includes(btn)
    && (dir ? s.cmds.includes(dir) : !s.cmds.some((c) => dirs.includes(c)))
    && (air === null || s.air === air || (s.air === null && air === false)));
  const rules = [
    ['jab', 'a', null, false], ['ftilt', 'b', null, false], ['dtilt', 'a', 'holddown', false],
    ['utilt', 'b', 'holddown', false], ['nair', 'a', null, true], ['dair', 'b', null, true],
    ['neutralB', 'c', null, false], ['downB', 'c', 'holddown', false],
    ['sideB', 'x', null, null], ['upB', 'y', null, null], ['fsmash', 'z', null, null],
  ];
  for (const [slot, btn, dir, air] of rules) {
    const s = find(btn, dir, air);
    if (s && hasHit(anims[s.value])) take(slot, s.value);
  }
  // Complète avec les anims d'attaque restantes, par plage de numéros.
  const attackAnims = Object.keys(anims).map(Number).filter((n) => hasHit(anims[n]) && !used.has(n)).sort((a, b) => a - b);
  const ground = attackAnims.filter((n) => n >= 200 && n < 600);
  const air = attackAnims.filter((n) => n >= 600 && n < 800);
  const special = attackAnims.filter((n) => n >= 800 && n < 5000);
  const fill = (slots, pool) => { for (const s of slots) if (!moves[s] && pool.length) take(s, pool.shift()); };
  fill(['jab', 'ftilt', 'dtilt', 'utilt', 'dash', 'fsmash', 'usmash', 'dsmash'], ground);
  fill(['nair', 'fair', 'dair', 'uair', 'bair'], air);
  fill(['neutralB', 'sideB', 'upB', 'downB', 'fsmash', 'usmash', 'dsmash'], special);
  // Recyclage : chaque emplacement a au moins quelque chose.
  const reuse = { fair: 'nair', bair: 'nair', uair: 'utilt', dash: 'ftilt', fsmash: 'ftilt', usmash: 'utilt', dsmash: 'dtilt',
    ledgeAtk: 'ftilt', getupAtk: 'dtilt', nair: 'jab', dair: 'dtilt', sideB: 'ftilt', upB: 'utilt', downB: 'dtilt', neutralB: 'jab',
    grab: 'jab', pummel: 'jab', fthrow: 'ftilt', bthrow: 'ftilt', uthrow: 'utilt', dthrow: 'dtilt' };
  for (const [slot] of MOVE_SLOTS) {
    if (!moves[slot] && reuse[slot] && moves[reuse[slot]]) take(slot, moves[reuse[slot]].anim);
    if (!moves[slot]) moves[slot] = makeMove(slot, null, anims);
  }
  return moves;
}

function measureBody(anims) {
  const a = anims[0];
  const boxes = a ? a.frames.flatMap((f) => f.c2) : [];
  if (!boxes.length) return { width: DEFAULT_STATS.width, height: DEFAULT_STATS.height };
  const minY = Math.min(...boxes.map((b) => b[1]));
  const minX = Math.min(...boxes.map((b) => b[0]));
  const maxX = Math.max(...boxes.map((b) => b[2]));
  return { width: Math.max(8, Math.min(40, maxX - minX)), height: Math.max(20, Math.min(120, -minY)) };
}

// Couleurs alternatives : rotation de teinte, et les gris/noirs reçoivent une légère couleur
// (sinon un perso noir ou blanc resterait identique).
export function huePalette(pal, deg) {
  const out = new Uint8Array(pal);
  for (let k = 1; k < 256; k++) {
    const r = pal[k * 4] / 255, g = pal[k * 4 + 1] / 255, b = pal[k * 4 + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let hh = 0, ss = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh *= 60;
    }
    hh = (hh + deg) % 360;
    if (ss < 0.3) { ss = 0.3 + ss; if (mx === mn) hh = deg % 360; }
    const q = l < 0.5 ? l * (1 + ss) : l + ss - l * ss, p = 2 * l - q;
    const f = (t) => { t = (t + 360) % 360; if (t < 60) return p + (q - p) * t / 60; if (t < 180) return q; if (t < 240) return p + (q - p) * (240 - t) / 60; return p; };
    out[k * 4] = Math.round(f(hh + 120) * 255);
    out[k * 4 + 1] = Math.round(f(hh) * 255);
    out[k * 4 + 2] = Math.round(f(hh - 120) * 255);
  }
  return out;
}

export async function importMugenCharacter(files, onProgress = () => {}) {
  const get = makeResolver(files);
  const defs = files.filter((f) => /\.def$/i.test(f.name));
  let defFile = null, sec = null;
  for (const d of defs) {
    const s = parseINI(latin.decode(d.data));
    const fsec = section(s, 'files');
    if (fsec && fsec.props.sprite && fsec.props.anim) { defFile = d; sec = s; break; }
  }
  if (!defFile) throw new Error('Aucun .def de personnage trouvé (il faut une section [Files] avec sprite= et anim=).');
  const info = section(sec, 'info')?.props || {};
  const fprops = section(sec, 'files').props;
  const sffData = get(fprops.sprite);
  const airData = get(fprops.anim);
  if (!sffData) throw new Error('Fichier de sprites introuvable : ' + fprops.sprite);
  if (!airData) throw new Error('Fichier d\'animations introuvable : ' + fprops.anim);
  onProgress('Décodage des sprites…');
  const sff = await parseSFF(sffData);
  onProgress('Lecture des animations…');
  const anims = parseAIR(latin.decode(airData));
  const cmdData = get(fprops.cmd);
  const cmdStates = cmdData ? parseCMDStates(latin.decode(cmdData)) : [];

  // Palette du corps : celle du sprite d'attente 0,0 (sinon la plus utilisée).
  const counts = new Map();
  for (const sp of sff.sprites) if (sp.kind === 'idx') counts.set(sp.pal, (counts.get(sp.pal) || 0) + 1);
  const s00 = sff.sprites.find((sp) => sp.g === 0 && sp.i === 0 && sp.kind === 'idx');
  const palBase = s00 ? s00.pal : ([...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);
  const samePal = (a, b) => { if (!a || !b) return false; for (let c = 4; c < 1024; c++) if ((c & 3) !== 3 && a[c] !== b[c]) return false; return true; };
  const palSwap = sff.palettes.map((p, k) => (samePal(p, sff.palettes[palBase]) ? k : -1)).filter((k) => k >= 0);
  // Palettes : celles du SFF + les .act déclarés (pal1..pal12).
  const palettes = sff.palettes.slice();
  const costumes = [{ name: 'Normal', pal: palBase, hue: 0 }];
  const seenAct = new Set();
  for (let k = 1; k <= 12; k++) {
    const p = fprops['pal' + k];
    if (!p || seenAct.has(p.toLowerCase())) continue;
    seenAct.add(p.toLowerCase());
    const act = get(p);
    if (!act || act.length < 768) continue;
    const pal = parseACT(act);
    // on ignore les palettes identiques à une palette déjà présente
    const same = palettes.some((q) => { for (let c = 4; c < 1024; c++) if ((c & 3) !== 3 && q[c] !== pal[c]) return false; return true; });
    if (same) continue;
    palettes.push(pal);
    costumes.push({ name: 'Palette ' + k, pal: palettes.length - 1, hue: 0 });
  }
  // En SFF v1, la vraie palette du perso est le premier .act (pal1), pas celle du premier sprite.
  if (sff.version === 1 && costumes.length > 1) {
    const first = costumes.splice(1, 1)[0];
    costumes[0] = { name: 'Normal', pal: first.pal, hue: 0 };
  }
  // Si on a moins de 4 costumes, on ajoute des variantes de teinte.
  const hues = [210, 120, 360, 280, 40];
  for (let k = 0; costumes.length < 6; k++) costumes.push({ name: 'Variante ' + (k + 1), pal: palBase, hue: hues[k % hues.length] });

  onProgress('Compression…');
  const pack = await packSprites(sff);

  const localcoord = nums(info.localcoord, [320, 240]);
  const body = measureBody(anims);
  const states = {};
  for (const [id, , cands] of STATE_SLOTS) states[id] = pickAnim(anims, cands);
  const moves = autoMoves(anims, cmdStates);

  const has = (g, i) => pack.sprites.some((s) => s[0] === g && s[1] === i);
  return {
    format: 'platfight-fighter', version: 1, id: uid(),
    name: info.displayname || info.name || 'Perso',
    author: info.author || '',
    source: 'Mugen (' + baseName(defFile.name) + ')',
    scale: +(320 / (localcoord[0] || 320)).toFixed(3),
    portrait: has(9000, 1) ? [9000, 1] : (has(9000, 0) ? [9000, 0] : null),
    icon: has(9000, 0) ? [9000, 0] : null,
    stats: { ...DEFAULT_STATS, ...body },
    palBase, palSwap,
    palettes: palettes.map((p) => toBase64(p)),
    costumes,
    pack,
    anims,
    states,
    moves,
  };
}

// --------------------------------------------------------------- Stages
export async function importMugenStage(files, onProgress = () => {}) {
  const get = makeResolver(files);
  const defs = files.filter((f) => /\.def$/i.test(f.name));
  let defFile = null, sec = null, text = '';
  for (const d of defs) {
    text = latin.decode(d.data);
    const s = parseINI(text);
    if (section(s, 'bgdef') || section(s, 'stageinfo')) { defFile = d; sec = s; break; }
  }
  if (!defFile) throw new Error('Aucun .def de stage trouvé (il faut une section [BGdef]).');
  const info = section(sec, 'info')?.props || {};
  const bgdef = section(sec, 'bgdef')?.props || {};
  const sffName = bgdef.spr || bgdef.sprite;
  const sffData = get(sffName);
  if (!sffData) throw new Error('Fichier de sprites du stage introuvable : ' + sffName);
  onProgress('Décodage du décor…');
  const sff = await parseSFF(sffData);
  const anims = parseAIR(text);
  const si = section(sec, 'stageinfo')?.props || {};
  const cam = section(sec, 'camera')?.props || {};
  const pi = section(sec, 'playerinfo')?.props || {};
  const zoffset = parseFloat(si.zoffset) || 200;
  const lc = nums(si.localcoord, [320, 240]);

  const bg = [];
  let inBG = false;
  for (const s of sec) {
    if (/^bgdef$/i.test(s.name)) { inBG = true; continue; }
    if (!inBG || !/^bg\b/i.test(s.name)) continue;
    const p = s.props;
    const type = (p.type || 'normal').toLowerCase();
    if (!['normal', 'anim', 'parallax'].includes(type)) continue;
    const el = {
      name: s.name.replace(/^bg\s*/i, '') || 'Calque',
      type: type === 'anim' ? 'anim' : 'normal',
      spr: nums(p.spriteno, [0, 0]),
      anim: p.actionno != null ? parseInt(p.actionno, 10) : null,
      start: nums(p.start, [0, 0]),
      delta: nums(p.delta, [1, 1]),
      tile: nums(p.tile, [0, 0]),
      tilespacing: nums(p.tilespacing, [0, 0]),
      scale: nums(p.scalestart, [1, 1]),
      velocity: nums(p.velocity, [0, 0]),
      trans: /^add/i.test(p.trans || '') ? 'add' : '',
      layer: parseInt(p.layerno, 10) === 1 ? 1 : 0,
    };
    if (el.scale.length === 1) el.scale[1] = el.scale[0];
    if (el.delta.length === 1) el.delta[1] = el.delta[0];
    bg.push(el);
  }
  // Couleur de fond = haut du premier calque (évite une bande noire au-dessus du ciel)
  let bgColor = '#101018';
  const first = bg.find((b) => b.type === 'normal');
  const sp = first && sff.sprites.find((q) => q.g === first.spr[0] && q.i === first.spr[1]);
  if (sp) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = 0; x < sp.w; x += Math.max(1, sp.w >> 5)) {
      let c;
      if (sp.kind === 'rgba') { if (sp.data[x * 4 + 3] < 128) continue; c = [sp.data[x * 4], sp.data[x * 4 + 1], sp.data[x * 4 + 2]]; }
      else { const k = sp.data[x]; if (!k) continue; const pal = sff.palettes[sp.pal] || sff.palettes[0]; c = [pal[k * 4], pal[k * 4 + 1], pal[k * 4 + 2]]; }
      r += c[0]; g += c[1]; b += c[2]; n++;
    }
    if (n) bgColor = '#' + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  }
  onProgress('Compression…');
  const pack = await packSprites(sff);
  const sx = [1, 2, 3, 4].map((k) => parseFloat(pi['p' + k + 'startx'])).filter((v) => !isNaN(v));
  const half = Math.max(120, Math.max(...sx.map(Math.abs), 70) + 60);
  return {
    format: 'platfight-stage', version: 1, id: uid(),
    name: info.displayname || info.name || 'Stage',
    author: info.author || '',
    source: 'Mugen (' + baseName(defFile.name) + ')',
    zoffset, localcoord: lc,
    bgColor,
    palettes: sff.palettes.map((p) => toBase64(p)),
    pack, anims, bg,
    ground: [{ x1: -half, y1: 0, x2: half, y2: 70, style: 'edge' }],
    platforms: [],
    blast: { left: -half - 170, right: half + 170, top: -300, bottom: 150 },
    camera: { left: -half - 140, right: half + 140, top: -270, bottom: 120 },
    spawns: [[-70, 0], [70, 0], [-140, 0], [140, 0]].map((d, k) => {
      const x = parseFloat(pi['p' + (k + 1) + 'startx']);
      return [isNaN(x) ? d[0] : Math.max(-half + 20, Math.min(half - 20, x)), 0];
    }),
    music: musicOf(get, section(sec, 'music')?.props?.bgmusic),
  };
}

function musicOf(get, name) {
  const data = get(name);
  if (!data) return null;
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav' }[ext];
  if (!mime) return null;
  return 'data:' + mime + ';base64,' + toBase64(data);
}
