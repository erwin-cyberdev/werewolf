// ===== Rôle : Héritier =====
// La nuit 1, choisit un testataire.
// À la mort du testataire, il récupère ses pouvoirs non consommés
// (sauf infection/contamination).
// Si le testataire est un loup, les loups sont informés.

export default {
  nom: "Héritier",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // L'Héritier n'agit que la nuit 1
    if (game.nuits.phaseNuit === 1) {
      const { mpHeritierInstructions } = await import("../utils/messages.js");
      await bot.envoyerMessagePrive(joueur.jid, mpHeritierInstructions(joueursVivants));
    }
  },

  async resolveAction(bot, joueur, action, game) {
    if (game.nuits.phaseNuit === 1 && action.type === "choisir") {
      return true;
    }
    return false;
  },

  /**
   * Transfère les pouvoirs du testataire à l'héritier
   */
  async transfererPouvoirs(bot, heritier, testataire, game) {
    // L'héritier hérite des pouvoirs non consommés
    if (testataire.role === "Sorcière") {
      heritier.role = "Sorcière";
      heritier.camp = testataire.camp;
      heritier.potions = { ...testataire.potions };
    } else if (testataire.role === "Garde") {
      heritier.role = "Garde";
      heritier.camp = testataire.camp;
      heritier.derniereProtectionId = testataire.derniereProtectionId;
    } else if (["Loup-Garou", "Loup Noir", "Loup Bavard"].includes(testataire.role)) {
      heritier.role = testataire.role;
      heritier.camp = testataire.camp;

      // Informer les loups
      const loups = game.players.joueurs.filter(
        (j) => j.camp === "loups" && j.estVivant && j.id !== heritier.id
      );
      for (const loup of loups) {
        await bot.envoyerMessagePrive(loup.jid,
          `👑 L'Héritier (@${heritier.pseudo}) a hérité des pouvoirs de ${testataire.pseudo} (${testataire.role}) et rejoint notre camp !`);
      }
    } else {
      heritier.role = testataire.role;
      heritier.camp = testataire.camp;
    }

    const { msgHeritierPowers } = await import("../utils/messages.js");
    await bot.envoyerMessagePrive(heritier.jid, msgHeritierPowers(testataire.role));
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
