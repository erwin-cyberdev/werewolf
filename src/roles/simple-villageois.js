// ===== Rôle : Simple Villageois =====
// Aucun pouvoir. Vote de jour uniquement.

export default {
  nom: "Simple Villageois",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false;
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
