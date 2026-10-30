## 1. Logique

- [x] 1.1 `drawTrainingDeck` dans `site/js/game-core.js` (tirage sans doublon, au moins 1 piège, nombre ramené dans [1, taille du paquet]). Vérification : tests des scénarios « Au moins un piège », « Une seule carte » et « Nombre hors bornes ».

## 2. Interface

- [x] 2.1 Carte « S'entraîner seul » sur l'accueil (nombre de cartes, 10 par défaut, « Commencer »). Vérification : essai en navigateur.
- [x] 2.2 Mode seul de l'écran de partie (carte à retourner, Venn, correction, « Carte suivante » / « Voir les résultats », « Arrêter », progression et score) et de l'écran de fin (score, récapitulatif, « Rejouer mes erreurs », « Nouvel entraînement », accueil). Vérification : partie complète en navigateur sans Firebase, captures sur ordinateur et téléphone, aucune écriture dans le stockage du navigateur.

## 3. Publication

- [x] 3.1 README, tests au vert, publication. Vérification : publication GitHub Actions réussie.
- [x] 3.2 Ajout décidé pendant l'implémentation : si le service temps réel est injoignable, l'accueil s'affiche quand même (au lieu d'un écran d'erreur), « Créer une partie » et « Rejoindre » expliquent que seul l'entraînement est disponible. Vérification : essai en navigateur sans accès à Firebase.
