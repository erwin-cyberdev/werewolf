// ===== Rôle : Loup-Garou =====
// Chaque nuit, peut dévorer un joueur ou passer.
// Vote individuel : chaque loup envoie sa cible en MP.
// Si égalité entre loups, mort aléatoire parmi les ex-æquo.

export default {
  nom: "Loup-Garou",
  camp: "loups",

  /** Envoie les instructions de nuit au joueur */
  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpLoupInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpLoupInstructions(joueursVivants));
  },

  /** Traite l'action du joueur pendant la nuit */
  async resolveAction(bot, joueur, action, game) {
    // L'action est gérée par nightManager.js (collecte des votes des loups)
    return action.type === "tuer" || action.type === "passer";
  },

  /** Actions à la mort du joueur */
  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
