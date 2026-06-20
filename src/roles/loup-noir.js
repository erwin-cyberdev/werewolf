// ===== Rôle : Loup Noir =====
// NOTE : ce fichier sert de documentation du rôle. La logique réelle est
// implémentée dans nightManager.js (résolution "infecter") et gameManager.js
// (notification de la victime + changement de ses actions nocturnes).
//
// Loup-Garou + peut infecter sa victime au lieu de la tuer (1x/partie).
// La victime infectée :
//   - rejoint le camp des Loups (CONFIG.CAMP.LOUPS) ;
//   - reçoit une notification privée l'informant qu'elle est désormais
//     un Loup Noir et qu'elle agit dorénavant avec les Loups ;
//   - reçoit chaque nuit les instructions de Loup (`-tuer [id]`) à la place
//     de ses anciennes instructions de rôle.
// La Voyante ne détecte pas l'infection (elle voit toujours le rôle d'origine).

export default {
  nom: "Loup Noir",
  camp: "loups",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpLoupNoirInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpLoupNoirInstructions(joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return ["tuer", "infecter", "passer"].includes(action.type);
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
