## 1. Logique métier

- [x] 1.1 Dans `site/js/game-core.js` : `dealHands` (un piège par main dès 2 cartes, mains mélangées, cartes toutes différentes), `maxCardsPerPlayer` tenant compte des pièges, cartes non distribuées pour un retardataire. Vérification : tests des scénarios « Un piège par personne », « Position du piège », « Une seule carte par personne » et des maximums de `game-room`.

## 2. Partie et règles

- [x] 2.1 Dans `site/js/game-store.js` : distribution des mains au lancement, pioche dans la main, indice de pioche par joueur, main du retardataire. Vérification : parcours complets sur la base en mémoire (1 piège par joueur, passer son tour, retardataire).
- [x] 2.2 Dans `database.rules.json` : `meta/hands/{uid}/{i}` à la place de `meta/deckOrder`, pioche vérifiée contre la main du joueur actif. Vérification : `tests/rules.test.mjs`, autres branches inchangées.

## 3. Interface et publication

- [x] 3.1 Maximum affiché dans les réglages ; aucun texte ne mentionne la règle. Vérification : partie en mode démo dans le navigateur.
- [x] 3.2 Recopier `database.rules.json` dans les cinq dépôts, le donner à l'auteur pour la console Firebase, pousser. Vérification : fichiers identiques, publication GitHub Actions réussie.
