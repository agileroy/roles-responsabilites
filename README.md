# roles-responsabilites

Jeu de formation PSM / PSPO sur les rôles et responsabilités de Scrum, en temps réel et sans publicité.

**Site : https://agileroy.github.io/roles-responsabilites/**

## Fonctionnement

- Le **formateur** crée une partie sur l'écran projeté : un **code de salle** à 4 lettres et un **QR code** s'affichent. Il anime, il ne joue pas.
- Les **participants** (10 au maximum) rejoignent depuis leur téléphone, avec le QR code ou le code, et saisissent un prénom unique dans la salle. Pas de compte.
- Avant de lancer, le formateur règle le **nombre de cartes par personne** (5 par défaut, à saisir au clavier ou avec − et +, dans la limite du maximum possible) et un **chrono** facultatif (30, 45 ou 60 secondes).
- **Tour par tour**, le joueur actif retourne une carte face cachée et la place dans le **diagramme de Venn** : Product Owner, Scrum Master, Developers, leurs intersections, le centre « Scrum Team », ou la zone **Piège** (responsabilité qui n'existe pas dans Scrum). Tout le monde voit son hésitation en direct.
- **Correction immédiate** pour toute la salle : juste, partiel ou faux, avec une explication tirée du Scrum Guide 2020, ciblée selon l'erreur commise. Le formateur passe à la carte suivante quand la discussion est terminée.
- Verdict : juste si la région est exacte ; partiel si le choix est incomplet (par exemple « Product Owner » pour une carte « Scrum Team ») ; faux sinon, et en particulier dès qu'il y a un rôle en trop (« Scrum Team » pour une carte « Product Owner ») ou entre la zone Piège et un rôle. Tout placer au centre ne rapporte donc rien.
- **Arrivée tardive** : le retardataire pioche autant de cartes qu'il en reste aux autres, dans la limite du paquet ; sinon il suit en spectateur.
- Le formateur peut **passer le tour** d'un joueur absent (la carte retourne dans le paquet), **retirer** un participant et **terminer** la partie à tout moment.
- **Fin de partie** : score de l'équipe, podium des trois meilleurs pourcentages (1 point par carte juste, 0,5 par carte partielle) et récapitulatif des erreurs avec leurs explications.
- Les salles sont **supprimées au bout de 24 heures** (par le navigateur du prochain formateur qui crée une partie), ou à tout moment par leur formateur.

## Paquet de cartes

Le paquet est dans [`site/data/cards.json`](site/data/cards.json) : pour chaque carte, son texte, sa bonne région (`po`, `sm`, `dev`, `po-sm`, `po-dev`, `sm-dev`, `team` ou `trap`), une explication générale, la section du Scrum Guide 2020, et des explications ciblées par mauvaise région (`errors`). Vocabulaire : traduction française officielle du Scrum Guide, avec « Product Goal », « Sprint Goal » et « refinement » gardés en anglais.

Après une modification, `npm run cartes` régénère [`docs/cartes.md`](docs/cartes.md), la vue de relecture ; `npm test` vérifie le format du paquet.

## Réseau d'entreprise

Le VPN de l'entreprise (proxy Zscaler) bloque GitHub Pages et Firebase : jouer hors VPN, et faire rejoindre les participants bloqués depuis leur téléphone avec le QR code.

## Architecture

Site statique (HTML/CSS/JavaScript, sans build) publié sur GitHub Pages ; l'état partagé des salles est dans Firebase Realtime Database (connexion anonyme), sous la branche `rolesGame`.

- `site/js/game-core.js` : logique métier pure (verdict, explications, tirage, joueur suivant, retardataires, scores, podium), testée avec Node.js ;
- `site/js/game-store.js` : actions de la partie et réactions automatiques du navigateur du formateur (révéler une carte, admettre un retardataire) ;
- `site/js/firebase-db.js` : seul module qui parle à Firebase ;
- `site/js/memory-db.js` : base en mémoire de même interface, pour les tests de parcours et le **mode démo** (`?demo` dans l'adresse : les onglets d'un même navigateur partagent une partie, sans Firebase) ;
- `site/js/venn.js` : diagramme de Venn en SVG ; `site/js/ui.js` : interface ; `site/js/app.js` : point d'entrée ;
- `site/vendor/` : générateur de QR code `qrcode-generator` 1.4.4 (licence MIT) ;
- `database.rules.json` : règles de sécurité de la base, **partagées** avec [poker-planning](https://github.com/agileroy/poker-planning), [matrice-competences](https://github.com/agileroy/matrice-competences), [wheel-of-chance](https://github.com/agileroy/wheel-of-chance) et [moving-motivators](https://github.com/agileroy/moving-motivators) : garder ce fichier identique dans les cinq dépôts, et le publier dans la console Firebase après chaque modification.

## Développement

```sh
npm test                                          # logique métier, paquet de cartes, parcours de partie, règles
npm run cartes                                    # régénère docs/cartes.md
python3 -m http.server 8765 --directory site      # puis http://localhost:8765/?demo
```

Chaque push sur `main` lance les tests puis publie `site/` sur GitHub Pages ; un test en échec bloque la publication.

## Méthode

Le projet suit le développement piloté par les spécifications avec [OpenSpec](https://github.com/Fission-AI/OpenSpec) : `openspec/specs/` décrit le comportement attendu, `openspec/changes/` les changements en cours. Commandes Claude Code : `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
