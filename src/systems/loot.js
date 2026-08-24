/**
 * loot.js — Sélection d'un objet dans une table.
 *
 * Une table déclare soit une liste explicite de raretés, soit un plafond.
 * Le plafond est une règle décidée par les rencontres (« Commun au maximum »).
 * La pondération à l'intérieur du plafond est provisoire.
 */

import { OBJETS } from '../data/objets.js';
import { TABLES_LOOT } from '../data/monde.js';
import { raretesJusqua } from '../data/personnage.js';
import { PROVISOIRE } from '../rules/provisoire.js';

/** Raretés autorisées par une table. */
export function raretesAutorisees(tableId) {
  const table = TABLES_LOOT[tableId];
  if (!table) throw new Error(`Table de loot inconnue : ${tableId}`);
  return table.raretes ?? raretesJusqua(table.plafond);
}

/** Objets candidats pour une table. */
export function candidats(tableId) {
  const autorisees = new Set(raretesAutorisees(tableId));
  return OBJETS.filter((o) => autorisees.has(o.rarete));
}

/**
 * Tire un objet. Le tirage se fait en deux temps : d'abord la rareté, pondérée,
 * puis un objet au hasard parmi ceux de cette rareté. Ainsi ajouter dix objets
 * fréquents ne rend pas les fréquents dix fois plus probables.
 */
export function tirer(tableId, rng) {
  const disponibles = candidats(tableId);
  if (disponibles.length === 0) return null;

  const poids = PROVISOIRE.loot.poidsParRarete;
  const parRarete = new Map();
  for (const o of disponibles) {
    if (!parRarete.has(o.rarete)) parRarete.set(o.rarete, []);
    parRarete.get(o.rarete).push(o);
  }

  const entrees = [...parRarete.keys()].map((r) => ({ rarete: r, poids: poids[r] ?? 0 }));
  const total = entrees.reduce((s, e) => s + e.poids, 0);
  if (total <= 0) return rng.pick(disponibles);

  let seuil = rng.next() * total;
  for (const e of entrees) {
    seuil -= e.poids;
    if (seuil <= 0) return rng.pick(parRarete.get(e.rarete));
  }
  return rng.pick(parRarete.get(entrees[entrees.length - 1].rarete));
}
