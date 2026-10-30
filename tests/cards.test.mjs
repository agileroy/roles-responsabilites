import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDeck, REGIONS, maxCardsPerPlayer, MAX_PLAYERS } from '../site/js/game-core.js';

const deck = JSON.parse(await readFile(new URL('../site/data/cards.json', import.meta.url), 'utf8'));

test('le paquet de cartes du site est valide', () => {
  assert.deepEqual(validateDeck(deck), []);
});

test('le paquet décrit toutes les régions du Venn', () => {
  assert.deepEqual(Object.keys(deck.regions).sort(), [...REGIONS].sort());
});

test('le paquet permet au moins une carte par personne avec la salle pleine', () => {
  assert.ok(maxCardsPerPlayer(deck.cards.length, MAX_PLAYERS) >= 1);
});

test('la zone Piège représente entre 15 et 30 % du paquet', () => {
  const share = deck.cards.filter((card) => card.answer === 'trap').length / deck.cards.length;
  assert.ok(share >= 0.15 && share <= 0.3, `part des pièges : ${Math.round(share * 100)} %`);
});
