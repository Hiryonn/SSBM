// Découpage automatique d'une planche de sprites brute :
// fond = couleur dominante des bords, poses = groupes de pixels, rangées = lignes de la planche.

// img : { w, h, rgba: Uint8ClampedArray }
export function sliceSheet(img, { tol = 6, gap = 2, minW = 8, minH = 10, maxW = 300, maxH = 300 } = {}) {
  const { w, h, rgba } = img;
  // ---- couleurs de fond : les plus fréquentes sur les bords
  const count = new Map();
  const add = (x, y) => { const k = (y * w + x) * 4; if (rgba[k + 3] < 16) return; const c = (rgba[k] << 16) | (rgba[k + 1] << 8) | rgba[k + 2]; count.set(c, (count.get(c) || 0) + 1); };
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
  const border = 2 * (w + h);
  const bg = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, n]) => n > border * 0.08).map(([c]) => [c >> 16, (c >> 8) & 255, c & 255]);
  // ---- masque des pixels de premier plan
  const fg = new Uint8Array(w * h);
  for (let p = 0, k = 0; p < w * h; p++, k += 4) {
    if (rgba[k + 3] < 16) continue;
    let isBg = false;
    for (const c of bg) if (Math.abs(rgba[k] - c[0]) + Math.abs(rgba[k + 1] - c[1]) + Math.abs(rgba[k + 2] - c[2]) <= tol) { isBg = true; break; }
    if (!isBg) fg[p] = 1;
  }
  // ---- composantes (8-connexité, pièces proches de `gap` px réunies)
  const grown = dilate(fg, w, h, gap);
  const label = new Int32Array(w * h);
  const comps = [];
  const stack = [];
  let next = 0;
  for (let p = 0; p < w * h; p++) {
    if (!grown[p] || label[p]) continue;
    next++;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0;
    stack.push(p); label[p] = next;
    while (stack.length) {
      const q = stack.pop();
      const qx = q % w, qy = (q / w) | 0;
      if (fg[q]) { area++; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const r = ny * w + nx;
        if (grown[r] && !label[r]) { label[r] = next; stack.push(r); }
      }
    }
    if (x1 < 0) continue;
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    if ((cw < minW && ch < minH) || cw > maxW || ch > maxH) continue;
    comps.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, area, label: next });
  }
  // ---- rangées : centres verticaux proches
  const rows = [];
  if (comps.length) {
    const hs = comps.map((c) => c.y1 - c.y0).sort((a, b) => a - b);
    const H = hs[hs.length >> 1];
    comps.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    for (const c of comps) {
      const cy = (c.y0 + c.y1) / 2;
      const last = rows[rows.length - 1];
      if (last && Math.abs(cy - last.cy) <= Math.max(6, H * 0.5)) {
        last.items.push(c);
        last.cy = last.items.reduce((s, i) => s + (i.y0 + i.y1) / 2, 0) / last.items.length;
      } else rows.push({ cy, items: [c] });
    }
    for (const r of rows) r.items.sort((a, b) => a.x0 - b.x0);
  }
  return { rows: rows.map((r) => r.items), fg, w, h, bg };
}

function dilate(src, w, h, n) {
  let a = src;
  for (let k = 0; k < n; k++) {
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!a[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) b[ny * w + nx] = 1;
      }
    }
    a = b;
  }
  return a;
}

// Image RGBA d'une pose (fond rendu transparent), éventuellement retournée, + point d'appui (pieds)
export function cropSprite(img, res, c, flip = false) {
  const cw = c.x1 - c.x0, ch = c.y1 - c.y0;
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = (c.y0 + y) * img.w + (c.x0 + x);
    if (!res.fg[p]) continue;
    const dx = flip ? cw - 1 - x : x;
    out.set(img.rgba.subarray(p * 4, p * 4 + 4), (y * cw + dx) * 4);
  }
  // point d'appui : bas du sprite, milieu des pixels du bas
  let bottom = 0;
  for (let y = ch - 1; y >= 0 && !bottom; y--) for (let x = 0; x < cw; x++) if (out[(y * cw + x) * 4 + 3]) { bottom = y; break; }
  let lo = cw, hi = -1;
  const band = Math.max(3, Math.round(ch * 0.22));
  for (let y = Math.max(0, bottom - band); y <= bottom; y++) for (let x = 0; x < cw; x++) if (out[(y * cw + x) * 4 + 3]) { if (x < lo) lo = x; if (x > hi) hi = x; }
  const ax = hi >= 0 ? Math.round((lo + hi) / 2) : cw >> 1;
  return { w: cw, h: ch, rgba: out, ax, ay: bottom };
}
