// Point d'entrée : charge le paquet de cartes et branche l'interface sur Firebase
// (ou, avec ?demo dans l'adresse, sur une base locale partagée entre les onglets du navigateur).
import { firebaseConfig } from './firebase-config.js?v=__VERSION__';
import { validateDeck } from './game-core.js?v=__VERSION__';
import { createGameStore } from './game-store.js?v=__VERSION__';
import { startApp, showFatal } from './ui.js?v=__VERSION__';

async function loadDeck() {
  const response = await fetch('data/cards.json?v=__VERSION__');
  if (!response.ok) throw new Error(`Paquet de cartes introuvable (${response.status})`);
  const deck = await response.json();
  const problems = validateDeck(deck);
  if (problems.length) throw new Error(problems.join('\n'));
  return deck;
}

async function createDb() {
  if (new URLSearchParams(location.search).has('demo')) {
    const { createDemoDb } = await import('./memory-db.js?v=__VERSION__');
    return createDemoDb();
  }
  const { createFirebaseDb } = await import('./firebase-db.js?v=__VERSION__');
  return createFirebaseDb(firebaseConfig);
}

let deck;
try {
  deck = await loadDeck();
} catch (error) {
  console.error(error);
  showFatal('Impossible de charger le paquet de cartes. Rechargez la page.');
}
/** Base injoignable (SDK Firebase non chargé) : l'interface démarre quand même, pour l'entraînement seul. */
const unreachableDb = {
  TIMESTAMP: null,
  uid: null,
  start: () => Promise.reject(new Error('Service temps réel injoignable')),
  serverNow: () => Date.now(),
  onConnection: () => () => {},
};

if (deck) {
  createDb()
    .catch((error) => { console.error(error); return unreachableDb; })
    .then((db) => startApp(createGameStore(db), { deck }));
}
