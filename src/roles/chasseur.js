// ===== Rôle : Chasseur =====
// À sa mort, peut entraîner un autre joueur avec lui (optionnel, timer de 30 sec).

export default {
  nom: "Chasseur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne spécifique
  },

  async resolveAction(bot, joueur, action, game) {
    return false; // L'action du chasseur se déclenche à sa mort
  },

  async onDeath(bot, joueur, game) {
    const { mpChasseurInstructions } = await import("../utils/messages.js");
    const vivants = game.players.getVivants().filter((j) => j.id !== joueur.id);
    await bot.envoyerMessagePrive(joueur.jid, mpChasseurInstructions(vivants));
  },
};
