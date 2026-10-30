# Game Room Specification

## Purpose
Création d'une salle par le formateur, arrivée des participants, réglages, lancement, arrivée tardive, présence et suppression au bout de 24 heures. Couvre `site/js/game-store.js`, `site/js/ui.js` et les règles `rolesGame/expiry`, `meta`, `players` et `names` de `database.rules.json`.

## Requirements

### Requirement: Création d'une partie par le formateur
La page d'accueil SHALL proposer « Créer une partie » et « Rejoindre une partie ». « Créer une partie » SHALL créer une salle avec un code de 4 lettres majuscules, sans lettres ambiguës (I, L, O, 0, 1 exclus), unique parmi les salles existantes. Le navigateur qui crée la salle en devient le formateur : il anime, ne joue pas et ne pioche aucune carte. Plusieurs salles SHALL pouvoir exister en même temps, indépendantes les unes des autres.

#### Scenario: Nouvelle salle
- **GIVEN** un formateur sur la page d'accueil
- **WHEN** il clique sur « Créer une partie »
- **THEN** l'écran du formateur affiche un code comme « KZTR », le QR code et une liste de participants vide

#### Scenario: Deux formations en parallèle
- **GIVEN** deux formateurs qui créent chacun une partie
- **WHEN** des participants rejoignent chacune des salles
- **THEN** chaque formateur ne voit que les participants et les cartes de sa propre salle

### Requirement: Rejoindre une partie
L'écran du formateur SHALL afficher en grand le code de la salle, un QR code de l'adresse du site avec le code en paramètre (`?salle=KZTR`) et l'adresse en clair. Un participant qui scanne le QR code SHALL arriver directement sur la saisie de son prénom ; un participant qui ouvre le site sans paramètre SHALL saisir le code puis son prénom. Le prénom SHALL être débarrassé de ses espaces de bord, compter de 1 à 20 caractères et être unique dans la salle, sans tenir compte des majuscules. Un code inconnu, une salle pleine (10 participants) ou une partie terminée MUST être refusés avec un message explicite. Le générateur de QR code SHALL être embarqué dans le site.

#### Scenario: Arrivée par le QR code
- **GIVEN** un formateur qui projette la salle « KZTR »
- **WHEN** Julie scanne le QR code avec son téléphone et saisit « Julie »
- **THEN** elle entre dans la salle, et « Julie » apparaît sur l'écran du formateur

#### Scenario: Prénom déjà pris
- **GIVEN** « Julie » déjà dans la salle
- **WHEN** une autre personne saisit « julie »
- **THEN** l'entrée est refusée avec le message « Ce prénom est déjà pris dans la salle »

#### Scenario: Salle pleine
- **GIVEN** une salle avec 10 participants
- **WHEN** une onzième personne tente de rejoindre
- **THEN** l'entrée est refusée avec le message « La salle est complète (10 participants au maximum) »

#### Scenario: Code inconnu
- **GIVEN** aucune salle « ABCD »
- **WHEN** une personne saisit le code « ABCD »
- **THEN** le message « Aucune partie avec ce code » s'affiche

### Requirement: Réglages de la partie
Avant le lancement, le formateur SHALL choisir le nombre de cartes par personne et le chrono (sans chrono, 30, 45 ou 60 secondes ; sans chrono par défaut). Le nombre de cartes par personne SHALL aller de 1 au maximum possible, égal au nombre de cartes du paquet divisé par le nombre de participants, arrondi à l'entier inférieur ; il SHALL valoir 5 par défaut (ou le maximum s'il est plus petit) et être ramené au nouveau maximum si un participant arrive. Le formateur SHALL pouvoir le changer avec les boutons − et +, ou en saisissant le nombre au clavier : la saisie est appliquée quand il valide (Entrée) ou quitte le champ, et une valeur hors bornes est ramenée dans [1, maximum]. Le bouton « Lancer la partie » SHALL être désactivé tant qu'aucun participant n'est présent.

#### Scenario: Valeur par défaut
- **GIVEN** un paquet de 67 cartes et 4 participants présents
- **WHEN** le formateur ouvre les réglages
- **THEN** le nombre de cartes par personne vaut 5, avec un maximum de 16

#### Scenario: Maximum
- **GIVEN** un paquet de 67 cartes et 10 participants présents
- **WHEN** le formateur ouvre les réglages
- **THEN** le nombre de cartes par personne vaut 5 et ne peut pas dépasser 6

