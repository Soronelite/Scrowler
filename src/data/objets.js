/**
 * objets.js — Catalogue d'objets.
 *
 * forme  : { l: largeur, h: hauteur } en cases, orientation de rangement.
 *          Un objet en ligne ou en colonne est pivotable ; un carré ne l'est pas.
 * action : ce que fait l'objet quand le joueur l'utilise.
 * passif : ce que l'objet apporte tant qu'il est possédé.
 *
 * Ajouter un objet ici suffit : aucun autre fichier n'a besoin de le connaître.
 */

export const OBJETS = [
  {
    id: 'epee_deux_mains',
    nom: 'Épée à deux mains',
    categorie: 'arme',
    rarete: 'peu_commun',
    icone: '⚔️',
    forme: { l: 1, h: 4 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '2d6' },
  },
  {
    id: 'pain_rassis',
    nom: 'Pain rassis',
    categorie: 'nourriture',
    rarete: 'frequent',
    icone: '🍞',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Manger', pv: 4, consomme: true },
  },
  {
    id: 'epee_courte',
    nom: 'Épée courte',
    categorie: 'arme',
    rarete: 'commun',
    icone: '🗡️',
    forme: { l: 1, h: 2 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '1d6' },
  },
  {
    id: 'dague',
    nom: 'Dague',
    categorie: 'arme',
    rarete: 'frequent',
    icone: '🔪',
    forme: { l: 1, h: 1 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '1d4' },
  },
  {
    id: 'hache_une_main',
    nom: 'Hache à une main',
    categorie: 'arme',
    rarete: 'commun',
    icone: '🪓',
    forme: { l: 1, h: 2 },
    action: { type: 'attaque', verbe: 'Attaquer', des: '1d8' },
  },
  {
    id: 'arc_court',
    nom: 'Arc court',
    categorie: 'arme',
    rarete: 'commun',
    icone: '🏹',
    forme: { l: 1, h: 4 },
    action: { type: 'attaque', verbe: 'Tirer', des: '1d6' },
  },
  {
    id: 'bouclier_bois',
    nom: 'Bouclier en bois',
    categorie: 'armure',
    rarete: 'frequent',
    icone: '🛡️',
    forme: { l: 1, h: 2 },
    passif: { armure: 2 },
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
    id: 'potion_soin',
    nom: 'Potion de soin',
    categorie: 'consommable',
    rarete: 'commun',
    icone: '🧪',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Boire', pv: 6, consomme: true },
  },
  {
    id: 'viande_sechee',
    nom: 'Viande séchée',
    categorie: 'nourriture',
    rarete: 'frequent',
    icone: '🥩',
    forme: { l: 1, h: 1 },
    action: { type: 'soin', verbe: 'Manger', pv: 3, consomme: true },
  },
  {
    id: 'torche',
    nom: 'Torche',
    categorie: 'utilitaire',
    rarete: 'frequent',
    icone: '🔥',
    forme: { l: 1, h: 2 },
    // Aucune zone sombre n'existe encore : l'action est sans effet.
    action: { type: 'inerte', verbe: 'Allumer', message: 'La torche éclaire les alentours.' },
  },
  {
    id: 'parchemin_boule_feu',
    nom: 'Parchemin de boule de feu',
    categorie: 'consommable',
    rarete: 'peu_commun',
    icone: '📜',
    forme: { l: 1, h: 2 },
    action: { type: 'degats', verbe: 'Lancer', des: '2d6', consomme: true, cible: 'ennemi' },
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
