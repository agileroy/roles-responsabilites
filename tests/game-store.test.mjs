// Parcours complets de partie sur la base en mémoire : un formateur et plusieurs participants
// partagent le même serveur, comme des navigateurs différents sur Firebase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMemoryServer } from '../site/js/memory-db.js';
import { createGameStore, hostReactions, joinRefusal, effectiveCardsPerPlayer, ROOT } from '../site/js/game-store.js';
import { teamScore, playedCounts, deckStats } from '../site/js/game-core.js';

const deck = JSON.parse(await readFile(new URL('../site/data/cards.json', import.meta.url), 'utf8'));
const cardsById = Object.fromEntries(deck.cards.map((c) => [c.id, c]));
const cards = deck.cards;
const isTrap = (id) => cardsById[id].answer === 'trap';

function setup({ now } = {}) {
  let clock = 1_000_000;
  const server = createMemoryServer({ now: now ?? (() => clock) });
  let seed = 1;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const make = (uid) => createGameStore(server.client(uid), { random });
  return { server, make, tick: (ms) => { clock += ms; }, room: (code) => server.read(`${ROOT}/rooms/${code}`) };
}

async function playTurn(t, code, host, stores, region = 'po') {
  const room = t.room(code);
  const player = stores[room.turn.playerUid];
  assert.ok(await player.draw(code, room));
  assert.ok(await player.place(code, t.room(code), region));
  hostReactions(host, code, t.room(code), cardsById);
  await new Promise((r) => setImmediate(r));
  return t.room(code);
}

test('création d\'une salle : code de 4 lettres, formateur, salle d\'attente', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  assert.match(code, /^[A-HJKMNP-Z]{4}$/);
  const room = t.room(code);
  assert.equal(room.meta.hostUid, 'host');
  assert.equal(room.meta.status, 'lobby');
  assert.equal(t.server.read(`${ROOT}/expiry/${code}`).hostUid, 'host');
});

test('rejoindre : prénom unique, code inconnu, salle pleine', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  assert.equal(await t.make('julie').join(code, ' Julie '), null);
  assert.equal(t.room(code).players.julie.name, 'Julie');
  assert.equal(await t.make('autre').join(code, 'julie'), 'Ce prénom est déjà pris dans la salle.');
  assert.equal(await t.make('x').join('ABCD', 'Paul'), 'Aucune partie avec ce code.');
  for (let i = 1; i < 10; i += 1) assert.equal(await t.make(`p${i}`).join(code, `Joueur ${i}`), null);
  assert.equal(await t.make('onze').join(code, 'Onze'), 'La salle est complète (10 participants au maximum).');
  // Un participant déjà présent peut revenir même salle pleine.
  assert.equal(joinRefusal(t.room(code), 'julie'), null);
});

test('réglages : 5 par défaut et ajusté à l\'arrivée d\'un participant', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  for (let i = 0; i < 7; i += 1) await t.make(`p${i}`).join(code, `P${i}`);
  assert.equal(effectiveCardsPerPlayer(t.room(code), deckStats(cards)), 5);
  await host.setCardsPerPlayer(code, 8);
  await t.make('p7').join(code, 'P7');
  assert.equal(effectiveCardsPerPlayer(t.room(code), deckStats(cards)), 7);
});

test('partie complète : cartes toutes différentes, correction, fin', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const stores = {};
  for (const name of ['julie', 'marc', 'ines', 'paul']) {
    stores[name] = t.make(name);
    await stores[name].join(code, name);
  }
  await host.setCardsPerPlayer(code, 5);
  assert.ok(await host.launch(code, t.room(code), cards));
  let room = t.room(code);
  assert.equal(room.meta.status, 'playing');
  assert.equal(room.turn.playerUid, room.meta.playerOrder[0]);

  for (let n = 0; n < 20; n += 1) {
    room = await playTurn(t, code, host, stores);
    assert.ok(room.turn.revealed, `tour ${n} révélé`);
    if (n < 19) await host.nextTurn(code, room);
  }
  const results = Object.values(t.room(code).results);
  assert.equal(results.length, 20);
  assert.equal(new Set(results.map((r) => r.cardId)).size, 20);
  for (const uid of Object.keys(stores)) {
    const mine = results.filter((r) => r.playerUid === uid);
    assert.equal(mine.filter((r) => isTrap(r.cardId)).length, 1, `un seul piège pour ${uid}`);
  }
  assert.deepEqual(Object.values(playedCounts(t.room(code).results)), [5, 5, 5, 5]);
  assert.equal(teamScore(t.room(code).results).count, 20);
  await host.finish(code);
  assert.equal(t.room(code).meta.status, 'finished');
  assert.equal(await t.make('late').join(code, 'Retard'), 'Cette partie est terminée.');
});

