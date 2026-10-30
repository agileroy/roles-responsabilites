## Why

Aujourd'hui, tout le monde pioche dans un même paquet mélangé : selon le hasard, un participant peut ne tomber sur aucun piège et un autre sur trois. Or démasquer une responsabilité qui n'existe pas dans Scrum est l'un des moments les plus utiles de l'atelier. L'auteur veut que chaque participant rencontre exactement un piège par partie, à une position différente pour chacun.

## What Changes

- Au lancement, le jeu **distribue une main à chaque participant** : exactement **1 carte Piège** et le reste en cartes qui ne sont pas des pièges, mélangées pour que la position du piège varie d'un participant à l'autre. Chacun pioche ensuite dans sa propre main.
- La règle s'applique **toujours**, dès 2 cartes par personne ; avec 1 carte par personne, la carte est tirée au hasard dans tout le paquet.
- **Rien ne l'annonce** aux participants : ni l'interface ni les explications ne mentionnent la règle, pour qu'ils ne puissent pas en déduire la réponse.
- Le **maximum de cartes par personne** tient compte de la règle : il faut assez de pièges (un par personne) et assez de cartes non piège pour compléter les mains. Avec 67 cartes dont 16 pièges : 13 cartes au plus pour 4 participants (au lieu de 16), 6 pour 10 participants (inchangé).
- **Retardataire** : il reçoit lui aussi une main avec 1 piège, prise dans les cartes non distribuées.
- **Passer son tour** : la carte piochée reste dans la main du joueur, qui la retrouvera à son prochain tour (au lieu de passer au joueur suivant).
- **Règles Firebase** : la pioche vérifie la carte suivante de la main du joueur au lieu du paquet commun ; le fichier partagé doit être republié dans la console.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `game-room` : réglages (maximum de cartes par personne), lancement et tirage (mains avec un piège), arrivée tardive.
- `game-turn` : pioche dans la main du joueur, passer son tour.

## Impact

- `site/js/game-core.js` (distribution des mains, maximum, main d'un retardataire), `site/js/game-store.js` (lancement, pioche, retardataire, tour suivant), `site/js/ui.js` (maximum affiché), tests.
- `database.rules.json` : `meta/deckOrder` remplacé par `meta/hands/{uid}`, règle de pioche adaptée ; recopié dans les cinq dépôts.
- Action manuelle de l'auteur : republier les règles dans la console Firebase.
