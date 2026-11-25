// Écran de jeu : boucle à 60 images/s fixe, pause, entraînement, résultats.
import { h, toast } from './dom.js';
import { app, go, screens, drawFighterThumb } from '../app.js';
import { Match } from '../engine/match.js';
import { listenKeyboard, getPads, DEFAULT_PAD } from '../engine/input.js';
import { K } from '../engine/constants.js';
import { stopMusic, unlockAudio } from '../engine/audio.js';

// opts : { cfg (pour Match.create), back: () => void, training, title }
screens.game = (opts) => {
  const canvas = h('canvas', { class: 'game-canvas', tabindex: 0 });
  const help = opts.training ? h('div', { class: 'train-help' },
    h('b', null, opts.title || 'Entraînement'),
    h('span', null, 'H : hitbox'), h('span', null, 'R : remettre à zéro'), h('span', null, 'P / Start : pause'), h('span', null, 'Échap / Select : quitter'),
  ) : null;
  const loading = h('div', { class: 'loading' }, 'Chargement…');
  const el = h('div', { class: 'screen game' }, canvas, help, loading);
  let match = null, raf = 0, last = 0, acc = 0, dead = false;
  let padStart = false, padQuit = true;

  const quit = () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    match?.destroy();
    stopMusic();
    opts.back();
  };

  const onKey = (e) => {
    if (!match) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      if (opts.training || match.paused) quit(); else match.togglePause();
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyP') {
      if (opts.training && e.code !== 'KeyP') return;
      if (opts.training) { match.paused = !match.paused; return; }
      match.togglePause();
    } else if (opts.training && e.code === 'KeyH') {
      match.debug = !match.debug;
    } else if (opts.training && e.code === 'KeyR') {
      const sp = match.stage.def.spawns || [];
      match.fighters.forEach((f, k) => { const s = sp[k] || [0, 0]; f.spawn(s[0], s[1] - 40, s[0] > 0 ? -1 : 1); f.percent = 0; });
      match.projectiles = [];
    }
  };

  const frame = (t) => {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const W = canvas.clientWidth | 0, H = canvas.clientHeight | 0;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const dt = Math.min(100, t - (last || t));
    last = t;
    acc += dt * (K.gameSpeed || 1);
    const step = 1000 / 60;
    // Start d'une manette = pause
    // Manette : Start = pause ; en pause, B (bouton droit) ou Select = quitter
    const pm = app.settings.padMap || DEFAULT_PAD;
    const pads = getPads();
    const anyStart = pads.some((p) => (pm.start || [9]).some((n) => p.buttons[n]?.pressed));
    const anyQuit = pads.some((p) => p.buttons[8]?.pressed || (match?.paused && p.buttons[1]?.pressed));
    if (anyStart && !padStart && match) { if (opts.training) match.paused = !match.paused; else match.togglePause(); }
    if (anyQuit && !padQuit && match && (match.paused || opts.training)) { padQuit = true; quit(); return; }
    padStart = anyStart; padQuit = anyQuit;
    let n = 0;
    while (acc >= step && n < 5) { match.step(); acc -= step; n++; }
    if (n >= 5) acc = 0;
    const ctx = canvas.getContext('2d');
    match.draw(ctx, W, H);
    if (match.phase === 'done' && !opts.training) {
      const res = match.results();
      dead = true;
      cancelAnimationFrame(raf);
      match.destroy();
      go('results', res, opts);
    }
  };

  return {
    el, ingame: true,
    async enter() {
      listenKeyboard();
      unlockAudio();
      window.addEventListener('keydown', onKey);
      try {
        match = await Match.create({ ...opts.cfg, keymaps: app.settings.keymaps, padMap: app.settings.padMap, training: !!opts.training });
      } catch (e) {
        console.error(e);
        toast('Impossible de lancer le match : ' + e.message, 'bad');
        opts.back();
        return;
      }
      window.__match = match;
      loading.remove();
      canvas.focus();
      raf = requestAnimationFrame(frame);
    },
    leave() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      match?.destroy();
    },
  };
};

screens.results = (res, opts) => {
  const canvases = [];
  const rows = res.map((r) => {
    const cv = h('canvas', { width: 120, height: 120 });
    canvases.push([r, cv]);
    return h('div', { class: 'res-row' + (r.place === 1 ? ' first' : ''), style: { '--pc': r.color } },
      h('div', { class: 'res-place' }, r.place),
      cv,
      h('div', { class: 'res-name' }, r.name),
      h('dl', { class: 'res-stats' },
        h('dt', null, 'KO'), h('dd', null, r.kos),
        h('dt', null, 'Chutes'), h('dd', null, r.falls),
        h('dt', null, 'Autodestructions'), h('dd', null, r.sds),
        h('dt', null, 'Dégâts infligés'), h('dd', null, r.dealt + ' %')));
  });
  const el = h('div', { class: 'screen results' },
    h('div', { class: 'res-head' }, h('h1', null, res[0] ? res[0].name + ' gagne !' : 'Fin du match')),
    h('div', { class: 'res-list' }, rows),
    h('div', { class: 'res-actions' },
      h('button', { class: 'btn primary big', onclick: () => go('game', opts) }, 'Revanche'),
      h('button', { class: 'btn big', onclick: () => go('versus') }, 'Changer de persos'),
      h('button', { class: 'btn big', onclick: () => go('title') }, 'Menu principal')));
  return {
    el,
    async enter() {

      for (const [r, cv] of canvases) drawFighterThumb(r.def, cv, r.costume);
    },
  };
};