test('seul le joueur actif peut piocher et placer, et une seule fois', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const a = t.make('a'); const b = t.make('b');
  await a.join(code, 'A'); await b.join(code, 'B');
  await host.launch(code, t.room(code), cards);
  const active = t.room(code).turn.playerUid === 'a' ? a : b;
  const other = active === a ? b : a;
  assert.equal(await other.draw(code, t.room(code)), false);
  assert.ok(await active.draw(code, t.room(code)));
  assert.equal(await active.draw(code, t.room(code)), false);
  assert.equal(await other.place(code, t.room(code), 'po'), false);
  assert.ok(await active.select(code, t.room(code), 'sm'));
  assert.equal(t.room(code).turn.selection, 'sm');
  assert.ok(await active.place(code, t.room(code), 'po'));
  assert.equal(await active.place(code, t.room(code), 'dev'), false);
  assert.equal(t.room(code).turn.placement, 'po');
});

test('chrono : carte comptée fausse avec « temps écoulé »', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const a = t.make('a');
  await a.join(code, 'A');
  await host.setTimer(code, 30);
  await host.launch(code, t.room(code), cards);
  await a.draw(code, t.room(code));
  await a.select(code, t.room(code), 'po');
  hostReactions(host, code, t.room(code), cardsById);
  await new Promise((r) => setImmediate(r));
  assert.ok(!t.room(code).turn.revealed, 'pas avant la fin du chrono');
  t.tick(33_000);
  assert.equal(await a.place(code, t.room(code), 'po'), false, 'placement refusé après le chrono');
  hostReactions(host, code, t.room(code), cardsById);
  await new Promise((r) => setImmediate(r));
  const result = t.room(code).results[0];
  assert.equal(result.verdict, 'wrong');
  assert.equal(result.timedOut, true);
  assert.equal(result.region, undefined, 'la sélection non validée n\'est pas prise en compte');
});

test('passer son tour : la carte reste dans la main du joueur, qui la retrouve à son tour suivant', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const stores = { a: t.make('a'), b: t.make('b') };
  await stores.a.join(code, 'A'); await stores.b.join(code, 'B');
  await host.setCardsPerPlayer(code, 2);
  await host.launch(code, t.room(code), cards);
  const first = t.room(code).turn.playerUid;
  await stores[first].draw(code, t.room(code));
  const drawn = t.room(code).turn.cardId;
  await host.nextTurn(code, t.room(code), { skip: true });
  let room = t.room(code);
  const second = room.turn.playerUid;
  assert.notEqual(second, first);
  assert.equal(room.turn.deckIndex, '0');
  await stores[second].draw(code, room);
  assert.notEqual(t.room(code).turn.cardId, drawn, 'le suivant pioche dans sa propre main');
  assert.equal(t.room(code).turn.cardId, t.room(code).meta.hands[second][0]);
  await stores[second].place(code, t.room(code), 'po');
  hostReactions(host, code, t.room(code), cardsById);
  await new Promise((r) => setImmediate(r));
  await host.nextTurn(code, t.room(code));
  room = t.room(code);
  assert.equal(room.turn.playerUid, first);
  await stores[first].draw(code, room);
  assert.equal(t.room(code).turn.cardId, drawn, 'le joueur passé retrouve sa carte');
  assert.equal(t.room(code).players[first].quota, 2);
});

