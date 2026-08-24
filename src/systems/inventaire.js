/**
 * inventaire.js — Inventaire en grille.
 *
 * Décidé : grille 4 × 4, chaque objet occupe une forme rectangulaire, jamais
 * en diagonale, rotation autorisée uniquement pour les objets en ligne ou en
 * colonne.
 *
 * Ce module ne touche pas à l'interface : il ne fait que placer et déplacer.
 */

import { objet, estPivotable } from '../data/objets.js';

export const LARGEUR = 4;
export const HAUTEUR = 4;

let compteur = 0;
const nouvelUid = () => `s${++compteur}`;

export function creerInventaire(largeur = LARGEUR, hauteur = HAUTEUR) {
  return { largeur, hauteur, contenu: [] };
}

/** Forme effective d'un emplacement, rotation comprise. */
export function forme(objetId, pivote) {
  const f = objet(objetId).forme;
  return pivote ? { l: f.h, h: f.l } : { l: f.l, h: f.h };
}

/** Cases couvertes par un emplacement. */
export function cases(slot) {
  const f = forme(slot.objetId, slot.pivote);
  const out = [];
  for (let dy = 0; dy < f.h; dy++) {
    for (let dx = 0; dx < f.l; dx++) out.push({ x: slot.x + dx, y: slot.y + dy });
  }
  return out;
}

/** Grille d'occupation : uid ou null pour chaque case. */
export function occupation(inv, ignoreUid = null) {
  const grille = Array.from({ length: inv.hauteur }, () => Array(inv.largeur).fill(null));
  for (const slot of inv.contenu) {
    if (slot.uid === ignoreUid) continue;
    for (const c of cases(slot)) {
      if (grille[c.y]?.[c.x] !== undefined) grille[c.y][c.x] = slot.uid;
    }
  }
  return grille;
}

/** La forme tient-elle à cette position ? */
export function peutPlacer(inv, objetId, x, y, pivote, ignoreUid = null) {
  const f = forme(objetId, pivote);
  if (x < 0 || y < 0 || x + f.l > inv.largeur || y + f.h > inv.hauteur) return false;
  const grille = occupation(inv, ignoreUid);
  for (let dy = 0; dy < f.h; dy++) {
    for (let dx = 0; dx < f.l; dx++) {
      if (grille[y + dy][x + dx] !== null) return false;
    }
  }
  return true;
}

/** Première position libre, en testant les deux orientations si possible. */
export function trouverPlace(inv, objetId) {
  const orientations = estPivotable(objet(objetId)) ? [false, true] : [false];
  for (const pivote of orientations) {
    for (let y = 0; y < inv.hauteur; y++) {
      for (let x = 0; x < inv.largeur; x++) {
        if (peutPlacer(inv, objetId, x, y, pivote)) return { x, y, pivote };
      }
    }
  }
  return null;
}

export function placer(inv, objetId, x, y, pivote = false) {
  if (!peutPlacer(inv, objetId, x, y, pivote)) return null;
  const slot = { uid: nouvelUid(), objetId, x, y, pivote };
  inv.contenu.push(slot);
  return slot;
}

/** Ajoute un objet là où il rentre. Renvoie null si l'inventaire est plein. */
export function ajouter(inv, objetId) {
  const place = trouverPlace(inv, objetId);
  if (!place) return null;
  return placer(inv, objetId, place.x, place.y, place.pivote);
}

export function retirer(inv, uid) {
  const i = inv.contenu.findIndex((s) => s.uid === uid);
  if (i === -1) return null;
  return inv.contenu.splice(i, 1)[0];
}

export function trouver(inv, uid) {
  return inv.contenu.find((s) => s.uid === uid) ?? null;
}

/** Déplace ou pivote un objet déjà présent. Ne fait rien si la place est prise. */
export function deplacer(inv, uid, x, y, pivote) {
  const slot = trouver(inv, uid);
  if (!slot) return false;
  const orientation = pivote ?? slot.pivote;
  if (orientation !== slot.pivote && !estPivotable(objet(slot.objetId))) return false;
  if (!peutPlacer(inv, slot.objetId, x, y, orientation, uid)) return false;
  slot.x = x;
  slot.y = y;
  slot.pivote = orientation;
  return true;
}

export function pivoter(inv, uid) {
  const slot = trouver(inv, uid);
  if (!slot) return false;
  return deplacer(inv, uid, slot.x, slot.y, !slot.pivote);
}

export function casesLibres(inv) {
  return occupation(inv).flat().filter((c) => c === null).length;
}

/** Emplacements dont l'objet correspond à un filtre. */
export function filtrer(inv, predicat) {
  return inv.contenu.filter((s) => predicat(objet(s.objetId), s));
}

export function armes(inv) {
  return filtrer(inv, (o) => o.action?.type === 'attaque');
}

/** Armure totale apportée par les objets possédés. */
export function armureDesObjets(inv) {
  return inv.contenu.reduce((total, s) => total + (objet(s.objetId).passif?.armure ?? 0), 0);
}

/** Sérialisation : le compteur d'uid est reconstruit au chargement. */
export function restaurer(donnees) {
  const inv = {
    largeur: donnees.largeur ?? LARGEUR,
    hauteur: donnees.hauteur ?? HAUTEUR,
    contenu: (donnees.contenu ?? []).map((s) => ({ ...s })),
  };
  for (const s of inv.contenu) {
    const n = Number.parseInt(String(s.uid).slice(1), 10);
    if (Number.isFinite(n)) compteur = Math.max(compteur, n);
  }
  return inv;
}
