# Prototype — roguelite heroic fantasy

Première base technique. Le prototype couvre la boucle demandée : accueil →
création de personnage → sauvegarde → run de trois pièces → fin de run.

## Lancer

Le navigateur bloque les modules JavaScript quand une page est ouverte
directement depuis le disque. Il faut donc un petit serveur local. Aucune
connexion Internet n'est nécessaire — le serveur ne sert que les fichiers du
dossier.

```
cd jeu
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

- `index.html` — le jeu
- `banc-dessai.html` — outil de développement : moteur de dés et tests

## Arborescence

```
index.html              écran unique, tout le rendu se fait en JavaScript
banc-dessai.html        outil de dev : jets de dés, effets, distribution, tests
styles/app.css          feuille de style

src/core/               moteur, aucune règle de jeu
  rng.js                aléatoire déterministe, sérialisable
  dice.js               notation « 2d6 + 2 », jets tracés
  modifiers.js          pipeline d'effets composables
  registry.js           registre de contenu extensible
  eventBus.js           bus interne

src/rules/              règles chiffrées
  stats.js              7 statistiques, PV et armure dérivés
  provisoire.js         TOUTES les valeurs non validées

src/data/               contenu, modifiable sans toucher au moteur
  personnage.js         raretés, races, sexes, classes
  objets.js             les 12 objets
  monde.js              ennemis, tables de loot, les 3 rencontres

src/systems/            systèmes de jeu
  personnage.js         création, PV, armure totale
  inventaire.js         grille 4×4, formes, rotation
  combat.js             tour par tour, armure, fuite
  loot.js               tirage plafonné par rareté
  run.js                enchaînement des pièces
  sauvegarde.js         stockage local

src/ui/                 interface
tests/                  harnais et suites
```

## Choix techniques

**Pas de framework.** HTML, CSS et JavaScript natifs, modules ES. Rien à
télécharger, rien à compiler, fonctionnement hors connexion garanti.

**Aléatoire déterministe.** `Math.random()` n'est ni reproductible ni
sérialisable. Le générateur maison tient son état sur un entier : une run peut
être rejouée à l'identique à partir de sa graine, et la sauvegarde peut reprendre
au milieu d'une séquence.

**Effets composables.** Un modificateur est une donnée qui déclare son étape
d'insertion dans un jet (`spec`, `die`, `group`, `flat`, `total`), sa condition
et sa transformation. Le moteur ne connaît aucun effet en particulier, ce qui
permet aux effets de se combiner entre eux. Chaque jet produit une trace
complète, lisible dans le banc d'essai.

**Sauvegarde en `localStorage`.** Synchrone, disponible partout, sans
permission. Le passage à IndexedDB ne toucherait que `sauvegarde.js`.

**Inventaire.** Le placement est calculé sur une grille d'occupation, séparé du
rendu. Déplacement au doigt comme à la souris via Pointer Events.

## Tests

75 tests, sans dépendance externe. Bouton « Lancer les tests » dans
`banc-dessai.html`, ou en ligne de commande avec un `package.json` contenant
`{"type":"module"}`.

## État des décisions

Toutes les valeurs qui n'ont pas été validées sont regroupées dans
`src/rules/provisoire.js`. Aucune n'est dispersée ailleurs dans le code. La
liste des questions ouvertes est aussi affichée dans l'écran Réglages du jeu.
