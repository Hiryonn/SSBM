// Sons synthétisés (aucun fichier requis) + musique de stage.
let ac = null;
let master = null;
export const volume = { sfx: 0.5, music: 0.5 };

function ctx() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.connect(ac.destination);
    } catch (e) { return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
export function unlockAudio() { ctx(); }

let noiseBuf = null;
function noise(a) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

export function sfx(kind, power = 5) {
  const a = ctx();
  if (!a || volume.sfx <= 0) return;
  const t = a.currentTime;
  const g = a.createGain();
  g.connect(master);
  const v = volume.sfx;
  if (kind === 'hit' || kind === 'shield') {
    const p = Math.min(1, power / 20);
    const n = noise(a);
    const f = a.createBiquadFilter();
    f.type = kind === 'shield' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'shield' ? 2500 : 1200 - p * 600;
    n.connect(f); f.connect(g);
    g.gain.setValueAtTime(v * (0.35 + p * 0.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + p * 0.25);
    n.start(t); n.stop(t + 0.4);
    if (kind === 'hit') {
      const o = a.createOscillator();
      const og = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160 - p * 60, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.2 + p * 0.2);
      og.gain.setValueAtTime(v * (0.4 + p * 0.6), t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.25 + p * 0.25);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 0.6);
    }
  } else if (kind === 'ko') {
    const n = noise(a);
    const f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(100, t + 1.2);
    n.connect(f); f.connect(g);
    g.gain.setValueAtTime(v * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    n.loop = true; n.start(t); n.stop(t + 1.4);
  } else if (kind === 'jump') {
    const o = a.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(v * 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t); o.stop(t + 0.12);
  } else if (kind === 'menu' || kind === 'go' || kind === 'count') {
    const o = a.createOscillator();
    o.type = 'square';
    const fr = kind === 'go' ? 880 : kind === 'count' ? 520 : 660;
    o.frequency.setValueAtTime(fr, t);
    o.connect(g);
    const d = kind === 'go' ? 0.45 : 0.08;
    g.gain.setValueAtTime(v * 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  }
}

let musicEl = null;
export function playMusic(src) {
  stopMusic();
  if (!src || volume.music <= 0) return;
  try {
    musicEl = new Audio(src);
    musicEl.loop = true;
    musicEl.volume = volume.music;
    musicEl.play().catch(() => {});
  } catch (e) { musicEl = null; }
}
export function stopMusic() {
  if (musicEl) { try { musicEl.pause(); } catch (e) { /* rien */ } musicEl = null; }
}
export function pauseMusic(p) { if (musicEl) { try { p ? musicEl.pause() : musicEl.play().catch(() => {}); } catch (e) { /* rien */ } } }
