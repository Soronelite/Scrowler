/**
 * regles.test.js — Règles décidées lors de la dernière passe.
 *
 * Endurance à 0, torche chiffrée, blocage immédiat, objets au sol,
 * destruction d'objet, parcours de six pièces, niveau du rat.
 */

import { suite, expect } from './harness.js';
import { createRng, createScriptedRng } from '../src/core/rng.js';
import {
  statsParDefaut,
  actionsParTour,
  pointsRestants,
  minimumDe,
  STAT_MIN,
} from '../src/rules/stats.js';
import { tirer, tirerButin, raretesAutorisees } from '../src/systems/loot.js';
import { PARCOURS, LONGUEUR_PARCOURS, ENNEMI_PAR_ID, rencontreAuRang } from '../src/data/monde.js';
import { xpDUnEnnemi } from '../src/rules/xp.js';
import * as Effets from '../src/systems/effets.js';
import * as Inv from '../src/systems/inventaire.js';
import * as Run from '../src/systems/run.js';
import { creerPersonnage, actionsDisponibles, armureTotale } from '../src/systems/personnage.js';
import { objet } from '../src/data/objets.js';

const heros = (stats = {}) =>
  creerPersonnage({
    nom: 'Test', race: 'humain', sexe: 'homme', classe: 'chevalier',
    stats: { ...statsParDefaut(), ...stats },
  });

/* ------------------------------------------------------------------ */

suite('Endurance', ({ test }) => {
  test('l’Endurance démarre à 0, les autres statistiques à 2', () => {
    const s = statsParDefaut();
    expect(s.endurance).toBe(0);
    expect(s.sante).toBe(2);
  });

  test('son minimum lui est propre', () => {
    expect(minimumDe('endurance')).toBe(0);
    expect(minimumDe('sante')).toBe(STAT_MIN);
  });

  test('0 endurance donne 1 action', () => {
    expect(actionsParTour(statsParDefaut())).toBe(1);
  });

  test('la deuxième action arrive à 3 points, pas avant', () => {
    expect(actionsParTour({ endurance: 2 })).toBe(1);
    expect(actionsParTour({ endurance: 3 })).toBe(2);
    expect(actionsParTour({ endurance: 5 })).toBe(2);
    expect(actionsParTour({ endurance: 6 })).toBe(3);
  });

  test('les deux points de création ne suffisent plus à doubler les actions', () => {
    const s = { ...statsParDefaut(), endurance: 2 };
    expect(pointsRestants(s)).toBe(0);
    expect(actionsParTour(s)).toBe(1);
  });

  test('une potion d’endurance ajoute une action', () => {
    const p = heros();
    const effets = [{ id: 'e', actions: 1 }];
    expect(actionsDisponibles(p, effets)).toBe(2);
  });
});

/* ------------------------------------------------------------------ */

suite('Torche', ({ test }) => {
  test('elle ne franchit jamais le plafond de rareté de la table', () => {
    const rng = createRng('plafond');
    const autorisees = new Set(raretesAutorisees('jusqu_commun'));
    for (let i = 0; i < 3000; i++) {
      expect(autorisees.has(tirer('jusqu_commun', rng, { lootAmeliore: true }).rarete)).toBe(true);
    }
  });

  test('une fouille de cadavre reste bloquée sur le fréquent même allumée', () => {
    const rng = createRng('cadavre');
    for (let i = 0; i < 500; i++) {
      expect(tirer('frequent_seul', rng, { lootAmeliore: true }).rarete).toBe('frequent');
    }
  });

  test('elle déplace bien la rareté vers le haut', () => {
    const compter = (bonus) => {
      const rng = createRng('deplacement');
      let hauts = 0;
      for (let i = 0; i < 8000; i++) {
        if (tirer('jusqu_peu_commun', rng, { lootAmeliore: bonus }).rarete !== 'frequent') hauts++;
      }
      return hauts;
    };
    expect(compter(true) > compter(false)).toBe(true);
  });

  test('elle double le butin environ une fois sur quatre', () => {
    const rng = createRng('double');
    let doubles = 0;
    for (let i = 0; i < 8000; i++) {
      if (tirerButin('jusqu_commun', rng, { lootAmeliore: true }).length === 2) doubles++;
    }
    expect(doubles).toBeWithin(1800, 2200);
  });

  test('sans torche le butin est toujours d’un seul objet', () => {
    const rng = createRng('simple');
    for (let i = 0; i < 500; i++) {
      expect(tirerButin('jusqu_commun', rng).length).toBe(1);
    }
  });
});

/* ------------------------------------------------------------------ */

