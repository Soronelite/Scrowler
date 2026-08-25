/**
 * traits.js — Cumul des effets de traits.
 *
 * Les traits ne modifient jamais `perso.stats` directement : ils forment une
 * couche de bonus par-dessus. Ainsi la répartition de points du joueur reste
 * lisible, et retirer un trait ne peut pas corrompre ses statistiques de base.
 */

import { trait, traitsDIdentite, TRAIT_PAR_ID } from '../data/traits.js';

/** Liste vide de traits acquis, pour un nouveau personnage. */
export function creerTraits() {
  return { acquis: [] };
}

/**
 * Tous les traits actifs : ceux de l'identité, plus ceux acquis en jeu.
 * @returns {Array} définitions de traits
 */
export function traitsActifs(perso) {
  const identite = traitsDIdentite({
    race: perso.race,
    sexe: perso.sexe,
    classe: perso.classe,
  });
  const acquis = perso.traits?.acquis ?? [];

  const vus = new Set();
  const sortie = [];
  for (const id of [...identite, ...acquis]) {
    if (vus.has(id) || !TRAIT_PAR_ID[id]) continue;
    vus.add(id);
    sortie.push(trait(id));
  }
  return sortie;
}

/**
 * Somme des effets de tous les traits actifs.
 * @returns {{stats:object, armure:number, degats:number, pvMax:number,
 *            initiative:number, bonusJet:number}}
 */
export function bonusDeTraits(perso) {
  const total = { stats: {}, armure: 0, degats: 0, pvMax: 0, initiative: 0, bonusJet: 0 };

  for (const t of traitsActifs(perso)) {
    const e = t.effets ?? {};
    for (const [statId, valeur] of Object.entries(e.stats ?? {})) {
      total.stats[statId] = (total.stats[statId] ?? 0) + valeur;
    }
    total.armure += e.armure ?? 0;
    total.degats += e.degats ?? 0;
    total.pvMax += e.pvMax ?? 0;
    total.initiative += e.initiative ?? 0;
    total.bonusJet += e.bonusJet ?? 0;
  }
  return total;
}

/** Bonus apporté par les traits à une statistique précise. */
export function bonusDeStat(perso, statId) {
  return bonusDeTraits(perso).stats[statId] ?? 0;
}

/** Ajoute un trait acquis en jeu. Ignore les doublons. */
export function ajouterTrait(perso, id) {
  if (!TRAIT_PAR_ID[id]) throw new Error(`Trait inconnu : ${id}`);
  perso.traits ??= creerTraits();
  if (perso.traits.acquis.includes(id)) return false;
  perso.traits.acquis.push(id);
  return true;
}

export function retirerTrait(perso, id) {
  const acquis = perso.traits?.acquis;
  if (!acquis) return false;
  const i = acquis.indexOf(id);
  if (i === -1) return false;
  acquis.splice(i, 1);
  return true;
}

export function possede(perso, id) {
  return traitsActifs(perso).some((t) => t.id === id);
}
