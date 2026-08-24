/**
 * provisoire.js — VALEURS NON VALIDÉES.
 *
 * Tout ce qui se trouve dans ce fichier a dû être fixé pour que le prototype
 * fonctionne, mais n'a PAS été décidé. Rien de tout cela n'est dispersé
 * ailleurs dans le code : changer une valeur ici suffit.
 *
 * QUESTIONS_OUVERTES est affiché tel quel dans l'écran Réglages, pour que
 * l'état des décisions reste visible pendant les tests.
 */

export const PROVISOIRE = {
  combat: {
    /** Comment l'armure réduit les dégâts. 'soustraction' = dégâts - armure. */
    armureMode: 'soustraction',
    /** Plancher des dégâts après armure. 0 = une attaque peut ne rien faire. */
    degatsMinimum: 0,
    /**
     * Qui frappe en premier. La rencontre 1 précise que le rat prend
     * l'initiative si la fuite échoue, ce qui suppose que le joueur commence
     * dans les autres cas. La statistique Initiative n'est donc pas encore
     * utilisée en combat.
     */
    joueurCommenceParDefaut: true,
    initiativeUtiliseeEnCombat: false,
    /** Attaque de repli si le joueur n'a plus aucune arme dans l'inventaire. */
    attaqueSansArme: { nom: 'Coup de poing', des: '1d2' },
  },

  loot: {
    /**
     * Pondération entre raretés autorisées par une table.
     * Une table « jusqu'à Commun » tirera donc Fréquent ~70 % du temps.
     */
    poidsParRarete: {
      frequent: 60,
      commun: 25,
      peu_commun: 10,
      rare: 4,
      legendaire: 1,
      mythique: 0,
    },
    /** Que faire si l'objet trouvé ne tient pas dans l'inventaire. */
    siInventairePlein: 'refuser', // 'refuser' | 'proposer_echange'
  },

  objets: {
    /** Un passif (bouclier, casque) agit-il depuis l'inventaire, sans équipement ? */
    passifsActifsDansLInventaire: true,
    /** Un consommable disparaît-il après usage ? */
    consommablesDetruitsApresUsage: true,
  },

  personnage: {
    /**
     * Lecture retenue de « démarrer avec 10 PV et 0 armure » :
     * ces valeurs correspondent aux statistiques par défaut (2 partout).
     * Les bonus se calculent donc à partir de 2, pas de 0.
     */
    statsDeReference: 2,
  },
};

export const QUESTIONS_OUVERTES = [
  {
    sujet: 'Armure',
    question:
      "L'armure se soustrait-elle aux dégâts ? Une attaque peut-elle tomber à 0 ?",
    provisoire: 'Soustraction, plancher à 0.',
  },
  {
    sujet: 'PV et armure de base',
    question:
      '« 10 PV, 0 armure » correspond-il aux stats par défaut (2 partout), ou à des stats à 0 ?',
    provisoire: 'Aux stats par défaut : 10 PV et 0 armure avec 2 en Santé et 2 en Défense.',
  },
  {
    sujet: 'Initiative',
    question:
      "« 10 % d'initiative » par point : 10 % de quoi ? Probabilité de frapper en premier ?",
    provisoire: "La valeur est stockée mais n'a aucun effet en combat.",
  },
  {
    sujet: 'Touche',
    question:
      "Y a-t-il un jet pour toucher, ou toute attaque touche-t-elle automatiquement ?",
    provisoire: 'Toute attaque touche.',
  },
  {
    sujet: 'Tour de combat',
    question:
      'Le joueur peut-il agir plusieurs fois par tour, ou une action met-elle fin à son tour ?',
    provisoire: "Une action par tour, puis l'ennemi riposte.",
  },
  {
    sujet: 'Probabilités de loot',
    question:
      "À l'intérieur d'une rareté maximale autorisée, quelle est la répartition ?",
    provisoire: 'Fréquent 60, Commun 25, Peu commun 10, Rare 4, Légendaire 1.',
  },
  {
    sujet: 'Inventaire plein',
    question: "Que se passe-t-il si l'objet trouvé ne rentre pas ?",
    provisoire: "Le loot est refusé et signalé dans le journal.",
  },
  {
    sujet: 'Passifs',
    question:
      "Un bouclier agit-il depuis l'inventaire, ou faudra-t-il un système d'équipement ?",
    provisoire: "Depuis l'inventaire.",
  },
  {
    sujet: 'Races',
    question:
      "Aucune liste de races ni aucun effet n'est défini. Quatre races sont proposées, sans aucune conséquence mécanique.",
    provisoire: 'Humain, Elfe, Nain, Orc — purement cosmétiques.',
  },
  {
    sujet: 'Statistiques inutilisées',
    question:
      "Intelligence, Perception, Courage et Charisme n'ont pas d'effet défini.",
    provisoire: 'Stockées, sans effet.',
  },
  {
    sujet: 'Arme utilisée',
    question:
      "Que se passe-t-il si le joueur n'a plus aucune arme dans son inventaire ?",
    provisoire: 'Attaque de repli à 1d2.',
  },
  {
    sujet: 'Torche',
    question:
      "« Éclairer certaines zones » : aucune zone sombre n'existe encore.",
    provisoire: "L'action existe mais ne produit aucun effet.",
  },
  {
    sujet: 'Réglages',
    question: "Le contenu de l'écran Réglages n'est pas défini.",
    provisoire: 'Graine de run, effacement de la sauvegarde, état des décisions.',
  },
];
