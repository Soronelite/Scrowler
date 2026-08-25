/**
 * traits.js — Traits de personnage.
 *
 * Un trait est une donnée : il déclare ce qu'il modifie, jamais comment. Le
 * moteur ne connaît aucun trait en particulier, ce qui permet d'en ajouter
 * sans toucher au code.
 *
 * Sources prévues :
 *   - race, sexe, classe        (implémenté)
 *   - tirage aléatoire à la création   (à venir)
 *   - choix parmi 2 ou 3 à la montée de niveau   (à venir)
 *   - gain ou malus selon les actions en jeu     (à venir)
 *
 * Effets reconnus :
 *   stats      : bonus à une statistique (Santé, Intelligence…)
 *   armure     : armure supplémentaire
 *   degats     : bonus aux jets de dégâts du joueur
 *   pvMax      : PV maximum supplémentaires
 *   initiative : bonus d'initiative
 *   bonusJet   : bonus à tous les jets du joueur
 */

export const TRAITS = [
  /* ---------------- races ---------------- */
  {
    id: 'constitution_humaine',
    nom: 'Constitution humaine',
    type: 'positif',
    origine: 'race',
    description: '+2 en Santé.',
    effets: { stats: { sante: 2 } },
  },
  {
    id: 'cuir_epais',
    nom: 'Cuir épais',
    type: 'positif',
    origine: 'race',
    description: '+2 d’armure.',
    effets: { armure: 2 },
  },
  {
    id: 'esprit_elfique',
    nom: 'Esprit elfique',
    type: 'positif',
    origine: 'race',
    description: '+2 en Intelligence.',
    effets: { stats: { intelligence: 2 } },
  },
  {
    id: 'force_brute',
    nom: 'Force brute',
    type: 'positif',
    origine: 'race',
    description: '+2 dégâts sur toutes tes attaques.',
    effets: { degats: 2 },
  },

  /* ---------------- classes ---------------- */
  {
    id: 'entrainement_chevaleresque',
    nom: 'Entraînement chevaleresque',
    type: 'positif',
    origine: 'classe',
    description: '+1 d’armure, +1 dégâts, +1 en Charisme et en Courage.',
    effets: {
      armure: 1,
      degats: 1,
      stats: { charisme: 1, courage: 1 },
    },
  },
];

export const TRAIT_PAR_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export function trait(id) {
  const t = TRAIT_PAR_ID[id];
  if (!t) throw new Error(`Trait inconnu : ${id}`);
  return t;
}

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

/**
 * Traits accordés par la race.
 *
 * Attention au vocabulaire : « Homme » désigne ici la race humaine, pas le
 * sexe. Les deux existent séparément dans le jeu.
 */
export const TRAITS_PAR_RACE = {
  humain: ['constitution_humaine'],
  nain: ['cuir_epais'],
  elfe: ['esprit_elfique'],
  orc: ['force_brute'],
};

/** Aucun trait lié au sexe pour l'instant. La structure est en place. */
export const TRAITS_PAR_SEXE = {
  homme: [],
  femme: [],
};

export const TRAITS_PAR_CLASSE = {
  chevalier: ['entrainement_chevaleresque'],
};

/** Identifiants des traits accordés par l'identité du personnage. */
export function traitsDIdentite({ race, sexe, classe }) {
  return [
    ...(TRAITS_PAR_RACE[race] ?? []),
    ...(TRAITS_PAR_SEXE[sexe] ?? []),
    ...(TRAITS_PAR_CLASSE[classe] ?? []),
  ];
}