suite('Blocage du bouclier', ({ test }) => {
  test('le blocage est actif dès le tour où il est déclenché', () => {
    const liste = Effets.creerListeEffets();
    Effets.appliquer(liste, objet('bouclier_bois').action.effet);
    expect(Effets.bonusArmure(liste)).toBe(4);
  });

  test('il protège de la riposte du tour en cours', () => {
    const p = heros();
    const liste = Effets.creerListeEffets();
    const avant = armureTotale(p, liste);
    Effets.appliquer(liste, objet('bouclier_bois').action.effet);
    expect(armureTotale(p, liste)).toBe(avant + 4);
  });

  test('il ne dure pas au-delà du tour', () => {
    const liste = Effets.creerListeEffets();
    Effets.appliquer(liste, objet('bouclier_bois').action.effet);
    Effets.finDeTour(liste);
    expect(Effets.bonusArmure(liste)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

suite('Objets au sol', ({ test }) => {
  test('un objet qui ne rentre pas reste au sol et n’est pas perdu', () => {
    const p = heros();
    // Saturer la grille : quatre colonnes de quatre cases.
    p.inventaire.contenu = [];
    for (let x = 0; x < 4; x++) Inv.placer(p.inventaire, 'epee_deux_mains', x, 0);
    expect(Inv.casesLibres(p.inventaire)).toBe(0);

    const run = Run.creerRun(p, { graine: 'sol' });
    Run.executerAction(run, 'attaquer');

    let garde = 0;
    while (run.phase === Run.PHASES.COMBAT && garde++ < 200) {
      const arme = Run.objetsUtilisables(run).find((u) => u.def.action.type === 'attaque');
      if (!arme) break;
      Run.utiliserObjet(run, arme.slot.uid);
    }

    const fouille = Run.actionsDeRencontre(run).find((a) => a.type === 'loot');
    expect(Boolean(fouille)).toBe(true);
    Run.executerAction(run, fouille.id);

    expect(Run.butinAuSol(run).length > 0).toBe(true);
  });

  test('libérer de la place permet de le ramasser', () => {
    const p = heros();
    p.inventaire.contenu = [];
    for (let x = 0; x < 4; x++) Inv.placer(p.inventaire, 'epee_deux_mains', x, 0);

    const run = Run.creerRun(p, { graine: 'sol2' });
    run.objetsAuSol.set(run.indexPiece, ['dague']);

    expect(Run.ramasserAuSol(run, 'dague')).toBe(false);
    Run.jeterObjet(run, p.inventaire.contenu[0].uid);
    expect(Run.ramasserAuSol(run, 'dague')).toBe(true);
    expect(Run.butinAuSol(run).length).toBe(0);
  });

  test('l’objet au sol est proposé comme action', () => {
    const p = heros();
    const run = Run.creerRun(p, { graine: 'sol3' });
    run.objetsAuSol.set(run.indexPiece, ['dague']);
    const actions = Run.actionsDeRencontre(run);
    expect(actions.some((a) => a.type === 'ramasser')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

suite('Jeter un objet', ({ test }) => {
  test('l’objet est retiré de l’inventaire', () => {
    const p = heros();
    const run = Run.creerRun(p, { graine: 'jet' });
    const avant = p.inventaire.contenu.length;
    Run.jeterObjet(run, p.inventaire.contenu[0].uid);
    expect(p.inventaire.contenu.length).toBe(avant - 1);
  });

  test('jeter un anneau de vigueur ramène les PV sous le nouveau maximum', () => {
    const p = heros();
    const run = Run.creerRun(p, { graine: 'anneau' });
    const slot = Inv.ajouter(p.inventaire, 'anneau_vigueur');
    p.pv = 12;
    Run.jeterObjet(run, slot.uid);
    expect(p.pv).toBe(10);
  });

  test('un identifiant inconnu ne casse rien', () => {
    const p = heros();
    const run = Run.creerRun(p, { graine: 'jet2' });
    expect(Run.jeterObjet(run, 'inexistant')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

suite('Parcours', ({ test }) => {
  test('le parcours compte six pièces', () => {
    expect(LONGUEUR_PARCOURS).toBe(6);
  });

  test('les trois rencontres sont répétées une fois', () => {
    expect(PARCOURS).toEqual([
      'cave_lugubre', 'cellier', 'couloir_garde',
      'cave_lugubre', 'cellier', 'couloir_garde',
    ]);
  });

  test('une répétition redonne bien la même rencontre', () => {
    expect(rencontreAuRang(0).id).toBe(rencontreAuRang(3).id);
  });

  test('la fouille d’une pièce répétée est de nouveau disponible', () => {
    const p = heros();
    const run = Run.creerRun(p, { graine: 'repet' });
    run.actionsFaites.add('1:fouiller_piece');
    run.indexPiece = 4; // cellier, deuxième passage
    run.phase = Run.PHASES.EXPLORATION;
    expect(Run.actionsDeRencontre(run).some((a) => a.id === 'fouiller_piece')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

suite('Niveaux d’ennemis', ({ test }) => {
  test('le rat géant est de niveau 1 et rapporte 5 XP', () => {
    expect(ENNEMI_PAR_ID.rat_geant.niveau).toBe(1);
    expect(xpDUnEnnemi(1)).toBe(5);
  });

  test('le garde est de niveau 3 et rapporte 12 XP', () => {
    expect(ENNEMI_PAR_ID.garde.niveau).toBe(3);
    expect(xpDUnEnnemi(3)).toBe(12);
  });

  test('un parcours complet rapporte assez d’XP pour dépasser le niveau 2', () => {
    // 2 rats + 2 gardes + 5 transitions = 5+5+12+12+10 = 44 XP
    const total = 2 * xpDUnEnnemi(1) + 2 * xpDUnEnnemi(3) + 5 * 2;
    expect(total).toBe(44);
  });
});
