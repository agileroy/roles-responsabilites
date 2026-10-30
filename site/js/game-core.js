// Logique métier pure du jeu « Rôles et responsabilités » : aucun accès au DOM ni à Firebase.
// Tout ce qui se calcule (verdict, explication, tirage, joueur suivant, scores) est ici et testé avec Node.js.

export const MAX_PLAYERS = 10;
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const TIMER_CHOICES = [0, 30, 45, 60];
export const NAME_MAX = 20;
export const CODE_LENGTH = 4;
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
/** Marge accordée par les règles de sécurité après la fin du chrono (latence réseau). */
export const TIMER_GRACE_MS = 2000;

/** Régions du Venn et ensembles d'accountabilities correspondants. */
export const REGIONS = ['po', 'sm', 'dev', 'po-sm', 'po-dev', 'sm-dev', 'team', 'trap'];
export const REGION_SETS = {
  po: ['po'],
  sm: ['sm'],
  dev: ['dev'],
  'po-sm': ['po', 'sm'],
  'po-dev': ['po', 'dev'],
  'sm-dev': ['sm', 'dev'],
  team: ['po', 'sm', 'dev'],
  trap: [],
};
export const REGION_LABELS = {
  po: 'Product Owner',
  sm: 'Scrum Master',
  dev: 'Developers',
  'po-sm': 'Product Owner + Scrum Master',
  'po-dev': 'Product Owner + Developers',
  'sm-dev': 'Scrum Master + Developers',
  team: 'Scrum Team',
  trap: 'Piège',
};

export const VERDICT_LABELS = { right: 'Juste', partial: 'Partiel', wrong: 'Faux' };
export const VERDICT_POINTS = { right: 1, partial: 0.5, wrong: 0 };

export function isRegion(value) {
  return REGIONS.includes(value);
}

/** Verdict d'un placement : égalité des ensembles → juste ; intersection non vide → partiel ; sinon faux. */
export function verdict(chosen, answer) {
  if (!isRegion(chosen) || !isRegion(answer)) return 'wrong';
  if (chosen === answer) return 'right';
  const answerSet = REGION_SETS[answer];
  return REGION_SETS[chosen].some((role) => answerSet.includes(role)) ? 'partial' : 'wrong';
}

/** Explication à afficher : ciblée pour la région choisie si elle existe, toujours accompagnée de l'explication générale. */
export function explanationFor(card, chosen) {
  const targeted = chosen && chosen !== card.answer ? card.errors?.[chosen] ?? null : null;
  return { targeted, general: card.explanation, reference: card.reference };
}

/** Espaces insécables de la typographie française (avant : ; ! ? et à l'intérieur des guillemets). */
export function frenchTypography(text) {
  return String(text)
    .replace(/ ([:;!?])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/ »/g, ' »');
}

/** Contrôle du paquet de cartes. Renvoie la liste des problèmes (vide si le paquet est valide). */
export function validateDeck(deck) {
  const problems = [];
  if (!deck || !Array.isArray(deck.cards)) return ['Le paquet doit contenir une liste « cards ».'];
  const ids = new Set();
  for (const card of deck.cards) {
    const id = card?.id;
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,20}$/.test(id)) problems.push(`Identifiant invalide : ${JSON.stringify(id)}`);
    else if (ids.has(id)) problems.push(`Identifiant en double : ${id}`);
    ids.add(id);
    if (!isRegion(card?.answer)) problems.push(`${id} : région inconnue ${JSON.stringify(card?.answer)}`);
    for (const field of ['text', 'explanation', 'reference']) {
      if (typeof card?.[field] !== 'string' || !card[field].trim()) problems.push(`${id} : champ « ${field} » vide`);
    }
    for (const [region, text] of Object.entries(card?.errors ?? {})) {
      if (!isRegion(region)) problems.push(`${id} : explication ciblée pour une région inconnue (${region})`);
      else if (region === card.answer) problems.push(`${id} : explication ciblée pour sa propre bonne région`);
      if (typeof text !== 'string' || !text.trim()) problems.push(`${id} : explication ciblée vide (${region})`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------- Prénom et code de salle

export function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

/** Message d'erreur, ou null si le prénom est valide. */
export function validateName(name) {
  const value = normalizeName(name);
  if (!value) return 'Saisissez votre prénom.';
  if ([...value].length > NAME_MAX) return `Votre prénom doit faire ${NAME_MAX} caractères au plus.`;
  return null;
}

/** Clé d'unicité du prénom : insensible à la casse, caractères interdits par Firebase encodés. */
export function nameKey(name) {
  return normalizeName(name).toLocaleLowerCase('fr-FR')
    .replace(/[.#$[\]/%]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

export function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function isValidCode(code) {
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code);
}

/** Code de salle aléatoire ; `random` renvoie un nombre dans [0, 1[. */
export function generateCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

// ---------------------------------------------------------------- Réglages et tirage

/** Nombre maximum de cartes par personne : paquet divisé par le nombre de participants. */
export function maxCardsPerPlayer(deckSize, playerCount) {
  if (playerCount <= 0) return Math.max(0, deckSize);
  return Math.floor(deckSize / playerCount);
}

/** Ramène un réglage dans les bornes [1, maximum]. */
export function clampCardsPerPlayer(value, max) {
  if (max <= 0) return 0;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return max;
  return Math.min(n, max);
}

/** Mélange de Fisher-Yates (copie). */
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Firebase stocke les listes comme des objets à clés numériques : on les remet en tableau. */
export function asList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key]).filter((item) => item != null);
  }
  return [];
}

