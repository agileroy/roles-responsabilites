## Context

Dépôt neuf, sur le modèle de `poker-planning` : site statique vanilla en modules ES, sans build, publié sur GitHub Pages après des tests `node --test`, et état partagé dans la base Firebase Realtime Database déjà utilisée par quatre outils de l'auteur. Différences de fond avec le poker planning : plusieurs salles simultanées (une par formation), un rôle de formateur distinct des participants, un déroulé tour par tour piloté par le formateur, et un contenu pédagogique (le paquet de cartes) qui doit rester facile à relire et à corriger.

## Goals / Non-Goals

**Goals:**
- Une partie collective en temps réel : écran projeté pour le formateur, téléphones pour les participants, sans compte.
- Des règles du jeu (seul le joueur actif place sa carte, seul le formateur fait avancer la partie) appliquées par la base, pas seulement par l'interface.
- Un verdict et un choix d'explication calculés par une logique pure, testée sans navigateur ni Firebase.
- Un paquet de cartes dans un fichier JSON, validé par les tests et relisible grâce à une vue générée.

**Non-Goals:**
- Édition du paquet depuis l'interface, mode solo, vote de la salle, historique des parties, autres langues.
- Cacher les bonnes réponses à un utilisateur technique : le paquet est public dans le site (voir Risques).
- Tests automatiques des règles Firebase (émulateur et Java nécessaires) : vérification manuelle documentée, comme pour `poker-planning`.

## Decisions

