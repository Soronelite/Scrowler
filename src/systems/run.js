/**
 * run.js — Déroulement d'une run.
 *
 * C'est le seul module qui enchaîne les systèmes. Il ne contient aucun texte
 * de rencontre ni aucune donnée d'ennemi : il lit `monde.js`.
 *
 * Il ne touche pas au DOM. L'interface s'abonne à `onChangement`.
 */

import { createRng } from '../core/rng.js';
import { ModifierPipeline } from '../core/modifiers.js';
import { RENCONTRES, ENNEMI_PAR_ID } from '../data/monde.js';
import { objet, OBJET_PAR_ID } from '../data/objets.js';
import { RARETE_PAR_ID } from '../data/personnage.js';
import { armureTotale, soigner, blesser, estMort } from './personnage.js';
import * as Inv from './inventaire.js';
import * as Combat from './combat.js';
import { tirer } from './loot.js';
import { PROVISOIRE } from '../rules/provisoire.js';

export const PHASES = {
  EXPLORATION: 'exploration',
  COMBAT: 'combat',
  APRES_COMBAT: 'apres_combat',
  FIN: 'fin',
};

export function creerRun(personnage, { graine = Date.now() } = {}) {
  const run = {
    personnage,
    rng: createRng(graine),
    graine,
    pipeline: new ModifierPipeline(),
    indexPiece: 0,
    phase: PHASES.EXPLORATION,
    combat: null,
    actionsFaites: new Set(),
    journal: [],
    issue: null, // 'mort' | 'termine'
    onChangement: null,
  };

  entrerDansLaPiece(run);
  return run;
}

/* ------------------------------------------------------------------ */

function noter(run, texte, type = 'recit') {
  run.journal.push({ texte, type });
}

function prevenir(run) {
  run.onChangement?.(run);
}

export function pieceCourante(run) {
  return RENCONTRES[run.indexPiece] ?? null;
}

export function progression(run) {
  return { piece: run.indexPiece + 1, total: RENCONTRES.length };
}

function cleAction(run, actionId) {
  return `${run.indexPiece}:${actionId}`;
}

/* ------------------------------------------------------------------ */

function entrerDansLaPiece(run) {
  const piece = pieceCourante(run);
  if (!piece) return terminer(run, 'termine');

  run.phase = PHASES.EXPLORATION;
  run.combat = null;
  noter(run, `— ${piece.lieu} —`, 'lieu');
  noter(run, piece.description);
  if (piece.apparition) noter(run, piece.apparition, 'alerte');
}

function terminer(run, issue) {
  run.phase = PHASES.FIN;
  run.issue = issue;
  run.combat = null;
  noter(
    run,
    issue === 'mort'
      ? `${run.personnage.nom} s'effondre. La run s'arrête ici.`
      : 'Les trois pièces sont derrière toi.',
    issue === 'mort' ? 'alerte' : 'lieu'
  );
}

/* ------------------------------------------------------------------ */
/* Actions de rencontre                                                */
/* ------------------------------------------------------------------ */

/** Actions proposées par la pièce, selon la phase. */
export function actionsDeRencontre(run) {
  const piece = pieceCourante(run);
  if (!piece) return [];

  let source = [];
  if (run.phase === PHASES.EXPLORATION) source = piece.actions ?? [];
  else if (run.phase === PHASES.APRES_COMBAT) source = piece.apresCombat ?? [];

  return source.filter((a) => !(a.uneFois && run.actionsFaites.has(cleAction(run, a.id))));
}

export function executerAction(run, actionId) {
  const action = actionsDeRencontre(run).find((a) => a.id === actionId);
  if (!action) return;

  switch (action.type) {
    case 'combat':
      engagerCombat(run, false);
      break;
    case 'fuite':
      fuir(run, action);
      break;
    case 'loot':
      fouiller(run, action);
      break;
    case 'avancer':
      avancer(run);
      break;
    default:
      noter(run, `Action non implémentée : ${action.type}`, 'alerte');
  }
  prevenir(run);
}

function engagerCombat(run, ennemiCommence) {
  const piece = pieceCourante(run);
  run.combat = Combat.creerCombat(piece.ennemi, { ennemiCommence });
  run.phase = PHASES.COMBAT;

  if (ennemiCommence) riposteEnnemi(run);
  else noter(run, `Le combat commence contre ${run.combat.ennemi.nom}.`, 'alerte');
}

function fuir(run, action) {
  const reussi = Combat.tenterFuite(action.chance, run.rng);
  noter(run, `Tentative de fuite (${action.chance} %) : ${reussi ? 'réussie' : 'échouée'}.`, 'jet');

  if (reussi) {
    noter(run, action.reussite);
    avancer(run);
  } else {
    noter(run, action.echec, 'alerte');
    engagerCombat(run, action.ennemiCommenceSiEchec === true);
  }
}

function fouiller(run, action) {
  run.actionsFaites.add(cleAction(run, action.id));

  const trouve = tirer(action.table, run.rng);
  if (!trouve) {
    noter(run, 'La fouille ne donne rien.');
    return;
  }

  const slot = Inv.ajouter(run.personnage.inventaire, trouve.id);
  const rarete = RARETE_PAR_ID[trouve.rarete].nom;

  if (slot) {
    noter(run, `Tu trouves : ${trouve.nom} (${rarete}).`, 'butin');
  } else if (PROVISOIRE.loot.siInventairePlein === 'refuser') {
    noter(
      run,
      `Tu trouves ${trouve.nom} (${rarete}), mais l'inventaire est plein. L'objet reste sur place.`,
      'alerte'
    );
  }
}

