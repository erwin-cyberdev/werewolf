// ===== Rôle : Dictateur =====
// Une fois par partie, prend le contrôle du vote journalier
// et impose l'élimination d'un joueur.
// Si c'est un loup → il devient Maire.
// Sinon → il meurt.

export default {
  nom: "Dictateur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false; // L'action du dictateur est en journée
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
