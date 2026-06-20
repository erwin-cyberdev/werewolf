// ===== Gestion des joueurs : IDs, rôles, statuts, couples, contamination =====

import CONFIG from "./config.js";
import { shuffle } from "./utils/helpers.js";

/**
 * Gestionnaire de joueurs
 * Gère l'état complet de tous les joueurs d'une partie
 */
class PlayerManager {
  constructor() {
    this.joueurs = []; // Liste de tous les joueurs
    this.prochainId = 1;

    // Mapping rôle → camp
    this.CAMP_ROLE = {};
    for (const [key, roleName] of Object.entries(CONFIG.ROLES)) {
      switch (key) {
        case "LOUP_GAROU":
        case "LOUP_NOIR":
        case "LOUP_BAVARD":
          this.CAMP_ROLE[roleName] = CONFIG.CAMP.LOUPS;
          break;
        case "LOUP_BLANC":
        case "MERCENAIRE":
        case "NAIN_TRACASSIN":
        case "RAT_MALADE":
        case "TANNEUR":
        case "FOU":
          this.CAMP_ROLE[roleName] = CONFIG.CAMP.SOLITAIRE;
          break;
        default:
          this.CAMP_ROLE[roleName] = CONFIG.CAMP.VILLAGEOIS;
      }
    }
  }

  /** Réinitialise complètement le gestionnaire */
  reset() {
    this.joueurs = [];
    this.prochainId = 1;
  }

  /** Ajoute un joueur à la partie */
  ajouterJoueur(jid, pseudo) {
    if (this.joueurs.some((j) => j.jid === jid)) return null; // déjà inscrit
    const joueur = {
      id: this.prochainId++,
      jid: jid,
      pseudo: pseudo,
      role: null,
      camp: null,
      estVivant: true,
      estMaire: false,
      estInfecte: false,     // infecté par Loup Noir
      estContamine: false,   // contaminé par Rat Malade
      estAmoureux: false,
      amoureuxId: null,
      potions: { vie: true, mort: true },   // Sorcière
      aUtiliseDictateur: false,
      aUtiliseInfection: false,
      ballesChasseur: 2,       // Chasseur : 2 balles, 1 utilisable par nuit
      aTireCetteNuit: false,   // Chasseur : a-t-il déjà tiré cette nuit ?
      protectionId: null,     // ID du joueur protégé cette nuit (Garde)
      derniereProtectionId: null, // dernière protection (pour éviter deux fois de suite)
      tonneau: false,         // a un tonneau (Pyromancien)
      aExplose: false,        // le Pyromancien a déjà explosé cette phase
      testataireId: null,     // Héritier : le testataire choisi
      heriteRole: null,       // Rôle hérité du testataire
      motBavard: null,        // Mot du Loup Bavard pour ce tour
      aPlaceMot: false,       // Le Loup Bavard a-t-il placé son mot ?
    };
    this.joueurs.push(joueur);
    return joueur;
  }

  /** Assigne les rôles aléatoirement à tous les joueurs */
  assignerRoles() {
    // Distribution selon le nombre de joueurs
    const nb = this.joueurs.length;
    let roles = [];

    // Toujours au moins un loup
    const nbLoups = Math.max(1, Math.floor(nb / 4));
    const nbSolitaires = Math.max(1, Math.floor(nb / 6));

    // Ajout des rôles loups
    for (let i = 0; i < nbLoups; i++) {
      if (i === 0) roles.push(CONFIG.ROLES.LOUP_GAROU);
      else if (i === 1 && nb > 5) roles.push(CONFIG.ROLES.LOUP_NOIR);
      else if (i === 2 && nb > 8) roles.push(CONFIG.ROLES.LOUP_BAVARD);
      else if (i === 3 && nb > 10) roles.push(CONFIG.ROLES.LOUP_GAROU);
      else roles.push(CONFIG.ROLES.LOUP_GAROU);
    }

    // Ajout des rôles solitaires
    const solosDisponibles = [
      CONFIG.ROLES.LOUP_BLANC,
      CONFIG.ROLES.MERCENAIRE,
      CONFIG.ROLES.NAIN_TRACASSIN,
      CONFIG.ROLES.RAT_MALADE,
      CONFIG.ROLES.TANNEUR,
      CONFIG.ROLES.FOU,
    ];
    const solosSelectionnes = shuffle(solosDisponibles).slice(0, nbSolitaires);
    roles.push(...solosSelectionnes);

    // Ajouter les rôles spéciaux villageois
    const speciaux = [
      CONFIG.ROLES.VOYANTE,
      CONFIG.ROLES.SORCIERE,
      CONFIG.ROLES.CHASSEUR,
      CONFIG.ROLES.GARDE,
      CONFIG.ROLES.CUPIDON,
      CONFIG.ROLES.FOSSOYEUR,
      CONFIG.ROLES.DICTATEUR,
      CONFIG.ROLES.CHAPERON_ROUGE,
      CONFIG.ROLES.PYROMANCIEN,
      CONFIG.ROLES.HERITIER,
    ];

    // Autant de spéciaux que possible selon le nombre de joueurs restants
    const reste = nb - roles.length;
    const speciauxSelectionnes = shuffle(speciaux).slice(0, Math.min(reste, nb - 3));
    roles.push(...speciauxSelectionnes);

    // Le reste en simples villageois
    while (roles.length < nb) {
      roles.push(CONFIG.ROLES.SIMPLE_VILLAGEOIS);
    }

    // Mélanger et assigner
    const rolesMelanges = shuffle(roles);
    this.joueurs.forEach((j, index) => {
      j.role = rolesMelanges[index];
      j.camp = this.CAMP_ROLE[j.role];
    });

    return rolesMelanges;
  }

