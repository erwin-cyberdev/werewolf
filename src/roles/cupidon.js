// ===== Rôle : Cupidon =====
// La nuit 1 uniquement, désigne 2 amoureux.
// Si l'un meurt, l'autre meurt immédiatement.
// Amoureux de camps opposés → doivent éliminer tout le monde pour gagner ensemble.
// Après la nuit 1, Cupidon devient Simple Villageois.

export default {
  nom: "Cupidon",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Cupidon n'agit que la nuit 1
    if (game.nuits.phaseNuit === 1) {
      const { mpCupidonInstructions } = await import("../utils/messages.js");
      await bot.envoyerMessagePrive(joueur.jid, mpCupidonInstructions(joueursVivants));
    }
  },

  async resolveAction(bot, joueur, action, game) {
    if (game.nuits.phaseNuit === 1 && action.type === "lier") {
      return true;
    }
    return false;
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },

  /** Après la nuit 1, Cupidon devient Villageois */
  onAfterNuit1(bot, joueur, game) {
    joueur.role = "Simple Villageois";
    joueur.camp = "villageois";
  },
};
