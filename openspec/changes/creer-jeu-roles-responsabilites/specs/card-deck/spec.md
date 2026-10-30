## ADDED Requirements

### Requirement: Régions du diagramme de Venn
Le jeu SHALL proposer huit régions : trois cercles qui se chevauchent, « Product Owner », « Scrum Master » et « Developers », ce qui donne les régions Product Owner seul, Scrum Master seul, Developers seuls, Product Owner + Scrum Master, Product Owner + Developers, Scrum Master + Developers et le centre « Scrum Team » ; et, à part, sous les cercles, une zone « Piège ». Chaque région SHALL correspondre à un ensemble d'accountabilities : la région Product Owner + Developers à {Product Owner, Developers}, le centre à {Product Owner, Scrum Master, Developers}, la zone Piège à l'ensemble vide. Le vocabulaire SHALL être celui du Scrum Guide 2020.

#### Scenario: Plateau affiché
- **GIVEN** une partie en cours
- **WHEN** le plateau s'affiche
- **THEN** on voit les trois cercles nommés, leurs intersections, le centre « Scrum Team » et la zone « Piège » sous les cercles

### Requirement: Paquet de cartes
Le paquet SHALL être un fichier JSON du site (`site/data/cards.json`). Chaque carte SHALL avoir un identifiant unique, un texte, une bonne région, une explication générale fondée sur le Scrum Guide 2020, la section du guide concernée et, facultativement, des explications ciblées par mauvaise région. Les tests automatiques MUST refuser un paquet dont une carte a un identifiant en double, une région inconnue, un texte ou une explication vide, ou une explication ciblée pour sa propre bonne région.

#### Scenario: Paquet invalide
- **GIVEN** un paquet où deux cartes ont le même identifiant
- **WHEN** les tests automatiques s'exécutent
- **THEN** un test échoue et le site n'est pas publié

### Requirement: Verdict d'un placement
Le verdict d'un placement SHALL être calculé à partir des ensembles d'accountabilities de la région choisie et de la bonne région :
- « Juste » si la région choisie est la bonne région ; une carte dont la bonne région est le centre « Scrum Team » est donc juste seulement au centre ;
- « Partiel » si les deux ensembles ont au moins une accountability en commun sans être identiques ;
- « Faux » sinon, et en particulier dès que l'une des deux régions est la zone Piège et pas l'autre.
Une carte non placée à la fin du chrono SHALL avoir le verdict « Faux ».

#### Scenario: Placement exact
- **GIVEN** la carte « Discuter des compromis lors du dimensionnement des éléments du Product Backlog », bonne région Product Owner + Developers
- **WHEN** le joueur la place dans Product Owner + Developers
- **THEN** le verdict est « Juste »

#### Scenario: Placement incomplet
- **GIVEN** la carte « Discuter des compromis lors du dimensionnement des éléments du Product Backlog », bonne région Product Owner + Developers
- **WHEN** le joueur la place dans Product Owner seul
- **THEN** le verdict est « Partiel »

#### Scenario: Responsabilité individuelle placée au centre
- **GIVEN** la carte « Ordonner les éléments du Product Backlog », bonne région Product Owner
- **WHEN** le joueur la place au centre « Scrum Team »
- **THEN** le verdict est « Partiel »

#### Scenario: Piège attribué à un rôle
- **GIVEN** la carte « Assigner les tâches aux Developers », bonne région Piège
- **WHEN** le joueur la place dans Scrum Master
- **THEN** le verdict est « Faux »

#### Scenario: Responsabilité réelle mise au piège
- **GIVEN** la carte « Annuler le Sprint si le Sprint Goal devient obsolète », bonne région Product Owner
- **WHEN** le joueur la place dans la zone Piège
- **THEN** le verdict est « Faux »

### Requirement: Explication de la correction
Après chaque placement, la correction SHALL afficher la bonne région, le verdict, et une explication : l'explication ciblée de la région choisie si la carte en a une, sinon l'explication générale. L'explication générale et la section du Scrum Guide SHALL toujours être affichées en complément quand une explication ciblée est montrée.

#### Scenario: Erreur avec explication ciblée
- **GIVEN** la carte « Dimensionner les éléments du Product Backlog », bonne région Developers, avec une explication ciblée pour Product Owner
- **WHEN** le joueur la place dans Product Owner
- **THEN** la correction affiche « Faux », la bonne région Developers, l'explication ciblée pour Product Owner, puis l'explication générale et la référence « Product Backlog »

#### Scenario: Erreur sans explication ciblée
- **GIVEN** une carte sans explication ciblée pour la région Scrum Master
- **WHEN** le joueur la place dans Scrum Master
- **THEN** la correction affiche l'explication générale et la référence au Scrum Guide

#### Scenario: Affinage placé dans Product Owner + Developers
- **GIVEN** la carte « Affiner le Product Backlog », bonne région Scrum Team
- **WHEN** le joueur la place dans Product Owner + Developers
- **THEN** le verdict est « Partiel »

### Requirement: Typographie française
À l'affichage, le texte des cartes et des explications SHALL utiliser une espace insécable avant « : », « ; », « ! » et « ? » et à l'intérieur des guillemets « », pour éviter un retour à la ligne isolant la ponctuation. Le fichier JSON MAY contenir des espaces ordinaires ; la conversion SHALL être faite par la logique d'affichage et testée.

#### Scenario: Deux-points en fin de ligne
- **GIVEN** une explication contenant « Ce n'est pas un piège : … »
- **WHEN** elle s'affiche sur un téléphone de 360 px
- **THEN** les deux-points ne sont jamais seuls en début de ligne

### Requirement: Vue de relecture du paquet
Un script (`node tools/cards-review.mjs`) SHALL générer `docs/cartes.md`, une vue lisible du paquet regroupée par bonne région, avec pour chaque carte son texte, son explication, sa référence et ses explications ciblées.

#### Scenario: Relecture
- **GIVEN** une carte modifiée dans `site/data/cards.json`
- **WHEN** l'auteur lance le script
- **THEN** `docs/cartes.md` reflète la modification
