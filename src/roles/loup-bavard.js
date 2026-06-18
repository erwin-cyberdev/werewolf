// ===== Rôle : Loup Bavard =====
// Loup-Garou + reçoit chaque matin un mot à placer dans ses messages du groupe
// avant la fin du jour. S'il ne le place pas, il meurt en fin de journée.

export default {
  nom: "Loup Bavard",
  camp: "loups",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpLoupInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpLoupInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "tuer" || action.type === "passer";
  },

  async onDayStart(bot, joueur, game) {
    // Envoyer le mot au Loup Bavard en début de journée
    if (game.donnees.motBavard) {
      const { msgLoupBavardMot } = await import("../utils/messages.js");
      await bot.envoyerMessagePrive(joueur.jid, msgLoupBavardMot(game.donnees.motBavard));
    }
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
