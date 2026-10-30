import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGIONS, verdict, explanationFor, frenchTypography, validateDeck, validateName, normalizeName, nameKey,
  generateCode, isValidCode, normalizeCode, maxCardsPerPlayer, clampCardsPerPlayer, shuffle, asList,
  nextPlayer, lateQuota, playedCounts, secondsLeft, teamScore, playerScores, podium, mistakes, formatPercent,
} from '../site/js/game-core.js';

// ---------------------------------------------------------------- Verdict

test('verdict : placement exact', () => {
  assert.equal(verdict('po-dev', 'po-dev'), 'right');
  assert.equal(verdict('team', 'team'), 'right');
  assert.equal(verdict('trap', 'trap'), 'right');
});

test('verdict : placement incomplet ou trop large est partiel', () => {
  assert.equal(verdict('po', 'po-dev'), 'partial');
  assert.equal(verdict('po', 'team'), 'partial');      // carte Scrum Team placée dans un seul rôle
  assert.equal(verdict('team', 'po'), 'partial');      // carte d'un seul rôle placée au centre
  assert.equal(verdict('po-dev', 'team'), 'partial');  // refinement placé en PO + Developers
});

test('verdict : aucune accountability commune est faux', () => {
  assert.equal(verdict('po', 'dev'), 'wrong');
  assert.equal(verdict('po-sm', 'dev'), 'wrong');
});

test('verdict : la zone Piège face à un rôle est toujours fausse', () => {
  for (const region of REGIONS.filter((r) => r !== 'trap')) {
    assert.equal(verdict(region, 'trap'), 'wrong', `${region} pour un piège`);
    assert.equal(verdict('trap', region), 'wrong', `piège pour ${region}`);
  }
});

test('verdict : carte non placée (temps écoulé) ou région inconnue', () => {
  assert.equal(verdict(null, 'po'), 'wrong');
  assert.equal(verdict('chef', 'po'), 'wrong');
});

test('verdict : combinaisons symétriques', () => {
  for (const a of REGIONS) for (const b of REGIONS) assert.equal(verdict(a, b), verdict(b, a), `${a} / ${b}`);
});

// ---------------------------------------------------------------- Explication et typographie

const sizing = {
  id: 'dev-06', text: 'Dimensionner', answer: 'dev', reference: 'Product Backlog',
  explanation: 'Générale.', errors: { po: 'Ciblée PO.' },
};

test('explication ciblée pour la région choisie, avec l\'explication générale', () => {
  assert.deepEqual(explanationFor(sizing, 'po'), { targeted: 'Ciblée PO.', general: 'Générale.', reference: 'Product Backlog' });
});

test('explication générale seule sans explication ciblée, ou si la réponse est juste', () => {
  assert.equal(explanationFor(sizing, 'sm').targeted, null);
  assert.equal(explanationFor(sizing, 'dev').targeted, null);
  assert.equal(explanationFor(sizing, null).targeted, null);
});

test('typographie française : espaces insécables', () => {
  assert.equal(frenchTypography("Ce n'est pas un piège : non ; si ! Vrai ?"), "Ce n'est pas un piège : non ; si ! Vrai ?");
  assert.equal(frenchTypography('le « comment » ici'), 'le « comment » ici');
});

// ---------------------------------------------------------------- Paquet

const card = (over = {}) => ({ id: 'a', text: 'T', answer: 'po', explanation: 'E', reference: 'R', errors: {}, ...over });

test('paquet valide', () => {
  assert.deepEqual(validateDeck({ cards: [card(), card({ id: 'b', answer: 'trap' })] }), []);
});

test('paquet invalide : doublon, région inconnue, champ vide, erreur ciblée sur la bonne région', () => {
  assert.match(validateDeck({ cards: [card(), card()] }).join(), /double/);
  assert.match(validateDeck({ cards: [card({ answer: 'chef' })] }).join(), /région inconnue/);
  assert.match(validateDeck({ cards: [card({ explanation: ' ' })] }).join(), /vide/);
  assert.match(validateDeck({ cards: [card({ errors: { po: 'x' } })] }).join(), /propre bonne région/);
  assert.match(validateDeck({ cards: [card({ errors: { chef: 'x' } })] }).join(), /région inconnue/);
});

// ---------------------------------------------------------------- Prénom et code

test('prénom : espaces de bord retirés, 1 à 20 caractères', () => {
  assert.equal(normalizeName('  Julie  '), 'Julie');
  assert.ok(validateName('   '));
  assert.ok(validateName('a'.repeat(21)));
  assert.equal(validateName('a'.repeat(20)), null);
});

