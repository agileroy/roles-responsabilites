// Interface du jeu. Reçoit un « store » (Firebase en production, mémoire pour la démo)
// et le paquet de cartes ; tout calcul passe par game-core.js.

import {
  MAX_PLAYERS, TIMER_CHOICES, REGION_LABELS, VERDICT_LABELS, frenchTypography, explanationFor, normalizeCode,
  isValidCode, deckStats, maxCardsPerPlayer, clampCardsPerPlayer, nextPlayer, playedCounts, resultList, secondsLeft,
  teamScore, playerScores, podium, mistakes, formatPercent, asList, verdict, shuffle, drawTrainingDeck,
} from './game-core.js?v=__VERSION__';
import { createVenn } from './venn.js?v=__VERSION__';
import { activePlayers, isConnected, effectiveCardsPerPlayer, hostReactions } from './game-store.js?v=__VERSION__';

const NAME_STORAGE_KEY = 'roles-responsabilites.name';
const SCREENS = ['status', 'home', 'host-lobby', 'player-lobby', 'game', 'end', 'message'];

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  for (const screen of SCREENS) $(`screen-${screen}`).hidden = screen !== name;
  document.body.dataset.screen = name;
}

export function showFatal(message) {
  showScreen('status');
  $('status-text').textContent = message;
  $('status-text').classList.add('is-error');
}

function showMessage(title, text) {
  showScreen('message');
  $('message-title').textContent = title;
  $('message-text').textContent = text;
}

function readStored(key) {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch { /* stockage indisponible */ }
}

function text(tag, content, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

function setTypo(node, value) {
  node.textContent = frenchTypography(value ?? '');
}

/** Boîte de confirmation ; renvoie true si l'utilisateur confirme. */
function confirmAction(title, message, okLabel) {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = message;
  $('confirm-ok').textContent = okLabel;
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = 'cancel';
    dialog.showModal();
  });
}

