// ===== Gestion des actions nocturnes =====

import CONFIG from "./config.js";
import { creerTimer } from "./utils/timer.js";

/**
 * Gère la collecte et la résolution des actions nocturnes par ordre de priorité
 */
class NightManager {
  constructor() {
    this.actions = {};      // { jid: { type: string, cible: number, cible2: number } }
    this.timer = null;
    this.callbacks = {};
    this.phaseNuit = 1;
  }

  reset() {
    this.actions = {};
    this.timer = null;
    this.callbacks = {};
    this.phaseNuit = 1;
  }

  incrementerPhase() {
    this.phaseNuit++;
  }

  /**
   * Démarre la collecte des actions nocturnes
   * @param {number} dureeSecondes
   * @param {Function} onEnd - callback à la fin avec les résultats résolus
   * @param {Function} onTick
   */
  demarrer(dureeSecondes, onEnd, onTick) {
    this.actions = {};
    this.callbacks.onEnd = onEnd;

    this.timer = creerTimer(dureeSecondes, (restant) => {
      if (onTick) onTick(restant);
    }, () => {
      this.finaliser();
    });
  }

  /**
   * Enregistre une action d'un joueur
   * @param {string} jid
   * @param {string} type - type d'action (tuer, voir, proteger, etc.)
   * @param {number} cible - ID du joueur cible principal
   * @param {number} cible2 - ID du joueur cible secondaire (optionnel)
   * @returns {boolean}
   */
  enregistrerAction(jid, type, cible, cible2 = null) {
    if (this.actions[jid]) return false; // déjà agi
    this.actions[jid] = { type, cible, cible2 };
    this.callbacks.onAction?.(jid, type, cible);
    return true;
  }

  /**
   * Résout toutes les actions dans l'ordre de priorité
   * @param {import('./playerManager.js').default} playerManager
   * @param {import('./mayorManager.js').default} mayorManager (inutilisé ici mais gardé pour l'interface)
   * @returns {Object} résultats de la nuit
   */
  resoudreActions(playerManager, mayorManager) {
    const resultats = {
      morts: [],          // [{ joueur, cause }]
      infectes: [],       // [joueur]
      infectesAppliques: [], // [joueur] — infections réellement appliquées cette nuit (pour notification)
      contamines: [],     // [joueur]
      vus: [],            // [{ voyant, cible, role }]          — vrais résultats Voyante
      fouVus: [],         // [{ voyant, cible, fauxRole }]     — faux résultats Fou
      protege: null,      // joueur protégé par le Garde
      sauve: null,        // joueur sauvé par la Sorcière
      amoureux: [],       // [{ j1, j2 }]
      tonneaux: [],       // [id_joueur]
      explosionTonneaux: false,
      heritierChoisi: null, // { heritierId, testataireId }
      nainResultat: null,   // { parieur, cible, roleDevine, succes }
    };

    const vivants = playerManager.getVivants();
    const getParJid = (jid) => playerManager.getParJid(jid);
    const getParId = (id) => playerManager.getParId(id);

    // ========== Résolution par ordre de priorité ==========

    // 1. Nain Tracassin (priorité 0)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.NAIN_TRACASSIN || action.type !== "parier") continue;
      const cible = getParId(action.cible);
      if (!cible || !cible.estVivant) continue;

      const roleDevine = action.cible2; // stocké comme role dans cible2
      const succes = cible.role === roleDevine;

      resultats.nainResultat = {
        parieur: joueur,
        cible: cible,
        roleDevine: roleDevine,
        succes: succes,
      };

      if (succes) {
        // Bonne réponse → la cible meurt
        const mort = playerManager.tuer(cible.id);
        resultats.morts.push({ joueur: mort.tue, cause: "nain_tracassin" });
        if (mort.amoureux) {
          resultats.morts.push({ joueur: mort.amoureux, cause: "chagrin_amoureux" });
        }
      } else {
        // Mauvaise réponse → la cible peut tenter de deviner le rôle du Nain
        // On stocke l'info pour que le jeu demande à la cible
        resultats.nainResultat.attenteReponse = true;
      }
    }

