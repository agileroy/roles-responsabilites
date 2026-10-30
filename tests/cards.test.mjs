import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDeck, REGIONS, maxCardsPerPlayer, deckStats, MAX_PLAYERS } from '../site/js/game-core.js';

const deck = JSON.parse(await readFile(new URL('../site/data/cards.json', import.meta.url), 'utf8'));

test('le paquet de cartes du site est valide', () => {
  assert.deepEqual(validateDeck(deck), []);
});

test('le paquet décrit toutes les régions du Venn', () => {
  assert.deepEqual(Object.keys(deck.regions).sort(), [...REGIONS].sort());
});

test('le paquet permet 5 cartes par personne avec un piège chacun, salle pleine', () => {
  const stats = deckStats(deck.cards);
  assert.ok(stats.traps >= MAX_PLAYERS, 'au moins un piège par participant');
  assert.ok(maxCardsPerPlayer(stats, MAX_PLAYERS) >= 5);
});

test('la zone Piège représente entre 15 et 30 % du paquet', () => {
  const share = deck.cards.filter((card) => card.answer === 'trap').length / deck.cards.length;
  assert.ok(share >= 0.15 && share <= 0.3, `part des pièges : ${Math.round(share * 100)} %`);
});
