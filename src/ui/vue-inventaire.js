/**
 * vue-inventaire.js — Inventaire plein écran.
 *
 * Déplacement au doigt comme à la souris (Pointer Events), rotation limitée
 * aux objets en ligne ou en colonne.
 *
 * Un appui bref sélectionne l'objet et affiche sa fiche ; un appui maintenu
 * suivi d'un déplacement le déplace.
 */

import { el, vider } from './dom.js';
import { objet, estPivotable } from '../data/objets.js';
import { RARETE_PAR_ID } from '../data/personnage.js';
import * as Inv from '../systems/inventaire.js';

const SEUIL_DEPLACEMENT = 6; // pixels avant de considérer que c'est un glissé

export function vueInventaire({ inventaire, onFermer, onUtiliser, onJeter, utilisableMaintenant }) {
  let selection = null;
  let confirmationJet = null;

  const grille = el('div', {
    class: 'grille',
    style: {
      gridTemplateColumns: `repeat(${inventaire.largeur}, 1fr)`,
      gridTemplateRows: `repeat(${inventaire.hauteur}, 1fr)`,
    },
  });

  const fiche = el('div', { class: 'bloc fiche' });

  const racine = el('div', { class: 'plein-ecran' }, [
    el('header', {}, [
      el('h2', { text: 'Inventaire' }),
      el('span', { class: 'etiquette', id: 'inv-libre' }),
    ]),
    el('div', { class: 'grille-zone' }, [grille]),
    fiche,
    el('p', {
      class: 'note',
      text: 'Glisse un objet pour le déplacer. Touche-le pour voir sa fiche.',
    }),
    el('div', { class: 'barre-bas' }, [
      el('button', { class: 'primaire', text: 'Fermer', onclick: onFermer }),
    ]),
  ]);

  /* ---------------- rendu ---------------- */

  function tailleCase() {
    const rect = grille.getBoundingClientRect();
    const espace = 4;
    return (rect.width - espace * (inventaire.largeur + 1)) / inventaire.largeur;
  }

  function positionner(noeud, slot) {
    const f = Inv.forme(slot.objetId, slot.pivote);
    const c = tailleCase();
    const espace = 4;
    noeud.style.left = `${espace + slot.x * (c + espace)}px`;
    noeud.style.top = `${espace + slot.y * (c + espace)}px`;
    noeud.style.width = `${f.l * c + (f.l - 1) * espace}px`;
    noeud.style.height = `${f.h * c + (f.h - 1) * espace}px`;
  }

  function rendre() {
    vider(grille);

    for (let i = 0; i < inventaire.largeur * inventaire.hauteur; i++) {
      grille.append(el('div', { class: 'case' }));
    }

    for (const slot of inventaire.contenu) {
      const def = objet(slot.objetId);
      const noeud = el(
        'div',
        {
          class: `objet${selection === slot.uid ? ' selectionne' : ''}`,
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

    const libres = Inv.casesLibres(inventaire);
    racine.querySelector('#inv-libre').textContent =
      `${libres} case${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}`;

    rendreFiche();
  }

  function rendreFiche() {
    vider(fiche);
    const slot = selection ? Inv.trouver(inventaire, selection) : null;

    if (!slot) {
      fiche.append(el('p', { class: 'vide', text: 'Aucun objet sélectionné.' }));
      return;
    }

    const def = objet(slot.objetId);
    const rarete = RARETE_PAR_ID[def.rarete];
    const f = def.forme;

    fiche.append(
      el('div', { class: 'titre' }, [
        el('span', { class: 'icone', text: def.icone }),
        el('strong', { text: def.nom }),
        el('span', { class: 'rarete', style: { color: rarete.couleur }, text: rarete.nom }),
      ]),
      el('p', { class: 'detail', text: descriptionDe(def, f) })
    );

    const actions = el('div', { class: 'rangee' });

    if (def.action) {
      const permis = utilisableMaintenant(def);
      actions.append(
        el('button', {
          class: permis ? 'primaire' : '',
          text: def.action.verbe,
          disabled: !permis,
          onclick: () => onUtiliser(slot.uid),
        })
      );
    }

    if (estPivotable(def)) {
      actions.append(
        el('button', {
          text: 'Pivoter',
          onclick: () => {
            if (!Inv.pivoter(inventaire, slot.uid)) {
              signaler('Pas assez de place pour pivoter.');
              return;
            }
            rendre();
          },
        })
      );
    }

    // Jeter : destruction définitive, donc confirmation en deux temps.
    if (onJeter) {
      const aConfirmer = confirmationJet === slot.uid;
      actions.append(
        el('button', {
          class: aConfirmer ? 'danger' : '',
          text: aConfirmer ? `Confirmer : détruire ${def.nom}` : 'Jeter',
          onclick: () => {
            if (!aConfirmer) {
              confirmationJet = slot.uid;
              rendreFiche();
              return;
            }
            confirmationJet = null;
            selection = null;
            onJeter(slot.uid);
            rendre();
          },
        })
      );
    }

    if (actions.children.length) fiche.append(actions);
  }

  const message = el('p', { class: 'note' });
  function signaler(texte) {
    message.textContent = texte;
    if (!message.isConnected) fiche.append(message);
    setTimeout(() => message.remove(), 2500);
  }

  /* ---------------- déplacement ---------------- */

  let drag = null;

  function commencer(evenement, slot, noeud) {
    if (evenement.button !== undefined && evenement.button !== 0) return;
    evenement.preventDefault();

    const rect = noeud.getBoundingClientRect();
    drag = {
      slot,
      noeud,
      depart: { x: evenement.clientX, y: evenement.clientY },
      decalage: { x: evenement.clientX - rect.left, y: evenement.clientY - rect.top },
      taille: { l: rect.width, h: rect.height },
      actif: false,
      flottant: null,
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
    surlignerCible(evenement);
  }

  function caseVisee(evenement) {
    const rect = grille.getBoundingClientRect();
    const c = tailleCase();
    const espace = 4;
    const gx = evenement.clientX - drag.decalage.x - rect.left - espace;
    const gy = evenement.clientY - drag.decalage.y - rect.top - espace;
    return {
      x: Math.round(gx / (c + espace)),
      y: Math.round(gy / (c + espace)),
    };
  }

  function surlignerCible(evenement) {
    for (const c of grille.querySelectorAll('.case')) {
      c.classList.remove('cible-ok', 'cible-non');
    }
    const { x, y } = caseVisee(evenement);
    const possible = Inv.peutPlacer(
      inventaire,
      drag.slot.objetId,
      x,
      y,
      drag.slot.pivote,
      drag.slot.uid
    );
    const f = Inv.forme(drag.slot.objetId, drag.slot.pivote);
    for (let dy = 0; dy < f.h; dy++) {
      for (let dx = 0; dx < f.l; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= inventaire.largeur || cy >= inventaire.hauteur) continue;
        const index = cy * inventaire.largeur + cx;
        grille.querySelectorAll('.case')[index]?.classList.add(possible ? 'cible-ok' : 'cible-non');
      }
    }
  }

  function relacher(evenement) {
    if (!drag) return;
    const { slot, actif } = drag;

    if (actif) {
      const { x, y } = caseVisee(evenement);
      Inv.deplacer(inventaire, slot.uid, x, y, slot.pivote);
    } else {
      selection = selection === slot.uid ? null : slot.uid;
    }

    nettoyer();
    rendre();
  }

  function annuler() {
    nettoyer();
    rendre();
  }

  function nettoyer() {
    if (!drag) return;
    drag.flottant?.remove();
    drag.noeud.classList.remove('fantome');
    drag.noeud.removeEventListener('pointermove', bouger);
    drag.noeud.removeEventListener('pointerup', relacher);
    drag.noeud.removeEventListener('pointercancel', annuler);
    drag = null;
    for (const c of grille.querySelectorAll('.case')) {
      c.classList.remove('cible-ok', 'cible-non');
    }
  }

  /* ---------------- taille de la grille ---------------- */

  function ajusterTaille() {
    const largeurDispo = Math.min(racine.clientWidth - 32, 22 * 16);
    grille.style.width = `${largeurDispo}px`;
    grille.style.height = `${largeurDispo * (inventaire.hauteur / inventaire.largeur)}px`;
    for (const noeud of grille.querySelectorAll('.objet')) {
      const slot = Inv.trouver(inventaire, noeud.dataset.uid);
      if (slot) positionner(noeud, slot);
    }
  }

  const observer = new ResizeObserver(ajusterTaille);

  racine.monter = () => {
    ajusterTaille();
    rendre();
    ajusterTaille();
    observer.observe(racine);
  };
  racine.demonter = () => observer.disconnect();
  racine.rafraichir = rendre;

  return racine;
}

function descriptionDe(def, forme) {
  const total = forme.l * forme.h;
  const dimensions =
    total === 1
      ? '1 case'
      : forme.l === forme.h
        ? `${total} cases en carré (${forme.l}×${forme.h})`
        : `${total} cases en ${forme.l === 1 ? 'colonne' : 'ligne'}`;

  const morceaux = [];

  if (def.passif?.armure) morceaux.push(`Passif : +${def.passif.armure} armure`);
  if (def.passif?.pvMax) morceaux.push(`Passif : +${def.passif.pvMax} PV maximum`);
  if (def.passif?.bonusJet) morceaux.push(`Passif : +${def.passif.bonusJet} aux jets de dés`);

  const a = def.action;
  if (a?.type === 'attaque' || a?.type === 'degats') {
    morceaux.push(`${a.verbe} : ${a.des} dégâts`);
  } else if (a?.type === 'soin') {
    morceaux.push(`${a.verbe} : rend ${a.pv} PV`);
  } else if (a?.type === 'effet') {
    const e = a.effet;
    const detail = e.armure
      ? `+${e.armure} armure`
      : e.degats
        ? `+${e.degats} dégâts`
        : e.actions
          ? `+${e.actions} action`
          : e.bonusLoot
            ? 'meilleur butin'
            : 'effet';
    const duree = e.dureePieces ? `pendant ${e.dureePieces} pièce` : 'au prochain tour';
    morceaux.push(`${a.verbe} : ${detail} ${duree}`);
  }

  if (!morceaux.length) morceaux.push('Aucun effet');

  return `${morceaux.join('. ')}. — ${dimensions}`;
}
