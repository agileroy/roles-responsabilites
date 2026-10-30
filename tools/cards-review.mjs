// Génère docs/cartes.md, une vue lisible du paquet de cartes pour la relecture.
// Usage : node tools/cards-review.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const deck = JSON.parse(await readFile(new URL('../site/data/cards.json', import.meta.url), 'utf8'));
const order = ['po', 'sm', 'dev', 'po-sm', 'po-dev', 'sm-dev', 'team', 'trap'];
const lines = [
  '# Paquet de cartes « Rôles et responsabilités »',
  '',
  `Source : ${deck.source}. Fichier source : \`site/data/cards.json\` (ce document est généré, ne pas le modifier).`,
  '',
  `${deck.cards.length} cartes :`,
  '',
];
for (const region of order) {
  const count = deck.cards.filter((c) => c.answer === region).length;
  lines.push(`- ${deck.regions[region]} : ${count}`);
}
for (const region of order) {
  const cards = deck.cards.filter((c) => c.answer === region);
  if (!cards.length) continue;
  lines.push('', `## ${deck.regions[region]}`, '');
  for (const c of cards) {
    lines.push(`### ${c.id} · ${c.text}`, '', `**Explication** (${c.reference}) : ${c.explanation}`, '');
    for (const [wrong, text] of Object.entries(c.errors)) {
      lines.push(`- Si placée en **${deck.regions[wrong]}** : ${text}`);
    }
    if (Object.keys(c.errors).length) lines.push('');
  }
}
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/cartes.md', import.meta.url), lines.join('\n').trimEnd() + '\n');
console.log(`docs/cartes.md : ${deck.cards.length} cartes`);
