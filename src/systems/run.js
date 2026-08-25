/**
 * run.js — Déroulement d'une run.
 *
 * Seul module qui enchaîne les systèmes. Il ne contient aucun texte de
 * rencontre, aucune donnée d'ennemi et aucune valeur d'équilibrage.
 */

import { createRng } from '../core/rng.js';
import { rencontreAuRang, LONGUEUR_PARCOURS, ENNEMI_PAR_ID } from '../data/monde.js';
import { objet, OBJET_PAR_ID } from '../data/objets.js';
import { RARETE_PAR_ID } from '../data/personnage.js';
import {
  armureTotale,
  actionsDisponibles,
  pvMaxTotal,
  soigner,
  blesser,
  estMort,
  apresGainDeStatistique,
} from './personnage.js';
import * as Inv from './inventaire.js';
import * as Combat from './combat.js';
import * as Effets from './effets.js';
import * as Prog from './progression.js';
import { cible as competence } from './competences.js';
import { tirerButin } from './loot.js';
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
    effets: Effets.creerListeEffets(),
    indexPiece: 0,
    phase: PHASES.EXPLORATION,
    combat: null,
    actionsFaites: new Set(),
    transitionsRecompensees: new Set(),
    /** Objets trouvés mais non ramassés, par rang de parcours. */
    objetsAuSol: new Map(),
    journal: [],
    issue: null,
    onChangement: null,
  };

  entrerDansLaPiece(run);
  return run;
}

/* ------------------------------------------------------------------ */

function noter(run, texte, type = 'recit') {
  run.journal.push({ texte, type, piece: run.indexPiece });
}

const prevenir = (run) => run.onChangement?.(run);

export function pieceCourante(run) {
  return rencontreAuRang(run.indexPiece);
}

export function progression(run) {
  return { piece: run.indexPiece + 1, total: LONGUEUR_PARCOURS };
}

const cleAction = (run, id) => `${run.indexPiece}:${id}`;

/** Pipeline reconstruit à chaque jet, à partir de l'inventaire et des effets. */
const pipelineDe = (run) => Effets.construirePipeline(run.personnage.inventaire, run.effets);

/* ------------------------------------------------------------------ */
/* Expérience                                                          */
/* ------------------------------------------------------------------ */

function donnerXp(run, montant, raison) {
  if (montant <= 0) return;
  const prog = run.personnage.progression;
  const dejaAuMax = prog.niveau >= Prog.NIVEAU_MAX;
  const resultat = Prog.gagnerXp(prog, montant);

  noter(run, `+${montant} XP — ${raison}`, 'xp');

  if (dejaAuMax) {
    noter(run, 'Niveau maximum atteint : l’XP est enregistrée sans effet.', 'xp');
    return;
  }

  for (const gain of resultat.niveauxGagnes) {
    noter(
      run,
      `NIVEAU SUPÉRIEUR ! Niveau ${gain.niveau} — ${gain.points} point${gain.points > 1 ? 's' : ''} de compétence.`,
      'niveau'
    );
  }

  const avancement = Prog.avancement(prog);
  noter(
    run,
    avancement.complet
      ? `Niveau ${prog.niveau} — maximum atteint`
      : `Niveau ${prog.niveau} — ${avancement.actuel} / ${avancement.requis} XP`,
    'xp'
  );
}

/** Vrai tant que le joueur doit attribuer des points avant de continuer. */
export function attendUnChoixDeCompetence(run) {
  return run.personnage.progression.pointsDisponibles > 0;
}

export function attribuerPoint(run, cibleId) {
  const prog = run.personnage.progression;
  if (prog.pointsDisponibles <= 0) return false;

  const c = competence(cibleId);
  if (c.disponible && !c.disponible(run.personnage)) return false;

  c.appliquer(run.personnage);
  if (cibleId.startsWith('stat:')) {
    apresGainDeStatistique(run.personnage, cibleId.slice(5));
  }
  Prog.depenserPoint(prog);
  noter(run, `Point de compétence attribué : ${c.nom}.`, 'niveau');
  prevenir(run);
  return true;
}

