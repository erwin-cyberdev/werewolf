// ===== Rôle : Pyromancien =====
// Chaque nuit, choisit entre poser un tonneau chez un joueur
// ou déclencher l'explosion de tous les tonneaux.
// Les joueurs avec un tonneau meurent au matin UNIQUEMENT si
// le Pyromancien est encore en vie. Peut tuer ses alliés.

export default {
  nom: "Pyromancien",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpPyromancienInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpPyromancienInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return action.type === "poser" || action.type === "exploser";
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
