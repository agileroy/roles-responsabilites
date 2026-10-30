// Actions de la partie sur la base partagée (Firebase en production, mémoire pour les tests et la démo).
// Les calculs viennent de game-core.js ; les règles de sécurité (database.rules.json) appliquent
// les mêmes contraintes côté base.

import {
  MAX_PLAYERS, ROOM_TTL_MS, TIMER_CHOICES, TIMER_GRACE_MS, generateCode, isValidCode, normalizeCode, normalizeName,
  validateName, nameKey, shuffle, asList, nextPlayer, lateQuota, maxCardsPerPlayer, clampCardsPerPlayer, verdict,
  resultList, isRegion,
} from './game-core.js?v=__VERSION__';

export const ROOT = 'rolesGame';
const roomPath = (code) => `${ROOT}/rooms/${code}`;

/** Participants non retirés. */
export function activePlayers(room) {
  return Object.entries(room?.players ?? {}).filter(([, p]) => p && p.name && !p.removed);
}

export function isConnected(player) {
  return Boolean(player?.connections && Object.keys(player.connections).length);
}

/** Nombre de cartes par personne effectivement appliqué (réglage, ou maximum par défaut). */
export function effectiveCardsPerPlayer(room, deckSize) {
  const max = maxCardsPerPlayer(deckSize, activePlayers(room).length);
  return clampCardsPerPlayer(room?.meta?.cardsPerPlayer ?? max, max);
}

/** Message d'erreur si l'on ne peut pas rejoindre cette salle, null sinon. */
export function joinRefusal(room, uid) {
  if (!room?.meta) return 'Aucune partie avec ce code.';
  if (room.players?.[uid]?.name && !room.players[uid].removed) return null; // déjà dans la salle
  if (room.players?.[uid]?.removed) return 'Le formateur vous a retiré de cette partie.';
  if (room.meta.status === 'finished') return 'Cette partie est terminée.';
  if (activePlayers(room).length >= MAX_PLAYERS) return `La salle est complète (${MAX_PLAYERS} participants au maximum).`;
  return null;
}

