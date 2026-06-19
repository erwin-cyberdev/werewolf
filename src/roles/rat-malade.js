// ===== Rôle : Rat Malade =====
// Chaque nuit, contamine 2 joueurs.
// Gagne quand tous les joueurs vivants sont contaminés.
// Les contaminés se connaissent entre eux (notification MP).

export default {
  nom: "Rat Malade",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpRatInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpRatInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "contaminer";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
