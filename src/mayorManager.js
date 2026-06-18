// ===== Gestion du Maire =====

/**
 * Gère l'élection et les pouvoirs du Maire
 */
class MayorManager {
  constructor() {
    this.maireId = null; // ID du joueur qui est Maire
  }

  reset() {
    this.maireId = null;
  }

  /** Définit le Maire */
  elire(joueurId) {
    this.maireId = joueurId;
  }

  /** Retourne l'ID du Maire */
  getMaireId() {
    return this.maireId;
  }

  /** Retourne true si un Maire est en fonction */
  aMaire() {
    return this.maireId !== null;
  }

  /** Supprime le Maire (si mort, etc.) */
  destituer() {
    this.maireId = null;
  }

  toJSON() {
    return { maireId: this.maireId };
  }

  fromJSON(data) {
    this.maireId = data.maireId || null;
  }
}

export default MayorManager;
