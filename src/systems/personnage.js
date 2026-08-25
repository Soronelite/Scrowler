/**
 * personnage.js — État du personnage.
 *
 * PV maximum et armure sont calculés, jamais figés : un anneau de vigueur
 * ramassé en cours de run doit être pris en compte immédiatement.
 */

import { pvMax, armureDeBase, actionsParTour, statsParDefaut } from '../rules/stats.js';
import { CLASSE_PAR_ID } from '../data/personnage.js';
import { creerInventaire, ajouter, armureDesObjets, pvMaxDesObjets } from './inventaire.js';
import { creerProgression } from './progression.js';
import { PROVISOIRE } from '../rules/provisoire.js';

export function creerPersonnage({ nom, race, sexe, classe, stats }) {
  const modele = CLASSE_PAR_ID[classe];
  if (!modele) throw new Error(`Classe inconnue : ${classe}`);

  const perso = {
    nom: (nom ?? '').trim() || 'Sans nom',
    race,
    sexe,
    classe,
    stats: { ...statsParDefaut(), ...stats },
    inventaire: creerInventaire(),
    progression: creerProgression(),
  };

  for (const objetId of modele.objetsDeDepart) ajouter(perso.inventaire, objetId);

  perso.pv = pvMaxTotal(perso);
  return perso;
}

/** PV maximum : statistiques + passifs des objets. */
export function pvMaxTotal(perso) {
  const objets = PROVISOIRE.objets.passifsActifsDansLInventaire
    ? pvMaxDesObjets(perso.inventaire)
    : 0;
  return pvMax(perso.stats) + objets;
}

/** Armure totale : statistiques + objets + effets temporaires. */
export function armureTotale(perso, effets = []) {
  const objets = PROVISOIRE.objets.passifsActifsDansLInventaire
    ? armureDesObjets(perso.inventaire)
    : 0;
  const temporaire = effets.reduce((t, e) => t + (e.armure ?? 0), 0);
  return armureDeBase(perso.stats) + objets + temporaire;
}

/** Actions par tour : statistiques + effets temporaires. */
export function actionsDisponibles(perso, effets = []) {
  const bonus = effets.reduce((t, e) => t + (e.actions ?? 0), 0);
  return actionsParTour(perso.stats) + bonus;
}

export function soigner(perso, pv) {
  const max = pvMaxTotal(perso);
  const avant = perso.pv;
  perso.pv = Math.min(max, perso.pv + pv);
  return perso.pv - avant;
}

export function blesser(perso, pv) {
  const avant = perso.pv;
  perso.pv = Math.max(0, perso.pv - pv);
  return avant - perso.pv;
}

export function estMort(perso) {
  return perso.pv <= 0;
}

/** Après une montée de niveau : les PV suivent le nouveau maximum. */
export function apresGainDeStatistique(perso, statId) {
  const max = pvMaxTotal(perso);
  if (statId === 'sante' && PROVISOIRE.personnage.monteeDeNiveauSoigne) {
    perso.pv = Math.min(max, perso.pv + 2);
  }
  perso.pv = Math.min(perso.pv, max);
}
