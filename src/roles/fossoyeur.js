// ===== Rôle : Fossoyeur =====
// À sa mort, le bot lui demande en MP de désigner un joueur.
// Le bot annonce publiquement ce joueur et son rôle,
// puis annonce un joueur du camp opposé et son rôle.

export default {
  nom: "Fossoyeur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false;
  },

  async onDeath(bot, joueur, game) {
    const { mpFossoyeurInstructions } = await import("../utils/messages.js");
    const vivants = game.players.getVivants().filter((j) => j.id !== joueur.id);
    await bot.envoyerMessagePrive(joueur.jid, mpFossoyeurInstructions(vivants));
  },
};
