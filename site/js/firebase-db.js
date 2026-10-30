// Seul module qui parle à Firebase : connexion anonyme et accès à la Realtime Database.
// Il expose la même interface que memory-db.js, ce qui permet de tester game-store.js sans Firebase.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getDatabase, ref, onValue, get, set, update, remove, push, onDisconnect, runTransaction, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

export function createFirebaseDb(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  let uid = null;
  let offset = 0;

  return {
    TIMESTAMP: serverTimestamp(),
    get uid() { return uid; },

    /** Connexion anonyme : l'identifiant est conservé par le navigateur (rechargements, onglets). */
    start() {
      return new Promise((resolve, reject) => {
        const stop = onAuthStateChanged(auth, (user) => {
          if (!user) return;
          stop();
          uid = user.uid;
          onValue(ref(db, '.info/serverTimeOffset'), (snap) => { offset = snap.val() ?? 0; });
          resolve(uid);
        }, reject);
        signInAnonymously(auth).catch(reject);
      });
    },

    serverNow() { return Date.now() + offset; },

    onValue(path, callback) {
      return onValue(ref(db, path), (snap) => callback(snap.val()), () => callback(null));
    },
    async get(path) { return (await get(ref(db, path))).val(); },
    set(path, value) { return set(ref(db, path), value); },
    update(path, patch) { return update(ref(db, path), patch); },
    remove(path) { return remove(ref(db, path)); },

    /** Transaction : `fn(valeur)` renvoie la nouvelle valeur, ou undefined pour abandonner. */
    async transaction(path, fn) {
      const result = await runTransaction(ref(db, path), fn);
      return result.committed;
    },

    /** Écrit `value` seulement si rien n'existe : les règles refusent d'écraser une valeur existante. */
    claim(path, value) {
      return set(ref(db, path), value).then(() => true, () => false);
    },

    onConnection(callback) {
      return onValue(ref(db, '.info/connected'), (snap) => callback(snap.val() === true));
    },

    /** Présence : une entrée par onglet sous `path`, retirée par le serveur à la déconnexion. */
    presence(path) {
      let current = null;
      let active = true;
      const open = async () => {
        current = push(ref(db, path));
        await onDisconnect(current).remove();
        await set(current, true);
      };
      const stop = onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val() === true && active) open().catch(() => {});
      });
      return async () => {
        active = false;
        stop();
        if (current) {
          await onDisconnect(current).cancel().catch(() => {});
          await remove(current).catch(() => {});
        }
      };
    },
  };
}
