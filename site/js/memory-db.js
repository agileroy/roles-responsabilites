// Base de données en mémoire, avec la même interface que firebase-db.js.
// Sert aux tests Node.js (plusieurs clients partagent un serveur) et au mode démo du site (?demo),
// où les onglets d'un même navigateur partagent l'état par localStorage, sans Firebase.

const TIMESTAMP = { '.sv': 'timestamp' };

function split(path) {
  return String(path).split('/').filter(Boolean);
}

function clone(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function resolveTimestamps(value, now) {
  if (value && typeof value === 'object') {
    if (value['.sv'] === 'timestamp') return now;
    const out = Array.isArray(value) ? [] : {};
    for (const [key, child] of Object.entries(value)) out[key] = resolveTimestamps(child, now);
    return out;
  }
  return value;
}

/** Supprime les objets vides, comme Firebase qui ne stocke pas de nœud sans enfant. */
function prune(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = prune(value[key]);
      if (value[key] === null || value[key] === undefined) delete value[key];
    }
    return Object.keys(value).length ? value : null;
  }
  return value;
}

/** Serveur en mémoire : `client(uid)` renvoie une connexion avec l'interface de firebase-db.js. */
export function createMemoryServer({ now = () => Date.now(), persist = null } = {}) {
  let data = persist?.load() ?? {};
  const listeners = new Set();
  let connectionSeq = 0;

  function read(path) {
    let node = data;
    for (const key of split(path)) {
      if (node === null || typeof node !== 'object') return null;
      node = node[key];
    }
    return node === undefined ? null : node;
  }

  function write(path, value) {
    const keys = split(path);
    if (!keys.length) { data = prune(clone(value)) ?? {}; return; }
    let node = data;
    for (const key of keys.slice(0, -1)) {
      if (node[key] === null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[keys.at(-1)] = clone(value);
    data = prune(data) ?? {};
  }

  function notify() {
    persist?.save(data);
    for (const listener of [...listeners]) listener.fire();
  }

  function listen(path, callback) {
    const listener = {
      last: undefined,
      fire() {
        const value = JSON.stringify(read(path));
        if (value === this.last) return;
        this.last = value;
        callback(JSON.parse(value));
      },
    };
    listeners.add(listener);
    listener.fire();
    return () => listeners.delete(listener);
  }

  function reload() {
    data = persist?.load() ?? data;
    for (const listener of [...listeners]) listener.fire();
  }

  function client(uid) {
    const connections = [];
    return {
      TIMESTAMP,
      get uid() { return uid; },
      async start() { return uid; },
      serverNow: now,
      onValue: (path, callback) => listen(path, callback),
      async get(path) { return clone(read(path)); },
      async set(path, value) { write(path, resolveTimestamps(value, now())); notify(); },
      async update(path, patch) {
        const stamped = resolveTimestamps(patch, now());
        for (const [key, value] of Object.entries(stamped)) write(`${path}/${key}`, value);
        notify();
      },
      async remove(path) { write(path, null); notify(); },
      async transaction(path, fn) {
        const next = fn(clone(read(path)));
        if (next === undefined) return false;
        write(path, resolveTimestamps(next, now()));
        notify();
        return true;
      },
      /** Écrit `value` seulement si rien n'existe à cet endroit. */
      async claim(path, value) {
        if (read(path) !== null) return false;
        write(path, resolveTimestamps(value, now()));
        notify();
        return true;
      },
      onConnection(callback) { callback(true); return () => {}; },
      presence(path) {
        connectionSeq += 1;
        const entry = `${path}/c${Date.now().toString(36)}${connectionSeq}${Math.random().toString(36).slice(2, 6)}`;
        write(entry, true);
        notify();
        connections.push(entry);
        return async () => { write(entry, null); notify(); };
      },
      /** Simule la fermeture de l'onglet : le serveur retire les présences de ce client. */
      disconnect() {
        for (const entry of connections.splice(0)) write(entry, null);
        notify();
      },
    };
  }

  return { client, read, reload, get data() { return data; } };
}

/** Base partagée entre les onglets du navigateur (mode démo). */
export function createDemoDb() {
  const KEY = 'roles-responsabilites.demo-db';
  const persist = {
    load() { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } },
    save(value) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
  };
  const server = createMemoryServer({ persist });
  window.addEventListener('storage', (event) => { if (event.key === KEY) server.reload(); });
  let uid;
  try {
    uid = sessionStorage.getItem('roles-responsabilites.demo-uid');
    if (!uid) {
      uid = `demo${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('roles-responsabilites.demo-uid', uid);
    }
  } catch {
    uid = `demo${Math.random().toString(36).slice(2, 10)}`;
  }
  const db = server.client(uid);
  window.addEventListener('pagehide', () => db.disconnect());
  return db;
}