test('arrivée tardive : autant de cartes qu\'il en reste aux autres, à la fin de l\'ordre', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const stores = {};
  for (const uid of ['a', 'b', 'c']) { stores[uid] = t.make(uid); await stores[uid].join(code, uid); }
  await host.setCardsPerPlayer(code, 5);
  await host.launch(code, t.room(code), cards);
  for (let n = 0; n < 6; n += 1) {
    const room = await playTurn(t, code, host, stores);
    await host.nextTurn(code, room);
  }
  stores.marc = t.make('marc');
  assert.equal(await stores.marc.join(code, 'Marc'), null);
  hostReactions(host, code, t.room(code), cardsById);
  await new Promise((r) => setImmediate(r));
  const room = t.room(code);
  assert.equal(room.players.marc.quota, 3);
  assert.equal(room.meta.playerOrder.at(-1), 'marc');
  assert.equal(room.meta.hands.marc.length, 3);
  assert.equal(room.meta.hands.marc.filter(isTrap).length, 1, 'un piège dans la main du retardataire');
  const dealt = Object.entries(room.meta.hands).filter(([uid]) => uid !== 'marc').flatMap(([, h]) => h);
  assert.ok(room.meta.hands.marc.every((id) => !dealt.includes(id)), 'cartes non encore distribuées');
});

test('arrivée tardive : spectateur si le paquet est épuisé', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  for (let i = 0; i < 9; i += 1) await t.make(`p${i}`).join(code, `P${i}`);
  // Paquet réduit à 54 cartes (9 pièges, 45 autres) : 6 cartes chacun pour 9 participants, tout est distribué.
  const small = [...cards.filter((c) => c.answer === 'trap').slice(0, 9), ...cards.filter((c) => c.answer !== 'trap').slice(0, 45)];
  await host.setCardsPerPlayer(code, 6);
  await host.launch(code, t.room(code), small);
  await t.make('marc').join(code, 'Marc');
  hostReactions(host, code, t.room(code), Object.fromEntries(small.map((c) => [c.id, c])));
  await new Promise((r) => setImmediate(r));
  assert.equal(t.room(code).players.marc.quota, 0);
});

test('arrivée tardive : limitée par les cartes non distribuées', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  for (let i = 0; i < 9; i += 1) await t.make(`p${i}`).join(code, `P${i}`);
  // 58 cartes (10 pièges, 48 autres) : 6 cartes chacun pour 9 participants, 54 distribuées, 4 libres (1 piège, 3 autres).
  const deck58 = [...cards.filter((c) => c.answer === 'trap').slice(0, 10), ...cards.filter((c) => c.answer !== 'trap').slice(0, 48)];
  await host.setCardsPerPlayer(code, 6);
  await host.launch(code, t.room(code), deck58);
  await t.make('marc').join(code, 'Marc');
  hostReactions(host, code, t.room(code), Object.fromEntries(deck58.map((c) => [c.id, c])));
  await new Promise((r) => setImmediate(r));
  const room = t.room(code);
  assert.equal(room.players.marc.quota, 4);
  assert.equal(room.meta.hands.marc.filter(isTrap).length, 1);
});

test('participant retiré : ses cartes ne sont plus jouées', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  const stores = { a: t.make('a'), b: t.make('b') };
  await stores.a.join(code, 'A'); await stores.b.join(code, 'B');
  await host.setCardsPerPlayer(code, 3);
  await host.launch(code, t.room(code), cards);
  const order = t.room(code).meta.playerOrder;
  await host.removePlayer(code, order[1]);
  const room = await playTurn(t, code, host, stores);
  assert.equal(await host.nextTurn(code, room), order[0]);
  assert.equal(await t.make(order[1]).join(code, 'X'), 'Le formateur vous a retiré de cette partie.');
});

test('ménage : salles de plus de 24 heures supprimées à la création d\'une salle', async () => {
  const t = setup();
  const old = await t.make('h1').createRoom();
  t.tick(25 * 3600 * 1000);
  const recent = await t.make('h2').createRoom();
  t.tick(3600 * 1000);
  await t.make('h3').createRoom();
  assert.equal(t.room(old), null);
  assert.equal(t.server.read(`${ROOT}/expiry/${old}`), null);
  assert.ok(t.room(recent));
});

test('suppression de la salle par le formateur', async () => {
  const t = setup();
  const host = t.make('host');
  const code = await host.createRoom();
  await host.deleteRoom(code);
  assert.equal(t.room(code), null);
});
