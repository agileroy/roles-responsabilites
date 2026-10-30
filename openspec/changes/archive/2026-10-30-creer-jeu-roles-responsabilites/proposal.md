## Why

En formation PSM et PSPO, les confusions sur les accountabilities de Scrum sont toujours les mêmes : qui ordonne le Product Backlog, qui estime, qui définit le Sprint Goal, qui « assigne les tâches »… L'atelier papier « Rôles et responsabilités » fonctionne, mais la correction est longue et dépend du formateur. Un jeu collectif en temps réel, projeté et joué depuis les téléphones, rend l'atelier plus rythmé, corrige chaque carte à chaud en s'appuyant sur le Scrum Guide 2020 et engage chaque participant à tour de rôle.

## What Changes

- Un **formateur** crée une partie depuis l'écran projeté : il obtient un **code de salle** à 4 lettres et un **QR code**. Il anime la partie mais ne joue pas.
- Les **participants** (10 au maximum) rejoignent depuis leur téléphone avec le QR code ou le code, et saisissent un prénom unique dans la salle. Pas de compte.
- Le formateur règle le **nombre de cartes par personne** (5 par défaut, au clavier ou avec − et +, dans la limite du maximum possible) et un **chrono** facultatif (30, 45 ou 60 secondes), puis lance la partie.
- **Tour par tour**, le jeu désigne le joueur actif, qui retourne une carte de responsabilité face cachée. Il la place sur son téléphone dans une région d'un **diagramme de Venn** : Product Owner, Scrum Master, Developers, leurs intersections, le centre (Scrum Team), ou la zone **Piège** (responsabilité qui n'existe pas dans Scrum). Tout le monde voit son choix en direct.
- **Correction immédiate** pour toute la salle : juste, partiel ou faux, avec une explication fondée sur le Scrum Guide 2020, ciblée selon l'erreur commise. Le formateur passe à la carte suivante quand la discussion est terminée.
- **Arrivée tardive** possible : le retardataire pioche autant de cartes qu'il en reste aux autres participants.
- **Fin de partie** : score collectif, podium des trois meilleurs pourcentages de bonnes réponses, récapitulatif des erreurs avec leurs explications.
- **Paquet de 67 cartes** dans un fichier JSON du dépôt (`site/data/cards.json`), relu et validé par l'auteur.
- Les salles sont **supprimées au bout de 24 heures**, sans serveur.
- Site statique sur GitHub Pages ; l'état partagé passe par la base Firebase existante de l'auteur, dans une nouvelle branche `rolesGame`.
- La **boîte à outils** (https://agileroy.github.io/outils/) reçoit un encart « En formation » avec la carte du jeu.

Hors périmètre de cette première version : modification du paquet de cartes depuis l'interface, mode solo, vote de la salle avant la réponse, autres langues, historique des parties, indice « cette carte concerne deux régions ».

## Capabilities

### New Capabilities

- `card-deck` : format du paquet de cartes, régions du Venn, verdict juste / partiel / faux et choix de l'explication.
- `game-room` : création de la salle par le formateur, code et QR code, arrivée des participants, réglages, arrivée tardive, présence et suppression au bout de 24 heures.
- `game-turn` : tour du joueur actif, pioche, placement dans le Venn, chrono, correction affichée à tous, passage à la carte suivante.
- `game-results` : score collectif, podium et récapitulatif des erreurs en fin de partie.
- `site-publication` : publication sur GitHub Pages, interface, connexion temps réel, règles de sécurité partagées, encart dans la boîte à outils.

### Modified Capabilities

_Aucune._

## Impact

- Ajoutés dans `roles-responsabilites` : `site/` (page, styles, scripts, paquet de cartes, QR code embarqué), `tests/`, `tools/cards-review.mjs` et `docs/cartes.md` (vue de relecture du paquet), `database.rules.json`, `.github/workflows/pages.yml`, `package.json`, `README.md`.
- `database.rules.json` : nouvelle branche `rolesGame`, recopiée à l'identique dans `poker-planning`, `matrice-competences`, `wheel-of-chance` et `moving-motivators`.
- `agileroy.github.io` : nouvel encart « En formation » dans `outils/index.html`.
- Actions manuelles de l'auteur : publier les nouvelles règles dans la console Firebase ; vérifier que `agileroy.github.io` figure dans les domaines autorisés de l'authentification Firebase.
