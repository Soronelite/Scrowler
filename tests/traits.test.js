/**
 * traits.test.js — Traits de race, de sexe et de classe.
 */

import { suite, expect } from './harness.js';
import { createScriptedRng } from '../src/core/rng.js';
import { roll } from '../src/core/dice.js';
import { statsParDefaut } from '../src/rules/stats.js';
import {
  creerPersonnage, pvMaxTotal, armureTotale, statsEffectives, traitsDe,
} from '../src/systems/personnage.js';
import * as Traits from '../src/systems/traits.js';
import * as Effets from '../src/systems/effets.js';
import { TRAITS, TRAIT_PAR_ID, traitsDIdentite } from '../src/data/traits.js';
import { RACES, SEXES, CLASSES } from '../src/data/personnage.js';

const perso = (race = 'humain', sexe = 'homme', classe = 'chevalier') =>
  creerPersonnage({ nom: 'Test', race, sexe, classe, stats: statsParDefaut() });

/* ------------------------------------------------------------------ */

suite('Catalogue de traits', ({ test }) => {
  test('chaque trait déclare un type et une origine', () => {
    for (const t of TRAITS) {
      expect(['positif', 'negatif'].includes(t.type)).toBe(true);
      expect(typeof t.origine).toBe('string');
    }
  });

  test('chaque race accorde un trait', () => {
    for (const race of RACES) {
      expect(traitsDIdentite({ race: race.id, sexe: 'homme', classe: 'chevalier' }).length >= 2)
        .toBe(true);
    }
  });

  test('le sexe n’accorde encore aucun trait, mais la structure existe', () => {
    for (const sexe of SEXES) {
      const avec = traitsDIdentite({ race: 'humain', sexe: sexe.id, classe: 'chevalier' });
      expect(avec.length).toBe(2);
    }
  });

  test('chaque classe accorde un trait', () => {
    for (const c of CLASSES) {
      expect(traitsDIdentite({ race: 'humain', sexe: 'homme', classe: c.id }).length >= 2)
        .toBe(true);
    }
  });

  test('tous les identifiants référencés existent', () => {
    for (const race of RACES) {
      for (const id of traitsDIdentite({ race: race.id, sexe: 'homme', classe: 'chevalier' })) {
        expect(Boolean(TRAIT_PAR_ID[id])).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------ */

suite('Traits de race', ({ test }) => {
  test('l’humain gagne 2 en Santé, soit 4 PV', () => {
    const p = perso('humain');
    expect(statsEffectives(p).sante).toBe(4);
    expect(pvMaxTotal(p)).toBe(16);
  });

  test('le nain gagne 2 d’armure', () => {
    expect(armureTotale(perso('nain'))).toBe(armureTotale(perso('elfe')) + 2);
  });

  test('l’elfe gagne 2 en Intelligence', () => {
    expect(statsEffectives(perso('elfe')).intelligence).toBe(4);
  });

  test('l’orc gagne 2 dégâts sur ses attaques', () => {
    expect(Traits.bonusDeTraits(perso('orc')).degats).toBe(3); // 2 orc + 1 chevalier
  });

  test('un trait de race ne profite pas aux autres races', () => {
    expect(statsEffectives(perso('nain')).sante).toBe(2);
    expect(statsEffectives(perso('humain')).intelligence).toBe(2);
  });
});

/* ------------------------------------------------------------------ */

suite('Trait de classe', ({ test }) => {
  test('le chevalier gagne armure, dégâts, Charisme et Courage', () => {
    const p = perso('elfe');
    const s = statsEffectives(p);
    expect(s.charisme).toBe(3);
    expect(s.courage).toBe(3);
    expect(Traits.bonusDeTraits(p).armure).toBe(1);
    expect(Traits.bonusDeTraits(p).degats).toBe(1);
  });

  test('les traits de race et de classe se cumulent', () => {
    const p = perso('nain');
    expect(Traits.bonusDeTraits(p).armure).toBe(3); // 2 nain + 1 chevalier
  });
});

/* ------------------------------------------------------------------ */

suite('Effets des traits en jeu', ({ test }) => {
  test('le bonus de dégâts s’applique aux attaques du joueur', () => {
    const p = perso('orc');
    const pipeline = Effets.construirePipeline(p.portage, [], Traits.bonusDeTraits(p));
    const jet = roll('2d6', {
      rng: createScriptedRng([3, 3]), pipeline, tags: ['degats', 'joueur'],
    });
    expect(jet.total).toBe(9); // 6 + 3
  });

  test('il ne profite pas à l’ennemi', () => {
    const p = perso('orc');
    const pipeline = Effets.construirePipeline(p.portage, [], Traits.bonusDeTraits(p));
    const jet = roll('2d6', {
      rng: createScriptedRng([3, 3]), pipeline, tags: ['degats', 'ennemi'],
    });
    expect(jet.total).toBe(6);
  });

  test('il ne s’applique pas aux jets qui ne sont pas des dégâts', () => {
    const p = perso('orc');
    const pipeline = Effets.construirePipeline(p.portage, [], Traits.bonusDeTraits(p));
    const jet = roll('1d10', {
      rng: createScriptedRng([5]), pipeline, tags: ['initiative', 'joueur'],
    });
    expect(jet.total).toBe(5);
  });

  test('les statistiques de base ne sont jamais modifiées', () => {
    const p = perso('humain');
    // La couche de traits reste séparée de la répartition du joueur.
    expect(p.stats.sante).toBe(2);
    expect(statsEffectives(p).sante).toBe(4);
  });
});

/* ------------------------------------------------------------------ */

suite('Traits acquis en jeu', ({ test }) => {
  test('un trait peut être ajouté après coup', () => {
    const p = perso('elfe');
    const avant = armureTotale(p);
    Traits.ajouterTrait(p, 'cuir_epais');
    expect(armureTotale(p)).toBe(avant + 2);
  });

  test('un doublon est ignoré', () => {
    const p = perso('nain');
    expect(Traits.ajouterTrait(p, 'cuir_epais')).toBe(true);
    const avec = armureTotale(p);
    Traits.ajouterTrait(p, 'cuir_epais');
    expect(armureTotale(p)).toBe(avec);
  });

  test('un trait acquis peut être retiré', () => {
    const p = perso('elfe');
    const avant = armureTotale(p);
    Traits.ajouterTrait(p, 'cuir_epais');
    Traits.retirerTrait(p, 'cuir_epais');
    expect(armureTotale(p)).toBe(avant);
  });

  test('un identifiant inconnu est refusé', () => {
    const p = perso();
    expect(() => Traits.ajouterTrait(p, 'inexistant')).toThrow('inconnu');
  });

  test('possede reconnaît les traits d’identité comme les acquis', () => {
    const p = perso('nain');
    expect(Traits.possede(p, 'cuir_epais')).toBe(true);
    expect(Traits.possede(p, 'esprit_elfique')).toBe(false);
    Traits.ajouterTrait(p, 'esprit_elfique');
    expect(Traits.possede(p, 'esprit_elfique')).toBe(true);
  });

  test('les traits actifs sont exposés pour l’affichage', () => {
    expect(traitsDe(perso('orc')).map((t) => t.id))
      .toEqual(['force_brute', 'entrainement_chevaleresque']);
  });
});
