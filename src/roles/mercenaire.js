// ===== Rôle : Mercenaire =====
// Reçoit une cible secrète au lever du jour 1.
// S'il la fait éliminer au vote du jour 1, il gagne immédiatement.
// Sinon, il devient Simple Villageois.
// Pas d'action nocturne.

export default {
  nom: "Mercenaire",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false; // Pas d'action nocturne
  },

  async onDayStart(bot, joueur, game) {
    // La cible est attribuée au jour 1 par le gameManager
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