/* ------------------------------------------------------------------ */
/* Pièces                                                              */
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

export function actionsDeRencontre(run) {
  const piece = pieceCourante(run);
  if (!piece) return [];

  let source = [];
  if (run.phase === PHASES.EXPLORATION) source = piece.actions ?? [];
  else if (run.phase === PHASES.APRES_COMBAT) source = piece.apresCombat ?? [];

  const actions = source.filter(
    (a) => !(a.uneFois && run.actionsFaites.has(cleAction(run, a.id)))
  );

  // Les objets laissés au sol restent proposés tant qu'on est dans la pièce.
  const auSol = objetsAuSol(run).map((id) => ({
    id: `ramasser:${id}`,
    libelle: `Ramasser ${objet(id).nom}`,
    type: 'ramasser',
    objetId: id,
  }));

  return [...auSol, ...actions];
}

export function executerAction(run, actionId) {
  if (attendUnChoixDeCompetence(run)) return;

  const action = actionsDeRencontre(run).find((a) => a.id === actionId);
  if (!action) return;

  switch (action.type) {
    case 'combat': engagerCombat(run, false); break;
    case 'fuite': fuir(run, action); break;
    case 'loot': fouiller(run, action); break;
    case 'ramasser': ramasserAuSol(run, action.objetId); return;
    case 'avancer': avancer(run); break;
    default: noter(run, `Action non implémentée : ${action.type}`, 'alerte');
  }
  prevenir(run);
}