function avancer(run) {
  run.indexPiece++;
  if (run.indexPiece >= RENCONTRES.length) terminer(run, 'termine');
  else entrerDansLaPiece(run);
}

/* ------------------------------------------------------------------ */
/* Objets utilisables                                                  */
/* ------------------------------------------------------------------ */

/** Objets que le joueur peut utiliser dans la phase courante. */
export function objetsUtilisables(run) {
  const enCombat = run.phase === PHASES.COMBAT;

  return run.personnage.inventaire.contenu
    .map((slot) => ({ slot, def: objet(slot.objetId) }))
    .filter(({ def }) => {
      if (!def.action) return false;
      if (def.action.cible === 'ennemi' || def.action.type === 'attaque') return enCombat;
      return run.phase !== PHASES.FIN;
    });
}

/** Attaque de repli, proposée en combat quand aucune arme n'est possédée. */
export function attaqueDeRepli(run) {
  if (run.phase !== PHASES.COMBAT) return null;
  if (Inv.armes(run.personnage.inventaire).length > 0) return null;
  return PROVISOIRE.combat.attaqueSansArme;
}

export function utiliserObjet(run, uid) {
  const slot = Inv.trouver(run.personnage.inventaire, uid);
  if (!slot) return;
  const def = objet(slot.objetId);
  const action = def.action;
  if (!action) return;

  let tourConsomme = false;

  switch (action.type) {
    case 'attaque':
      frapper(run, def.nom, action.des);
      tourConsomme = true;
      break;

    case 'degats':
      frapper(run, def.nom, action.des, { ignoreArmure: false });
      tourConsomme = true;
      break;

    case 'soin': {
      const rendus = soigner(run.personnage, action.pv);
      noter(
        run,
        rendus > 0
          ? `${action.verbe} : ${def.nom} rend ${rendus} PV.`
          : `${def.nom} : tu es déjà au maximum.`,
        'soin'
      );
      tourConsomme = run.phase === PHASES.COMBAT;
      break;
    }

    case 'inerte':
      noter(run, action.message ?? `${def.nom} : aucun effet pour l'instant.`);
      break;

    default:
      noter(run, `Effet non implémenté : ${action.type}`, 'alerte');
  }

  if (action.consomme && PROVISOIRE.objets.consommablesDetruitsApresUsage) {
    Inv.retirer(run.personnage.inventaire, uid);
  }

  finirTourJoueur(run, tourConsomme);
  prevenir(run);
}

export function utiliserAttaqueDeRepli(run) {
  const repli = attaqueDeRepli(run);
  if (!repli) return;
  frapper(run, repli.nom, repli.des);
  finirTourJoueur(run, true);
  prevenir(run);
}

function frapper(run, source, des) {
  const r = Combat.frapperEnnemi(run.combat, des, {
    rng: run.rng,
    pipeline: run.pipeline,
    personnage: run.personnage,
  });

  const detail = r.absorbe > 0 ? ` (${r.brut} − ${r.absorbe} d'armure)` : '';
  noter(run, `${source} : ${r.jet.describe()}`, 'jet');
  noter(run, `${r.degats} dégâts${detail}. ${run.combat.ennemi.nom} : ${run.combat.ennemi.pv} PV.`, 'degats');

  if (r.mort) {
    noter(run, `${run.combat.ennemi.nom} est vaincu.`, 'victoire');
    run.phase = PHASES.APRES_COMBAT;
  }
}

function finirTourJoueur(run, tourConsomme) {
  if (!tourConsomme || run.phase !== PHASES.COMBAT) return;
  Combat.finirTour(run.combat);
  riposteEnnemi(run);
}

function riposteEnnemi(run) {
  const r = Combat.riposte(run.combat, {
    rng: run.rng,
    pipeline: run.pipeline,
    personnage: run.personnage,
    armureJoueur: armureTotale(run.personnage),
  });

  const detail = r.absorbe > 0 ? ` (${r.brut} − ${r.absorbe} d'armure)` : '';
  noter(run, `${run.combat.ennemi.nom} attaque : ${r.jet.describe()}`, 'jet');

  const subis = blesser(run.personnage, r.degats);
  noter(
    run,
    subis > 0
      ? `Tu subis ${subis} dégâts${detail}. ${run.personnage.pv} / ${run.personnage.pvMax} PV.`
      : `L'attaque ne passe pas ton armure${detail}.`,
    'degats'
  );

  if (estMort(run.personnage)) {
    Combat.marquerDefaite(run.combat);
    terminer(run, 'mort');
    return;
  }

  Combat.finirTour(run.combat);
}

/* ------------------------------------------------------------------ */

export function resume(run) {
  return {
    nom: run.personnage.nom,
    pv: run.personnage.pv,
    pvMax: run.personnage.pvMax,
    armure: armureTotale(run.personnage),
    piece: progression(run),
    phase: run.phase,
    issue: run.issue,
    ennemi: run.combat?.ennemi ?? null,
    graine: run.graine,
  };
}

export { OBJET_PAR_ID, ENNEMI_PAR_ID };
