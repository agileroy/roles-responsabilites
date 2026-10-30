## Context

Le lancement mélange aujourd'hui tout le paquet dans `meta/deckOrder`, et chaque joueur actif pioche la carte d'indice « nombre de cartes déjà jouées » dans cette liste commune. Le nombre de pièges reçus par chacun dépend donc du hasard. Les règles de sécurité vérifient la carte piochée contre `meta/deckOrder`.

## Goals / Non-Goals

**Goals:**
- Exactement 1 piège par main dès 2 cartes par personne, à une position aléatoire.
- Une pioche toujours vérifiée par la base, comme aujourd'hui.

**Non-Goals:**
- Équilibrer les autres régions (nombre de cartes PO, SM, Developers ou Scrum Team par main).
- Rendre la règle configurable : l'auteur la veut toujours active.

## Decisions

- **Mains distribuées au lancement** : `meta/hands/{uid}` contient la liste ordonnée des cartes de chaque participant ; `meta/deckOrder` disparaît. Le formateur mélange séparément les pièges et les autres cartes, donne un piège et `n − 1` autres cartes à chacun, puis mélange chaque main. Avec 1 carte par personne, les mains sont prises dans le paquet entier mélangé. Alternative écartée : garder un paquet commun et réordonner les cartes à chaque tour pour forcer un piège ; plus complexe à vérifier dans les règles.
- **Pioche** : `turn.deckIndex` devient l'indice dans la main du joueur actif (le nombre de cartes qu'il a déjà jouées), écrit en chaîne par le formateur à chaque nouveau tour. Les règles comparent `turn.cardId` à `meta/hands/{turn.playerUid}/{turn.deckIndex}`.
- **Passer son tour** : comme l'indice dépend des cartes jouées par le joueur et qu'une carte passée ne crée pas de résultat, le joueur retrouve la même carte à son tour suivant, sans rien de plus à écrire.
- **Maximum de cartes par personne** : `maxCardsPerPlayer({ total, traps }, n)` renvoie le plus grand `k` tel que `n × k ≤ total` et, si `k ≥ 2`, `n ≤ traps` et `n × (k − 1) ≤ total − traps`. Le paquet actuel (67 cartes dont 16 pièges) donne 6 pour 10 participants, comme avant.
- **Retardataire** : sa main est prise dans les cartes absentes de toutes les mains (`undealt`), avec la même fonction de distribution ; son quota est limité par le nombre de ces cartes.
- **Discrétion** : aucun libellé ni explication ne mentionne la règle ; le nombre de pièges d'une main n'est visible que dans les données.

## Risks / Trade-offs

- [Un participant technique peut lire sa main dans les données] → Comme pour les bonnes réponses, déjà publiques dans le site : assumé pour un jeu de formation.
- [Maximum plus bas pour les petits groupes (13 au lieu de 16 pour 4 participants)] → Sans effet en pratique : l'auteur joue 5 cartes par personne.
- [Partie en cours au moment de la publication] → Une partie lancée avant la mise à jour n'a pas de mains : elle ne peut plus piocher. Publier en dehors d'une formation ; les salles ont au plus 24 heures.

## Migration Plan

1. Implémenter, tester (logique pure, parcours sur la base en mémoire, navigateur en mode démo).
2. Recopier `database.rules.json` dans les cinq dépôts et le donner à l'auteur, qui le republie dans la console Firebase.
3. Pousser sur `main`.

## Open Questions

_Aucune._
