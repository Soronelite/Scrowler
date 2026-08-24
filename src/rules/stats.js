/**
 * stats.js — Statistiques et valeurs dérivées.
 *
 * Les règles décidées :
 *   - 7 statistiques, 2 points chacune par défaut, maximum 10 ;
 *   - 2 points supplémentaires à répartir à la création ;
 *   - 10 PV et 0 armure au départ ;
 *   - 1 point de Santé  = +2 PV maximum ;
 *   - 1 point de Défense = +1 armure ;
 *   - les autres statistiques valent 10 % par point.
 */

import { PROVISOIRE } from './provisoire.js';

export const STATS = [
  { id: 'sante', nom: 'Santé', effet: '+2 PV maximum par point' },
  { id: 'defense', nom: 'Défense', effet: '+1 armure par point' },
  { id: 'intelligence', nom: 'Intelligence', effet: 'Effet à définir' },
  { id: 'initiative', nom: 'Initiative', effet: '+10 % par point' },
  { id: 'perception', nom: 'Perception', effet: 'Effet à définir' },
  { id: 'courage', nom: 'Courage', effet: 'Effet à définir' },
  { id: 'charisme', nom: 'Charisme', effet: 'Effet à définir' },
];

export const STAT_MIN = 2;
export const STAT_MAX = 10;
export const POINTS_A_REPARTIR = 2;

export const PV_BASE = 10;
export const ARMURE_BASE = 0;
export const PV_PAR_SANTE = 2;
export const ARMURE_PAR_DEFENSE = 1;
export const POURCENT_PAR_POINT = 10;

/** Statistiques de départ : 2 partout. */
export function statsParDefaut() {
  return Object.fromEntries(STATS.map((s) => [s.id, STAT_MIN]));
}

const ref = () => PROVISOIRE.personnage.statsDeReference;

/** PV maximum. Voir provisoire.js : le calcul part des stats de référence. */
export function pvMax(stats) {
  return PV_BASE + (stats.sante - ref()) * PV_PAR_SANTE;
}

/** Armure venant des statistiques, hors objets. */
export function armureDeBase(stats) {
  return ARMURE_BASE + (stats.defense - ref()) * ARMURE_PAR_DEFENSE;
}

/** Valeur en pourcentage d'une statistique non chiffrée en points. */
export function pourcentage(stats, id) {
  return stats[id] * POURCENT_PAR_POINT;
}

/** Points déjà dépensés au-delà du minimum. */
export function pointsDepenses(stats) {
  return STATS.reduce((total, s) => total + (stats[s.id] - STAT_MIN), 0);
}

export function pointsRestants(stats) {
  return POINTS_A_REPARTIR - pointsDepenses(stats);
}