- **Structure du site** : `site/index.html`, `site/app.css`, `site/data/cards.json`, `site/vendor/` (QR code), et dans `site/js/` :
  - `game-core.js` : logique pure (régions et ensembles d'accountabilities, verdict, choix de l'explication, validation du paquet, maximum de cartes par personne, ordre de passage, joueur suivant, quota d'un retardataire, scores, podium, récapitulatif, génération et validation du code de salle, normalisation du prénom) ;
  - `room-store.js` : seul module qui parle à Firebase ;
  - `ui.js` : interface, avec trois vues (formateur, joueur actif, spectateur) ; `app.js` : point d'entrée et routage par `?salle=` ;
  - `venn.js` : dessin SVG du diagramme et détection de la région touchée ;
  - `firebase-config.js` : configuration publique, identique à celle de `poker-planning` (même projet).
  Les modules `theme.js` et le générateur de QR code `qrcode-generator` 1.4.4 sont repris de `poker-planning`.

- **Diagramme de Venn en SVG** : trois cercles de même rayon disposés en triangle dans un rectangle « Scrum Team », zone « Piège » en bandeau sous le rectangle. Chaque région est un chemin SVG distinct (calculé par intersections de cercles à l'aide de `clipPath` et de masques), ce qui donne une cible tactile par région et permet de la colorer ; la région PO + SM, géométriquement petite, garde une zone tactile d'au moins 44 px grâce au rayon choisi. Alternative écartée : boutons de régions sous un Venn décoratif, moins parlant pour le débrief.

- **Régions et verdict** : chaque région est associée à un ensemble (`po` → {PO}, `po-dev` → {PO, Dev}, `team` → {PO, SM, Dev}, `trap` → {}). Le verdict compare les ensembles : égalité → juste ; intersection non vide → partiel ; sinon faux. La zone Piège, ensemble vide, donne donc « faux » face à toute autre région. Cette règle unique couvre aussi le centre : « PO » pour une carte « Scrum Team » est partiel.

- **Modèle de données** (sous `/rolesGame`) :
  - `rooms/{code}/meta` : `{ hostUid, createdAt, status: 'lobby' | 'playing' | 'finished', cardsPerPlayer, timerSeconds, deckOrder, playerOrder }`. `deckOrder` est la liste mélangée des identifiants de cartes, `playerOrder` la liste des `uid` dans l'ordre de passage, tous deux écrits par le formateur au lancement (les retardataires sont ajoutés à la fin de `playerOrder`) ;
  - `rooms/{code}/players/{uid}` : `{ name, joinedAt, quota, removed, connections: { {connId}: true } }` ; `quota` est le nombre de cartes à jouer, fixé par le formateur au lancement ou à l'arrivée tardive ;
  - `rooms/{code}/names/{cléNormalisée}` : `uid`, pour l'unicité du prénom ;
  - `rooms/{code}/turn` : `{ seq, playerUid, cardId, drawnAt, selection, placement, timedOut, revealed }` ; `seq` numérote les tours ;
  - `rooms/{code}/results/{seq}` : `{ playerUid, cardId, region, verdict }`, écrit par le formateur à la révélation ;
  - `expiry/{code}` : `createdAt`, index lisible par tous les connectés, pour le ménage.

- **Rôles et autorité** : le formateur est identifié par `meta.hostUid` (authentification anonyme, `uid` stable par navigateur). Lui seul écrit `meta`, `turn` (sauf `selection` et `placement`), `results` et le `quota` ou `removed` des joueurs. Le joueur désigné par `turn.playerUid` est le seul à pouvoir écrire `turn.cardId` à la pioche (valeur imposée : la carte suivante de `deckOrder`, vérifiable par les règles via un index `turn.deckIndex`), `turn.selection` tant que `placement` est vide, puis `turn.placement` une seule fois. Les régions sont validées par une expression régulière dans les règles.

- **Calcul du verdict par le formateur** : quand `turn.placement` apparaît (ou que le chrono expire), le navigateur du formateur calcule le verdict avec `game-core.js`, écrit `results/{seq}` et passe `turn.revealed` à vrai ; tous les écrans affichent alors la correction à partir du paquet local et du résultat. Un seul écrivain évite les conflits. Conséquence : la correction n'apparaît que si l'écran du formateur est ouvert, ce qui est le cas en formation.

- **Chrono** : `turn.drawnAt` est l'heure du serveur à la pioche (`serverTimestamp`). Chaque écran affiche le temps restant avec `.info/serverTimeOffset`. À l'échéance, le navigateur du formateur écrit le résultat « faux, temps écoulé » ; les règles refusent un `placement` écrit après `drawnAt + timerSeconds`, avec une marge de 2 secondes.

- **Passage au joueur suivant** : `game-core.js` calcule le prochain joueur à partir de `playerOrder`, des quotas, des cartes déjà jouées par chacun (comptées dans `results`) et des joueurs retirés. La partie est terminée quand plus aucun joueur non retiré n'a de carte à jouer. « Passer son tour » remet le joueur à la fin du tour complet en cours sans consommer de carte : la carte piochée n'est pas comptée et l'index du paquet n'avance pas.

- **Arrivée tardive** : le formateur fixe le `quota` du retardataire à `cardsPerPlayer − toursComplets`, limité par `(cartes restantes) − (cartes encore dues aux autres)` ; à 0, le retardataire est spectateur.

- **Présence** : identique à `poker-planning` (une entrée par onglet sous `connections`, retirée par `onDisconnect`). Un participant sans connexion est affiché « déconnecté » mais garde sa place.

- **Ménage des salles de plus de 24 heures** : à la création d'une salle, le navigateur du formateur lit `expiry` et supprime `rooms/{code}` et `expiry/{code}` pour chaque salle dont `createdAt` dépasse 24 heures (constante `ROOM_TTL_MS`). Les règles n'autorisent cette suppression que si `createdAt < now − 86 400 000`, ou si l'auteur de la suppression est le formateur de la salle.

- **Code de salle** : 4 lettres tirées dans un alphabet sans lettres ambiguës (`ABCDEFGHJKMNPQRSTUVWXYZ`), réservé par transaction sur `expiry/{code}` ; en cas de collision, un nouveau tirage.

- **Hasard** : `crypto.getRandomValues` pour le mélange (Fisher-Yates), l'ordre de passage et le code. `game-core.js` reçoit la fonction aléatoire en paramètre pour être testable.

- **Paquet et relecture** : `site/data/cards.json` chargé par `fetch` au démarrage ; `tests/cards.test.mjs` valide son format ; `tools/cards-review.mjs` génère `docs/cartes.md` pour la relecture.

- **Règles partagées** : la branche `rolesGame` est ajoutée au `database.rules.json` commun, puis le fichier est recopié à l'identique dans les cinq dépôts. Après chaque modification, le fichier complet est donné à l'auteur pour être collé dans la console Firebase.

- **Encart dans la boîte à outils** : nouvelle section « En formation » dans `agileroy.github.io/outils/index.html`, en reprenant le balisage des cartes existantes.

- **Tests** : `tests/game-core.test.mjs` couvre le verdict (toutes les combinaisons de régions), le choix d'explication, le maximum de cartes par personne, l'ordre de passage avec retraits et passages de tour, le quota d'un retardataire, les scores, le podium avec ex aequo et le récapitulatif. Les parcours temps réel sont vérifiés à la main avec un écran formateur et plusieurs navigateurs, selon une liste de contrôle dans `tasks.md`.

## Risks / Trade-offs

- [Bonnes réponses lisibles dans le site par un participant technique] → Assumé : c'est un jeu de formation, pas un examen.
- [Correction dépendante de l'écran du formateur] → En formation, l'écran projeté est toujours ouvert. Si le formateur recharge sa page, il reprend la partie là où elle en était, car tout l'état est dans la base.
- [Règles de sécurité partagées entre cinq outils] → Une erreur de syntaxe bloquerait la publication des règles de tous les outils. La branche `rolesGame` est isolée, et le fichier est vérifié (JSON valide, autres branches inchangées) avant d'être recopié.
- [Réseau d'entreprise filtré] → Constaté pour `poker-planning` : le proxy Zscaler bloque GitHub Pages et Firebase. Le jeu se joue hors VPN, et les participants bloqués rejoignent depuis leur téléphone avec le QR code.
- [Région PO + Scrum Master très petite à l'écran] → Rayon et écartement des cercles choisis pour garder 44 px de zone tactile ; vérification sur un téléphone de 360 px.
- [Offre gratuite Firebase (100 connexions simultanées)] → Une formation de 10 participants plus le formateur en utilise une douzaine.

## Migration Plan

1. Valider le paquet de cartes (`docs/cartes.md`) avec l'auteur.
2. Implémenter et tester en local (`localhost`) avec un écran formateur et plusieurs navigateurs.
3. Ajouter la branche `rolesGame` aux règles, recopier `database.rules.json` dans les cinq dépôts, et donner le fichier complet à l'auteur pour la console Firebase.
4. Vérifier avec l'auteur que `agileroy.github.io` figure dans les domaines autorisés de l'authentification Firebase.
5. Pousser sur `main` (GitHub Pages en mode GitHub Actions est déjà activé), vérifier le site publié, puis ajouter l'encart dans la boîte à outils.

## Open Questions

_Aucune._
