// ===== Rôle : Chasseur =====
// NOTE : ce fichier sert de documentation du rôle. La logique réelle est
// implémentée dans gameManager.js (envoyerInstructionsNuit / actionChasseur)
// et déclenchée par la commande -tirer en message privé.
//
// Le Chasseur possède 2 balles dans son fusil pour toute la partie.
// Chaque nuit où il est vivant et qu'il lui reste au moins une balle,
// il peut utiliser UNE balle (1 max par nuit) pour abattre immédiatement
// le membre du jeu de son choix, via `-tirer [id]`.
// La mort qui en résulte est annoncée au groupe en précisant qu'elle est
// causée par le Chasseur ("abattu par le Chasseur").

export default {
  nom: "Chasseur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    const { mpChasseurInstructions } = await import("../utils/messages.js");
    if (joueur.ballesChasseur > 0) {
      await bot.envoyerMessagePrive(joueur.jid, mpChasseurInstructions(joueursVivants, joueur.ballesChasseur));
    }
  },

  async resolveAction(bot, joueur, action, game) {
    // Résolu immédiatement par gameManager.actionChasseur() (pas via la file
    // d'attente nocturne classique), pour permettre un tir instantané.
    return false;
  },

  async onDeath(bot, joueur, game) {
    // Le Chasseur n'a plus de pouvoir déclenché par sa propre mort :
    // ses balles restantes (s'il en avait) sont simplement perdues.
  },
};