/** Résultats triés par numéro de tour. */
export function resultList(results) {
  return Object.entries(results ?? {})
    .map(([seq, result]) => ({ ...result, seq: Number(seq) }))
    .filter((result) => Number.isFinite(result.seq))
    .sort((a, b) => a.seq - b.seq);
}

/** Nombre de cartes jouées par participant. */
export function playedCounts(results) {
  const counts = {};
  for (const result of resultList(results)) counts[result.playerUid] = (counts[result.playerUid] ?? 0) + 1;
  return counts;
}

/** Un participant qui doit encore jouer (non retiré, quota non atteint). */
function stillPlaying(uid, players, played) {
  const player = players?.[uid];
  return Boolean(player) && !player.removed && (played[uid] ?? 0) < (player.quota ?? 0);
}

/** Cartes encore dues aux participants. */
export function remainingCards(players, played) {
  let total = 0;
  for (const [uid, player] of Object.entries(players ?? {})) {
    if (!player || player.removed) continue;
    total += Math.max(0, (player.quota ?? 0) - (played[uid] ?? 0));
  }
  return total;
}

/**
 * Joueur suivant dans l'ordre de passage, en partant après `currentUid` (ou du début),
 * en sautant les retirés et ceux qui ont joué toutes leurs cartes. null : partie terminée.
 */
export function nextPlayer({ order, players, results, currentUid = null }) {
  const list = asList(order);
  if (!list.length) return null;
  const played = playedCounts(results);
  const start = currentUid === null ? 0 : list.indexOf(currentUid) + 1;
  for (let step = 0; step < list.length; step += 1) {
    const uid = list[(start + step) % list.length];
    if (stillPlaying(uid, players, played)) return uid;
  }
  return null;
}

/**
 * Nombre de cartes d'un retardataire : ce qu'il reste à jouer au participant le moins avancé
 * (réglage moins les tours complets déjà joués), limité par les cartes restantes du paquet.
 */
export function lateQuota({ players, results, deckSize, cardsPerPlayer }) {
  const played = playedCounts(results);
  let remainingOthers = 0;
  for (const [uid, player] of Object.entries(players ?? {})) {
    if (!player || player.removed || player.quota == null) continue;
    remainingOthers = Math.max(remainingOthers, (player.quota ?? 0) - (played[uid] ?? 0));
  }
  remainingOthers = Math.min(remainingOthers, cardsPerPlayer);
  const drawn = resultList(results).length;
  const free = deckSize - drawn - remainingCards(players, played);
  return Math.max(0, Math.min(remainingOthers, free));
}

/** Temps restant du chrono, en secondes entières (null sans chrono ou avant la pioche). */
export function secondsLeft(drawnAt, timerSeconds, now) {
  if (!timerSeconds || typeof drawnAt !== 'number') return null;
  return Math.max(0, Math.ceil((drawnAt + timerSeconds * 1000 - now) / 1000));
}

// ---------------------------------------------------------------- Scores et résultats

function emptyScore() {
  return { count: 0, points: 0, right: 0, partial: 0, wrong: 0, percent: null };
}

function addResult(score, result) {
  const v = VERDICT_POINTS[result.verdict] === undefined ? 'wrong' : result.verdict;
  score.count += 1;
  score.points += VERDICT_POINTS[v];
  score[v] += 1;
}

/** Pourcentage arrondi à une décimale au plus. */
function percentOf(score) {
  return score.count ? Math.round((score.points / score.count) * 1000) / 10 : null;
}

/** Score collectif : points sur cartes jouées, pourcentage arrondi à l'entier. */
export function teamScore(results) {
  const score = emptyScore();
  for (const result of resultList(results)) addResult(score, result);
  score.percent = score.count ? Math.round((score.points / score.count) * 100) : null;
  return score;
}

/** Score de chaque participant, pourcentage à une décimale près. */
export function playerScores(results) {
  const scores = {};
  for (const result of resultList(results)) {
    scores[result.playerUid] ??= emptyScore();
    addResult(scores[result.playerUid], result);
  }
  for (const score of Object.values(scores)) score.percent = percentOf(score);
  return scores;
}

/**
 * Podium des trois meilleurs pourcentages : les ex aequo partagent la même marche.
 * Renvoie [{ rank: 1, percent, uids: [...] }, …] (trois marches au plus).
 */
export function podium(results) {
  const byPercent = new Map();
  for (const [uid, score] of Object.entries(playerScores(results))) {
    if (!score.count) continue;
    if (!byPercent.has(score.percent)) byPercent.set(score.percent, []);
    byPercent.get(score.percent).push(uid);
  }
  return [...byPercent.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 3)
    .map(([percent, uids], index) => ({ rank: index + 1, percent, uids }));
}

/** Cartes partielles et fausses, dans l'ordre où elles ont été jouées. */
export function mistakes(results, cardsById) {
  return resultList(results)
    .filter((result) => result.verdict !== 'right' && cardsById[result.cardId])
    .map((result) => {
      const card = cardsById[result.cardId];
      return { ...result, card, explanation: explanationFor(card, result.region ?? null) };
    });
}

/** Pourcentage formaté en français (« 62,5 % »). */
export function formatPercent(value) {
  if (value === null || value === undefined) return '–';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} %`;
}