test('prénom unique sans tenir compte des majuscules', () => {
  assert.equal(nameKey('Julie'), nameKey(' julie '));
  assert.equal(nameKey('a.b/c'), 'a%2Eb%2Fc');
});

test('code de salle : 4 lettres sans lettres ambiguës', () => {
  let i = 0;
  const values = [0, 0.5, 0.99, 0.2];
  const code = generateCode(() => values[i++]);
  assert.equal(code.length, 4);
  assert.ok(isValidCode(code));
  assert.ok(!isValidCode('ABCI'));
  assert.ok(!isValidCode('ABC0'));
  assert.ok(!isValidCode('ABC'));
  assert.equal(normalizeCode(' kztr '), 'KZTR');
  for (let n = 0; n < 200; n += 1) assert.ok(isValidCode(generateCode()));
});

// ---------------------------------------------------------------- Réglages

test('maximum de cartes par personne', () => {
  assert.equal(maxCardsPerPlayer(67, 10), 6);
  assert.equal(maxCardsPerPlayer(67, 8), 8);
  assert.equal(maxCardsPerPlayer(67, 7), 9);
});

test('réglage ramené au nouveau maximum à l\'arrivée d\'un participant', () => {
  assert.equal(clampCardsPerPlayer(9, maxCardsPerPlayer(67, 8)), 8);
  assert.equal(clampCardsPerPlayer(3, 8), 3);
  assert.equal(clampCardsPerPlayer(0, 8), 8);
});

test('mélange : même contenu, ordre déterministe avec un aléa fixé', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  const mixed = shuffle(items, () => 0);
  assert.deepEqual([...mixed].sort(), items);
  assert.deepEqual(mixed, ['b', 'c', 'd', 'e', 'a']);
  assert.deepEqual(items, ['a', 'b', 'c', 'd', 'e']);
});

test('listes Firebase remises en tableau', () => {
  assert.deepEqual(asList({ 1: 'b', 0: 'a', 10: 'c' }), ['a', 'b', 'c']);
  assert.deepEqual(asList(['a', null, 'b']), ['a', 'b']);
  assert.deepEqual(asList(undefined), []);
});

// ---------------------------------------------------------------- Joueur suivant

const players = (quota, extra = {}) => ({
  julie: { quota }, marc: { quota }, ines: { quota }, ...extra,
});
const order = ['julie', 'marc', 'ines'];
const res = (...uids) => Object.fromEntries(uids.map((uid, seq) => [seq, { playerUid: uid, cardId: `c${seq}`, verdict: 'right' }]));

test('joueur suivant : ordre de passage cyclique', () => {
  assert.equal(nextPlayer({ order, players: players(2), results: {} }), 'julie');
  assert.equal(nextPlayer({ order, players: players(2), results: res('julie'), currentUid: 'julie' }), 'marc');
  assert.equal(nextPlayer({ order, players: players(2), results: res('julie', 'marc', 'ines'), currentUid: 'ines' }), 'julie');
});

test('joueur suivant : fin de partie quand tout le monde a joué ses cartes', () => {
  assert.equal(nextPlayer({ order, players: players(1), results: res('julie', 'marc', 'ines'), currentUid: 'ines' }), null);
});

test('joueur suivant : un participant retiré est sauté', () => {
  const p = players(2, { marc: { quota: 2, removed: true } });
  assert.equal(nextPlayer({ order, players: p, results: res('julie'), currentUid: 'julie' }), 'ines');
});

test('joueur absent : après « Passer son tour », il garde ses cartes et rejoue au tour suivant', () => {
  // Marc passé (aucun résultat pour lui) : c'est à Inès, puis Julie, puis Marc à nouveau.
  const p = players(2);
  const results = res('julie');
  assert.equal(nextPlayer({ order, players: p, results, currentUid: 'marc' }), 'ines');
  const after = res('julie', 'ines', 'julie');
  assert.equal(nextPlayer({ order, players: p, results: after, currentUid: 'julie' }), 'marc');
  assert.equal(playedCounts(after).marc ?? 0, 0);
});

test('retardataire : autant de cartes qu\'il en reste aux autres', () => {
  const p = players(5);
  const twoRounds = res('julie', 'marc', 'ines', 'julie', 'marc', 'ines');
  assert.equal(lateQuota({ players: p, results: twoRounds, deckSize: 67, cardsPerPlayer: 5 }), 3);
  // Tour en cours : Inès n'a pas encore joué son 3e carte ; il en reste 3 au moins avancé.
  const mid = res('julie', 'marc', 'ines', 'julie', 'marc', 'ines', 'julie', 'marc');
  assert.equal(lateQuota({ players: p, results: mid, deckSize: 67, cardsPerPlayer: 5 }), 3);
});

