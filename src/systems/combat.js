/**
 * combat.js — Combat tour par tour.
 *
 * Règles décidées : PV, armure, dégâts par jet de dés, victoire à 0 PV.
 * Règles provisoires (voir provisoire.js) : soustraction de l'armure, plancher
 * des dégâts, ordre du tour, absence de jet pour toucher.
 *
 * Le module ne parle pas à l'interface : il renvoie des faits, l'appelant les
 * raconte.
 */

import { roll } from '../core/dice.js';
import { PROVISOIRE } from '../rules/provisoire.js';
import { ENNEMI_PAR_ID, rangDe, varianteDe } from '../data/monde.js';

export function creerCombat(ennemiId, { ennemiCommence = false } = {}) {
  const modele = ENNEMI_PAR_ID[ennemiId];
  if (!modele) throw new Error(`Ennemi inconnu : ${ennemiId}`);
  return {
    ennemi: {
      ...modele,
      rang: rangDe(modele),
      variante: varianteDe(modele),
      pv: modele.pv,
      pvMax: modele.pv,
    },
    tour: 1,
    aQui: ennemiCommence ? 'ennemi' : 'joueur',
    actionsRestantes: 0,
    termine: false,
    vainqueur: null,
  };
}

/** Applique l'armure à un jet de dégâts. */
export function degatsApresArmure(brut, armure) {
  if (PROVISOIRE.combat.armureMode !== 'soustraction') {
    throw new Error(`Mode d'armure non implémenté : ${PROVISOIRE.combat.armureMode}`);
  }
  return Math.max(PROVISOIRE.combat.degatsMinimum, brut - armure);
}

/**
 * Le joueur inflige des dégâts.
 * @returns {{jet:object, brut:number, absorbe:number, degats:number, mort:boolean}}
 */
export function frapperEnnemi(combat, des, { rng, pipeline, personnage }) {
  const jet = roll(des, {
    rng,
    pipeline,
    tags: ['degats', 'joueur'],
    actor: personnage,
    target: combat.ennemi,
  });
  const degats = degatsApresArmure(jet.total, combat.ennemi.armure);
  combat.ennemi.pv = Math.max(0, combat.ennemi.pv - degats);
  const mort = combat.ennemi.pv === 0;
  if (mort) {
    combat.termine = true;
    combat.vainqueur = 'joueur';
  }
  return { jet, brut: jet.total, absorbe: jet.total - degats, degats, mort };
}

/** L'ennemi riposte. `armureJoueur` est calculée par l'appelant. */
export function riposte(combat, { rng, pipeline, personnage, armureJoueur }) {
  const jet = roll(combat.ennemi.attaque, {
    rng,
    pipeline,
    tags: ['degats', 'ennemi'],
    actor: combat.ennemi,
    target: personnage,
  });
  const degats = degatsApresArmure(jet.total, armureJoueur);
  return { jet, brut: jet.total, absorbe: jet.total - degats, degats };
}

export function finirTour(combat) {
  combat.aQui = combat.aQui === 'joueur' ? 'ennemi' : 'joueur';
  if (combat.aQui === 'joueur') combat.tour++;
}

export function marquerDefaite(combat) {
  combat.termine = true;
  combat.vainqueur = 'ennemi';
}

/** Test de fuite. `chance` est un pourcentage. */
export function tenterFuite(chance, rng) {
  return rng.int(1, 100) <= chance;
}
