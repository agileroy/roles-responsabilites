## Why

Le jeu ne se joue aujourd'hui qu'en groupe, avec un formateur. Un mode d'entraînement seul permet de réviser les accountabilities avant l'examen PSM ou PSPO, ou de prolonger la formation : chacun rejoue à son rythme, avec la même correction fondée sur le Scrum Guide 2020.

## What Changes

- Sur l'accueil, une troisième carte **« S'entraîner seul »**, avec le **nombre de cartes** (10 par défaut, modifiable au clavier de 1 à la taille du paquet) et un bouton « Commencer ».
- Les cartes sont **tirées au hasard dans tout le paquet**, avec **au moins 1 piège** par partie.
- Même mécanique qu'en groupe : carte face cachée à retourner, placement dans le Venn, « Valider », correction avec explication ciblée ; le joueur passe lui-même à la carte suivante. **Pas de chrono.**
- **Fin de partie** : score, nombre de cartes justes, partielles et fausses, récapitulatif des erreurs avec leurs explications, et un bouton **« Rejouer mes erreurs »** qui relance une partie avec uniquement les cartes partielles et fausses.
- Tout se passe **dans le navigateur, sans Firebase** : aucune règle de sécurité à modifier, et **rien n'est conservé** d'une session à l'autre.

Hors périmètre : chrono, mémoire entre les sessions (meilleur score, cartes jamais réussies), choix des types de cartes.

## Capabilities

### New Capabilities

- `solo-training` : lancement depuis l'accueil, tirage des cartes, tour de jeu sans formateur, fin de partie et « Rejouer mes erreurs ».

### Modified Capabilities

_Aucune._

## Impact

- `site/js/game-core.js` (tirage d'une partie d'entraînement), `site/js/ui.js` et `site/index.html` (carte d'accueil, écran de partie et de fin réutilisés en mode seul), `site/app.css`, tests, `README.md`.
- Aucun changement de `database.rules.json`.
