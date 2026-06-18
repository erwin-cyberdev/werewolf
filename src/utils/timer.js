// ===== Gestion des comptes à rebours =====

/**
 * Crée un timer avec gestion d'événements
 * @param {number} dureeSecondes - durée en secondes
 * @param {Function} onTick - callback à chaque seconde (reçoit les secondes restantes)
 * @param {Function} onEnd - callback à la fin du timer
 * @returns {{ stop: Function, ajouter: Function, tempsRestant: number }}
 */
export function creerTimer(dureeSecondes, onTick, onEnd) {
  let tempsRestant = dureeSecondes;
  let intervalId = null;
  let termine = false;

  const tick = () => {
    if (termine) return;
    tempsRestant--;
    if (onTick) onTick(tempsRestant);
    if (tempsRestant <= 0) {
      clearInterval(intervalId);
      termine = true;
      if (onEnd) onEnd();
    }
  };

  // Démarre le timer
  intervalId = setInterval(tick, 1000);
  if (onTick) onTick(tempsRestant);

  return {
    /** Arrête le timer immédiatement */
    stop() {
      if (termine) return;
      clearInterval(intervalId);
      termine = true;
    },

    /** Ajoute du temps (en secondes) */
    ajouter(secondes) {
      if (termine) return;
      tempsRestant += secondes;
      if (onTick) onTick(tempsRestant);
    },

    /** Retourne le temps restant */
    get tempsRestant() {
      return tempsRestant;
    },

    get estTermine() {
      return termine;
    },
  };
}

/**
 * Attend une durée donnée (Promise)
 * @param {number} secondes
 * @returns {Promise<void>}
 */
export function attendre(secondes) {
  return new Promise((resolve) => setTimeout(resolve, secondes * 1000));
}
