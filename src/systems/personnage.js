/**
 * personnage.js — État du personnage.
 */

import { pvMax, armureDeBase, statsParDefaut } from '../rules/stats.js';
import { CLASSE_PAR_ID } from '../data/personnage.js';
import { creerInventaire, ajouter, armureDesObjets } from './inventaire.js';
import { PROVISOIRE } from '../rules/provisoire.js';

export function creerPersonnage({ nom, race, sexe, classe, stats }) {
  const modele = CLASSE_PAR_ID[classe];
  if (!modele) throw new Error(`Classe inconnue : ${classe}`);

  const perso = {
    nom: nom.trim() || 'Sans nom',
    race,
    sexe,
    classe,
    stats: { ...statsParDefaut(), ...stats },
    inventaire: creerInventaire(),
  };

  perso.pvMax = pvMax(perso.stats);
  perso.pv = perso.pvMax;

  for (const objetId of modele.objetsDeDepart) ajouter(perso.inventaire, objetId);

  return perso;
}

/** Armure totale : statistiques + objets possédés. */
export function armureTotale(perso) {
  const objets = PROVISOIRE.objets.passifsActifsDansLInventaire
    ? armureDesObjets(perso.inventaire)
    : 0;
  return armureDeBase(perso.stats) + objets;
}

export function soigner(perso, pv) {
  const avant = perso.pv;
  perso.pv = Math.min(perso.pvMax, perso.pv + pv);
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
