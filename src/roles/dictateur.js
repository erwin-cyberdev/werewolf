// ===== Rôle : Dictateur =====
// NOTE : ce fichier sert de documentation du rôle. La logique réelle est
// implémentée dans gameManager.js (actionDictateur), déclenchée par la
// commande -coup en message privé.
//
// Une fois par partie (mais à N'IMPORTE QUEL tour de jour, pas seulement
// le premier), le Dictateur peut faire un coup d'État via `-coup [id]`
// pour désigner de force la personne à lyncher, sans passer par le vote
// du village.
// - Si la cible est un Loup → le Dictateur devient Maire.
// - Sinon → le Dictateur meurt à son tour.
// La cause de la mort de la cible est annoncée au groupe ("exécuté sur
// ordre du Dictateur").

export default {
  nom: "Dictateur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne : le coup d'État se joue uniquement en journée.
  },

  async resolveAction(bot, joueur, action, game) {
    return false; // Résolu directement par gameManager.actionDictateur()
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};// ===== Rôle : Dictateur =====
// Une fois par partie, prend le contrôle du vote journalier
// et impose l'élimination d'un joueur.
// Si c'est un loup → il devient Maire.
// Sinon → il meurt.

export default {
  nom: "Dictateur",
  camp: "villageois",

  async onNightStart(bot, joueur, joueursVivants, game) {
    // Pas d'action nocturne
  },

  async resolveAction(bot, joueur, action, game) {
    return false; // L'action du dictateur est en journée
  },

  async onDeath(bot, joueur, game) {
    // Rien de spécial
  },
};
