/**
 * xp.js — Expérience, niveaux et points de compétence.
 *
 * Les courbes sont des tables explicites, volontairement pas recalculées.
 * Modifier l'équilibrage se fait donc ici, sans toucher au code.
 */

export const NIVEAU_INITIAL = 1;
export const NIVEAU_MAX = 10;

/**
 * XP cumulée nécessaire pour atteindre chaque niveau.
 * L'index correspond au niveau : SEUILS[3] = 24.
 */
export const SEUILS = [null, 0, 10, 24, 43, 69, 104, 151, 214, 299, 414];

/** XP gagnée en tuant un ennemi, selon son niveau. */
export const XP_PAR_NIVEAU_ENNEMI = {
  1: 5,
  2: 8,
  3: 12,
  4: 17,
  5: 24,
  6: 34,
  7: 47,
  8: 65,
  9: 90,
  10: 125,
};

/** XP gagnée en passant à une nouvelle pièce. */
export const XP_PROGRESSION = 2;

/** Points de compétence accordés en atteignant un niveau donné. */
export function pointsCompetencePour(niveau) {
  if (niveau <= 1) return 0;
  return niveau >= 5 ? 2 : 1;
}

/** XP cumulée requise pour atteindre un niveau. */
export function seuilCumule(niveau) {
  if (niveau < 1 || niveau > NIVEAU_MAX) return null;
  return SEUILS[niveau];
}

/** XP nécessaire pour passer du niveau donné au suivant. */
export function xpRequisePourNiveauSuivant(niveau) {
  if (niveau >= NIVEAU_MAX) return null;
  return SEUILS[niveau + 1] - SEUILS[niveau];
}

/** XP gagnée pour un ennemi de ce niveau. */
export function xpDUnEnnemi(niveau) {
  if (niveau === null || niveau === undefined) return 0;
  return XP_PAR_NIVEAU_ENNEMI[niveau] ?? 0;
}
