## ADDED Requirements

### Requirement: Points par carte
Chaque carte jouée SHALL rapporter 1 point si elle est « Juste », 0,5 point si elle est « Partiel » et 0 point si elle est « Faux ». Le pourcentage d'un participant SHALL être la somme de ses points divisée par le nombre de cartes qu'il a jouées. Une carte passée avec « Passer son tour » MUST NOT être comptée.

#### Scenario: Pourcentage individuel
- **GIVEN** Julie qui a joué 4 cartes : 2 justes, 1 partielle, 1 fausse
- **WHEN** son pourcentage est calculé
- **THEN** il vaut 62,5 %

### Requirement: Score collectif
Pendant la partie et à la fin, le jeu SHALL afficher le score collectif : le total des points de tous les participants divisé par le nombre de cartes jouées, en pourcentage arrondi à l'entier, ainsi que le nombre de cartes justes, partielles et fausses.

#### Scenario: Score de l'équipe
- **GIVEN** 20 cartes jouées : 14 justes, 2 partielles, 4 fausses
- **WHEN** le score collectif s'affiche
- **THEN** il indique 75 %, avec 14 justes, 2 partielles et 4 fausses

### Requirement: Podium
À la fin de la partie, l'écran projeté SHALL afficher un podium des trois meilleurs pourcentages individuels. Les ex aequo SHALL partager la même marche, sans départage. Un participant qui n'a joué aucune carte MUST NOT figurer au podium. Chaque téléphone SHALL afficher le pourcentage de son participant et le score collectif.

#### Scenario: Ex aequo
- **GIVEN** Julie et Marc à 80 %, Inès à 60 %, Paul à 40 %
- **WHEN** le podium s'affiche
- **THEN** Julie et Marc sont tous les deux sur la première marche, et Inès sur la deuxième

### Requirement: Récapitulatif des erreurs
L'écran de fin SHALL lister les cartes partielles et fausses, dans l'ordre où elles ont été jouées, avec pour chacune le texte de la carte, le prénom du joueur, la région choisie, la bonne région et l'explication (voir `card-deck`). Si aucune carte n'est fausse ni partielle, l'écran SHALL l'indiquer par un message de félicitations.

#### Scenario: Revue des erreurs
- **GIVEN** une partie terminée où Marc a placé « Assigner les tâches aux Developers » dans Scrum Master
- **WHEN** le formateur affiche les résultats
- **THEN** la carte figure dans le récapitulatif avec « Marc », « Scrum Master », la bonne région « Piège » et l'explication ciblée pour Scrum Master

#### Scenario: Sans faute
- **GIVEN** une partie terminée sans carte fausse ni partielle
- **WHEN** l'écran de fin s'affiche
- **THEN** il affiche « Aucune erreur, bravo à toute l'équipe ! » à la place du récapitulatif
