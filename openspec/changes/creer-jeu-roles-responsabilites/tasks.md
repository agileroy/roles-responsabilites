## 1. Paquet de cartes

- [x] 1.1 Rédiger `site/data/cards.json` (régions, cartes, explications, explications ciblées) et `tools/cards-review.mjs`, qui génère `docs/cartes.md`. Vérification : le script génère la vue sans erreur.
- [ ] 1.2 Intégrer les relectures (fidélité au Scrum Guide 2020, clarté et jouabilité) et faire valider le paquet par l'auteur. Vérification : validation explicite de l'auteur.
- [ ] 1.3 Écrire `tests/cards.test.mjs` : identifiants uniques, régions connues, textes et explications non vides, pas d'explication ciblée pour la bonne région. Vérification : `npm test` au vert, et un test rouge sur un paquet volontairement cassé.

## 2. Logique métier pure

- [ ] 2.1 Créer `site/js/game-core.js` : régions et ensembles, verdict, choix de l'explication. Vérification : tests de toutes les combinaisons de régions et de chaque scénario de `card-deck`.
- [ ] 2.2 Ajouter le code de salle, la normalisation du prénom, le maximum de cartes par personne, le mélange et l'ordre de passage avec un aléa injecté. Vérification : tests des scénarios de `game-room` (maximum 5 pour 10 participants, ajustement à 7).
- [ ] 2.3 Ajouter le joueur suivant (quotas, retraits, passages de tour), la fin de partie et le quota d'un retardataire. Vérification : tests des scénarios « Retardataire », « Paquet épuisé » et « Joueur absent ».
- [ ] 2.4 Ajouter les scores, le podium et le récapitulatif. Vérification : un test par scénario de `game-results`.

## 3. Firebase

- [ ] 3.1 Ajouter la branche `rolesGame` à `database.rules.json` (formateur, joueur actif, régions valides, chrono, prénoms, ménage au-delà de 24 heures), sans toucher aux autres branches. Vérification : JSON valide, autres branches identiques octet pour octet, essais refusés et acceptés listés en 5.1.
- [ ] 3.2 Créer `site/js/room-store.js` : connexion anonyme, création de salle avec code réservé par transaction, ménage, entrée d'un participant avec prénom unique, présence, réglages, lancement, pioche, sélection, placement, révélation, carte suivante, passer son tour, retrait, fin, suppression. Vérification : parcours 5.1 en local.

## 4. Interface

- [ ] 4.1 Créer `site/js/venn.js` : Venn SVG avec huit régions cliquables, sélection, bonne région et région choisie mises en évidence. Vérification : zone tactile d'au moins 44 px par région à 360 px de large, rendu dans les deux thèmes.
- [ ] 4.2 Créer `site/index.html`, `site/app.css`, `site/js/app.js` et `site/js/ui.js` : accueil, rejoindre (code, prénom, erreurs), écran formateur (salle d'attente, QR code, réglages, partie, correction, fin), écran joueur actif (pioche, Venn, Valider), écran spectateur, chrono, bandeau de connexion perdue, thème clair / sombre. Vérification : liste de contrôle 5.1.
- [ ] 4.3 Vérifier l'affichage projeté (1280 px et plus) et sur téléphone (360 et 390 px), en thème clair et sombre. Vérification : captures sans défilement horizontal.

## 5. Vérification et publication

- [ ] 5.1 Liste de contrôle en local, avec un écran formateur et au moins trois navigateurs participants (dont une fenêtre privée) : création et code, QR code, prénom pris, salle pleine, code inconnu, réglages et maximum, lancement, pioche, sélection visible en direct, changement d'avis, validation, placement refusé à un autre joueur, chrono et temps écoulé, correction ciblée, carte suivante, passer son tour, arrivée tardive et spectateur, rechargement d'un participant et du formateur, retrait, fin anticipée, podium avec ex aequo, récapitulatif, suppression de la salle, ménage d'une salle de plus de 24 heures, coupure réseau. Vérification : chaque point constaté.
- [ ] 5.2 Ajouter `package.json`, `.github/workflows/pages.yml` (tests puis publication de `site/`) et le `README.md`. Vérification : `npm test` au vert en local.
- [ ] 5.3 Recopier `database.rules.json` dans `poker-planning`, `matrice-competences`, `wheel-of-chance` et `moving-motivators`, et donner le fichier complet à l'auteur pour la console Firebase. Vérification : fichier identique dans les cinq dépôts.
- [ ] 5.4 Pousser sur `main` et vérifier le site publié avec un formateur et deux téléphones. Vérification : une partie complète jouée sur https://agileroy.github.io/roles-responsabilites/.
- [ ] 5.5 Ajouter la section « En formation » et la carte du jeu dans `agileroy.github.io/outils/index.html`, et mettre à jour le compteur d'outils. Vérification : la carte ouvre le jeu dans un nouvel onglet.
