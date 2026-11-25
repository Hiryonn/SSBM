// Parsers des fichiers texte Mugen : .def / .cmd (style INI) et .air (animations).

export function stripComment(line) {
  let inQ = false;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (c === '"') inQ = !inQ;
    else if (c === ';' && !inQ) return line.slice(0, k);
  }
  return line;
}

// Renvoie une liste de sections { name, props: {cle: valeur}, lines: [lignes brutes] }
export function parseINI(text) {
  const sections = [];
  let cur = { name: '', props: {}, lines: [] };
  sections.push(cur);
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    if (!line) continue;
    const m = line.match(/^\[(.+)\]$/);
    if (m) {
      cur = { name: m[1].trim(), props: {}, lines: [] };
      sections.push(cur);
      continue;
    }
    cur.lines.push(line);
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim().toLowerCase();
      let v = line.slice(eq + 1).trim();
      if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
      if (!(k in cur.props)) cur.props[k] = v;
    }
  }
  return sections;
}

export function section(sections, name) {
  const n = name.toLowerCase();
  return sections.find((s) => s.name.toLowerCase() === n);
}

export const nums = (v, def = []) => (v == null ? def : String(v).split(',').map((x) => parseFloat(x)).map((x, k) => (isNaN(x) ? (def[k] ?? 0) : x)));

// ------------------------------------------------------------------ AIR
// Une anim : { loop: index de LoopStart, frames: [{ g, i, ox, oy, t, fh, fv, trans, c1: [[x1,y1,x2,y2]], c2: [...] }] }
export function parseAIR(text) {
  const anims = {};
  let cur = null;
  let def1 = [], def2 = [];
  let next1 = null, next2 = null;
  let pending = null; // { kind: 1|2, list, count }
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = stripComment(raw).trim();
    if (!line) continue;
    const head = line.match(/^\[\s*begin\s+action\s+(-?\d+)\s*\]/i);
    if (head) {
      cur = { loop: 0, frames: [] };
      anims[parseInt(head[1], 10)] = cur;
      def1 = []; def2 = []; next1 = null; next2 = null; pending = null;
      continue;
    }
    if (line.startsWith('[')) { cur = null; continue; }
    if (!cur) continue;
    if (/^loopstart/i.test(line)) { cur.loop = cur.frames.length; continue; }
    let m = line.match(/^clsn([12])(default)?\s*:\s*(\d+)/i);
    if (m) {
      const list = [];
      if (m[1] === '1') { if (m[2]) def1 = list; else next1 = list; }
      else { if (m[2]) def2 = list; else next2 = list; }
      continue;
    }
    m = line.match(/^clsn([12])\s*\[\s*\d+\s*\]\s*=\s*(.+)$/i);
    if (m) {
      const v = m[2].split(',').map((x) => parseFloat(x));
      if (v.length < 4 || v.some(isNaN)) continue;
      const box = [Math.min(v[0], v[2]), Math.min(v[1], v[3]), Math.max(v[0], v[2]), Math.max(v[1], v[3])];
      const target = m[1] === '1' ? (next1 || def1) : (next2 || def2);
      target.push(box);
      continue;
    }
    if (/^interpolate/i.test(line)) continue;
    const parts = line.split(',').map((x) => x.trim());
    if (parts.length >= 5 && !isNaN(parseInt(parts[0], 10))) {
      const flip = (parts[5] || '').toUpperCase();
      cur.frames.push({
        g: parseInt(parts[0], 10), i: parseInt(parts[1], 10) || 0,
        ox: parseFloat(parts[2]) || 0, oy: parseFloat(parts[3]) || 0,
        t: parseInt(parts[4], 10),
        fh: flip.includes('H'), fv: flip.includes('V'),
        trans: (parts[6] || '').toUpperCase().startsWith('A') ? 'add' : '',
        c1: (next1 || def1).map((b) => b.slice()),
        c2: (next2 || def2).map((b) => b.slice()),
      });
      if (isNaN(cur.frames[cur.frames.length - 1].t)) cur.frames[cur.frames.length - 1].t = 1;
      next1 = null; next2 = null;
    }
  }
  for (const a of Object.values(anims)) if (a.loop >= a.frames.length) a.loop = 0;
  return anims;
}

// Les blocs [Begin Action] dans un .def de stage (animations de décor).
export function parseStageAnims(text) {
  return parseAIR(text);
}

// ------------------------------------------------------------------ CMD
// Extrait les changements d'état [State -1] : { value, cmds: ['a','holddown',...], air: bool|null }
export function parseCMDStates(text) {
  const out = [];
  const secs = parseINI(text);
  for (const s of secs) {
    if (!/^state\s+-1/i.test(s.name)) continue;
    const type = (s.props.type || '').toLowerCase();
    if (type !== 'changestate') continue;
    const value = parseInt(s.props.value, 10);
    if (isNaN(value) || String(value) !== String(s.props.value).trim()) continue;
    const body = s.lines.join(' ').toLowerCase();
    const cmds = [...body.matchAll(/command\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    let air = null;
    if (/statetype\s*=\s*a\b/.test(body)) air = true;
    else if (/statetype\s*!=\s*a\b/.test(body) || /statetype\s*=\s*[sc]\b/.test(body)) air = false;
    const needsPower = /power\s*>=?\s*\d{3,}/.test(body);
    out.push({ value, cmds, air, needsPower });
  }
  return out;
}
