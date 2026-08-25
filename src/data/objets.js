/**
 * objets.js — Catalogue d'objets.
 *
 * forme   : { l, h } en cases. Un objet en ligne ou en colonne est pivotable,
 *           un carré ne l'est pas.
 * action  : ce que fait l'objet quand le joueur l'utilise.
 * passif  : ce que l'objet apporte tant qu'il est possédé.
 *
 * Un effet temporaire est décrit ici comme une donnée (`effet`), jamais comme
 * un cas particulier dans le moteur.
 */

export const OBJETS = [
  {
    id: 'epee_deux_mains',
    nom: 'Épée à deux mains',
    categorie: 'arme',
    rarete: 'peu_commun',
    icone: '⚔️',
    forme: { l: 1, h: 4 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '2d6', cout: 1 },
  },
  {
    id: 'pain_rassis',
    nom: 'Pain rassis',
    categorie: 'nourriture',
    rarete: 'frequent',
    icone: '🍞',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Manger', pv: 4, consomme: true, cout: 1 },
  },
  {
    id: 'epee_courte',
    nom: 'Épée courte',
    categorie: 'arme',
    rarete: 'commun',
    icone: '🗡️',
    forme: { l: 1, h: 2 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '1d6', cout: 1 },
  },
  {
    id: 'dague',
    nom: 'Dague',
    categorie: 'arme',
    rarete: 'frequent',
    icone: '🔪',
    forme: { l: 1, h: 1 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '1d4', cout: 1 },
  },
  {
    id: 'bouclier_bois',
    nom: 'Bouclier en bois',
    categorie: 'armure',
    rarete: 'frequent',
    icone: '🛡️',
    forme: { l: 2, h: 2 },
    passif: { armure: 2 },
    action: {
      type: 'effet',
      verbe: 'Bloquer',
      cout: 1,
      seulementEnCombat: true,
      effet: { id: 'blocage', label: 'Blocage', armure: 4, dureeTours: 1, immediat: true },
    },
  },
  {
    id: 'casque_fer',
    nom: 'Casque en fer',
    categorie: 'armure',
    rarete: 'frequent',
    icone: '⛑️',
    forme: { l: 1, h: 1 },
    passif: { armure: 1 },
  },
  {
    id: 'armure_mailles',
    nom: 'Armure de mailles',
    categorie: 'armure',
    rarete: 'commun',
    icone: '🥋',
    forme: { l: 2, h: 2 },
    passif: { armure: 3 },
  },
  {
    id: 'bouclier_renforce',
    nom: 'Bouclier renforcé',
    categorie: 'armure',
    rarete: 'peu_commun',
    icone: '🛡',
    forme: { l: 2, h: 2 },
    passif: { armure: 3 },
  },
  {
    id: 'cape_protection',
    nom: 'Cape de protection',
    categorie: 'armure',
    rarete: 'rare',
    icone: '🧥',
    forme: { l: 1, h: 2 },
    passif: { armure: 1 },
  },
  {
    id: 'potion_soin',
    nom: 'Potion de soin',
    categorie: 'consommable',
    rarete: 'commun',
    icone: '🧪',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Boire', pv: 6, consomme: true, cout: 1 },
  },
  {
    id: 'viande_sechee',
    nom: 'Viande séchée',
    categorie: 'nourriture',
    rarete: 'frequent',
    icone: '🥩',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Manger', pv: 3, consomme: true, cout: 1 },
  },
  {
    id: 'torche',
    nom: 'Torche',
    categorie: 'utilitaire',
    rarete: 'frequent',
    icone: '🔥',
    forme: { l: 1, h: 2 },
    action: {
      type: 'effet',
      verbe: 'Allumer',
      cout: 1,
      consomme: true,
      effet: {
        id: 'lumiere',
        label: 'Torche allumée',
        bonusLoot: { rareteSuperieure: 10, objetDouble: 25 },
        dureePieces: 1,
      },
      message: 'La lumière révèle des recoins jusque-là invisibles.',
    },
  },
  {
    id: 'parchemin_boule_feu',
    nom: 'Parchemin de boule de feu',
    categorie: 'consommable',
    rarete: 'peu_commun',
    icone: '📜',
    forme: { l: 1, h: 2 },
    action: { type: 'degats', verbe: 'Lancer', des: '2d6', consomme: true, cible: 'ennemi', cout: 1 },
  },
  {
    id: 'potion_endurance',
    nom: "Potion d'endurance",
    categorie: 'consommable',
    rarete: 'rare',
    icone: '🍶',
    forme: { l: 1, h: 1 },
    action: {
      type: 'effet',
      verbe: 'Boire',
      cout: 1,
      consomme: true,
      effet: { id: 'endurance_bonus', label: 'Souffle retrouvé', actions: 1, dureeTours: 'prochainTour' },
    },
  },
  {
    id: 'potion_force',
    nom: 'Potion de force',
    categorie: 'consommable',
    rarete: 'peu_commun',
    icone: '🧉',
    forme: { l: 1, h: 1 },
    action: {
      type: 'effet',
      verbe: 'Boire',
      cout: 1,
      consomme: true,
      effet: { id: 'force', label: 'Force décuplée', degats: 2, dureeTours: 'prochainTour' },
    },
  },
  {
    id: 'anneau_vigueur',
    nom: 'Anneau de vigueur',
    categorie: 'accessoire',
    rarete: 'rare',
    icone: '💍',
    forme: { l: 1, h: 1 },
    passif: { pvMax: 2 },
  },
  {
    id: 'amulette_chance',
    nom: 'Amulette de chance',
    categorie: 'accessoire',
    rarete: 'rare',
    icone: '🔮',
    forme: { l: 1, h: 1 },
    passif: { bonusJet: 1 },
  },
];

export const OBJET_PAR_ID = Object.fromEntries(OBJETS.map((o) => [o.id, o]));

export function objet(id) {
  const o = OBJET_PAR_ID[id];
  if (!o) throw new Error(`Objet inconnu : ${id}`);
  return o;
}

/** Un objet est pivotable s'il occupe une ligne ou une colonne de plus d'une case. */
export function estPivotable(objet) {
  const { l, h } = objet.forme;
  return (l === 1 || h === 1) && l !== h;
}

export function tailleEnCases(objet) {
  return objet.forme.l * objet.forme.h;
}