  /** Retourne la liste des joueurs vivants */
  getVivants() {
    return this.joueurs.filter((j) => j.estVivant);
  }

  /** Retourne la liste des joueurs morts */
  getMorts() {
    return this.joueurs.filter((j) => !j.estVivant);
  }

  /** Retourne un joueur par son ID */
  getParId(id) {
    return this.joueurs.find((j) => j.id === parseInt(id)) || null;
  }

  /** Retourne un joueur par son JID */
  getParJid(jid) {
    return this.joueurs.find((j) => j.jid === jid) || null;
  }

  /** Retourne les joueurs d'un camp spécifique */
  getParCamp(camp) {
    return this.joueurs.filter((j) => j.camp === camp && j.estVivant);
  }

  /** Tue un joueur */
  tuer(id) {
    const joueur = this.getParId(id);
    if (!joueur || !joueur.estVivant) return false;
    joueur.estVivant = false;

    // Gérer les amoureux : l'autre meurt aussi
    if (joueur.estAmoureux && joueur.amoureuxId) {
      const amoureux = this.getParId(joueur.amoureuxId);
      if (amoureux && amoureux.estVivant) {
        amoureux.estVivant = false;
        return { tue: joueur, amoureux: amoureux };
      }
    }

    return { tue: joueur, amoureux: null };
  }

  /** Infecte un joueur (Loup Noir) */
  infecter(id) {
    const joueur = this.getParId(id);
    if (!joueur || !joueur.estVivant || joueur.estInfecte) return false;
    joueur.estInfecte = true;
    joueur.camp = CONFIG.CAMP.LOUPS; // Rejoint le camp des loups
    return true;
  }

  /** Contamine un joueur (Rat Malade) */
  contaminer(id) {
    const joueur = this.getParId(id);
    if (!joueur || !joueur.estVivant || joueur.estContamine) return false;
    joueur.estContamine = true;
    return true;
  }

  /** Vérifie si tous les vivants sont contaminés (condition de victoire Rat) */
  tousContamines() {
    return this.getVivants().every((j) => j.estContamine);
  }

  /** Compte les joueurs par camp */
  compterParCamp() {
    const vivants = this.getVivants();
    const loups = vivants.filter((j) => j.camp === CONFIG.CAMP.LOUPS).length;
    const villageois = vivants.filter((j) => j.camp === CONFIG.CAMP.VILLAGEOIS).length;
    const solos = vivants.filter((j) => j.camp === CONFIG.CAMP.SOLITAIRE).length;
    return { loups, villageois, solos, total: vivants.length };
  }

  /** Vérifie les conditions de victoire */
  verifierVictoire() {
    const vivants = this.getVivants();
    const { loups, villageois, solos, total } = this.compterParCamp();

    // Loup Blanc : dernier survivant seul
    if (total === 1 && vivants[0].role === CONFIG.ROLES.LOUP_BLANC) {
      // Vérifie si en couple avec un mort
      if (vivants[0].estAmoureux && !this.getParId(vivants[0].amoureuxId)?.estVivant) {
        return { equipeGagnante: CONFIG.CAMP.SOLITAIRE, gagnants: [vivants[0]], raison: "Loup Blanc dernier survivant" };
      }
    }

    // Loups : nb loups >= nb non-loups
    const nonLoups = total - loups;
    if (loups > 0 && loups >= nonLoups) {
      return { equipeGagnante: CONFIG.CAMP.LOUPS, gagnants: vivants.filter((j) => j.camp === CONFIG.CAMP.LOUPS), raison: "Les loups dominent le village" };
    }

    // Villageois : tous les loups et solitaires éliminés
    if (loups === 0 && solos === 0) {
      return { equipeGagnante: CONFIG.CAMP.VILLAGEOIS, gagnants: vivants, raison: "Tous les loups et solitaires ont été éliminés" };
    }

    // Rat Malade : tous les vivants contaminés
    if (this.tousContamines() && total > 0) {
      const rat = this.joueurs.find((j) => j.role === CONFIG.ROLES.RAT_MALADE);
      if (rat && rat.estVivant) {
        return { equipeGagnante: CONFIG.CAMP.SOLITAIRE, gagnants: [rat], raison: "Tous les joueurs sont contaminés" };
      }
    }

    // Nain Tracassin : seul survivant ou en duel face à un villageois
    const nain = vivants.find((j) => j.role === CONFIG.ROLES.NAIN_TRACASSIN);
    if (nain && total <= 2) {
      return { equipeGagnante: CONFIG.CAMP.SOLITAIRE, gagnants: [nain], raison: "Le Nain Tracassin est l'un des derniers survivants" };
    }

    // Vérification des couples amoureux : ils gagnent s'ils sont les 2 derniers survivants
    const couplesOpposes = this.joueurs.filter(
      (j) => j.estAmoureux && j.amoureuxId && this.getParId(j.amoureuxId)?.estVivant
    );
    if (couplesOpposes.length === 2 && total === 2) {
      const j1 = couplesOpposes[0];
      const j2 = couplesOpposes[1];
      return { equipeGagnante: "couple", gagnants: [j1, j2], raison: "Les amoureux sont les deux derniers survivants" };
    }

    return null;
  }

  /** Sérialise l'état pour sauvegarde */
  toJSON() {
    return {
      prochainId: this.prochainId,
      joueurs: this.joueurs,
      CAMP_ROLE: this.CAMP_ROLE,
    };
  }

  /** Restaure l'état depuis une sauvegarde */
  fromJSON(data) {
    this.prochainId = data.prochainId;
    this.joueurs = data.joueurs;
    this.CAMP_ROLE = data.CAMP_ROLE;
  }
}

export default PlayerManager;
