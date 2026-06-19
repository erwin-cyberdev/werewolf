// ===== Rôle : Chaperon Rouge =====
// Tant que le Chasseur est en vie (et non infecté), elle est immunisée
// contre les attaques nocturnes des loups.
// Si le Chasseur meurt ou est infecté, elle devient Simple Villageois.
// Elle ignore l'identité du Chasseur et inversement.

export default {
  nom: "Chaperon Rouge",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false;
  },

  /** Vérifie si le Chaperon Rouge est immunisée */
  estImmunisee(joueur, game) {
    const chasseur = game.players.joueurs.find(
      (j) => j.role === "Chasseur" && j.estVivant && !j.estInfecte
    );
    return chasseur !== undefined;
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
