## Why

« Rôles et responsabilités » partage aujourd'hui un projet Firebase avec 6 autres outils. Sur l'offre gratuite (Spark), une Realtime Database accepte au plus 100 connexions simultanées, réparties entre tous ces outils : une formation qui tombe en même temps qu'un autre atelier peut saturer la base, et les nouveaux arrivants ne se connectent alors plus, sans message clair. Le fichier de règles commun doit en plus être recopié dans chaque dépôt et publié à la main, et une erreur dans la branche d'un outil peut casser les autres.

Deuxième outil déplacé, sur le modèle de Fournée (`scrum-increment`, changement `projet-firebase-dedie`).

## What Changes

- **Projet Firebase dédié** au jeu (`roles-responsabilites-vleroy` : Realtime Database en europe-west1, connexion anonyme, domaine `agileroy.github.io` autorisé), créé par l'auteur ; `site/js/firebase-config.js` pointe vers ce projet.
- **Règles propres au jeu** : `database.rules.json` ne contient plus que la branche `rolesGame` (inchangée) ; il n'est plus recopié dans les autres dépôts.
- **Déploiement automatique des règles** : à chaque push sur `main`, après les tests, GitHub Actions publie les règles avec Firebase CLI et le compte de service du secret `FIREBASE_SERVICE_ACCOUNT` ; le site n'est publié qu'après les règles.
- **Projet partagé** : la branche `rolesGame` est retirée du fichier commun des autres dépôts, une fois le jeu en service sur son projet.

Aucune donnée à migrer : les salles expirent après 24 heures. La bascule se fait hors séance.

Hors périmètre : autres outils, offre payante.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `site-publication` : la base n'est plus partagée ; règles propres au jeu, déployées automatiquement après les tests.

## Impact

- Ce dépôt : `site/js/firebase-config.js`, `database.rules.json`, `firebase.json` et `.firebaserc` (nouveaux), `.github/workflows/pages.yml`, `tests/rules.test.mjs`, `README.md`, `openspec/config.yaml`.
- Dépôts qui partagent encore la base (`poker-planning`, `matrice-competences`, `wheel-of-chance`, `moving-motivators`, `scrum-events`, `roti`) : branche `rolesGame` retirée de `database.rules.json`.
- Actions manuelles de l'auteur : créer le projet (base, connexion anonyme **activée**, domaine autorisé, appli Web), créer le secret `FIREBASE_SERVICE_ACCOUNT`, puis publier le fichier commun allégé dans la console du projet partagé.
