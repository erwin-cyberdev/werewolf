// ===== Rôle : Nain Tracassin =====
// Chaque nuit avant les loups, choisit un joueur et parie sur son rôle.
// Bonne réponse → le joueur est éliminé.
// Mauvaise réponse → la cible peut tenter de deviner le rôle du Nain ;
// si correct, le Nain meurt.

export default {
  nom: "Nain Tracassin",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpNainInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpNainInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "parier";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
