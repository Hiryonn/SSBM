// Petits utilitaires d'interface.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }

let toastBox = null;
export function toast(msg, kind = '') {
  if (!toastBox) { toastBox = h('div', { class: 'toasts' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

// Boîte de dialogue maison (alert/confirm sont bloqués dans certains contextes)
export function modal(title, body, buttons = [{ label: 'OK', value: true, primary: true }]) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    const wrap = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(null); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
        h('h2', null, title),
        h('div', { class: 'modal-body' }, body),
        h('div', { class: 'modal-actions' }, buttons.map((b) => h('button', { class: b.primary ? 'btn primary' : (b.danger ? 'btn danger' : 'btn'), onclick: () => close(typeof b.value === 'function' ? b.value() : b.value) }, b.label)))));
    document.body.append(wrap);
    document.addEventListener('keydown', onKey, true);
    const f = wrap.querySelector('input,select,button.primary');
    if (f) setTimeout(() => f.focus(), 30);
  });
}
export const confirmBox = (title, text, okLabel = 'Confirmer', danger = true) =>
  modal(title, h('p', null, text), [{ label: 'Annuler', value: false }, { label: okLabel, value: true, primary: !danger, danger }]);

export async function promptBox(title, label, value = '') {
  const input = h('input', { type: 'text', value, class: 'inp wide' });
  const r = await modal(title, h('label', { class: 'field' }, h('span', null, label), input), [{ label: 'Annuler', value: null }, { label: 'OK', value: () => input.value, primary: true }]);
  return r;
}

export function pickFiles({ multiple = true, accept = '', directory = false } = {}) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', style: { display: 'none' } });
    if (multiple) inp.multiple = true;
    if (accept) inp.accept = accept;
    if (directory) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
    inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
    document.body.append(inp);
    inp.click();
  });
}

export function download(name, data, mime = 'application/json') {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, style: { display: 'none' } });
    document.body.append(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
    toast('Export lancé : ' + name + ' (si rien ne se passe, utilisez la version bureau).');
  } catch (e) {
    toast('Le téléchargement est bloqué ici. Utilisez la version bureau du logiciel.', 'bad');
  }
}

export function num(label, value, onInput, opts = {}) {
  const inp = h('input', { type: 'number', class: 'inp', value, step: opts.step ?? 1, min: opts.min, max: opts.max });
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) onInput(v); });
  return h('label', { class: 'field ' + (opts.cls || '') }, h('span', null, label), inp);
}
export function slider(label, value, onInput, { min = 0, max = 1, step = 0.01, fmt = (v) => v } = {}) {
  const out = h('output', null, fmt(value));
  const inp = h('input', { type: 'range', min, max, step, value });
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); out.textContent = fmt(v); onInput(v); });
  return h('label', { class: 'field slider' }, h('span', null, label), inp, out);
}
export function select(label, value, options, onChange) {
  const sel = h('select', { class: 'inp' }, options.map(([v, t]) => h('option', { value: String(v) }, t)));
  sel.value = String(value);
  sel.addEventListener('change', () => onChange(sel.value));
  return label ? h('label', { class: 'field' }, h('span', null, label), sel) : sel;
}
export function check(label, value, onChange) {
  const inp = h('input', { type: 'checkbox' });
  inp.checked = !!value;
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'field check' }, inp, h('span', null, label));
}
export function text(label, value, onInput) {
  const inp = h('input', { type: 'text', class: 'inp', value: value ?? '' });
  inp.addEventListener('input', () => onInput(inp.value));
  return h('label', { class: 'field' }, h('span', null, label), inp);
}