function engagerCombat(run, ennemiCommence) {
  const piece = pieceCourante(run);
  run.combat = Combat.creerCombat(piece.ennemi, { ennemiCommence });
  run.phase = PHASES.COMBAT;

  if (ennemiCommence) {
    riposteEnnemi(run);
    if (run.phase === PHASES.COMBAT) ouvrirTourJoueur(run);
  } else {
    noter(run, `Le combat commence contre ${run.combat.ennemi.nom}.`, 'alerte');
    ouvrirTourJoueur(run);
  }
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

function objetsAuSol(run) {
  return run.objetsAuSol.get(run.indexPiece) ?? [];
}

function poserAuSol(run, objetDef) {
  const liste = run.objetsAuSol.get(run.indexPiece) ?? [];
  liste.push(objetDef.id);
  run.objetsAuSol.set(run.indexPiece, liste);
}

/** Tente de ranger un objet. Sinon il reste au sol, récupérable plus tard. */
function recupererOuLaisser(run, objetDef) {
  const rarete = RARETE_PAR_ID[objetDef.rarete].nom;
  const slot = Inv.ajouter(run.personnage.inventaire, objetDef.id);

  if (slot) {
    noter(run, `Tu trouves : ${objetDef.nom} (${rarete}).`, 'butin');
    return true;
  }

  poserAuSol(run, objetDef);
  noter(
    run,
    `${objetDef.nom} (${rarete}) ne rentre pas dans ton inventaire. L'objet reste au sol.`,
    'alerte'
  );
  return false;
}

function fouiller(run, action) {
  run.actionsFaites.add(cleAction(run, action.id));

  const ameliore = Effets.lootAmeliore(run.effets);
  const butin = tirerButin(action.table, run.rng, { lootAmeliore: ameliore });

  if (butin.length === 0) {
    noter(run, 'La fouille ne donne rien.');
    return;
  }

  if (butin.length > 1) {
    noter(run, 'La lumière de la torche révèle un second objet.', 'butin');
  }

  for (const objetDef of butin) recupererOuLaisser(run, objetDef);
}

/** Ramasse un objet laissé au sol dans la pièce courante. */
export function ramasserAuSol(run, objetId) {
  const liste = run.objetsAuSol.get(run.indexPiece) ?? [];
  const index = liste.indexOf(objetId);
  if (index === -1) return false;

  const objetDef = objet(objetId);
  const slot = Inv.ajouter(run.personnage.inventaire, objetId);
  if (!slot) {
    noter(run, `${objetDef.nom} ne rentre toujours pas.`, 'alerte');
    prevenir(run);
    return false;
  }

  liste.splice(index, 1);
  if (liste.length === 0) run.objetsAuSol.delete(run.indexPiece);
  noter(run, `Tu ramasses ${objetDef.nom}.`, 'butin');
  prevenir(run);
  return true;
}

/** Objets au sol de la pièce courante, sous forme de définitions. */
export function butinAuSol(run) {
  return objetsAuSol(run).map((id) => objet(id));
}

/** Jette un objet de l'inventaire. L'objet est détruit. */
export function jeterObjet(run, uid) {
  const slot = Inv.trouver(run.personnage.inventaire, uid);
  if (!slot) return false;
  const objetDef = objet(slot.objetId);
  Inv.retirer(run.personnage.inventaire, uid);
  run.personnage.pv = Math.min(run.personnage.pv, pvMaxTotal(run.personnage));
  noter(run, `${objetDef.nom} est jeté.`, 'alerte');
  prevenir(run);
  return true;
}

function avancer(run) {
  const suivante = run.indexPiece + 1;

  // XP de progression : une seule fois par passage vers une pièce donnée,
  // même si un retour en arrière est ajouté plus tard.
  if (!run.transitionsRecompensees.has(suivante)) {
    run.transitionsRecompensees.add(suivante);
    donnerXp(run, Prog.XP_PROGRESSION, 'progression');
  }

  for (const expire of Effets.changementDePiece(run.effets)) {
    noter(run, `${expire.label} se dissipe.`, 'effet');
  }

  run.indexPiece = suivante;
  if (run.indexPiece >= LONGUEUR_PARCOURS) terminer(run, 'termine');
  else entrerDansLaPiece(run);
}

/* ------------------------------------------------------------------ */
/* Tours de combat                                                     */
/* ------------------------------------------------------------------ */

function ouvrirTourJoueur(run) {
  run.combat.aQui = 'joueur';
  run.combat.actionsRestantes = actionsDisponibles(run.personnage, run.effets);
}

export function actionsRestantes(run) {
  return run.phase === PHASES.COMBAT ? run.combat.actionsRestantes : null;
}

export function terminerLeTour(run) {
  if (run.phase !== PHASES.COMBAT || attendUnChoixDeCompetence(run)) return;
  run.combat.actionsRestantes = 0;
  finDeTourJoueur(run);
  prevenir(run);
}

function finDeTourJoueur(run) {
  if (run.phase !== PHASES.COMBAT) return;

  riposteEnnemi(run);
  if (run.phase !== PHASES.COMBAT) return;

  for (const expire of Effets.finDeTour(run.effets)) {
    noter(run, `${expire.label} prend fin.`, 'effet');
  }

  run.combat.tour++;
  ouvrirTourJoueur(run);
}

function consommerAction(run, cout) {
  if (run.phase !== PHASES.COMBAT || cout <= 0) return;
  run.combat.actionsRestantes -= cout;
  if (run.combat.actionsRestantes <= 0) finDeTourJoueur(run);
}

/* ------------------------------------------------------------------ */
/* Objets                                                              */
/* ------------------------------------------------------------------ */

export function objetsUtilisables(run) {
  const enCombat = run.phase === PHASES.COMBAT;

  return run.personnage.inventaire.contenu
    .map((slot) => ({ slot, def: objet(slot.objetId) }))
    .filter(({ def }) => {
      const a = def.action;
      if (!a) return false;
      if (a.type === 'attaque' || a.cible === 'ennemi' || a.seulementEnCombat) return enCombat;
      return run.phase !== PHASES.FIN;
    });
}

export function attaqueDeRepli(run) {
  if (run.phase !== PHASES.COMBAT) return null;
  if (Inv.armes(run.personnage.inventaire).length > 0) return null;
  return PROVISOIRE.combat.attaqueSansArme;
}

export function utiliserObjet(run, uid) {
  if (attendUnChoixDeCompetence(run)) return;

  const slot = Inv.trouver(run.personnage.inventaire, uid);
  if (!slot) return;
  const def = objet(slot.objetId);
  const action = def.action;
  if (!action) return;

  const enCombat = run.phase === PHASES.COMBAT;
  if (enCombat && run.combat.actionsRestantes <= 0) return;

  switch (action.type) {
    case 'attaque':
    case 'degats':
      if (!enCombat) return;
      frapper(run, def.nom, action.des);
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
      break;
    }

    case 'effet': {
      Effets.appliquer(run.effets, action.effet, `objet:${def.id}`);
      noter(run, action.message ?? `${action.verbe} : ${action.effet.label} est actif.`, 'effet');
      break;
    }

    default:
      noter(run, `Effet non implémenté : ${action.type}`, 'alerte');
  }

  if (action.consomme && PROVISOIRE.objets.consommablesDetruitsApresUsage) {
    Inv.retirer(run.personnage.inventaire, uid);
    run.personnage.pv = Math.min(run.personnage.pv, pvMaxTotal(run.personnage));
  }

  if (run.phase === PHASES.COMBAT) consommerAction(run, action.cout ?? 1);
  prevenir(run);
}