#### Scenario: Saisie au clavier
- **GIVEN** un paquet de 67 cartes et 4 participants présents
- **WHEN** le formateur saisit 12 dans le champ puis appuie sur Entrée
- **THEN** le nombre de cartes par personne vaut 12 pour tout le monde

#### Scenario: Saisie hors bornes
- **GIVEN** un paquet de 67 cartes et 4 participants présents
- **WHEN** le formateur saisit 40 puis quitte le champ
- **THEN** le nombre de cartes par personne est ramené à 16

#### Scenario: Ajustement à l'arrivée d'un participant
- **GIVEN** un paquet de 67 cartes, 7 participants et le réglage à 9 cartes par personne
- **WHEN** un huitième participant arrive
- **THEN** le réglage est ramené à 8 cartes par personne

### Requirement: Lancement et tirage
Au lancement, le jeu SHALL mélanger le paquet et figer l'ordre de passage des participants présents, tiré au hasard. Toutes les cartes piochées pendant une partie MUST être différentes. Chaque participant présent au lancement SHALL piocher exactement le nombre de cartes réglé, sauf s'il quitte la partie.

#### Scenario: Cartes différentes
- **GIVEN** une partie de 4 participants à 5 cartes chacun
- **WHEN** la partie se termine
- **THEN** 20 cartes différentes ont été jouées, 5 par participant

### Requirement: Arrivée tardive
Un participant qui rejoint une partie déjà lancée SHALL être ajouté à la fin de l'ordre de passage. Son nombre de cartes SHALL être égal au nombre de tours restant aux autres participants au moment de son arrivée, c'est-à-dire le nombre de cartes réglé moins le nombre de tours complets déjà joués, et limité par les cartes restantes du paquet. S'il ne reste pas assez de cartes, il SHALL rejoindre en spectateur, avec un message qui l'explique. Il MUST NOT rejoindre une salle déjà pleine ni une partie terminée.

#### Scenario: Retardataire
- **GIVEN** une partie à 5 cartes par personne dont 2 tours complets ont été joués
- **WHEN** Marc rejoint la salle
- **THEN** Marc jouera 3 cartes, en dernier dans l'ordre de passage

#### Scenario: Paquet épuisé
- **GIVEN** une partie dont le paquet ne contient plus assez de cartes pour un nouveau joueur
- **WHEN** Marc rejoint la salle
- **THEN** Marc suit la partie en spectateur, avec le message « Plus assez de cartes pour vous faire jouer : vous suivez la partie en spectateur »

### Requirement: Présence des participants
L'écran du formateur SHALL afficher la liste des participants, en temps réel, en distinguant ceux qui sont déconnectés. Un participant qui recharge sa page ou rouvre le lien sur le même navigateur SHALL retrouver sa place, son prénom et ses cartes restantes. Le formateur SHALL pouvoir retirer un participant ; ses cartes restantes ne sont alors plus jouées et ses résultats déjà obtenus restent comptés.

#### Scenario: Rechargement
- **GIVEN** Julie dans une partie en cours, à qui il reste 2 cartes
- **WHEN** elle recharge la page
- **THEN** elle retrouve la partie avec son prénom et 2 cartes restantes

#### Scenario: Participant déconnecté
- **GIVEN** Marc qui ferme son navigateur pendant la partie
- **WHEN** l'écran du formateur se met à jour
- **THEN** « Marc » apparaît comme déconnecté dans la liste

### Requirement: Suppression au bout de 24 heures
Une salle et toutes ses données SHALL être supprimées 24 heures après sa création au plus tôt. Sans serveur, cette suppression SHALL être faite par le navigateur de tout formateur qui crée une nouvelle salle, et les règles de sécurité MUST n'autoriser la suppression d'une salle par quelqu'un d'autre que son formateur que si elle a plus de 24 heures. Le formateur SHALL pouvoir supprimer sa salle à tout moment avec « Terminer et supprimer la salle ».

#### Scenario: Ménage automatique
- **GIVEN** une salle créée il y a 25 heures
- **WHEN** un formateur crée une nouvelle partie
- **THEN** l'ancienne salle est supprimée de la base

#### Scenario: Salle récente protégée
- **GIVEN** une salle créée il y a 2 heures
- **WHEN** le navigateur d'un autre formateur tente de la supprimer
- **THEN** la base refuse la suppression
