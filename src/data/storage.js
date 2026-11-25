// Bibliothèque locale (IndexedDB) avec repli en mémoire.
const DB = 'platfight-studio';
// fighters / stages : ancienne bibliothèque ; projects / pitems : projets enregistrés dans le navigateur
const STORES = ['fighters', 'stages', 'settings', 'projects', 'pitems'];
let dbp = null;
const mem = { fighters: new Map(), stages: new Map(), settings: new Map(), projects: new Map(), pitems: new Map() };
export let persistent = true;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { persistent = false; resolve(null); };
      req.onblocked = () => { persistent = false; resolve(null); };
    } catch (e) { persistent = false; resolve(null); }
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  if (!db) return fn(null);
  return new Promise((resolve, reject) => {
    try {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const r = fn(s);
      t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : r);
      t.onerror = () => reject(t.error);
    } catch (e) { persistent = false; resolve(fn(null)); }
  });
}

export async function put(store, key, value) {
  mem[store].set(key, value);
  try { await tx(store, 'readwrite', (s) => s && s.put(value, key)); } catch (e) { persistent = false; }
}
export async function del(store, key) {
  mem[store].delete(key);
  try { await tx(store, 'readwrite', (s) => s && s.delete(key)); } catch (e) { /* rien */ }
}
export async function get(store, key) {
  if (mem[store].has(key)) return mem[store].get(key);
  try {
    const v = await tx(store, 'readonly', (s) => s && s.get(key));
    if (v !== undefined && v !== null && typeof v === 'object' && !('readyState' in v)) { mem[store].set(key, v); return v; }
  } catch (e) { /* rien */ }
  return mem[store].get(key);
}
export async function all(store) {
  try {
    const db = await open();
    if (db) {
      const vals = await new Promise((resolve) => {
        const out = [];
        const t = db.transaction(store, 'readonly');
        const req = t.objectStore(store).openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
        req.onerror = () => resolve(null);
      });
      if (vals) { for (const v of vals) if (v && v.id) mem[store].set(v.id, v); }
    }
  } catch (e) { persistent = false; }
  return [...mem[store].values()];
}

// Toutes les valeurs dont la clé commence par un préfixe (ex. "projet:persos:")
export async function allPrefix(store, prefix) {
  const out = [];
  try {
    const db = await open();
    if (db) {
      await new Promise((resolve) => {
        const t = db.transaction(store, 'readonly');
        const req = t.objectStore(store).openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'));
        req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); mem[store].set(c.key, c.value); c.continue(); } else resolve(); };
        req.onerror = () => resolve();
      });
      return out;
    }
  } catch (e) { persistent = false; }
  for (const [k, v] of mem[store]) if (String(k).startsWith(prefix)) out.push(v);
  return out;
}
