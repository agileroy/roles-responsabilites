# Game Turn Specification

## Purpose
Déroulé d'un tour : joueur actif, carte face cachée à retourner, placement dans le Venn, chrono, correction affichée à tous et passage à la carte suivante. Couvre `site/js/game-store.js`, `site/js/ui.js`, `site/js/venn.js` et les règles `rolesGame/rooms/{code}/turn` de `database.rules.json`.

## Requirements

### Requirement: Joueur actif
À chaque tour, le jeu SHALL désigner le joueur actif en suivant l'ordre de passage, en sautant les participants qui n'ont plus de cartes à jouer ou qui ont été retirés. Tous les écrans SHALL afficher son prénom (« À Julie de jouer »), et son téléphone SHALL indiquer clairement « À vous de jouer ! ». Un tour complet correspond au passage de tous les participants qui ont encore des cartes.

#### Scenario: Tour de Julie
- **GIVEN** une partie dont l'ordre de passage est Julie, Marc, Inès
- **WHEN** le premier tour commence
- **THEN** le téléphone de Julie affiche « À vous de jouer ! », et l'écran projeté et les téléphones de Marc et Inès affichent « À Julie de jouer »

### Requirement: Pioche
Avant la pioche, tous les écrans SHALL montrer une carte face cachée. Le joueur actif SHALL piocher en touchant cette carte sur son téléphone (accessible aussi au clavier, avec le libellé « Retourner la carte ») ; pour les autres, la carte face cachée MUST NOT être cliquable. La carte piochée SHALL être la carte suivante de la main du joueur actif (voir `game-room`, « Lancement et tirage »), et les règles de sécurité MUST refuser toute autre carte. Elle SHALL se retourner avec une animation en même temps sur l'écran projeté et sur tous les téléphones. Si l'utilisateur a demandé de réduire les animations, la carte SHALL s'afficher directement, sans rotation.

#### Scenario: Carte retournée
- **GIVEN** Julie, joueuse active, devant la carte face cachée
- **WHEN** elle touche la carte
- **THEN** la carte se retourne et la carte suivante de sa main s'affiche sur tous les écrans

#### Scenario: Carte d'un autre joueur
- **GIVEN** Julie, joueuse active
- **WHEN** Marc touche la carte face cachée sur son téléphone
- **THEN** rien ne se passe, et la carte indique « Julie va retourner la carte »

### Requirement: Placement dans le Venn
Le joueur actif SHALL choisir une région en la touchant sur le diagramme de Venn de son téléphone ; la région choisie SHALL être mise en évidence, et il SHALL pouvoir changer d'avis tant qu'il n'a pas confirmé. Chaque région SHALL offrir une zone tactile d'au moins 44 × 44 px sur un écran de 360 px de large. Un bouton « Valider » SHALL confirmer le placement ; le placement validé MUST être définitif. Seul le joueur actif MUST pouvoir placer la carte, y compris du point de vue des règles de sécurité de la base. Avant la validation, l'écran projeté et les autres téléphones SHALL afficher la région en cours de sélection, pour que tout le monde suive son hésitation.

#### Scenario: Placement en direct
- **GIVEN** Julie, joueuse active, avec sa carte piochée
- **WHEN** elle touche la région Product Owner
- **THEN** la région Product Owner est mise en évidence sur son téléphone, sur l'écran projeté et chez les autres participants

#### Scenario: Changement d'avis
- **GIVEN** Julie qui a touché la région Scrum Master sans valider
- **WHEN** elle touche la région Product Owner puis « Valider »
- **THEN** la carte est placée dans Product Owner

#### Scenario: Placement par un autre joueur
- **GIVEN** Julie, joueuse active
- **WHEN** le navigateur de Marc tente d'écrire un placement pour la carte de Julie
- **THEN** la base refuse l'écriture

### Requirement: Chrono
Si le formateur a activé le chrono, un compte à rebours SHALL démarrer dès la pioche et s'afficher sur tous les écrans. Les 5 dernières secondes SHALL être mises en évidence. À zéro, si le joueur n'a pas validé, la carte SHALL être comptée « Faux » avec la mention « Temps écoulé », et la correction s'afficher comme pour un placement. Une région sélectionnée mais non validée MUST NOT être prise en compte. Sans chrono, aucun compte à rebours ne s'affiche.

#### Scenario: Temps écoulé
- **GIVEN** une partie avec un chrono de 30 secondes, et Julie qui a pioché sans valider
- **WHEN** 30 secondes se sont écoulées
- **THEN** la carte est comptée « Faux » avec la mention « Temps écoulé », et la correction s'affiche

### Requirement: Correction à chaque carte
Dès la validation, ou à la fin du chrono, la correction SHALL s'afficher en même temps sur l'écran projeté et sur tous les téléphones : verdict (« Juste », « Partiel » ou « Faux »), région choisie, bonne région mise en évidence sur le Venn, et explication (voir `card-deck`). Le score collectif en cours SHALL être mis à jour. Le téléphone du joueur actif SHALL vibrer brièvement (au plus 200 ms) si le navigateur le permet.

#### Scenario: Correction pour toute la salle
- **GIVEN** Julie qui a validé la carte « Dimensionner les éléments du Product Backlog » dans Product Owner
- **WHEN** la correction s'affiche
- **THEN** tout le monde voit « Faux », la région Developers mise en évidence et l'explication ciblée pour Product Owner

### Requirement: Passage à la carte suivante
Après la correction, seul le formateur SHALL pouvoir passer au joueur suivant, avec « Carte suivante », pour laisser le temps à la discussion. Après la dernière carte, ce bouton SHALL devenir « Voir les résultats ». Le formateur SHALL pouvoir passer le tour d'un joueur déconnecté ou qui ne répond pas, avant la pioche ou avant la validation (« Passer son tour ») : la carte éventuellement piochée reste dans la main du joueur, qui la retrouvera à son prochain tour ; il garde son nombre de cartes restantes et rejoue au tour complet suivant. Le formateur SHALL pouvoir terminer la partie à tout moment (« Terminer la partie »), après confirmation, et afficher les résultats des cartes déjà jouées.

#### Scenario: Carte suivante
- **GIVEN** la correction de la carte de Julie affichée
- **WHEN** le formateur clique sur « Carte suivante »
- **THEN** c'est au tour de Marc, et les téléphones affichent « À Marc de jouer »

#### Scenario: Joueur absent
- **GIVEN** Marc, joueur actif, déconnecté, qui a retourné la carte « Ordonner les éléments du Product Backlog »
- **WHEN** le formateur clique sur « Passer son tour »
- **THEN** c'est au tour d'Inès, qui pioche dans sa propre main, et Marc retrouvera « Ordonner les éléments du Product Backlog » à son prochain tour

#### Scenario: Pas de bouton pour les participants
- **GIVEN** la correction affichée
- **WHEN** Julie regarde son téléphone
- **THEN** elle ne voit aucun bouton « Carte suivante »