export function utiliserAttaqueDeRepli(run) {
  const repli = attaqueDeRepli(run);
  if (!repli || attendUnChoixDeCompetence(run)) return;
  frapper(run, repli.nom, repli.des);
  if (run.phase === PHASES.COMBAT) consommerAction(run, 1);
  prevenir(run);
}

function frapper(run, source, des) {
  const r = Combat.frapperEnnemi(run.combat, des, {
    rng: run.rng,
    pipeline: pipelineDe(run),
    personnage: run.personnage,
  });

  const detail = r.absorbe > 0 ? ` (${r.brut} − ${r.absorbe} d'armure)` : '';
  noter(run, `${source} : ${r.jet.describe()}`, 'jet');
  noter(
    run,
    `${r.degats} dégâts${detail}. ${run.combat.ennemi.nom} : ${run.combat.ennemi.pv} PV.`,
    'degats'
  );

  if (r.mort) {
    noter(run, `${run.combat.ennemi.nom} est vaincu.`, 'victoire');
    run.phase = PHASES.APRES_COMBAT;

    const niveau = run.combat.ennemi.niveau;
    if (niveau === null || niveau === undefined) {
      noter(run, 'Aucun niveau défini pour cet ennemi : pas d’XP.', 'alerte');
    } else {
      donnerXp(run, Prog.xpPourEnnemi(niveau), `${run.combat.ennemi.nom} niveau ${niveau}`);
    }

    Effets.finDeCombat(run.effets);
  }
}

function riposteEnnemi(run) {
  const r = Combat.riposte(run.combat, {
    rng: run.rng,
    pipeline: pipelineDe(run),
    personnage: run.personnage,
    armureJoueur: armureTotale(run.personnage, run.effets),
  });

  const detail = r.absorbe > 0 ? ` (${r.brut} − ${r.absorbe} d'armure)` : '';
  noter(run, `${run.combat.ennemi.nom} attaque : ${r.jet.describe()}`, 'jet');

  const subis = blesser(run.personnage, r.degats);
  noter(
    run,
    subis > 0
      ? `Tu subis ${subis} dégâts${detail}. ${run.personnage.pv} / ${pvMaxTotal(run.personnage)} PV.`
      : `L'attaque ne passe pas ton armure${detail}.`,
    'degats'
  );

  if (estMort(run.personnage)) {
    Combat.marquerDefaite(run.combat);
    terminer(run, 'mort');
  }
}

/* ------------------------------------------------------------------ */

export function resume(run) {
  const prog = run.personnage.progression;
  return {
    nom: run.personnage.nom,
    pv: run.personnage.pv,
    pvMax: pvMaxTotal(run.personnage),
    armure: armureTotale(run.personnage, run.effets),
    niveau: prog.niveau,
    xp: Prog.avancement(prog),
    points: prog.pointsDisponibles,
    actions: actionsRestantes(run),
    actionsMax: actionsDisponibles(run.personnage, run.effets),
    effets: run.effets.map((e) => e.label),
    piece: progression(run),
    phase: run.phase,
    issue: run.issue,
    ennemi: run.combat?.ennemi ?? null,
    graine: run.graine,
  };
}

export { OBJET_PAR_ID, ENNEMI_PAR_ID };
