/**
 * monde.js — Ennemis, tables de loot et rencontres.
 *
 * Les rencontres sont des données : le moteur les lit, il ne les connaît pas.
 * Ajouter une quatrième pièce se fait ici, sans toucher au moteur.
 */

export const ENNEMIS = [
  {
    id: 'rat_geant',
    nom: 'Rat géant',
    icone: '🐀',
    pv: 10,
    armure: 0,
    attaque: '2d4',
  },
  {
    id: 'garde',
    nom: 'Garde',
    icone: '💂',
    pv: 15,
    armure: 4,
    attaque: '2d6',
  },
];

export const ENNEMI_PAR_ID = Object.fromEntries(ENNEMIS.map((e) => [e.id, e]));

/* ------------------------------------------------------------------ */
/* Tables de loot : une table déclare la rareté maximale autorisée.     */
/* ------------------------------------------------------------------ */

export const TABLES_LOOT = {
  frequent_seul: { nom: 'Fouille de cadavre', raretes: ['frequent'] },
  jusqu_commun: { nom: 'Fouille sommaire', plafond: 'commun' },
  jusqu_peu_commun: { nom: 'Réserve', plafond: 'peu_commun' },
};

/* ------------------------------------------------------------------ */

export const RENCONTRES = [
  {
    id: 'cave_lugubre',
    lieu: 'Cave lugubre',
    visuel: 'Cave lugubre',
    description:
      "L'air est froid et humide. Les murs de pierre sont couverts de traces de moisissure et l'obscurité rend difficile de distinguer les recoins de la cave. Une odeur désagréable flotte dans l'air. Un bruit de griffes résonne soudain dans l'obscurité.",
    ennemi: 'rat_geant',
    apparition: 'Un rat géant surgit de l’ombre.',
    actions: [
      { id: 'attaquer', libelle: 'Attaquer', type: 'combat' },
      {
        id: 'fuir',
        libelle: 'Fuir',
        type: 'fuite',
        chance: 50,
        reussite: 'Tu te glisses hors de la cave avant que le rat ne te rattrape.',
        echec: 'Le rat te coupe la route. Il attaque le premier.',
        ennemiCommenceSiEchec: true,
      },
    ],
    apresCombat: [
      {
        id: 'fouiller_cadavre',
        libelle: 'Fouiller le cadavre',
        type: 'loot',
        table: 'frequent_seul',
        uneFois: true,
      },
      {
        id: 'fouiller_piece',
        libelle: 'Fouiller la pièce',
        type: 'loot',
        table: 'jusqu_commun',
        uneFois: true,
      },
      { id: 'avancer', libelle: 'Avancer', type: 'avancer' },
    ],
  },

  {
    id: 'cellier',
    lieu: 'Cellier',
    visuel: 'Ancien cellier',
    description:
      "De vieilles étagères en bois occupent les murs du cellier. Des caisses poussiéreuses sont empilées dans les coins et quelques bocaux oubliés depuis longtemps couvrent les étagères. Malgré l'abandon des lieux, certaines réserves semblent encore intactes.",
    ennemi: null,
    actions: [
      {
        id: 'fouiller_piece',
        libelle: 'Fouiller la pièce',
        type: 'loot',
        table: 'jusqu_peu_commun',
        uneFois: true,
      },
      { id: 'avancer', libelle: 'Avancer', type: 'avancer' },
    ],
  },

  {
    id: 'couloir_garde',
    lieu: 'Couloir de pierre',
    visuel: 'Couloir de pierre',
    description:
      "Le couloir est étroit et faiblement éclairé par quelques torches accrochées aux murs. Au bout du passage, un garde en armure monte la garde. À la vue du joueur, il saisit immédiatement son arme et bloque le passage.",
    ennemi: 'garde',
    apparition: 'Le garde dégaine et bloque le passage.',
    actions: [{ id: 'attaquer', libelle: 'Attaquer', type: 'combat' }],
    apresCombat: [
      {
        id: 'fouiller_cadavre',
        libelle: 'Fouiller le cadavre',
        type: 'loot',
        table: 'frequent_seul',
        uneFois: true,
      },
      {
        id: 'fouiller_piece',
        libelle: 'Fouiller le couloir',
        type: 'loot',
        table: 'jusqu_commun',
        uneFois: true,
      },
      { id: 'avancer', libelle: 'Avancer', type: 'avancer' },
    ],
  },
];
