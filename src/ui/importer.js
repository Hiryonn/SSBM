// Écran d'import : persos et stages Mugen (fichiers, dossiers, zip) + fichiers PlatFight.
import { h, clear, toast, pickFiles } from './dom.js';
import { app, go, screens, saveFighter, saveStage, drawFighterThumb, drawStageThumb } from '../app.js';
import { importMugenCharacter, importMugenStage } from '../import/mugen.js';
import { parseINI, section } from '../import/text.js';
import { readZip } from '../import/zip.js';

const latin = new TextDecoder('latin1');
const dirOf = (p) => { const s = p.replace(/\\/g, '/'); const k = s.lastIndexOf('/'); return k < 0 ? '' : s.slice(0, k + 1).toLowerCase(); };

async function collect(fileList) {
  const out = [];
  for (const f of fileList) {
    const name = f.webkitRelativePath || f.relPath || f.name;
    const data = new Uint8Array(await f.arrayBuffer());
    if (/\.zip$/i.test(name)) {
      try { for (const z of await readZip(data)) out.push({ name: name.replace(/\.zip$/i, '') + '/' + z.name, data: z.data }); }
      catch (e) { toast('Zip illisible : ' + name, 'bad'); }
    } else out.push({ name, data });
  }
  return out;
}

// Récupère les fichiers d'un glisser-déposer (y compris les dossiers)
async function fromDataTransfer(dt) {
  const items = [...(dt.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...dt.files];
  const files = [];
  const walk = async (entry, path) => {
    if (entry.isFile) {
      const f = await new Promise((res, rej) => entry.file(res, rej));
      f.relPath = path + f.name;
      files.push(f);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        batch = await new Promise((res) => reader.readEntries(res, () => res([])));
        for (const e of batch) await walk(e, path + entry.name + '/');
      } while (batch.length);
    }
  };
  for (const it of items) await walk(it, '');
  return files;
}

screens.importer = () => {
  const log = h('div', { class: 'imp-log' });
  const results = h('div', { class: 'lib-grid' });
  const drop = h('div', { class: 'dropzone', tabindex: 0 },
    h('b', null, 'Dépose ici un dossier de perso ou de stage Mugen'),
    h('span', null, 'ou un .zip, ou plusieurs dossiers à la fois. Fichiers lus : .def, .sff (v1 et v2), .air, .cmd, .act, musique du stage.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: async () => run(await pickFiles({ directory: true })) }, 'Choisir un dossier…'),
      h('button', { class: 'btn', onclick: async () => run(await pickFiles({ multiple: true })) }, 'Choisir des fichiers ou un zip…')));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => { e.preventDefault(); drop.classList.remove('over'); run(await fromDataTransfer(e.dataTransfer)); });

  const say = (msg, cls = '') => { log.append(h('div', { class: cls }, msg)); log.scrollTop = log.scrollHeight; };

  async function run(fileList) {
    if (!fileList || !fileList.length) return;
    say('Lecture de ' + fileList.length + ' fichier(s)…');
    const files = await collect(fileList);
    // Fichiers PlatFight directs
    for (const f of files.filter((x) => /\.json$/i.test(x.name))) {
      try {
        const d = JSON.parse(new TextDecoder().decode(f.data));
        if (d.format === 'platfight-fighter') { d.builtin = false; await saveFighter(d); showResult('f', d); say('✔ Perso PlatFight ajouté : ' + d.name, 'ok'); }
        if (d.format === 'platfight-stage') { d.builtin = false; await saveStage(d); showResult('s', d); say('✔ Stage PlatFight ajouté : ' + d.name, 'ok'); }
      } catch (e) { /* pas un fichier PlatFight */ }
    }
    // Repère chaque .def et son type
    const defs = [];
    for (const f of files.filter((x) => /\.def$/i.test(x.name))) {
      const secs = parseINI(latin.decode(f.data));
      const fs = section(secs, 'files');
      const info = section(secs, 'info')?.props || {};
      if (fs && fs.props.sprite && fs.props.anim) defs.push({ kind: 'f', f, key: 'f|' + (info.name || '') + '|' + fs.props.sprite.toLowerCase() });
      else if (section(secs, 'bgdef')) defs.push({ kind: 's', f, key: 's|' + (info.name || f.name) });
    }
    // Un seul .def par perso (évite les doublons des sous-dossiers 1.0 / 1.1)
    defs.sort((a, b) => a.f.name.split('/').length - b.f.name.split('/').length);
    const seen = new Set();
    const todo = defs.filter((d) => { if (seen.has(d.key)) return false; seen.add(d.key); return true; });
    if (!todo.length && !files.some((x) => /\.json$/i.test(x.name))) say('Aucun .def de perso ou de stage trouvé dans ces fichiers.', 'bad');
    for (const d of todo) {
      const dir = dirOf(d.f.name);
      const scoped = files.filter((x) => x.name.replace(/\\/g, '/').toLowerCase().startsWith(dir) || !x.name.includes('/'));
      const rel = scoped.map((x) => ({ name: x.name.slice(dir.length) || x.name, data: x.data }));
      // les autres .def du dossier sont retirés pour ne garder que celui-ci
      const only = rel.filter((x) => !/\.def$/i.test(x.name) || x.data === d.f.data);
      // on garde aussi les fichiers des autres dossiers (musique de stage rangée dans sound/, etc.) en dernier recours
      const rest = files.filter((x) => !scoped.includes(x)).map((x) => ({ name: x.name, data: x.data })).filter((x) => !/\.def$/i.test(x.name));
      try {
        if (d.kind === 'f') {
          const def = await importMugenCharacter([...only, ...rest], (m) => say('  ' + m));
          await saveFighter(def);
          say('✔ Perso importé : ' + def.name + ' (' + def.pack.sprites.length + ' sprites, ' + Object.keys(def.anims).length + ' anims)', 'ok');
          showResult('f', def);
        } else {
          const def = await importMugenStage([...only, ...rest], (m) => say('  ' + m));
          await saveStage(def);
          say('✔ Stage importé : ' + def.name + (def.music ? ' (avec musique)' : ''), 'ok');
          showResult('s', def);
        }
      } catch (e) {
        console.error(e);
        say('✘ ' + d.f.name + ' : ' + e.message, 'bad');
      }
    }
  }

  function showResult(kind, def) {
    const cv = h('canvas', kind === 'f' ? { width: 120, height: 120 } : { width: 240, height: 135 });
    results.append(h('div', { class: 'lib-card' + (kind === 's' ? ' wide' : '') }, cv, h('b', null, def.name),
      h('small', null, kind === 'f' ? 'Coups attribués automatiquement : vérifie-les dans l\'éditeur.' : 'Sol et zones de KO à ajuster dans l\'éditeur.'),
      h('div', { class: 'lib-actions' },
        h('button', { class: 'btn primary', onclick: () => go(kind === 'f' ? 'chareditor' : 'stageeditor', def.id) }, 'Ouvrir dans l\'éditeur'))));
    (kind === 'f' ? drawFighterThumb(def, cv) : drawStageThumb(def, cv)).catch(() => {});
  }

  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' }, h('button', { class: 'btn ghost', onclick: () => go('title') }, '← Menu'), h('h1', null, 'Importer')),
    h('div', { class: 'imp-grid' }, drop, log),
    results);
  return { el };
};