    // 2. Loups (priorité 1) - Loup Blanc, Loup-Garou, Loup Noir, Loup Bavard
    const votesLoups = {}; // { cibleId: [joueur_loup] }
    let actionLoupBlanc = null;

    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || !joueur.estVivant) continue;

      if (joueur.role === CONFIG.ROLES.LOUP_BLANC) {
        // Loup Blanc : peut dévorer une nuit sur deux (nuits paires après la nuit 1)
        if (this.phaseNuit >= 2 && this.phaseNuit % 2 === 0) {
          if (action.type === "devorer" || action.type === "tuer") {
            actionLoupBlanc = { joueur, cible: getParId(action.cible) };
          }
        }
        continue;
      }

      // Actions des loups normaux (Loup-Garou, Loup Noir, Loup Bavard)
      if (joueur.camp === CONFIG.CAMP.LOUPS && (action.type === "tuer" || action.type === "infecter" || action.type === "passer")) {
        if (action.type === "passer") continue;
        const cible = getParId(action.cible);
        if (!cible || !cible.estVivant) continue;

        if (!votesLoups[cible.id]) votesLoups[cible.id] = [];
        votesLoups[cible.id].push(joueur);

        // Loup Noir : action d'infection
        if (action.type === "infecter" && !joueur.aUtiliseInfection) {
          resultats.infectes.push({ infecteur: joueur, cible: cible });
        }
      }
    }

    // Résolution du vote des loups
    if (Object.keys(votesLoups).length > 0) {
      // Trouver la cible avec le plus de votes
      let maxVotes = 0;
      let meilleuresCibles = [];
      for (const [cibleId, votants] of Object.entries(votesLoups)) {
        if (votants.length > maxVotes) {
          maxVotes = votants.length;
          meilleuresCibles = [parseInt(cibleId)];
        } else if (votants.length === maxVotes) {
          meilleuresCibles.push(parseInt(cibleId));
        }
      }

      // Égalité → mort aléatoire parmi les ex-æquo
      const cibleId = meilleuresCibles.length > 1
        ? meilleuresCibles[Math.floor(Math.random() * meilleuresCibles.length)]
        : meilleuresCibles[0];

      resultats.cibleLoups = cibleId;
    }

    // Application Loup Blanc (après les loups normaux)
    if (actionLoupBlanc && actionLoupBlanc.cible && actionLoupBlanc.cible.estVivant) {
      // Le Loup Blanc peut tuer même un loup, ignore les protections
      resultats.cibleLoupBlanc = actionLoupBlanc.cible.id;
      resultats.ignoreProtection = true;
    }

    // 3. Garde (priorité 2)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.GARDE || action.type !== "proteger") continue;
      const cible = getParId(action.cible);
      if (!cible || !cible.estVivant) continue;
      // Vérifier qu'il ne protège pas deux fois de suite la même personne
      if (joueur.derniereProtectionId === cible.id) continue;

      resultats.protege = cible;
      joueur.derniereProtectionId = cible.id;
      break;
    }

    // 4. Sorcière (priorité 3)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.SORCIERE) continue;

      if (action.type === "sauver" && joueur.potions.vie) {
        resultats.sauve = true;
        joueur.potions.vie = false;
      }

      if (action.type === "empoisonner" && joueur.potions.mort) {
        const cible = getParId(action.cible);
        if (cible && cible.estVivant) {
          resultats.morts.push({ joueur: cible, cause: "sorciere" });
          joueur.potions.mort = false;
        }
      }
      break; // une seule action par nuit pour la sorcière
    }

    // 5. Pyromancien (priorité 4)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.PYROMANCIEN) continue;

      if (action.type === "poser") {
        const cible = getParId(action.cible);
        if (cible && cible.estVivant) {
          cible.tonneau = true;
          resultats.tonneaux.push(cible.id);
        }
      }

      if (action.type === "exploser") {
        resultats.explosionTonneaux = true;
        // Réservé : l'explosion sera traitée au matin
      }
      break;
    }

    // 6. Cupidon (priorité 5) - nuit 1 uniquement
    if (this.phaseNuit === 1) {
      for (const [jid, action] of Object.entries(this.actions)) {
        const joueur = getParJid(jid);
        if (!joueur || joueur.role !== CONFIG.ROLES.CUPIDON || action.type !== "lier") continue;
        const cible1 = getParId(action.cible);
        const cible2 = getParId(action.cible2);
        if (!cible1 || !cible2 || !cible1.estVivant || !cible2.estVivant) continue;
        if (cible1.id === cible2.id) continue;

        cible1.estAmoureux = true;
        cible1.amoureuxId = cible2.id;
        cible2.estAmoureux = true;
        cible2.amoureuxId = cible1.id;
        resultats.amoureux.push({ j1: cible1, j2: cible2 });
        break; // un seul couple
      }
    }

    // 7. Voyante (priorité 6)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.VOYANTE || action.type !== "voir") continue;
      const cible = getParId(action.cible);
      if (!cible || !cible.estVivant) continue;

      // La Voyante ne détecte PAS l'infection du Loup Noir
      // Elle voit le rôle original, sauf si le joueur a été infecté
      let roleVu = cible.role;
      // Si le joueur a été infecté, la voyante voit toujours le rôle original
      // (conformément à la spec : la Voyante ne détecte pas l'infection)

      resultats.vus.push({ voyant: joueur, cible: cible, role: roleVu });
      break;
    }

    // 7b. Le Fou (même priorité que Voyante) — résultat aléatoire et FAUX
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.FOU || action.type !== "voir") continue;
      const cible = getParId(action.cible);
      if (!cible || !cible.estVivant) continue;

      // Choisir un rôle aléatoire parmi tous les rôles *différents* du vrai rôle
      const tousLesRoles = Object.values(CONFIG.ROLES).filter((r) => r !== cible.role);
      const fauxRole = tousLesRoles[Math.floor(Math.random() * tousLesRoles.length)];

      resultats.fouVus.push({ voyant: joueur, cible: cible, fauxRole });
      break;
    }

    // 8. Rat Malade (priorité 7)
    for (const [jid, action] of Object.entries(this.actions)) {
      const joueur = getParJid(jid);
      if (!joueur || joueur.role !== CONFIG.ROLES.RAT_MALADE || action.type !== "contaminer") continue;
      const cible1 = getParId(action.cible);
      const cible2 = getParId(action.cible2);
      if (cible1 && cible1.estVivant) {
        resultats.contamines.push(cible1);
      }
      if (cible2 && cible2.estVivant) {
        resultats.contamines.push(cible2);
      }
      break;
    }

    // 9. Héritier (priorité 8) - nuit 1 uniquement
    if (this.phaseNuit === 1) {
      for (const [jid, action] of Object.entries(this.actions)) {
        const joueur = getParJid(jid);
        if (!joueur || joueur.role !== CONFIG.ROLES.HERITIER || action.type !== "choisir") continue;
        const cible = getParId(action.cible);
        if (!cible || !cible.estVivant) continue;

        resultats.heritierChoisi = { heritier: joueur, testataire: cible };
        joueur.testataireId = cible.id;
        break;
      }
    }

    // ========== Application des morts de la nuit ==========

    // 1. Victime des loups
    if (resultats.cibleLoups) {
      const cible = getParId(resultats.cibleLoups);
      if (cible && cible.estVivant) {
        const estProtege = resultats.protege && resultats.protege.id === cible.id;
        const estSauve = resultats.sauve;
        const estTueParLoupBlanc = false; // traité séparément

        if (!estProtege && !estSauve) {
          // Loup Noir : vérifier infection
          const infecteur = resultats.infectes.find((i) => i.cible.id === cible.id);
          if (infecteur) {
            playerManager.infecter(cible.id);
            infecteur.infecteur.aUtiliseInfection = true;
            resultats.infectesAppliques.push(cible);
          } else {
            const mort = playerManager.tuer(cible.id);
            if (mort) {
              resultats.morts.push({ joueur: mort.tue, cause: "loups" });
              if (mort.amoureux) {
                resultats.morts.push({ joueur: mort.amoureux, cause: "chagrin_amoureux" });
              }
            }
          }
        }
      }
    }

    // 2. Loup Blanc
    if (resultats.cibleLoupBlanc) {
      const cible = getParId(resultats.cibleLoupBlanc);
      if (cible && cible.estVivant) {
        // Le Loup Blanc ignore toute protection
        const mort = playerManager.tuer(cible.id);
        if (mort) {
          resultats.morts.push({ joueur: mort.tue, cause: "loup_blanc" });
          if (mort.amoureux) {
            resultats.morts.push({ joueur: mort.amoureux, cause: "chagrin_amoureux" });
          }
        }
      }
    }

    // 3. Application des contaminations
    for (const contamine of resultats.contamines) {
      playerManager.contaminer(contamine.id);
    }

    // 4. Explosion des tonneaux au matin (si le Pyromancien est vivant)
    if (resultats.explosionTonneaux) {
      const pyromancien = playerManager.joueurs.find((j) => j.role === CONFIG.ROLES.PYROMANCIEN && j.estVivant);
      if (pyromancien) {
        const porteurs = playerManager.joueurs.filter((j) => j.tonneau && j.estVivant);
        for (const porteur of porteurs) {
          const mort = playerManager.tuer(porteur.id);
          if (mort) {
            resultats.morts.push({ joueur: mort.tue, cause: "tonneau" });
            if (mort.amoureux) {
              resultats.morts.push({ joueur: mort.amoureux, cause: "chagrin_amoureux" });
            }
          }
          porteur.tonneau = false; // les tonneaux explosent et disparaissent
        }
      }
    }

    return resultats;
  }

  /** Finalise la collecte et résout les actions */
  finaliser() {
    if (this.timer) {
      this.timer.stop();
    }
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd();
    }
  }

  toJSON() {
    return { actions: this.actions, phaseNuit: this.phaseNuit };
  }

  fromJSON(data) {
    this.actions = data.actions || {};
    this.phaseNuit = data.phaseNuit || 1;
  }
}

export default NightManager;
