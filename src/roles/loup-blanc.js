// ===== Rôle : Loup Blanc =====
// Se réveille avec les loups (ils le croient allié) mais joue seul.
// À partir de la nuit 2, une nuit sur deux, peut dévorer un joueur OU un loup.
// Son attaque ignore toute protection.
// Objectif : être le dernier survivant (sauf si en couple).

export default {
  nom: "Loup Blanc",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Ne reçoit d'instructions qu'à partir de la nuit 2, une nuit sur deux
    if (game.nuits.phaseNuit >= 2 && game.nuits.phaseNuit % 2 === 0) {
      const { mpLoupBlancInstructions } = await import("../utils/messages.js");
      await bot.envoyerMessagePrive(joueur.jid, mpLoupBlancInstructions(joueursVivants, game.nuits.phaseNuit));
    }
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "devorer" || action.type === "tuer" || action.type === "passer";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