test('retardataire : limité par les cartes restantes du paquet, spectateur s\'il n\'en reste pas', () => {
  const p = players(6);
  assert.equal(lateQuota({ players: p, results: {}, deckSize: 20, cardsPerPlayer: 6 }), 2);
  assert.equal(lateQuota({ players: p, results: {}, deckSize: 18, cardsPerPlayer: 6 }), 0);
});

test('chrono : secondes restantes', () => {
  assert.equal(secondsLeft(1000, 30, 1000), 30);
  assert.equal(secondsLeft(1000, 30, 30500), 1);
  assert.equal(secondsLeft(1000, 30, 99999), 0);
  assert.equal(secondsLeft(1000, 0, 2000), null);
  assert.equal(secondsLeft(undefined, 30, 2000), null);
});

// ---------------------------------------------------------------- Scores

const scored = (...entries) => Object.fromEntries(entries.map(([uid, v], seq) => [seq, { playerUid: uid, cardId: `c${seq}`, verdict: v, region: 'po' }]));

test('pourcentage individuel : 2 justes, 1 partielle, 1 fausse = 62,5 %', () => {
  const results = scored(['julie', 'right'], ['julie', 'right'], ['julie', 'partial'], ['julie', 'wrong']);
  assert.equal(playerScores(results).julie.percent, 62.5);
  assert.equal(formatPercent(62.5), '62,5 %');
});

test('score collectif : 14 justes, 2 partielles, 4 fausses = 75 %', () => {
  const entries = [
    ...Array(14).fill(['a', 'right']), ...Array(2).fill(['b', 'partial']), ...Array(4).fill(['c', 'wrong']),
  ];
  const score = teamScore(scored(...entries));
  assert.deepEqual({ ...score }, { count: 20, points: 15, right: 14, partial: 2, wrong: 4, percent: 75 });
});

test('podium : les ex aequo partagent la même marche', () => {
  const results = scored(
    ['julie', 'right'], ['julie', 'right'], ['julie', 'right'], ['julie', 'right'], ['julie', 'wrong'],
    ['marc', 'right'], ['marc', 'right'], ['marc', 'right'], ['marc', 'right'], ['marc', 'wrong'],
    ['ines', 'right'], ['ines', 'right'], ['ines', 'right'], ['ines', 'wrong'], ['ines', 'wrong'],
    ['paul', 'right'], ['paul', 'right'], ['paul', 'wrong'], ['paul', 'wrong'], ['paul', 'wrong'],
    ['zoe', 'wrong'],
  );
  const steps = podium(results);
  assert.equal(steps.length, 3);
  assert.deepEqual(steps[0], { rank: 1, percent: 80, uids: ['julie', 'marc'] });
  assert.deepEqual(steps[1], { rank: 2, percent: 60, uids: ['ines'] });
  assert.deepEqual(steps[2], { rank: 3, percent: 40, uids: ['paul'] });
});

test('podium : un participant sans carte jouée n\'y figure pas', () => {
  assert.deepEqual(podium({}), []);
});

test('récapitulatif : cartes partielles et fausses, dans l\'ordre joué, avec explication ciblée', () => {
  const cards = {
    'trap-01': { id: 'trap-01', text: 'Assigner les tâches', answer: 'trap', explanation: 'Gén.', reference: 'Scrum Team', errors: { sm: 'Pas chef.' } },
    'po-03': { id: 'po-03', text: 'Ordonner', answer: 'po', explanation: 'Gén.', reference: 'PO', errors: {} },
  };
  const results = {
    0: { playerUid: 'julie', cardId: 'po-03', region: 'po', verdict: 'right' },
    1: { playerUid: 'marc', cardId: 'trap-01', region: 'sm', verdict: 'wrong' },
    2: { playerUid: 'ines', cardId: 'po-03', region: 'team', verdict: 'partial' },
  };
  const list = mistakes(results, cards);
  assert.deepEqual(list.map((m) => [m.seq, m.playerUid, m.region]), [[1, 'marc', 'sm'], [2, 'ines', 'team']]);
  assert.equal(list[0].explanation.targeted, 'Pas chef.');
  assert.deepEqual(mistakes({ 0: results[0] }, cards), []);
});
