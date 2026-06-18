// ===== Rôle : Le Fou =====
// Se croit voyante mais ses "prédictions" sont fausses.
// Au début il reçoit un message l'informant qu'il est "La Voyante".
// Chaque nuit il peut "voir" un joueur, mais le rôle qui lui est renvoyé est aléatoire et faux.
// À sa mort, le bot lui révèle en MP son vrai rôle (Le Fou).
// Camp : solitaire (n'a pas d'objectif de victoire propre, il joue pour le village sans le savoir).

export default {
  nom: "Le Fou",
  camp: "solo",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Instructions identiques à la Voyante (le Fou croit être la Voyante)
    const { mpFouInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpFouInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    // Le Fou peut envoyer la commande -voir
    return action.type === "voir";
  },

  async onDeath(bot, joueur, game) {
    // Révéler son vrai rôle au moment de sa mort
    await bot.envoyerMessagePrive(
      joueur.jid,
      `🃏 *Révélation* : Tu n'étais pas la Voyante...\n\n` +
      `Ton vrai rôle était *Le Fou* ! Tu as cru toute la partie avoir des pouvoirs de voyance, ` +
      `mais tes visions étaient entièrement inventées. Bravo pour avoir semé le chaos ! 😄`
    );
  },
};
