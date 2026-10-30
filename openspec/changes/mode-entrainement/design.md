## Context

La partie en groupe repose sur une salle Firebase, un formateur dont le navigateur calcule le verdict, et des écrans pilotés par l'état de la salle. Un entraînement seul n'a besoin d'aucun de ces éléments : un seul navigateur suffit, et toute la logique utile (verdict, explications, scores, récapitulatif) est déjà pure dans `game-core.js`.

## Goals / Non-Goals

**Goals:**
- Réutiliser l'écran de partie (carte à retourner, Venn, correction) et l'écran de fin, pour une expérience identique à la partie en groupe.
- Ne rien changer au mode groupe ni aux règles Firebase.

**Non-Goals:**
- Chrono, mémoire entre les sessions, filtres de cartes.

## Decisions

- **État local** : une session d'entraînement est un objet en mémoire dans `ui.js` (`{ cardIds, index, flipped, selection, results }`), sans `game-store` ni base. Les résultats ont la même forme que ceux d'une salle (`{ playerUid, cardId, region, verdict }`, indexés par numéro), ce qui permet de réutiliser `teamScore`, `mistakes` et le rendu du récapitulatif.
- **Tirage** : `drawTrainingDeck(cards, count, random)` dans `game-core.js` : mélange du paquet, `count` premières cartes ; s'il n'y a aucun piège, une carte au hasard est remplacée par un piège au hasard, puis l'ordre est remélangé. « Rejouer mes erreurs » mélange simplement les cartes ratées.
- **Écrans** : l'écran de partie reçoit un mode « seul » (`body[data-mode="solo"]`) qui masque le panneau du formateur et affiche un panneau avec « Carte suivante » et « Arrêter ». La carte à retourner et le Venn sont pilotés par une fonction de rendu commune aux deux modes. L'écran de fin masque le podium et affiche « Votre score » et les actions de l'entraînement.
- **Pas de Firebase** : le bouton « Commencer » ne dépend pas de la connexion ; l'entraînement fonctionne même si le service temps réel est injoignable, une fois la page et le paquet chargés.

## Risks / Trade-offs

- [Mélange des deux modes dans `ui.js`] → Le mode seul est isolé dans ses propres fonctions de rendu ; seules la carte à retourner et la correction sont partagées.

## Migration Plan

Aucune migration : nouveau mode, sans donnée ni règle.

## Open Questions

_Aucune._
