/**
 * vue-inventaire.js — Inventaire plein écran.
 *
 * Trois zones : les emplacements d'équipement, les emplacements rapides de la
 * ceinture, et la grille du sac.
 *
 * Un appui bref sélectionne, un glissé déplace dans la grille. Les
 * changements de zone (équiper, mettre à la ceinture, ranger) passent par les
 * boutons de la fiche : c'est plus fiable au doigt qu'un glissé inter-zones.
 */

import { el, vider } from './dom.js';
import { objet, estPivotable } from '../data/objets.js';
import { RARETE_PAR_ID } from '../data/personnage.js';
import { EMPLACEMENTS, MAINS } from '../data/emplacements.js';
import * as Inv from '../systems/inventaire.js';
import * as Eq from '../systems/equipement.js';
import * as Portage from '../systems/portage.js';

const SEUIL_DEPLACEMENT = 6;

export function vueInventaire({ portage, onFermer, onUtiliser, onJeter, utilisableMaintenant }) {
  let selection = null;
  let confirmationJet = null;

  const zoneEquipement = el('div', { class: 'equipement' });
  const zoneCeinture = el('div', { class: 'ceinture-rapide' });
  const grille = el('div', { class: 'grille' });
  const fiche = el('div', { class: 'bloc fiche' });
  const message = el('p', { class: 'note' });

  const racine = el('div', { class: 'plein-ecran' }, [
    el('header', {}, [
      el('h2', { text: 'Équipement' }),
      el('span', { class: 'etiquette', id: 'inv-libre' }),
    ]),
    zoneEquipement,
    el('h3', { class: 'sous-titre-inv', text: 'Emplacements rapides' }),
    zoneCeinture,
    el('h3', { class: 'sous-titre-inv', text: 'Sac' }),
    el('div', { class: 'grille-zone' }, [grille]),
    fiche,
    message,
    el('div', { class: 'barre-bas' }, [
      el('button', { class: 'primaire', text: 'Fermer', onclick: onFermer }),
    ]),
  ]);

  function signaler(texte) {
    message.textContent = texte;
    clearTimeout(signaler.minuteur);
    signaler.minuteur = setTimeout(() => { message.textContent = ''; }, 2600);
  }

  /* ---------------- équipement ---------------- */

  function rendreEquipement() {
    vider(zoneEquipement);

    for (const emplacement of EMPLACEMENTS) {
      const instance = portage.equipement[emplacement.id];
      const grisee = Eq.mainGrisee(portage.equipement, emplacement.id);
      const def = instance ? objet(instance.objetId) : null;

      const noeud = el(
        'button',
        {
          class: `slot${instance ? ' rempli' : ''}${grisee ? ' grise' : ''}` +
                 `${selection === instance?.uid ? ' selectionne' : ''}`,
          disabled: grisee,
          title: grisee ? 'Occupée par une arme à deux mains' : emplacement.nom,
          onclick: () => {
            if (instance) {
              selection = selection === instance.uid ? null : instance.uid;
              rendre();
            } else if (selection) {
              tenterEquiper(selection, emplacement.id);
            }
          },
        },
        [
          el('span', { class: 'slot-nom', text: emplacement.nom }),
          el('span', { class: 'slot-icone', text: def ? def.icone : emplacement.icone }),
          el('span', {
            class: 'slot-objet',
            text: grisee ? '— deux mains —' : def ? def.nom : 'vide',
          }),
          instance && instance.brise ? el('span', { class: 'brise', text: 'BRISÉ' }) : null,
        ]
      );
      zoneEquipement.append(noeud);
    }
  }

  function tenterEquiper(uid, emplacementId) {
    const resultat = Portage.equiper(portage, uid, emplacementId);
    if (!resultat.ok) {
      signaler(resultat.raison);
      return;
    }
    for (const reste of resultat.expulses ?? []) {
      signaler(`${objet(reste.objetId).nom} ne rentre plus dans le sac.`);
    }
    selection = null;
    rendre();
  }

  /* ---------------- ceinture ---------------- */

  function rendreCeinture() {
    vider(zoneCeinture);

    if (portage.raccourcis.length === 0) {
      zoneCeinture.append(
        el('p', { class: 'note', text: 'Aucune ceinture équipée : aucun emplacement rapide.' })
      );
      return;
    }

    portage.raccourcis.forEach((emplacement, index) => {
      const instance = emplacement.contenu;
      const def = instance ? objet(instance.objetId) : null;

      zoneCeinture.append(
        el(
          'button',
          {
            class: `rapide${instance ? ' rempli' : ''}${emplacement.type === 'potion' ? ' potion' : ''}` +
                   `${selection === instance?.uid ? ' selectionne' : ''}`,
            title: emplacement.type === 'potion' ? 'Potions uniquement' : 'Emplacement rapide',
            onclick: () => {
              if (instance) {
                selection = selection === instance.uid ? null : instance.uid;
                rendre();
              } else if (selection) {
                const r = Portage.mettreEnRapide(portage, selection, index);
                if (!r.ok) signaler(r.raison);
                else selection = null;
                rendre();
              }
            },
          },
          [
            el('span', { class: 'slot-icone', text: def ? def.icone : emplacement.type === 'potion' ? '⚗️' : '·' }),
            el('span', { class: 'slot-objet', text: def ? def.nom : 'vide' }),
          ]
        )
      );
    });
  }

  /* ---------------- sac ---------------- */

  const sac = () => portage.sac;

  function tailleCase() {
    const rect = grille.getBoundingClientRect();
    return (rect.width - 4 * (sac().largeur + 1)) / sac().largeur;
  }

  function positionner(noeud, slot) {
    const f = Inv.forme(slot.objetId, slot.pivote);
    const c = tailleCase();
    noeud.style.left = `${4 + slot.x * (c + 4)}px`;
    noeud.style.top = `${4 + slot.y * (c + 4)}px`;
    noeud.style.width = `${f.l * c + (f.l - 1) * 4}px`;
    noeud.style.height = `${f.h * c + (f.h - 1) * 4}px`;
  }

  function rendreSac() {
    vider(grille);
    grille.style.gridTemplateColumns = `repeat(${sac().largeur}, 1fr)`;
    grille.style.gridTemplateRows = `repeat(${sac().hauteur}, 1fr)`;

    for (let i = 0; i < sac().largeur * sac().hauteur; i++) {
      grille.append(el('div', { class: 'case' }));
    }

    for (const slot of sac().contenu) {
      const def = objet(slot.objetId);
      const noeud = el(
        'div',
        {
          class: `objet${selection === slot.uid ? ' selectionne' : ''}${slot.brise ? ' brise-fond' : ''}`,
          'data-uid': slot.uid,
          title: def.nom,
        },
        [
          el('span', { class: 'icone', text: def.icone }),
          el('span', { class: 'nom', text: def.nom }),
        ]
      );
      noeud.addEventListener('pointerdown', (e) => commencer(e, slot, noeud));
      grille.append(noeud);
      positionner(noeud, slot);
    }

    const libres = Inv.casesLibres(sac());
    racine.querySelector('#inv-libre').textContent =
      `sac ${sac().largeur}×${sac().hauteur} — ${libres} case${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}`;
  }

  /* ---------------- fiche ---------------- */

  function rendreFiche() {
    vider(fiche);
    const position = selection ? Portage.localiser(portage, selection) : null;

    if (!position) {
      fiche.append(el('p', { class: 'vide', text: 'Aucun objet sélectionné.' }));
      return;
    }

    const instance = position.instance ?? position.slot;
    const def = objet(instance.objetId);
    const rarete = RARETE_PAR_ID[def.rarete];

    fiche.append(
      el('div', { class: 'titre' }, [
        el('span', { class: 'icone', text: def.icone }),
        el('strong', { text: def.nom }),
        el('span', { class: 'rarete', style: { color: rarete.couleur }, text: rarete.nom }),
      ]),
      el('p', { class: 'detail', text: decrire(def, instance, position) })
    );

    const actions = el('div', { class: 'rangee' });

    if (def.action && position.zone !== 'sac' && !instance.brise) {
      const permis = utilisableMaintenant(def, position);
      actions.append(
        el('button', {
          class: permis ? 'primaire' : '',
          text: def.action.verbe,
          disabled: !permis,
          onclick: () => onUtiliser(instance.uid),
        })
      );
    }

    // Équiper : un bouton par emplacement compatible et libre.
    if (position.zone !== 'equipement') {
      for (const emplacement of EMPLACEMENTS) {
        if (!emplacement.accepte.includes(def.port)) continue;
        if (portage.equipement[emplacement.id]) continue;
        if (Eq.mainGrisee(portage.equipement, emplacement.id)) continue;
        actions.append(
          el('button', {
            text: `→ ${emplacement.nom}`,
            onclick: () => tenterEquiper(instance.uid, emplacement.id),
          })
        );
      }
    }

    if (position.zone === 'equipement') {
      actions.append(
        el('button', {
          text: 'Ranger dans le sac',
          onclick: () => {
            const r = Portage.desequiper(portage, position.emplacementId);
            if (!r.ok) signaler(r.raison);
            else selection = null;
            rendre();
          },
        })
      );
    }

    if (position.zone === 'raccourci') {
      actions.append(
        el('button', {
          text: 'Ranger dans le sac',
          onclick: () => {
            const r = Portage.retirerDuRapide(portage, position.index);
            if (!r.ok) signaler(r.raison);
            else selection = null;
            rendre();
          },
        })
      );
    }

    if (position.zone === 'sac' && estPivotable(def)) {
      actions.append(
        el('button', {
          text: 'Pivoter',
          onclick: () => {
            if (!Inv.pivoter(sac(), instance.uid)) signaler('Pas assez de place pour pivoter.');
            rendre();
          },
        })
      );
    }

    if (onJeter) {
      const aConfirmer = confirmationJet === instance.uid;
      actions.append(
        el('button', {
          class: aConfirmer ? 'danger' : '',
          text: aConfirmer ? `Confirmer : détruire ${def.nom}` : 'Jeter',
          onclick: () => {
            if (!aConfirmer) {
              confirmationJet = instance.uid;
              rendreFiche();
              return;
            }
            confirmationJet = null;
            selection = null;
            onJeter(instance.uid);
            rendre();
          },
        })
      );
    }

    if (actions.children.length) fiche.append(actions);
  }

  /* ---------------- glissé dans le sac ---------------- */

  let drag = null;

  function commencer(evenement, slot, noeud) {
    if (evenement.button !== undefined && evenement.button !== 0) return;
    evenement.preventDefault();
    const rect = noeud.getBoundingClientRect();
    drag = {
      slot, noeud,
      depart: { x: evenement.clientX, y: evenement.clientY },
      decalage: { x: evenement.clientX - rect.left, y: evenement.clientY - rect.top },
      taille: { l: rect.width, h: rect.height },
      actif: false, flottant: null,
    };
    noeud.setPointerCapture(evenement.pointerId);
    noeud.addEventListener('pointermove', bouger);
    noeud.addEventListener('pointerup', relacher);
    noeud.addEventListener('pointercancel', annuler);
  }

  function bouger(evenement) {
    if (!drag) return;
    const dx = evenement.clientX - drag.depart.x;
    const dy = evenement.clientY - drag.depart.y;
    if (!drag.actif && Math.hypot(dx, dy) < SEUIL_DEPLACEMENT) return;

    if (!drag.actif) {
      drag.actif = true;
      drag.noeud.classList.add('fantome');
      const clone = drag.noeud.cloneNode(true);
      clone.classList.remove('fantome', 'selectionne');
      clone.classList.add('objet-flottant');
      clone.style.width = `${drag.taille.l}px`;
      clone.style.height = `${drag.taille.h}px`;
      document.body.append(clone);
      drag.flottant = clone;
    }
    drag.flottant.style.left = `${evenement.clientX - drag.decalage.x}px`;
    drag.flottant.style.top = `${evenement.clientY - drag.decalage.y}px`;
    surligner(evenement);
  }

  function caseVisee(evenement) {
    const rect = grille.getBoundingClientRect();
    const c = tailleCase();
    return {
      x: Math.round((evenement.clientX - drag.decalage.x - rect.left - 4) / (c + 4)),
      y: Math.round((evenement.clientY - drag.decalage.y - rect.top - 4) / (c + 4)),
    };
  }

  function surligner(evenement) {
    const cellules = grille.querySelectorAll('.case');
    for (const c of cellules) c.classList.remove('cible-ok', 'cible-non');
    const { x, y } = caseVisee(evenement);
    const possible = Inv.peutPlacer(sac(), drag.slot.objetId, x, y, drag.slot.pivote, drag.slot.uid);
    const f = Inv.forme(drag.slot.objetId, drag.slot.pivote);
    for (let dy = 0; dy < f.h; dy++) {
      for (let dx = 0; dx < f.l; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= sac().largeur || cy >= sac().hauteur) continue;
        cellules[cy * sac().largeur + cx]?.classList.add(possible ? 'cible-ok' : 'cible-non');
      }
    }
  }

  function relacher(evenement) {
    if (!drag) return;
    const { slot, actif } = drag;
    if (actif) {
      const { x, y } = caseVisee(evenement);
      Inv.deplacer(sac(), slot.uid, x, y, slot.pivote);
    } else {
      selection = selection === slot.uid ? null : slot.uid;
    }
    nettoyer();
    rendre();
  }

  function annuler() { nettoyer(); rendre(); }

  function nettoyer() {
    if (!drag) return;
    drag.flottant?.remove();
    drag.noeud.classList.remove('fantome');
    drag.noeud.removeEventListener('pointermove', bouger);
    drag.noeud.removeEventListener('pointerup', relacher);
    drag.noeud.removeEventListener('pointercancel', annuler);
    drag = null;
  }

  /* ---------------- taille ---------------- */

  function ajusterTaille() {
    const largeurDispo = Math.min(racine.clientWidth - 32, 22 * 16);
    grille.style.width = `${largeurDispo}px`;
    grille.style.height = `${largeurDispo * (sac().hauteur / sac().largeur)}px`;
    for (const noeud of grille.querySelectorAll('.objet')) {
      const slot = Inv.trouver(sac(), noeud.dataset.uid);
      if (slot) positionner(noeud, slot);
    }
  }

  function rendre() {
    rendreEquipement();
    rendreCeinture();
    rendreSac();
    rendreFiche();
    ajusterTaille();
  }

  const observer = new ResizeObserver(ajusterTaille);
  racine.monter = () => { rendre(); observer.observe(racine); };
  racine.demonter = () => observer.disconnect();
  racine.rafraichir = rendre;

  return racine;
}

