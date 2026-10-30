## 1. Paquet de cartes

- [x] 1.1 Rédiger `site/data/cards.json` (régions, cartes, explications, explications ciblées) et `tools/cards-review.mjs`, qui génère `docs/cartes.md`. Vérification : le script génère la vue sans erreur.
- [x] 1.2 Intégrer les relectures (fidélité au Scrum Guide 2020, clarté et jouabilité, puis relecture sur la traduction française officielle : 67 cartes, « Product Goal », « Sprint Goal » et « refinement » gardés en anglais) et faire valider le paquet par l'auteur. Vérification : validation explicite de l'auteur (30 octobre 2026).
- [x] 1.3 Écrire `tests/cards.test.mjs` et la validation du paquet dans `game-core.js` : identifiants uniques, régions connues, textes et explications non vides, pas d'explication ciblée pour la bonne région. Vérification : `npm test` au vert, et des tests rouges sur des paquets volontairement cassés (`tests/game-core.test.mjs`).

## 2. Logique métier pure

- [x] 2.1 Créer `site/js/game-core.js` : régions et ensembles, verdict, choix de l'explication, espaces insécables de la typographie française. Vérification : tests de toutes les combinaisons de régions et de chaque scénario de `card-deck`.
- [x] 2.2 Ajouter le code de salle, la normalisation du prénom, le maximum de cartes par personne, le mélange et l'ordre de passage avec un aléa injecté. Vérification : tests des scénarios de `game-room` (maximum 6 pour 10 participants, ajustement de 9 à 8).
- [x] 2.3 Ajouter le joueur suivant (quotas, retraits, passages de tour), la fin de partie et le quota d'un retardataire. Vérification : tests des scénarios « Retardataire », « Paquet épuisé » et « Joueur absent ».
- [x] 2.4 Ajouter les scores, le podium et le récapitulatif. Vérification : un test par scénario de `game-results`.

## 3. Firebase

- [x] 3.1 Ajouter la branche `rolesGame` à `database.rules.json` (formateur, joueur actif, régions valides, chrono, prénoms, ménage au-delà de 24 heures), sans toucher aux autres branches. Vérification : JSON valide, autres branches identiques octet pour octet, `tests/rules.test.mjs` (régions, code de salle, chrono et délai alignés sur `game-core.js`).
- [x] 3.2 Créer `site/js/game-store.js` sur une interface de base de données, avec `site/js/firebase-db.js` (Firebase) et `site/js/memory-db.js` (mémoire et mode démo) : connexion anonyme, création de salle avec code réservé, ménage, entrée d'un participant avec prénom unique, présence, réglages, lancement, pioche, sélection, placement, révélation, carte suivante, passer son tour, retrait, fin, suppression. Vérification : `tests/game-store.test.mjs` (parcours complets à plusieurs clients sur la base en mémoire).

## 4. Interface

- [x] 4.1 Créer `site/js/venn.js` : Venn SVG avec huit régions cliquables et focalisables, sélection, bonne région et région choisie mises en évidence. Vérification : plus petite région d'environ 55 px à 360 px de large, rendu dans les deux thèmes.
- [x] 4.2 Créer `site/index.html`, `site/app.css`, `site/js/app.js` et `site/js/ui.js` : accueil, rejoindre (code, prénom, erreurs), écran formateur (salle d'attente, QR code, réglages, partie, correction, fin), écran joueur actif (pioche, Venn, Valider), écran spectateur, chrono, bandeau de connexion perdue, thème clair / sombre. Vérification : liste de contrôle 5.1.
- [x] 4.3 Vérifier l'affichage projeté (1280 et 1440 px) et sur téléphone (360 et 390 px), en thème clair et sombre. Vérification : captures sans défilement horizontal (essais automatisés Playwright en mode démo).

## 5. Vérification et publication

- [ ] 5.1 Liste de contrôle avec un écran formateur et au moins trois navigateurs participants. Fait en mode démo (Playwright, un formateur et trois participants) : création et code, QR code, prénom pris, code inconnu, réglages et maximum, lancement, pioche, sélection visible en direct, changement d'avis, validation, chrono et temps écoulé, correction ciblée, carte suivante, passer son tour, arrivée tardive, fin anticipée, podium avec ex aequo, récapitulatif, suppression de la salle. Reste à faire sur Firebase avec de vrais téléphones : placement refusé à un autre joueur par les règles, rechargement d'un participant et du formateur, retrait, coupure réseau.
- [x] 5.2 Ajouter `package.json`, `.github/workflows/pages.yml` (tests puis publication de `site/`) et le `README.md`. Vérification : `npm test` au vert en local.
- [x] 5.3 Recopier `database.rules.json` dans `poker-planning`, `matrice-competences`, `wheel-of-chance` et `moving-motivators`, et donner le fichier complet à l'auteur pour la console Firebase. Vérification : fichier identique dans les cinq dépôts (même empreinte avant et après), tests des quatre dépôts au vert. Reste à l'auteur : publier le fichier dans la console Firebase.
- [ ] 5.4 Pousser sur `main` (fait : publication GitHub Actions réussie) et vérifier le site publié avec un formateur et deux téléphones, une fois les règles publiées. Vérification : une partie complète jouée sur https://agileroy.github.io/roles-responsabilites/.
- [x] 5.5 Ajouter la section « En formation » et la carte du jeu dans `agileroy.github.io/outils/index.html`, et mettre à jour le compteur d'outils. Vérification : la carte ouvre le jeu dans un nouvel onglet.
