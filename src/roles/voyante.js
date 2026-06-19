// ===== Rôle : Voyante =====
// Chaque nuit, apprend le rôle d'un joueur.
// Ne détecte pas l'infection du Loup Noir.

export default {
  nom: "Voyante",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpVoyanteInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpVoyanteInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "voir";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
