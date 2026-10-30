# Site Publication Specification

## Purpose
Publication sur GitHub Pages, interface (langue, appareils, thème), connexion au service temps réel, règles de sécurité partagées et encart dans la boîte à outils.

## Requirements

### Requirement: Publication automatique
Le site SHALL être publié sur GitHub Pages, à l'adresse https://agileroy.github.io/roles-responsabilites/, à chaque push sur `main`. Les tests automatiques SHALL être lancés avant la publication, et la publication MUST NOT avoir lieu si un test échoue. Les tests SHALL aussi être lancés sur chaque pull request, sans publication.

#### Scenario: Test en échec
- **GIVEN** un push sur `main` qui casse un test
- **WHEN** le workflow GitHub Actions s'exécute
- **THEN** le job de tests échoue et le site publié reste la version précédente

### Requirement: Interface et appareils
L'interface SHALL être en français. L'écran du formateur SHALL être conçu pour être projeté (lisible à distance sur un écran de 1280 px et plus, Venn occupant l'essentiel de la hauteur). L'écran des participants SHALL être utilisable sur téléphone (largeur de 360 px et plus) sans défilement horizontal. Les deux SHALL fonctionner en thème clair et en thème sombre, avec un bouton de bascule mémorisé dans le navigateur, comme dans les autres outils de l'auteur. Le site MUST NOT afficher de publicité ni charger de traceur.

#### Scenario: Participant sur téléphone
- **GIVEN** un téléphone de 390 px de large
- **WHEN** Julie est joueuse active
- **THEN** la carte, le Venn et le bouton « Valider » tiennent dans l'écran sans défilement horizontal

### Requirement: Connexion au service temps réel
Le site SHALL n'utiliser que des connexions HTTPS (port 443) vers Firebase. Si la connexion est perdue, l'écran SHALL afficher « Connexion perdue, reconnexion… » et reprendre automatiquement à son retour, sans recharger la page.

#### Scenario: Coupure réseau
- **GIVEN** un participant dans une partie
- **WHEN** sa connexion est coupée puis rétablie
- **THEN** le message de connexion perdue s'affiche pendant la coupure, puis la partie se met à jour

### Requirement: Règles de sécurité partagées
Les règles de sécurité SHALL être versionnées dans `database.rules.json` et identiques dans les cinq dépôts qui partagent la base (`roles-responsabilites`, `poker-planning`, `matrice-competences`, `wheel-of-chance`, `moving-motivators`). Ce jeu MUST n'écrire et ne lire que sous la branche `rolesGame`, et l'ajout de cette branche MUST NOT modifier les règles des autres outils. Les règles MUST imposer : seul le formateur d'une salle modifie ses réglages, lance la partie, fait avancer les tours et retire des participants ; un participant n'écrit que sa propre fiche ; seul le joueur actif place la carte du tour, avec une région valide ; une salle n'est supprimée que par son formateur, ou par n'importe qui au-delà de 24 heures.

#### Scenario: Écriture hors de sa salle
- **GIVEN** Marc, participant de la salle « KZTR »
- **WHEN** son navigateur tente de modifier les réglages de la salle
- **THEN** la base refuse l'écriture

### Requirement: Encart dans la boîte à outils
La page https://agileroy.github.io/outils/ SHALL comporter une nouvelle section « En formation », décrite comme « Jeux ludiques pour les formations Scrum », contenant une carte « Rôles et responsabilités » avec une courte description, des étiquettes et un lien « Ouvrir » vers le jeu, sur le même modèle que les cartes existantes. Le compteur d'outils en bas de page SHALL être mis à jour.

#### Scenario: Accès depuis la boîte à outils
- **GIVEN** la page de la boîte à outils
- **WHEN** l'utilisateur clique sur la carte « Rôles et responsabilités »
- **THEN** le jeu s'ouvre dans un nouvel onglet
