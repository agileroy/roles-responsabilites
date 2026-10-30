# Solo Training Specification

## Purpose
Entraînement seul, sans formateur ni service temps réel : lancement depuis l'accueil, tirage des cartes avec au moins un piège, tour de jeu, fin de partie et « Rejouer mes erreurs ». Couvre `drawTrainingDeck` dans `site/js/game-core.js` et le mode seul de `site/js/ui.js`.

## Requirements

### Requirement: Lancement d'un entraînement
La page d'accueil SHALL proposer une carte « S'entraîner seul », à côté de « Animer une partie » et « Rejoindre une partie », avec un champ « Nombre de cartes » et un bouton « Commencer ». Le nombre de cartes SHALL valoir 10 par défaut ; il SHALL être modifiable au clavier, et une valeur hors bornes ou illisible SHALL être ramenée dans [1, taille du paquet] au lancement. L'entraînement MUST NOT nécessiter de prénom, de code de salle, de formateur ni de connexion au service temps réel.

#### Scenario: Valeurs par défaut
- **GIVEN** la page d'accueil
- **WHEN** l'utilisateur regarde la carte « S'entraîner seul »
- **THEN** le nombre de cartes vaut 10

#### Scenario: Nombre de cartes modifié
- **GIVEN** la page d'accueil
- **WHEN** l'utilisateur saisit 20 puis clique sur « Commencer »
- **THEN** une partie de 20 cartes commence

#### Scenario: Nombre hors bornes
- **GIVEN** un paquet de 67 cartes
- **WHEN** l'utilisateur saisit 200 puis clique sur « Commencer »
- **THEN** une partie de 67 cartes commence

### Requirement: Tirage des cartes
Les cartes d'un entraînement SHALL être tirées au hasard dans tout le paquet, toutes différentes, dans un ordre aléatoire. Chaque partie MUST contenir au moins 1 carte Piège ; si le tirage n'en contient aucune, une carte tirée au hasard SHALL être remplacée par un piège tiré au hasard, à une position aléatoire.

#### Scenario: Au moins un piège
- **GIVEN** de nombreuses parties d'entraînement de 10 cartes
- **WHEN** on compte les pièges de chaque partie
- **THEN** chaque partie en contient au moins 1

#### Scenario: Une seule carte
- **GIVEN** un entraînement de 1 carte
- **WHEN** la partie commence
- **THEN** la carte est un piège

### Requirement: Tour d'entraînement
Chaque carte SHALL se jouer comme en groupe : carte face cachée à toucher pour la retourner, choix d'une région du Venn modifiable jusqu'à « Valider », puis correction (verdict, région choisie, bonne région mise en évidence, explication ciblée et explication générale, référence au Scrum Guide 2020), selon les mêmes règles de verdict que la partie en groupe (voir `card-deck`). Il n'y a pas de chrono. Après la correction, un bouton « Carte suivante » SHALL passer à la carte suivante ; après la dernière carte, il SHALL devenir « Voir les résultats ». L'écran SHALL indiquer la progression (« Carte 3 sur 10 ») et le score en cours. Un lien « Arrêter » SHALL permettre, après confirmation, d'afficher les résultats des cartes déjà jouées.

#### Scenario: Correction d'une carte
- **GIVEN** un entraînement en cours, avec la carte « Dimensionner les éléments du Product Backlog » retournée
- **WHEN** l'utilisateur la place dans Product Owner et clique sur « Valider »
- **THEN** la correction affiche « Faux », la bonne région Developers et l'explication ciblée pour Product Owner, puis le bouton « Carte suivante »

#### Scenario: Dernière carte
- **GIVEN** la correction de la dernière carte affichée
- **WHEN** l'utilisateur clique sur « Voir les résultats »
- **THEN** l'écran de fin s'affiche

#### Scenario: Arrêt anticipé
- **GIVEN** un entraînement de 10 cartes dont 4 ont été jouées
- **WHEN** l'utilisateur clique sur « Arrêter » et confirme
- **THEN** l'écran de fin affiche les résultats des 4 cartes jouées

### Requirement: Fin d'un entraînement
L'écran de fin SHALL afficher le pourcentage de bonnes réponses (1 point par carte juste, 0,5 par carte partielle), le nombre de cartes justes, partielles et fausses, et le récapitulatif des cartes partielles et fausses avec la région choisie, la bonne région et l'explication, comme en groupe, sans podium. Il SHALL proposer « Rejouer mes erreurs » s'il y a au moins une carte partielle ou fausse, « Nouvel entraînement » et un retour à l'accueil. « Rejouer mes erreurs » SHALL lancer un entraînement composé uniquement des cartes partielles et fausses de la partie qui vient de se terminer, dans un ordre mélangé, sans ajouter de piège.

#### Scenario: Rejouer mes erreurs
- **GIVEN** un entraînement terminé avec 3 cartes fausses et 1 partielle
- **WHEN** l'utilisateur clique sur « Rejouer mes erreurs »
- **THEN** un entraînement de ces 4 cartes commence

#### Scenario: Sans erreur
- **GIVEN** un entraînement terminé sans carte fausse ni partielle
- **WHEN** l'écran de fin s'affiche
- **THEN** il affiche « Aucune erreur, bravo ! » et ne propose pas « Rejouer mes erreurs »

### Requirement: Entraînement local
L'entraînement SHALL se dérouler entièrement dans le navigateur : il MUST NOT écrire dans le service temps réel ni dans le stockage du navigateur. Recharger la page SHALL ramener à l'accueil, sans reprendre l'entraînement en cours.

#### Scenario: Rechargement
- **GIVEN** un entraînement en cours
- **WHEN** l'utilisateur recharge la page
- **THEN** la page d'accueil s'affiche