function qrSvg(url, label) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: `QR code : ${label}` });
  } catch {
    return '';
  }
}

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export async function startApp(gameStore, { deck }) {
  const cardsById = Object.fromEntries(deck.cards.map((card) => [card.id, card]));
  const cardIds = deck.cards.map((card) => card.id);
  const stats = deckStats(deck.cards);   // taille du paquet et nombre de pièges
  const params = new URLSearchParams(location.search);
  let code = isValidCode(normalizeCode(params.get('salle'))) ? normalizeCode(params.get('salle')) : null;
  let room = null;
  let roomLoaded = false;
  let stopWatching = null;
  let everConnected = false;
  let localSelection = null;     // sélection en cours du joueur actif (avant l'aller-retour serveur)
  let localSelectionSeq = null;
  let lastRevealedSeq = null;
  const inFlight = new Set();
  let busy = false;

  // Sans service temps réel, seul l'entraînement seul reste disponible.
  const OFFLINE_MESSAGE = 'Service temps réel injoignable : vérifiez votre connexion et rechargez la page. L\'entraînement seul reste disponible.';
  let offline = false;
  try {
    await gameStore.start();
  } catch (error) {
    console.error('Connexion refusée :', error?.code ?? error);
    offline = true;
  }
  const uid = gameStore.uid;

  if (!offline) gameStore.onConnection((connected) => {
    everConnected ||= connected;
    $('banner').hidden = connected || !everConnected;
    $('banner').textContent = 'Connexion perdue, reconnexion…';
  });

  // ---------------------------------------------------------------- Adresses et QR codes

  function urlFor(roomCode) {
    const parts = [];
    if (params.has('demo')) parts.push('demo');
    if (roomCode) parts.push(`salle=${roomCode}`);
    return `${location.origin}${location.pathname}${parts.length ? `?${parts.join('&')}` : ''}`;
  }
  const baseLabel = (location.origin + location.pathname).replace(/^https?:\/\//, '').replace(/\/$/, '');
  let qrFor = null;
  function renderJoinInfo() {
    if (qrFor === code) return;
    qrFor = code;
    const url = urlFor(code);
    $('qr-lobby').innerHTML = qrSvg(url, `${baseLabel}, salle ${code}`);
    $('qr-mini').innerHTML = $('qr-lobby').innerHTML;
    $('join-url').textContent = baseLabel;
    $('room-code').textContent = code;
    $('room-code-mini').textContent = code;
  }

  // ---------------------------------------------------------------- Venn

  const venn = createVenn($('venn'), {
    onSelect(region) {
      if (solo) { soloSelect(region); return; }
      if (!room?.turn || room.turn.playerUid !== uid || room.turn.placement) return;
      localSelection = region;
      localSelectionSeq = room.turn.seq;
      render();
      gameStore.select(code, room, region);
    },
  });

  // ---------------------------------------------------------------- Abonnement à la salle

  function watch(roomCode) {
    stopWatching?.();
    code = roomCode;
    roomLoaded = false;
    stopWatching = gameStore.watchRoom(roomCode, (value) => {
      room = value;
      roomLoaded = true;
      if (room?.meta?.hostUid === uid) hostReactions(gameStore, code, room, cardsById, inFlight);
      render();
    });
  }

  // Le navigateur du formateur révèle aussi les cartes dont le chrono est écoulé.
  setInterval(() => {
    if (room?.meta?.hostUid === uid) hostReactions(gameStore, code, room, cardsById, inFlight);
    renderTimer();
  }, 250);

  // ---------------------------------------------------------------- Accueil

  $('name-input').value = readStored(NAME_STORAGE_KEY);

  function showHome(error = '') {
    showScreen('home');
    $('room-chip').hidden = true;
    $('me-name').hidden = true;
    const known = Boolean(code);
    $('code-field').hidden = known;
    $('join-room').hidden = !known;
    $('join-room').textContent = known ? `Salle ${code}` : '';
    $('code-input').value = known ? code : $('code-input').value;
    $('join-error').textContent = error;
  }

  $('create-room').addEventListener('click', async () => {
    if (offline) { $('create-error').textContent = OFFLINE_MESSAGE; return; }
    if (busy) return;
    busy = true;
    $('create-room').disabled = true;
    $('create-error').textContent = '';
    try {
      const newCode = await gameStore.createRoom();
      history.replaceState(null, '', urlFor(newCode));
      watch(newCode);
    } catch (error) {
      console.error(error);
      $('create-error').textContent = 'Impossible de créer la partie. Réessayez.';
    } finally {
      busy = false;
      $('create-room').disabled = false;
    }
  });

  $('code-input').addEventListener('input', () => {
    $('code-input').value = normalizeCode($('code-input').value);
  });

  $('join-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (offline) { $('join-error').textContent = OFFLINE_MESSAGE; return; }
    if (busy) return;
    const joinCode = code ?? normalizeCode($('code-input').value);
    const name = $('name-input').value;
    busy = true;
    $('join-submit').disabled = true;
    $('join-error').textContent = '';
    try {
      const error = await gameStore.join(joinCode, name);
      if (error) {
        $('join-error').textContent = error;
        if (error.startsWith('Aucune partie') && code) {
          code = null;
          history.replaceState(null, '', urlFor(null));
          showHome(error);
        }
        return;
      }
      store(NAME_STORAGE_KEY, name.trim());
      if (joinCode !== code || !stopWatching) {
        history.replaceState(null, '', urlFor(joinCode));
        watch(joinCode);
      } else {
        render();
      }
    } finally {
      busy = false;
      $('join-submit').disabled = false;
    }
  });

  // ---------------------------------------------------------------- Rendu principal

  function role() {
    if (!room?.meta) return 'none';
    if (room.meta.hostUid === uid) return 'host';
    const me = room.players?.[uid];
    if (me?.removed) return 'removed';
    if (me?.name) return 'player';
    return 'visitor';
  }

  function nameOf(playerUid) {
    return room?.players?.[playerUid]?.name ?? 'Un participant';
  }

  function render() {
    document.body.dataset.mode = solo ? 'solo' : 'room';
    if (solo) { renderSolo(); return; }
    if (!code) { showHome(); return; }
    if (!roomLoaded) return;
    const who = role();
    if (who === 'none') {
      code = null;
      history.replaceState(null, '', urlFor(null));
      showHome('Aucune partie avec ce code. Elle a peut-être été supprimée.');
      return;
    }
    $('room-chip').hidden = false;
    $('room-chip').textContent = `Salle ${code}`;
    $('me-name').hidden = who !== 'player';
    $('me-name').textContent = who === 'player' ? nameOf(uid) : '';
    document.body.dataset.role = who;

    if (who === 'removed') {
      gameStore.closePresence();
      showMessage('Vous avez été retiré de la partie', 'Le formateur vous a retiré de cette partie.');
      return;
    }
    if (who === 'visitor') {
      if (room.meta.status === 'finished') {
        showMessage('Cette partie est terminée', 'Demandez au formateur le code d\'une nouvelle partie.');
        return;
      }
      showHome($('join-error').textContent);
      return;
    }
    if (who === 'player') gameStore.openPresence(code);

    const status = room.meta.status;
    if (status === 'lobby') {
      if (who === 'host') renderHostLobby(); else renderPlayerLobby();
    } else if (status === 'playing') {
      renderGame(who === 'host');
    } else {
      renderEnd(who === 'host');
    }
  }

  // ---------------------------------------------------------------- Salle d'attente

  function playerItem(playerUid, player, { removable = false, progress = null, active = false } = {}) {
    const item = document.createElement('li');
    item.className = 'player';
    item.classList.toggle('is-offline', !isConnected(player));
    item.classList.toggle('is-active', active);
    const dot = document.createElement('span');
    dot.className = 'presence-dot';
    dot.title = isConnected(player) ? 'Connecté' : 'Déconnecté';
    item.append(dot, text('span', player.name, 'player-name'));
    if (!isConnected(player)) item.append(text('span', 'déconnecté', 'player-status'));
    if (playerUid === uid) item.append(text('span', '(vous)', 'player-you'));
    if (progress) item.append(text('span', progress, 'player-progress'));
    if (removable) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'icon-button';
      button.setAttribute('aria-label', `Retirer ${player.name}`);
      button.title = `Retirer ${player.name}`;
      button.textContent = '×';
      button.addEventListener('click', async () => {
        const ok = await confirmAction(`Retirer ${player.name} ?`,
          'Ses cartes restantes ne seront pas jouées ; ses résultats déjà obtenus restent comptés.', 'Retirer');
        if (!ok) return;
        await gameStore.removePlayer(code, playerUid);
        if (room?.turn?.playerUid === playerUid && !room.turn.revealed && room.meta.status === 'playing') {
          await gameStore.nextTurn(code, room, { skip: true });
        }
      });
      item.append(button);
    }
    return item;
  }

  function sortedPlayers() {
    return activePlayers(room).sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
  }

  function renderHostLobby() {
    showScreen('host-lobby');
    renderJoinInfo();
    const players = sortedPlayers();
    $('lobby-count').textContent = `${players.length} / ${MAX_PLAYERS}`;
    $('lobby-players').replaceChildren(...players.map(([id, p]) => playerItem(id, p, { removable: true })));
    $('lobby-empty').hidden = players.length > 0;

    const max = maxCardsPerPlayer(stats, players.length);
    const value = effectiveCardsPerPlayer(room, stats);
    const input = $('cards-value');
    input.max = String(Math.max(max, 1));
    input.disabled = !players.length;
    if (document.activeElement !== input) input.value = players.length ? String(value) : '';
    $('cards-hint').textContent = players.length ? `Maximum ${max}` : `${cardIds.length} cartes dans le paquet`;
    $('cards-minus').disabled = !players.length || value <= 1;
    $('cards-plus').disabled = !players.length || value >= max;

    const timer = room.meta.timerSeconds ?? 0;
    const options = $('timer-options');
    if (!options.childElementCount) {
      for (const seconds of TIMER_CHOICES) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.className = 'segment';
        button.dataset.seconds = String(seconds);
        button.textContent = seconds ? `${seconds} s` : 'Sans';
        button.addEventListener('click', () => gameStore.setTimer(code, seconds));
        options.append(button);
      }
    }
    for (const button of options.children) button.setAttribute('aria-checked', String(Number(button.dataset.seconds) === timer));
    $('launch').disabled = !players.length;
  }

  function changeCards(delta) {
    const players = activePlayers(room).length;
    const max = maxCardsPerPlayer(stats, players);
    const next = clampCardsPerPlayer(effectiveCardsPerPlayer(room, stats) + delta, max);
    gameStore.setCardsPerPlayer(code, next);
  }
  $('cards-minus').addEventListener('click', () => changeCards(-1));
  $('cards-plus').addEventListener('click', () => changeCards(1));

  /** Saisie au clavier : appliquée à la validation (Entrée) ou en quittant le champ, ramenée dans [1, maximum]. */
  function commitCardsInput() {
    if (!room?.meta) return;
    const input = $('cards-value');
    const max = maxCardsPerPlayer(stats, activePlayers(room).length);
    if (!max) return;
    const next = clampCardsPerPlayer(input.value.trim() === '' ? effectiveCardsPerPlayer(room, stats) : input.value, max);
    input.value = String(next);
    if (next !== effectiveCardsPerPlayer(room, stats) || room.meta.cardsPerPlayer !== next) gameStore.setCardsPerPlayer(code, next);
  }
  $('cards-value').addEventListener('change', commitCardsInput);
  $('cards-value').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); commitCardsInput(); }
  });

  $('launch').addEventListener('click', async () => {
    if (busy || !room) return;
    busy = true;
    $('launch').disabled = true;
    try { await gameStore.launch(code, room, deck.cards); } finally { busy = false; }
  });

  async function deleteRoom() {
    const ok = await confirmAction('Supprimer la salle ?', 'La partie et tous ses résultats seront effacés pour tout le monde.', 'Supprimer');
    if (!ok) return;
    stopWatching?.();
    stopWatching = null;
    await gameStore.deleteRoom(code);
    code = null;
    room = null;
    qrFor = null;
    history.replaceState(null, '', urlFor(null));
    showHome();
  }
  $('delete-room-lobby').addEventListener('click', deleteRoom);
  $('delete-room-end').addEventListener('click', deleteRoom);

  function renderPlayerLobby() {
    showScreen('player-lobby');
    $('player-welcome').textContent = `Bienvenue ${nameOf(uid)} !`;
    $('player-lobby-list').replaceChildren(...sortedPlayers().map(([id, p]) => playerItem(id, p)));
  }

  // ---------------------------------------------------------------- Partie

  function plannedTotal() {
    const played = playedCounts(room.results);
    let total = resultList(room.results).length;
    for (const [id, player] of activePlayers(room)) total += Math.max(0, (player.quota ?? 0) - (played[id] ?? 0));
    return total;
  }

  function renderGame(isHost) {
    showScreen('game');
    document.body.classList.toggle('is-host', isHost);
    const turn = room.turn ?? {};
    const results = room.results ?? {};
    const card = turn.cardId ? cardsById[turn.cardId] : null;
    const result = turn.revealed ? results[turn.seq] : null;
    const isMine = turn.playerUid === uid && !turn.done;
    const me = room.players?.[uid];
    const spectator = !isHost && me && me.quota === 0;
    const played = resultList(results).length;
    const total = plannedTotal();

    if (localSelectionSeq !== turn.seq || turn.placement) { localSelection = null; localSelectionSeq = null; }

    // Bandeau du tour
    if (turn.done) $('turn-who').textContent = 'Toutes les cartes ont été jouées';
    else if (turn.revealed) $('turn-who').textContent = isMine ? 'Votre carte : correction' : `Carte de ${nameOf(turn.playerUid)} : correction`;
    else if (isMine) $('turn-who').textContent = 'À vous de jouer !';
    else $('turn-who').textContent = `À ${nameOf(turn.playerUid)} de jouer`;
    $('turn-bar').classList.toggle('is-mine', isMine && !turn.revealed);

    // Carte
    const current = Math.min(total, played + (card && !turn.revealed ? 1 : 0)) || (total ? 1 : 0);
    $('card-meta').textContent = turn.done ? `${played} cartes jouées` : `Carte ${Math.max(current, 1)} sur ${total}`;
    renderFlipCard(turn, card, isMine);
    const choosing = isMine && card && !turn.placement && !turn.revealed;
    const selection = choosing ? (localSelection ?? turn.selection ?? null) : (turn.placement ?? turn.selection ?? null);
    $('validate').hidden = !choosing;
    $('validate').disabled = !selection;
    let hint = '';
    if (choosing) hint = selection ? `Votre choix : ${REGION_LABELS[selection]}. Validez quand vous êtes sûr.` : 'Touchez une zone du diagramme, puis validez.';
    else if (card && !turn.revealed && turn.placement) hint = 'Correction en cours…';
    else if (card && !turn.revealed && selection) hint = `Hésite sur : ${REGION_LABELS[selection]}`;
    else if (turn.done) hint = 'Partie terminée : place aux résultats.';
    else if (spectator) hint = 'Plus assez de cartes pour vous faire jouer : vous suivez la partie en spectateur.';
    $('card-hint').textContent = hint;

    venn.setInteractive(Boolean(choosing));
    venn.update(result && card
      ? { chosen: result.region ?? null, correct: card.answer, verdict: result.verdict }
      : { selection });

    // Correction
    renderCorrection(card, result);
    if (result && card) {
      if (lastRevealedSeq !== turn.seq) {
        if (lastRevealedSeq !== null && turn.playerUid === uid) navigator.vibrate?.(150); // pas au chargement
        lastRevealedSeq = turn.seq;
      }
    }

    // Formateur
    $('solo-controls').hidden = true;
    $('host-controls').hidden = !isHost;
    if (isHost) {
      renderJoinInfo();
      const hasNext = Boolean(nextPlayer({ order: room.meta.playerOrder, players: room.players, results, currentUid: turn.playerUid ?? null }));
      $('next-card').hidden = !(turn.revealed || turn.done);
      $('next-card').textContent = hasNext && !turn.done ? 'Carte suivante' : 'Voir les résultats';
      $('skip-turn').hidden = Boolean(turn.revealed || turn.done);
      $('skip-turn').textContent = card ? 'Passer son tour (il retrouvera cette carte)' : 'Passer son tour';
      const team = teamScore(results);
      $('score-line').textContent = team.count
        ? `Équipe : ${formatPercent(team.percent)} · ${team.right} juste${team.right > 1 ? 's' : ''}, ${team.partial} partiel${team.partial > 1 ? 's' : ''}, ${team.wrong} faux`
        : 'Équipe : aucune carte jouée';
      const counts = playedCounts(results);
      const order = asList(room.meta.playerOrder);
      const players = sortedPlayers().sort(([a], [b]) => {
        const ia = order.indexOf(a); const ib = order.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      $('game-players').replaceChildren(...players.map(([id, p]) => playerItem(id, p, {
        removable: true,
        active: id === turn.playerUid && !turn.done,
        progress: p.quota === 0 ? 'spectateur' : p.quota == null ? 'arrive…' : `${counts[id] ?? 0} / ${p.quota}`,
      })));
    }

    // Participant
    $('my-progress').hidden = isHost || spectator;
    if (!isHost && !spectator) {
      const mine = playerScores(results)[uid];
      const done = mine?.count ?? 0;
      $('my-progress-text').textContent = `Vos cartes : ${done} / ${me?.quota ?? '–'}${mine ? ` · ${formatPercent(mine.percent)} de bonnes réponses` : ''}`;
      const team = teamScore(results);
      $('team-progress-text').textContent = team.count ? `Équipe : ${formatPercent(team.percent)}` : '';
    }
    renderTimer();
  }

  /** Correction d'une carte (verdict, régions, explications), commune à la partie en groupe et à l'entraînement. */
  function renderCorrection(card, result) {
    $('correction').hidden = !(result && card);
    if (!result || !card) return;
    const verdictNode = $('verdict');
    verdictNode.textContent = result.timedOut ? `${VERDICT_LABELS[result.verdict]} · Temps écoulé` : VERDICT_LABELS[result.verdict];
    verdictNode.className = `verdict verdict-${result.verdict}`;
    $('chosen-region').textContent = result.region ? REGION_LABELS[result.region] : 'Aucun (temps écoulé)';
    $('correct-region').textContent = REGION_LABELS[card.answer];
    const explanation = explanationFor(card, result.region ?? null);
    $('explanation-targeted').hidden = !explanation.targeted;
    setTypo($('explanation-targeted'), explanation.targeted ?? '');
    setTypo($('explanation'), explanation.general);
    $('reference').textContent = `Scrum Guide 2020 · ${explanation.reference}`;
  }

  /**
   * Carte face cachée, retournée quand le joueur actif la touche. L'animation n'est jouée que si cet écran
   * a vu la carte face cachée : au chargement d'une carte déjà retournée, elle s'affiche directement.
   */
  let shownCardKey;          // undefined : premier rendu ; null : face cachée ; sinon tour et carte affichés
  function renderFlipCard(turn, card, isMine) {
    showFlipCard({
      key: card ? `${turn.seq}:${turn.cardId}` : null, card, hidden: Boolean(turn.done),
      canFlip: isMine && !card && !turn.done, waitingText: `${nameOf(turn.playerUid)} va retourner la carte`,
    });
  }

  function showFlipCard({ key, card, hidden, canFlip, waitingText }) {
    const flip = $('flip-card');
    flip.closest('.card-stage').hidden = hidden;
    if (key !== shownCardKey) {
      const animate = shownCardKey === null && key !== null;
      flip.classList.toggle('no-anim', !animate);
      if (card) setTypo($('card-text'), card.text);
      flip.classList.toggle('is-flipped', Boolean(card));
      shownCardKey = key;
      if (!animate) requestAnimationFrame(() => requestAnimationFrame(() => flip.classList.remove('no-anim')));
    }
    flip.disabled = !canFlip;
    if (canFlip) flip.setAttribute('aria-label', 'Retourner la carte');
    else flip.removeAttribute('aria-label');
    $('back-hint').textContent = canFlip ? 'Touchez la carte pour la retourner' : waitingText;
    $('flip-back').setAttribute('aria-hidden', String(Boolean(card)));
    $('flip-front').setAttribute('aria-hidden', String(!card));
  }

  function renderTimer() {
    const node = $('timer');
    const turn = room?.turn;
    const timer = room?.meta?.timerSeconds ?? 0;
    if (!room || room.meta?.status !== 'playing' || !turn?.cardId || turn.revealed || turn.placement || !timer) {
      node.hidden = true;
      return;
    }
    const left = secondsLeft(turn.drawnAt, timer, gameStore.serverNow());
    if (left === null) { node.hidden = true; return; }
    node.hidden = false;
    node.textContent = formatSeconds(left);
    node.classList.toggle('is-urgent', left <= 5);
    node.setAttribute('aria-label', `${left} secondes restantes`);
  }

  $('flip-card').addEventListener('click', () => {
    if (solo) { soloFlip(); return; }
    if (room?.turn?.playerUid === uid && !room.turn.cardId) gameStore.draw(code, room);
  });
  $('validate').addEventListener('click', async () => {
    if (solo) { soloValidate(); return; }
    const selection = localSelection ?? room?.turn?.selection;
    if (!room || !selection) return;
    $('validate').disabled = true;
    const ok = await gameStore.place(code, room, selection);
    if (!ok) $('card-hint').textContent = 'Placement refusé : le temps est peut-être écoulé.';
  });

  $('next-card').addEventListener('click', async () => {
    if (busy || !room) return;
    busy = true;
    try {
      const turn = room.turn ?? {};
      const hasNext = !turn.done && nextPlayer({ order: room.meta.playerOrder, players: room.players, results: room.results, currentUid: turn.playerUid ?? null });
      if (hasNext) await gameStore.nextTurn(code, room);
      else await gameStore.finish(code);
    } finally { busy = false; }
  });

  $('skip-turn').addEventListener('click', async () => {
    if (busy || !room) return;
    busy = true;
    try { await gameStore.nextTurn(code, room, { skip: true }); } finally { busy = false; }
  });

  $('end-game').addEventListener('click', async () => {
    const ok = await confirmAction('Terminer la partie ?', 'Les résultats des cartes déjà jouées seront affichés à tout le monde.', 'Terminer');
    if (ok) await gameStore.finish(code);
  });

  // ---------------------------------------------------------------- Fin de partie

  function renderEnd(isHost) {
    showScreen('end');
    document.body.classList.toggle('is-host', isHost);
    const results = room.results ?? {};
    const team = teamScore(results);
    $('team-score').textContent = formatPercent(team.percent);
    $('team-detail').textContent = team.count
      ? `${team.count} carte${team.count > 1 ? 's' : ''} jouée${team.count > 1 ? 's' : ''} · ${team.right} juste${team.right > 1 ? 's' : ''} · ${team.partial} partiel${team.partial > 1 ? 's' : ''} · ${team.wrong} faux`
      : 'Aucune carte jouée.';

    const mine = playerScores(results)[uid];
    $('my-score').hidden = isHost || !mine;
    if (mine) $('my-score').textContent = `Votre score : ${formatPercent(mine.percent)} (${mine.count} carte${mine.count > 1 ? 's' : ''})`;

    const steps = podium(results);
    $('podium-panel').hidden = !steps.length;
    $('podium').replaceChildren(...steps.map((step) => {
      const item = document.createElement('li');
      item.className = `podium-step step-${step.rank}`;
      item.append(text('span', String(step.rank), 'podium-rank'));
      item.append(text('span', step.uids.map(nameOf).join(', '), 'podium-names'));
      item.append(text('span', formatPercent(step.percent), 'podium-percent'));
      return item;
    }));

    renderRecap(results, { withNames: true });
    $('recap-none').textContent = 'Aucune erreur, bravo à toute l\'équipe !';
    $('end-score-title').textContent = 'Score de l\'équipe';
    $('solo-end-actions').hidden = true;
    $('end-actions').hidden = !isHost;
  }

  /** Récapitulatif des cartes partielles et fausses, avec leurs explications. */
  function renderRecap(results, { withNames }) {
    const list = mistakes(results, cardsById);
    $('recap-none').hidden = list.length > 0 || !teamScore(results).count;
    $('recap').replaceChildren(...list.map((mistake) => {
      const item = document.createElement('li');
      item.className = `recap-item verdict-border-${mistake.verdict}`;
      const head = document.createElement('p');
      head.className = 'recap-card';
      setTypo(head, mistake.card.text);
      const meta = document.createElement('p');
      meta.className = 'recap-meta';
      if (withNames) meta.append(text('span', nameOf(mistake.playerUid), 'recap-player'));
      meta.append(
        text('span', mistake.region ? REGION_LABELS[mistake.region] : 'Temps écoulé', `recap-chosen verdict-${mistake.verdict}`),
        text('span', '→', 'recap-arrow'),
        text('span', REGION_LABELS[mistake.card.answer], 'recap-correct'),
      );
      item.append(head, meta);
      if (mistake.explanation.targeted) {
        const targeted = document.createElement('p');
        targeted.className = 'explanation-targeted';
        setTypo(targeted, mistake.explanation.targeted);
        item.append(targeted);
      }
      const general = document.createElement('p');
      general.className = 'explanation';
      setTypo(general, mistake.explanation.general);
      item.append(general, text('p', `Scrum Guide 2020 · ${mistake.explanation.reference}`, 'reference'));
      return item;
    }));
  }

  $('new-game').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      const newCode = await gameStore.createRoom();
      qrFor = null;
      history.replaceState(null, '', urlFor(newCode));
      watch(newCode);
    } finally { busy = false; }
  });

  // ---------------------------------------------------------------- Entraînement seul
  // Tout est local : aucune écriture dans la base ni dans le stockage du navigateur.

  let solo = null;   // { ids, index, flipped, selection, results, finished }

  function startSolo(ids) {
    stopWatching?.();
    stopWatching = null;
    code = null;
    room = null;
    roomLoaded = false;
    gameStore.closePresence?.();
    if (location.search.includes('salle=')) history.replaceState(null, '', urlFor(null));
    solo = { ids, index: 0, flipped: false, selection: null, results: {}, finished: false };
    shownCardKey = undefined;
    render();
    window.scrollTo(0, 0);
  }

  function soloCard() {
    return cardsById[solo.ids[solo.index]];
  }

  function soloFlip() {
    if (solo.finished || solo.flipped) return;
    solo.flipped = true;
    render();
  }

  function soloSelect(region) {
    if (!solo.flipped || solo.results[solo.index]) return;
    solo.selection = region;
    render();
  }

  function soloValidate() {
    if (!solo.flipped || !solo.selection || solo.results[solo.index]) return;
    const card = soloCard();
    solo.results[solo.index] = { playerUid: 'solo', cardId: card.id, region: solo.selection, verdict: verdict(solo.selection, card.answer), timedOut: false };
    render();
  }

  function soloNext() {
    if (!solo.results[solo.index]) return;
    if (solo.index + 1 >= solo.ids.length) { solo.finished = true; }
    else { solo.index += 1; solo.flipped = false; solo.selection = null; }
    render();
    window.scrollTo(0, 0);
  }

  function renderSolo() {
    $('room-chip').hidden = true;
    $('me-name').hidden = true;
    document.body.classList.remove('is-host');
    if (solo.finished) { renderSoloEnd(); return; }
    showScreen('game');
    const card = soloCard();
    const result = solo.results[solo.index] ?? null;
    const total = solo.ids.length;
    const last = solo.index + 1 >= total;
    $('turn-who').textContent = `Carte ${solo.index + 1} sur ${total}`;
    $('turn-bar').classList.toggle('is-mine', !result);
    $('timer').hidden = true;
    $('card-meta').textContent = 'Entraînement';
    showFlipCard({
      key: solo.flipped ? `solo:${solo.index}:${card.id}` : null, card: solo.flipped ? card : null,
      hidden: false, canFlip: !solo.flipped, waitingText: '',
    });
    const choosing = solo.flipped && !result;
    $('validate').hidden = !choosing;
    $('validate').disabled = !solo.selection;
    $('card-hint').textContent = choosing
      ? (solo.selection ? `Votre choix : ${REGION_LABELS[solo.selection]}. Validez quand vous êtes sûr.` : 'Touchez une zone du diagramme, puis validez.')
      : '';
    venn.setInteractive(Boolean(choosing));
    venn.update(result ? { chosen: result.region, correct: card.answer, verdict: result.verdict } : { selection: solo.selection });
    renderCorrection(card, result);
    $('host-controls').hidden = true;
    $('my-progress').hidden = true;
    $('solo-controls').hidden = false;
    $('solo-next').hidden = !result;
    $('solo-next').textContent = last ? 'Voir les résultats' : 'Carte suivante';
    const score = teamScore(solo.results);
    $('solo-score').textContent = score.count
      ? `Score : ${formatPercent(score.percent)} · ${score.right} juste${score.right > 1 ? 's' : ''}, ${score.partial} partiel${score.partial > 1 ? 's' : ''}, ${score.wrong} faux`
      : 'Score : aucune carte jouée';
  }

  function renderSoloEnd() {
    showScreen('end');
    const score = teamScore(solo.results);
    $('end-score-title').textContent = 'Votre score';
    $('team-score').textContent = formatPercent(score.percent);
    $('team-detail').textContent = score.count
      ? `${score.count} carte${score.count > 1 ? 's' : ''} jouée${score.count > 1 ? 's' : ''} · ${score.right} juste${score.right > 1 ? 's' : ''} · ${score.partial} partiel${score.partial > 1 ? 's' : ''} · ${score.wrong} faux`
      : 'Aucune carte jouée.';
    $('my-score').hidden = true;
    $('podium-panel').hidden = true;
    renderRecap(solo.results, { withNames: false });
    $('recap-none').textContent = 'Aucune erreur, bravo !';
    $('end-actions').hidden = true;
    $('solo-end-actions').hidden = false;
    $('replay-mistakes').hidden = !mistakes(solo.results, cardsById).length;
  }

  $('training-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const ids = drawTrainingDeck(deck.cards, $('training-count').value);
    $('training-count').value = String(ids.length);
    startSolo(ids);
  });
  $('solo-next').addEventListener('click', soloNext);
  $('solo-stop').addEventListener('click', async () => {
    if (!solo) return;
    const ok = await confirmAction('Arrêter l\'entraînement ?', 'Vous verrez les résultats des cartes déjà jouées.', 'Arrêter');
    if (!ok) return;
    solo.finished = true;
    render();
  });
  $('replay-mistakes').addEventListener('click', () => {
    const ids = mistakes(solo.results, cardsById).map((mistake) => mistake.cardId);
    if (ids.length) startSolo(shuffle(ids));
  });
  $('new-training').addEventListener('click', () => {
    startSolo(drawTrainingDeck(deck.cards, $('training-count').value));
  });
  $('training-home').addEventListener('click', () => {
    solo = null;
    shownCardKey = undefined;
    render();
    window.scrollTo(0, 0);
  });

  // ---------------------------------------------------------------- Démarrage

  if (code && offline) {
    code = null;
    showHome(OFFLINE_MESSAGE);
  } else if (code) {
    showScreen('status');
    $('status-text').textContent = 'Ouverture de la salle…';
    watch(code);
  } else {
    showHome();
  }
}
