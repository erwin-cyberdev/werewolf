// ===== Rôle : Tanneur =====
// Villageois sans pouvoir spécial.
// Objectif unique : être éliminé par le vote du village.
// S'il est tué par les loups ou une autre action nocturne, il perd.
// S'il est éliminé au vote de jour, il gagne instantanément.
// Pas d'action nocturne.

export default {
  nom: "Tanneur",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false;
  },

  async onDeath(bot, joueur, game) {
    // La vérification de victoire est faite dans gameManager.finaliserVote()
    // quand le Tanneur est éliminé par le vote
  },
};