/** Aléa cryptographique dans [0, 1[ (mélange, ordre de passage, code de salle). */
function cryptoRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function createGameStore(db, { random = cryptoRandom } = {}) {
  let stopPresence = null;
  let presenceFor = null;

  const store = {
    get uid() { return db.uid; },
    start: () => db.start(),
    serverNow: () => db.serverNow(),
    onConnection: (callback) => db.onConnection(callback),
    watchRoom: (code, callback) => db.onValue(roomPath(code), callback),
    getRoom: (code) => db.get(roomPath(code)),

    // ------------------------------------------------------------ Formateur : salle

    /** Supprime les salles de plus de 24 heures (règles : autorisé à tous au-delà de ce délai). */
    async sweepExpired() {
      const expiry = (await db.get(`${ROOT}/expiry`).catch(() => null)) ?? {};
      const limit = db.serverNow() - ROOM_TTL_MS;
      const old = Object.entries(expiry).filter(([, e]) => typeof e?.createdAt === 'number' && e.createdAt < limit);
      await Promise.all(old.map(([code]) =>
        db.update(ROOT, { [`rooms/${code}`]: null, [`expiry/${code}`]: null }).catch(() => {})));
      return old.length;
    },

    /** Crée une salle avec un code libre ; le navigateur appelant en devient le formateur. */
    async createRoom() {
      await store.sweepExpired();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = generateCode(random);
        // La réservation échoue si le code est déjà pris (les règles refusent d'écraser une salle).
        const reserved = await db.claim(`${ROOT}/expiry/${code}`, { createdAt: db.TIMESTAMP, hostUid: db.uid });
        if (!reserved) continue;
        const createdAt = (await db.get(`${ROOT}/expiry/${code}/createdAt`)) ?? db.serverNow();
        await db.set(`${roomPath(code)}/meta`, {
          hostUid: db.uid, createdAt, status: 'lobby', timerSeconds: 0,
        });
        return code;
      }
      throw new Error('Impossible de trouver un code de salle libre.');
    },

    setCardsPerPlayer(code, value) {
      return db.set(`${roomPath(code)}/meta/cardsPerPlayer`, value);
    },

    setTimer(code, seconds) {
      if (!TIMER_CHOICES.includes(seconds)) return Promise.resolve();
      return db.set(`${roomPath(code)}/meta/timerSeconds`, seconds);
    },

    /** Lance la partie : paquet mélangé, ordre de passage tiré au sort, quotas, premier tour. */
    async launch(code, room, cardIds) {
      const players = activePlayers(room).map(([uid]) => uid);
      if (!players.length) return false;
      const perPlayer = effectiveCardsPerPlayer(room, cardIds.length);
      const order = shuffle(players, random);
      const patch = {
        'meta/status': 'playing',
        'meta/cardsPerPlayer': perPlayer,
        'meta/deckOrder': shuffle(cardIds, random),
        'meta/playerOrder': order,
        'meta/startedAt': db.TIMESTAMP,
        turn: { seq: 0, playerUid: order[0], deckIndex: '0' },
      };
      for (const uid of players) patch[`players/${uid}/quota`] = perPlayer;
      await db.update(roomPath(code), patch);
      return true;
    },

    /** Donne un nombre de cartes au retardataire et l'ajoute à la fin de l'ordre de passage. */
    async admitLatePlayer(code, room, uid) {
      const quota = lateQuota({
        players: room.players, results: room.results,
        deckSize: asList(room.meta.deckOrder).length, cardsPerPlayer: room.meta.cardsPerPlayer,
      });
      const order = asList(room.meta.playerOrder);
      const patch = { [`players/${uid}/quota`]: quota };
      if (quota > 0 && !order.includes(uid)) patch['meta/playerOrder'] = [...order, uid];
      await db.update(roomPath(code), patch);
      // Partie déjà finie faute de joueur : le retardataire relance le tour.
      if (quota > 0 && room.turn?.done) {
        await db.set(`${roomPath(code)}/turn`, {
          seq: (room.turn.seq ?? 0) + 1, playerUid: uid, deckIndex: String(resultList(room.results).length),
        });
      }
    },

    /** Calcule le verdict d'une carte validée ou dont le temps est écoulé, et l'affiche à tous. */
    async revealTurn(code, room, cardsById) {
      const turn = room.turn;
      if (!turn || turn.revealed || !turn.cardId) return false;
      const card = cardsById[turn.cardId];
      const timedOut = !turn.placement;
      const region = turn.placement ?? null;
      const result = {
        playerUid: turn.playerUid, cardId: turn.cardId, region, verdict: card ? verdict(region, card.answer) : 'wrong', timedOut,
      };
      if (region === null) delete result.region;
      await db.update(roomPath(code), { [`results/${turn.seq}`]: result, 'turn/revealed': true });
      return true;
    },

    /** Passe au joueur suivant ; marque la partie comme jouée entièrement s'il n'y en a plus. */
    async nextTurn(code, room, { skip = false } = {}) {
      const turn = room.turn ?? { seq: -1 };
      const results = room.results ?? {};
      const next = nextPlayer({
        order: room.meta.playerOrder, players: room.players, results, currentUid: turn.playerUid ?? null,
      });
      if (!next) {
        await db.set(`${roomPath(code)}/turn`, { seq: (turn.seq ?? 0) + 1, done: true });
        return null;
      }
      // Passer son tour : la carte piochée n'est pas comptée et retourne dans le paquet.
      void skip;
      await db.set(`${roomPath(code)}/turn`, {
        seq: (turn.seq ?? 0) + 1, playerUid: next, deckIndex: String(resultList(results).length),
      });
      return next;
    },

    finish(code) {
      return db.update(roomPath(code), { 'meta/status': 'finished', 'meta/finishedAt': db.TIMESTAMP });
    },

    removePlayer(code, uid) {
      return db.set(`${roomPath(code)}/players/${uid}/removed`, true);
    },

    deleteRoom(code) {
      return db.update(ROOT, { [`rooms/${code}`]: null, [`expiry/${code}`]: null });
    },

    // ------------------------------------------------------------ Participant

    /** Entre dans la salle avec un prénom unique. Renvoie null, ou un message d'erreur. */
    async join(rawCode, rawName) {
      const code = normalizeCode(rawCode);
      if (!isValidCode(code)) return 'Le code de la salle fait 4 lettres.';
      const nameError = validateName(rawName);
      if (nameError) return nameError;
      const name = normalizeName(rawName);
      const room = await db.get(roomPath(code)).catch(() => null);
      const refusal = joinRefusal(room, db.uid);
      if (refusal) return refusal;
      const key = nameKey(name);
      const previous = room.players?.[db.uid]?.name;
      const claimed = await db.transaction(`${roomPath(code)}/names/${key}`, (owner) =>
        (owner === null || owner === db.uid ? db.uid : undefined)).catch(() => false);
      if (!claimed) return 'Ce prénom est déjà pris dans la salle.';
      await db.update(`${roomPath(code)}/players/${db.uid}`, { name, joinedAt: db.TIMESTAMP });
      if (previous && nameKey(previous) !== key) {
        await db.remove(`${roomPath(code)}/names/${nameKey(previous)}`).catch(() => {});
      }
      store.openPresence(code);
      return null;
    },

    /** Présence dans la salle (une entrée par onglet, retirée à la déconnexion). */
    openPresence(code) {
      if (presenceFor === code) return;
      stopPresence?.();
      presenceFor = code;   // avant l'appel : l'écriture de présence peut déclencher un nouveau rendu
      stopPresence = db.presence(`${roomPath(code)}/players/${db.uid}/connections`);
    },

    async closePresence() {
      const stop = stopPresence;
      stopPresence = null;
      presenceFor = null;
      await stop?.();
    },

    /** Le joueur actif pioche la carte suivante du paquet mélangé. */
    async draw(code, room) {
      const turn = room.turn;
      if (!turn || turn.playerUid !== db.uid || turn.cardId) return false;
      const cardId = asList(room.meta.deckOrder)[Number(turn.deckIndex)];
      if (!cardId) return false;
      await db.update(`${roomPath(code)}/turn`, { cardId, drawnAt: db.TIMESTAMP });
      return true;
    },

    /** Sélection en cours (visible de tous), modifiable jusqu'à la validation. */
    select(code, room, region) {
      const turn = room.turn;
      if (!turn || turn.playerUid !== db.uid || !turn.cardId || turn.placement || !isRegion(region)) return Promise.resolve(false);
      return db.set(`${roomPath(code)}/turn/selection`, region).then(() => true, () => false);
    },

    /** Validation définitive du placement (refusée par les règles après le chrono). */
    place(code, room, region) {
      const turn = room.turn;
      if (!turn || turn.playerUid !== db.uid || !turn.cardId || turn.placement || !isRegion(region)) return Promise.resolve(false);
      const timer = room.meta.timerSeconds ?? 0;
      if (timer && db.serverNow() > turn.drawnAt + timer * 1000 + TIMER_GRACE_MS) return Promise.resolve(false);
      return db.update(`${roomPath(code)}/turn`, { selection: region, placement: region, placedAt: db.TIMESTAMP })
        .then(() => true, () => false);
    },
  };
  return store;
}

/**
 * Réactions automatiques du navigateur du formateur, à chaque mise à jour de la salle :
 * révéler la carte validée ou dont le chrono est écoulé, admettre les retardataires.
 * Idempotent : les écritures déjà faites ne sont pas refaites.
 */
export function hostReactions(store, code, room, cardsById, inFlight = new Set()) {
  if (!room?.meta || room.meta.hostUid !== store.uid) return;
  const run = (key, action) => {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    action().catch(() => {}).finally(() => inFlight.delete(key));
  };
  if (room.meta.status === 'playing') {
    const turn = room.turn;
    if (turn?.cardId && !turn.revealed) {
      const timer = room.meta.timerSeconds ?? 0;
      const expired = timer && typeof turn.drawnAt === 'number' && store.serverNow() > turn.drawnAt + timer * 1000 + TIMER_GRACE_MS;
      if (turn.placement || expired) run(`reveal-${turn.seq}`, () => store.revealTurn(code, room, cardsById));
    }
    for (const [uid, player] of activePlayers(room)) {
      if (player.quota === undefined || player.quota === null) run(`admit-${uid}`, () => store.admitLatePlayer(code, room, uid));
    }
  }
}
