## MODIFIED Requirements

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
