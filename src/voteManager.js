// ===== Gestion des votes en MP =====

import { creerTimer } from "./utils/timer.js";

/**
 * Gère la collecte et le décompte des votes (tous en MP)
 */
class VoteManager {
  constructor() {
    this.votes = {};        // { jid_expediteur: id_cible }
    this.timer = null;
    this.callbacks = {};
  }

  reset() {
    this.votes = {};
    this.timer = null;
    this.callbacks = {};
  }

  /**
   * Démarre une phase de vote
   * @param {number} dureeSecondes
   * @param {Function} onEnd - callback appelé à la fin avec le résultat
   * @param {Function} onTick - callback à chaque seconde
   */
  demarrer(dureeSecondes, onEnd, onTick) {
    this.votes = {};
    this.callbacks.onEnd = onEnd;

    this.timer = creerTimer(dureeSecondes, (restant) => {
      if (onTick) onTick(restant);
    }, () => {
      this.finaliser();
    });
  }

  /**
   * Enregistre le vote d'un joueur
   * @param {string} jid - JID de l'expéditeur
   * @param {number} cibleId - ID du joueur ciblé
   * @returns {boolean} true si accepté
   */
  voter(jid, cibleId) {
    if (this.votes[jid]) return false; // a déjà voté
    this.votes[jid] = cibleId;
    this.callbacks.onVote?.(jid, cibleId);
    return true;
  }

  /**
   * Vérifie si un joueur a déjà voté
   */
  aVote(jid) {
    return jid in this.votes;
  }

  /**
   * Calcule le résultat du vote
   * @returns {{ resultat: Object, egaux: Array, totalVotes: number }}
   */
  calculerResultat() {
    const compteur = {};
    Object.values(this.votes).forEach((cibleId) => {
      compteur[cibleId] = (compteur[cibleId] || 0) + 1;
    });

    const totalVotes = Object.keys(this.votes).length;
    const maxVotes = Math.max(...Object.values(compteur), 0);

    // Trouver les joueurs avec le max de votes
    const egaux = Object.entries(compteur)
      .filter(([id, nb]) => nb === maxVotes)
      .map(([id]) => parseInt(id));

    return {
      compteur,
      totalVotes,
      maxVotes,
      egaux,
      vainqueur: egaux.length === 1 ? egaux[0] : null,
    };
  }

  /** Finalise le vote et appelle le callback */
  finaliser() {
    if (this.timer) {
      this.timer.stop();
    }
    const resultat = this.calculerResultat();
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd(resultat);
    }
  }

  /** Arrête le vote prématurément */
  stopper() {
    if (this.timer) {
      this.timer.stop();
    }
  }

  toJSON() {
    return { votes: this.votes };
  }

  fromJSON(data) {
    this.votes = data.votes || {};
  }
}

export default VoteManager;
