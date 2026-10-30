## MODIFIED Requirements

### Requirement: Réglages de la partie
Avant le lancement, le formateur SHALL choisir le nombre de cartes par personne et le chrono (sans chrono, 30, 45 ou 60 secondes ; sans chrono par défaut). Le nombre de cartes par personne SHALL aller de 1 au maximum possible : le plus grand nombre de cartes par personne qui permet de distribuer les mains de tous les participants, chacune avec exactement 1 piège à partir de 2 cartes (voir « Lancement et tirage ») ; 1 carte par personne reste toujours possible tant que le paquet compte au moins une carte par participant. Il SHALL valoir 5 par défaut (ou le maximum s'il est plus petit) et être ramené au nouveau maximum si un participant arrive. Le formateur SHALL pouvoir le changer avec les boutons − et +, ou en saisissant le nombre au clavier : la saisie est appliquée quand il valide (Entrée) ou quitte le champ, et une valeur hors bornes est ramenée dans [1, maximum]. Le bouton « Lancer la partie » SHALL être désactivé tant qu'aucun participant n'est présent.

#### Scenario: Valeur par défaut
- **GIVEN** un paquet de 67 cartes dont 16 pièges, et 4 participants présents
- **WHEN** le formateur ouvre les réglages
- **THEN** le nombre de cartes par personne vaut 5, avec un maximum de 13

#### Scenario: Maximum
- **GIVEN** un paquet de 67 cartes dont 16 pièges, et 10 participants présents
- **WHEN** le formateur ouvre les réglages
- **THEN** le nombre de cartes par personne vaut 5 et ne peut pas dépasser 6

#### Scenario: Saisie au clavier
- **GIVEN** un paquet de 67 cartes dont 16 pièges, et 4 participants présents
- **WHEN** le formateur saisit 12 dans le champ puis appuie sur Entrée
- **THEN** le nombre de cartes par personne vaut 12 pour tout le monde

#### Scenario: Saisie hors bornes
- **GIVEN** un paquet de 67 cartes dont 16 pièges, et 4 participants présents
- **WHEN** le formateur saisit 40 puis quitte le champ
- **THEN** le nombre de cartes par personne est ramené à 13

#### Scenario: Ajustement à l'arrivée d'un participant
- **GIVEN** un paquet de 67 cartes dont 16 pièges, 7 participants et le réglage à 8 cartes par personne
- **WHEN** un huitième participant arrive
- **THEN** le réglage est ramené à 7 cartes par personne

### Requirement: Lancement et tirage
Au lancement, le jeu SHALL figer l'ordre de passage des participants présents, tiré au hasard, et distribuer à chacun une main d'autant de cartes que le réglage. À partir de 2 cartes par personne, chaque main MUST contenir exactement 1 carte Piège, les autres cartes n'étant pas des pièges ; l'ordre des cartes de chaque main SHALL être mélangé, pour que la position du piège varie d'un participant à l'autre. Avec 1 carte par personne, chaque main SHALL être une carte tirée au hasard dans tout le paquet. Chaque participant SHALL piocher dans sa propre main, dans l'ordre. Toutes les cartes distribuées pendant une partie MUST être différentes. Chaque participant présent au lancement SHALL piocher exactement le nombre de cartes réglé, sauf s'il quitte la partie. L'interface et les explications MUST NOT révéler aux participants qu'ils ont un piège par main.

#### Scenario: Cartes différentes
- **GIVEN** une partie de 4 participants à 5 cartes chacun
- **WHEN** la partie se termine
- **THEN** 20 cartes différentes ont été jouées, 5 par participant

#### Scenario: Un piège par personne
- **GIVEN** une partie de 4 participants à 5 cartes chacun
- **WHEN** la partie se termine
- **THEN** chaque participant a joué exactement 1 carte Piège et 4 cartes qui n'en sont pas

#### Scenario: Position du piège
- **GIVEN** de nombreuses parties de 4 participants à 5 cartes chacun
- **WHEN** on relève à quel rang chacun a pioché son piège
- **THEN** le piège apparaît à chacun des rangs 1 à 5

#### Scenario: Une seule carte par personne
- **GIVEN** une partie de 3 participants à 1 carte chacun
- **WHEN** le jeu distribue les mains
- **THEN** chacun reçoit une carte tirée au hasard dans tout le paquet, piège ou non

#### Scenario: Règle discrète
- **GIVEN** une partie en cours
- **WHEN** un participant regarde son téléphone ou l'écran projeté
- **THEN** aucun texte n'indique combien de pièges contient sa main

### Requirement: Arrivée tardive
Un participant qui rejoint une partie déjà lancée SHALL être ajouté à la fin de l'ordre de passage. Son nombre de cartes SHALL être égal au nombre de tours restant aux autres participants au moment de son arrivée, c'est-à-dire le nombre de cartes réglé moins le nombre de tours complets déjà joués, et limité par les cartes encore non distribuées. Sa main SHALL être prise parmi ces cartes, avec exactement 1 piège à partir de 2 cartes, comme au lancement ; s'il ne reste plus de piège ou plus assez de cartes non piège, sa main SHALL être complétée avec les cartes disponibles. S'il ne reste aucune carte, il SHALL rejoindre en spectateur, avec un message qui l'explique. Il MUST NOT rejoindre une salle déjà pleine ni une partie terminée.

#### Scenario: Retardataire
- **GIVEN** une partie à 5 cartes par personne dont 2 tours complets ont été joués
- **WHEN** Marc rejoint la salle
- **THEN** Marc jouera 3 cartes, dont exactement 1 piège, en dernier dans l'ordre de passage

#### Scenario: Paquet épuisé
- **GIVEN** une partie dont toutes les cartes ont été distribuées
- **WHEN** Marc rejoint la salle
- **THEN** Marc suit la partie en spectateur, avec le message « Plus assez de cartes pour vous faire jouer : vous suivez la partie en spectateur »
