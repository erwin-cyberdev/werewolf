// ===== Rôle : Garde =====
// Chaque nuit, protège un joueur différent (pas deux fois de suite la même personne,
// peut s'auto-protéger). Protection inefficace contre la Sorcière et le Loup Blanc.

export default {
  nom: "Garde",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpGardeInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpGardeInstructions(
      joueursVivants,
      joueur.derniereProtectionId ? game.players.getParId(joueur.derniereProtectionId) : null
    ));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "proteger";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