function decrire(def, instance, position) {
  const morceaux = [];

  if (def.action?.des) morceaux.push(`${def.action.des} dégâts`);
  if (def.action?.pv) morceaux.push(`rend ${def.action.pv} PV`);
  if (def.passif?.armure) morceaux.push(`+${def.passif.armure} armure`);
  if (def.passif?.pvMax) morceaux.push(`+${def.passif.pvMax} PV maximum`);
  if (def.passif?.bonusJet) morceaux.push(`+${def.passif.bonusJet} aux jets`);
  if (def.passif?.initiative) morceaux.push(`+${def.passif.initiative} initiative`);
  if (def.ceinture) {
    const p = def.ceinture;
    morceaux.push(
      `${p.rapides} emplacement${p.rapides > 1 ? 's' : ''} rapide${p.rapides > 1 ? 's' : ''}` +
      (p.rapidesPotion ? ` + ${p.rapidesPotion} potions` : '')
    );
  }
  if (def.sac) morceaux.push(`sac ${def.sac.largeur}×${def.sac.hauteur}`);
  if (def.mains === 2) morceaux.push('deux mains');

  if (def.usure) {
    morceaux.push(
      instance.brise
        ? 'BRISÉ'
        : `${instance.utilisations}/${def.usure.max} utilisations` +
          (def.usure.reparable === false ? ' — irréparable' : '')
    );
  }

  const f = def.forme;
  const taille = f.l === 1 && f.h === 1
    ? '1 case'
    : `${f.l * f.h} cases (${f.l}×${f.h})`;
  morceaux.push(taille);

  if (position.zone === 'sac') morceaux.push('dans le sac : sans effet');

  return morceaux.join(' · ');
}
