// ===== Rôle : Sorcière =====
// 2 potions uniques. Potion de vie : sauve la victime des loups cette nuit.
// Potion de mort : tue un joueur. Une seule potion par nuit, ou passer.

export default {
  nom: "Sorcière",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // La Sorcière est notifiée de la victime potentielle
    // Note : à ce stade, les actions des loups n'ont pas encore été résolues
    // donc on ne peut pas encore savoir qui est la victime
    const { mpSorciereInstructions } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(joueur.jid, mpSorciereInstructions(null, joueursVivants));
  },

  async resolveAction(bot, joueur, action, game) {
    return ["sauver", "empoisonner", "passer"].includes(action.type);
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
