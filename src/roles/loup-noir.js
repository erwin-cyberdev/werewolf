// ===== Rôle : Loup Noir =====
// Loup-Garou + peut infecter la victime au lieu de la tuer (1x/partie)
// La victime rejoint le camp loup en conservant ses pouvoirs
// La Voyante ne détecte pas l'infection

export default {
  nom: "Loup Noir",
  camp: "loups",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpLoupNoirInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpLoupNoirInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    // Géré par nightManager.js
    return ["tuer", "infecter", "passer"].includes(action.type);
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
