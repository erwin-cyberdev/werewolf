// ===== Rôle : Cupidon =====
// NOTE : ce fichier sert de documentation du rôle. La logique réelle est
// implémentée dans nightManager.js (résolution de l'action "lier") et
// gameManager.js (envoi des instructions + notification des amoureux).
//
// La nuit 1 UNIQUEMENT, le bot envoie automatiquement à Cupidon ses
// instructions lui demandant s'il veut lier deux joueurs (`-lier [id1] [id2]`).
// Passé la nuit 1, Cupidon ne peut plus agir.
//
// Les deux joueurs désignés sont notifiés en privé de leur nouveau statut
// d'amoureux.
// Si l'un des deux meurt, l'autre meurt aussitôt de chagrin.
// S'ils sont les deux seuls survivants de la partie, ils gagnent ensemble.

export default {
  nom: "Cupidon",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Cupidon n'agit que la nuit 1
    if (game.nuits.phaseNuit === 1) {
      const { mpCupidonInstructions } = await import("../utils/messages.js");
      await bot.envoyerMessagePrive(joueur.jid, mpCupidonInstructions(joueursVivants));
    }
  },

  async resolveAction(bot, joueur, action, game) {
    if (game.nuits.phaseNuit === 1 && action.type === "lier") {
      return true;
    }
    return false;
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
