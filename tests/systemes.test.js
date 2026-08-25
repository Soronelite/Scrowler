/**
 * systemes.test.js — Tests des systèmes de jeu.
 *
 * Ces tests vérifient les règles décidées. Les règles provisoires sont testées
 * telles qu'elles sont actuellement réglées : si une décision change, un test
 * doit échouer, ce qui est le comportement voulu.
 */

import { suite, expect } from './harness.js';
import { createRng, createScriptedRng } from '../src/core/rng.js';
import * as Inv from '../src/systems/inventaire.js';
import { degatsApresArmure, creerCombat, frapperEnnemi, tenterFuite } from '../src/systems/combat.js';
import { creerPersonnage, armureTotale, soigner, blesser } from '../src/systems/personnage.js';
import { tirer, raretesAutorisees, candidats } from '../src/systems/loot.js';
import { statsParDefaut, pvMax, armureDeBase, pointsRestants } from '../src/rules/stats.js';
import { estPivotable, objet } from '../src/data/objets.js';

/* ------------------------------------------------------------------ */

suite('Inventaire', ({ test }) => {
  test('la grille fait 4 sur 4', () => {
    const inv = Inv.creerInventaire();
    expect(inv.largeur).toBe(4);
    expect(Inv.casesLibres(inv)).toBe(16);
  });

  test('une épée à deux mains occupe une colonne entière', () => {
    const inv = Inv.creerInventaire();
    Inv.placer(inv, 'epee_deux_mains', 0, 0);
    expect(Inv.casesLibres(inv)).toBe(12);
  });

  test('deux objets ne peuvent pas se superposer', () => {
    const inv = Inv.creerInventaire();
    Inv.placer(inv, 'epee_deux_mains', 0, 0);
    expect(Inv.peutPlacer(inv, 'dague', 0, 2, false)).toBe(false);
    expect(Inv.peutPlacer(inv, 'dague', 1, 2, false)).toBe(true);
  });

  test('un objet ne peut pas dépasser de la grille', () => {
    const inv = Inv.creerInventaire();
    expect(Inv.peutPlacer(inv, 'epee_deux_mains', 0, 1, false)).toBe(false);
  });

  test('un objet en colonne est pivotable, pas un objet d’une case', () => {
    expect(estPivotable(objet('epee_deux_mains'))).toBe(true);
    expect(estPivotable(objet('dague'))).toBe(false);
  });

  test('la rotation transforme une colonne en ligne', () => {
    const inv = Inv.creerInventaire();
    const slot = Inv.placer(inv, 'epee_courte', 0, 0);
    Inv.pivoter(inv, slot.uid);
    expect(Inv.forme(slot.objetId, slot.pivote)).toEqual({ l: 2, h: 1 });
  });

  test('la rotation est refusée si la place manque', () => {
    const inv = Inv.creerInventaire();
    const epee = Inv.placer(inv, 'epee_deux_mains', 0, 0);
    Inv.placer(inv, 'dague', 1, 0);
    expect(Inv.pivoter(inv, epee.uid)).toBe(false);
  });

  test('l’ajout automatique trouve une place, puis échoue quand c’est plein', () => {
    const inv = Inv.creerInventaire();
    for (let i = 0; i < 4; i++) expect(Inv.ajouter(inv, 'epee_deux_mains') !== null).toBe(true);
    expect(Inv.ajouter(inv, 'dague')).toBe(null);
  });

  test('un déplacement sur une case occupée est refusé', () => {
    const inv = Inv.creerInventaire();
    const a = Inv.placer(inv, 'dague', 0, 0);
    Inv.placer(inv, 'dague', 1, 0);
    expect(Inv.deplacer(inv, a.uid, 1, 0, false)).toBe(false);
    expect(Inv.deplacer(inv, a.uid, 2, 0, false)).toBe(true);
  });

  test('les armures cumulent leur passif', () => {
    const inv = Inv.creerInventaire();
    Inv.ajouter(inv, 'bouclier_bois');
    Inv.ajouter(inv, 'casque_fer');
    expect(Inv.armureDesObjets(inv)).toBe(3);
  });

  test('les armes sont repérables', () => {
    const inv = Inv.creerInventaire();
    Inv.ajouter(inv, 'epee_courte');
    Inv.ajouter(inv, 'pain_rassis');
    expect(Inv.armes(inv).length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */

suite('Personnage', ({ test }) => {
  test('les statistiques par défaut valent 2', () => {
    expect(statsParDefaut().sante).toBe(2);
  });

  test('les statistiques par défaut donnent 10 PV et 0 armure', () => {
    const s = statsParDefaut();
    expect(pvMax(s)).toBe(10);
    expect(armureDeBase(s)).toBe(0);
  });

  test('un point de santé donne 2 PV, un point de défense donne 1 armure', () => {
    const s = { ...statsParDefaut(), sante: 4, defense: 3 };
    expect(pvMax(s)).toBe(14);
    expect(armureDeBase(s)).toBe(1);
  });

  test('deux points seulement sont répartissables', () => {
    expect(pointsRestants(statsParDefaut())).toBe(2);
    expect(pointsRestants({ ...statsParDefaut(), sante: 4 })).toBe(0);
  });

  test('le chevalier démarre avec ses deux objets', () => {
    const p = creerPersonnage({
      nom: 'Test', race: 'humain', sexe: 'homme', classe: 'chevalier',
      stats: statsParDefaut(),
    });
    expect(p.inventaire.contenu.length).toBe(2);
    expect(p.pv).toBe(10);
  });

  test('l’armure des objets s’ajoute à celle des statistiques', () => {
    const p = creerPersonnage({
      nom: 'Test', race: 'humain', sexe: 'homme', classe: 'chevalier',
      stats: { ...statsParDefaut(), defense: 4 },
    });
    Inv.ajouter(p.inventaire, 'casque_fer');
    expect(armureTotale(p)).toBe(3);
  });

  test('les soins ne dépassent pas le maximum', () => {
    const p = creerPersonnage({
      nom: 'Test', race: 'humain', sexe: 'homme', classe: 'chevalier',
      stats: statsParDefaut(),
    });
    blesser(p, 3);
    expect(soigner(p, 10)).toBe(3);
    expect(p.pv).toBe(10);
  });
});

/* ------------------------------------------------------------------ */

suite('Combat', ({ test }) => {
  test('l’armure se soustrait aux dégâts', () => {
    expect(degatsApresArmure(9, 4)).toBe(5);
  });

  test('une attaque trop faible ne fait rien', () => {
    expect(degatsApresArmure(3, 4)).toBe(0);
  });

  test('le rat géant a 10 PV et aucune armure', () => {
    const c = creerCombat('rat_geant');
    expect(c.ennemi.pv).toBe(10);
    expect(c.ennemi.armure).toBe(0);
  });

  test('le garde a 15 PV et 4 d’armure', () => {
    const c = creerCombat('garde');
    expect(c.ennemi.pv).toBe(15);
    expect(c.ennemi.armure).toBe(4);
  });

  test('un coup d’épée retire des PV au rat', () => {
    const c = creerCombat('rat_geant');
    const r = frapperEnnemi(c, '2d6', { rng: createScriptedRng([3, 3]), personnage: null });
    expect(r.degats).toBe(6);
    expect(c.ennemi.pv).toBe(4);
  });

  test('l’ennemi meurt à zéro PV et le combat se termine', () => {
    const c = creerCombat('rat_geant');
    frapperEnnemi(c, '2d6', { rng: createScriptedRng([6, 6]), personnage: null });
    frapperEnnemi(c, '2d6', { rng: createScriptedRng([6, 6]), personnage: null });
    expect(c.termine).toBe(true);
    expect(c.vainqueur).toBe('joueur');
  });

  test('la fuite à 50 % réussit environ une fois sur deux', () => {
    const rng = createRng('fuite');
    let reussies = 0;
    for (let i = 0; i < 4000; i++) if (tenterFuite(50, rng)) reussies++;
    expect(reussies).toBeWithin(1850, 2150);
  });
});

/* ------------------------------------------------------------------ */

suite('Loot', ({ test }) => {
  test('une fouille de cadavre ne donne que du fréquent', () => {
    expect(raretesAutorisees('frequent_seul')).toEqual(['frequent']);
  });

  test('« jusqu’à commun » exclut le peu commun', () => {
    expect(raretesAutorisees('jusqu_commun')).toEqual(['frequent', 'commun']);
  });

  test('« jusqu’à peu commun » s’arrête au peu commun', () => {
    expect(raretesAutorisees('jusqu_peu_commun')).toEqual(['frequent', 'commun', 'peu_commun']);
  });

  test('aucun tirage ne dépasse le plafond, sur mille fouilles', () => {
    const rng = createRng('loot');
    const autorisees = new Set(raretesAutorisees('jusqu_commun'));
    for (let i = 0; i < 1000; i++) {
      expect(autorisees.has(tirer('jusqu_commun', rng).rarete)).toBe(true);
    }
  });

  test('la table de cadavre ne peut sortir que des objets fréquents', () => {
    expect(candidats('frequent_seul').every((o) => o.rarete === 'frequent')).toBe(true);
  });

  test('les trois raretés apparaissent bien dans la table du cellier', () => {
    const rng = createRng('cellier');
    const vues = new Set();
    for (let i = 0; i < 2000; i++) vues.add(tirer('jusqu_peu_commun', rng).rarete);
    expect(vues.size).toBe(3);
  });
});
