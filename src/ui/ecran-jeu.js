/**
 * ecran-jeu.js — Interface de run.
 *
 * Découpage décidé : deux quarts de zone visuelle, un quart de texte,
 * un quart d'actions.
 */

import { el, vider, visuelManquant } from './dom.js';
import { objet } from '../data/objets.js';
import * as Run from '../systems/run.js';
import { vueInventaire } from './vue-inventaire.js';

export function ecranJeu({ personnage, graine, onTerminer }) {
  const run = Run.creerRun(personnage, { graine });

  const zoneVisuelle = el('div', { class: 'zone zone-visuelle' });
  const zoneTexte = el('div', { class: 'zone zone-texte' });
  const zoneActions = el('div', { class: 'zone zone-actions' });

  const racine = el('div', { class: 'ecran jeu' }, [zoneVisuelle, zoneTexte, zoneActions]);

  let inventaireOuvert = null;
  let dernierJournal = 0;

  /* ---------------- zone visuelle ---------------- */

  function rendreVisuel() {
    vider(zoneVisuelle);

    const piece = Run.pieceCourante(run);
    const combat = run.combat;
    const info = Run.resume(run);

    const hud = el('div', { class: 'hud' }, [
      el('span', { class: 'nom', text: personnage.nom }),
      el('span', { class: `pv${personnage.pv <= personnage.pvMax / 3 ? ' bas' : ''}` }, [
        document.createTextNode(`${personnage.pv}/${personnage.pvMax} PV`),
      ]),
      el('div', { class: 'jauge' }, [
        el('i', { style: { width: `${(personnage.pv / personnage.pvMax) * 100}%` } }),
      ]),
      el('span', { class: 'armure', text: `${info.armure} armure` }),
      el('span', { class: 'piece', text: `Pièce ${info.piece.piece}/${info.piece.total}` }),
    ]);

    let contenu;
    if (combat && !combat.termine) {
      contenu = el('div', {}, [
        visuelManquant(combat.ennemi.nom, combat.ennemi.icone),
        el('div', { class: 'hud', style: { position: 'static', background: 'none', justifyContent: 'center' } }, [
          el('span', { text: `${combat.ennemi.pv}/${combat.ennemi.pvMax} PV` }),
          el('div', { class: 'jauge ennemi' }, [
            el('i', { style: { width: `${(combat.ennemi.pv / combat.ennemi.pvMax) * 100}%` } }),
          ]),
          el('span', { class: 'armure', text: `${combat.ennemi.armure} armure` }),
        ]),
      ]);
    } else if (run.phase === Run.PHASES.FIN) {
      contenu = visuelManquant(run.issue === 'mort' ? 'Mort du personnage' : 'Fin du parcours');
    } else {
      contenu = visuelManquant(piece ? piece.visuel : 'Lieu');
    }

    zoneVisuelle.append(hud, contenu);
  }

  /* ---------------- journal ---------------- */

  function rendreJournal() {
    for (let i = dernierJournal; i < run.journal.length; i++) {
      const entree = run.journal[i];
      zoneTexte.append(el('p', { class: entree.type, text: entree.texte }));
    }
    dernierJournal = run.journal.length;
    zoneTexte.scrollTop = zoneTexte.scrollHeight;
  }

  /* ---------------- actions ---------------- */

  function utilisableMaintenant(def) {
    if (!def.action) return false;
    const enCombat = run.phase === Run.PHASES.COMBAT;
    if (def.action.type === 'attaque' || def.action.cible === 'ennemi') return enCombat;
    return run.phase !== Run.PHASES.FIN;
  }

  function rendreActions() {
    vider(zoneActions);

    if (run.phase === Run.PHASES.FIN) {
      zoneActions.append(
        el('div', { class: 'rangee' }, [
          el('button', {
            class: 'primaire',
            text: 'Terminer la run',
            onclick: () => onTerminer(run),
          }),
        ])
      );
      return;
    }

    const rencontre = el('div', { class: 'rangee' });
    for (const action of Run.actionsDeRencontre(run)) {
      rencontre.append(
        el('button', {
          class: action.type === 'avancer' ? 'primaire' : '',
          text: action.libelle,
          onclick: () => Run.executerAction(run, action.id),
        })
      );
    }
    if (rencontre.children.length) zoneActions.append(rencontre);

    const utilisables = Run.objetsUtilisables(run);
    const repli = Run.attaqueDeRepli(run);

    if (utilisables.length || repli) {
      const raccourcis = el('div', { class: 'raccourcis' });

      if (repli) {
        raccourcis.append(
          el('button', { class: 'raccourci', onclick: () => Run.utiliserAttaqueDeRepli(run) }, [
            el('span', { class: 'icone', text: '✊' }),
            el('span', {}, [
              document.createTextNode(repli.nom),
              el('small', { text: ` ${repli.des}` }),
            ]),
          ])
        );
      }

      for (const { slot, def } of utilisables) {
        raccourcis.append(
          el('button', { class: 'raccourci', onclick: () => Run.utiliserObjet(run, slot.uid) }, [
            el('span', { class: 'icone', text: def.icone }),
            el('span', {}, [
              document.createTextNode(def.action.verbe),
              el('small', { text: ` ${detailCourt(def)}` }),
            ]),
          ])
        );
      }

      zoneActions.append(raccourcis);
    }

    zoneActions.append(
      el('div', { class: 'rangee' }, [
        el('button', { class: 'discret', text: 'Inventaire', onclick: ouvrirInventaire }),
      ])
    );
  }

  /* ---------------- inventaire ---------------- */

  function ouvrirInventaire() {
    if (inventaireOuvert) return;
    inventaireOuvert = vueInventaire({
      inventaire: personnage.inventaire,
      utilisableMaintenant,
      onUtiliser: (uid) => {
        Run.utiliserObjet(run, uid);
        fermerInventaire();
      },
      onFermer: fermerInventaire,
    });
    document.body.append(inventaireOuvert);
    inventaireOuvert.monter();
  }

  function fermerInventaire() {
    if (!inventaireOuvert) return;
    inventaireOuvert.demonter();
    inventaireOuvert.remove();
    inventaireOuvert = null;
    rendre();
  }

  /* ---------------- boucle de rendu ---------------- */

  function rendre() {
    rendreVisuel();
    rendreJournal();
    rendreActions();
    if (inventaireOuvert) inventaireOuvert.rafraichir();
  }

  run.onChangement = rendre;
  rendre();

  racine.demonter = fermerInventaire;
  return racine;
}

function detailCourt(def) {
  if (def.action.des) return def.action.des;
  if (def.action.pv) return `+${def.action.pv} PV`;
  return '';
}
