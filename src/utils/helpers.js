// ===== Fonctions utilitaires =====

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 * @param {Array} arr
 * @returns {Array} nouveau tableau mélangé
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire un élément aléatoire d'un tableau
 * @param {Array} arr
 * @returns {*} élément aléatoire
 */
export function randomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Retourne la clé distante (JID) d'un message
 * @param {Object} msg
 * @returns {string}
 */
export function getJid(msg) {
  return msg.key?.remoteJid;
}

/**
 * Retourne l'expéditeur d'un message
 * @param {Object} msg
 * @returns {string}
 */
export function getSender(msg) {
  return msg.key?.participant || msg.key?.remoteJid;
}

/**
 * Vérifie si un message est un MP (1-1)
 * @param {string} jid
 * @returns {boolean}
 */
export const isPrivateChat = (jid) => !jid || !jid.includes("@g.us");

/**
 * Extrait le numéro de téléphone d'un JID
 * @param {string} jid
 * @returns {string}
 */
export function jidToNum(jid) {
  if (!jid) return "";
  return jid.replace(/@s\.whatsapp\.net$/, "").replace(/@g\.us$/, "").split(":")[0];
}

/**
 * Formate un JID pour déclencher une vraie mention WhatsApp.
 *
 * Règles Baileys pour les mentions :
 *  1. Le texte du message doit contenir le JID complet sous la forme
 *     "@<numero>@s.whatsapp.net" (ou "@g.us" pour un groupe).
 *  2. Ce même JID doit être présent dans le tableau `mentions` passé à
 *     sendMessage — c'est _extraireMentions() dans index.js qui s'en charge.
 *
 * Les groupes en mode "LID" (WhatsApp v2+) retournent parfois des participants
 * sous la forme "25676035928189@lid". Ce format N'EST PAS un JID mentionnable.
 * Si un @lid arrive ici c'est que le mapping LID→PN n'est pas encore résolu ;
 * dans ce cas on affiche le numéro brut sans créer de mention (texte fallback).
 *
 * @param {string} jid - JID du joueur, idéalement "237xxxxxxx@s.whatsapp.net"
 * @returns {string}
 */
export function jidToMention(jid) {
  if (!jid) return "@inconnu";
  // Le texte doit contenir UNIQUEMENT "@numéro" — WhatsApp l'affiche en bleu.
  // Le JID complet (237xxx@s.whatsapp.net) est fourni séparément dans le
  // tableau `mentions` de sendMessage (voir _extraireMentions dans index.js).
  return "@" + jidToNum(jid); // ex: "@237691234567"
}

/**
 * Formate la liste des joueurs vivants pour affichage.
 * Affiche le pseudo ET insère la vraie mention WhatsApp.
 * @param {Array} joueurs - chaque joueur a { id, jid, pseudo }
 * @returns {string}
 */
export function formaterListeJoueurs(joueurs) {
  if (!joueurs || joueurs.length === 0) return "Aucun joueur.";
  return joueurs
    .map((j) => `${j.id} - ${jidToMention(j.jid)} (${j.pseudo || jidToNum(j.jid)})`)
    .join("\n");
}

/**
 * Vérifie si une commande correspond au préfixe
 * @param {string} texte
 * @param {string} prefixe
 * @returns {boolean}
 */
export function estCommande(texte, prefixe) {
  return texte?.startsWith(prefixe);
}

/**
 * Extrait le nom de commande et les arguments
 * @param {string} texte
 * @param {string} prefixe
 * @returns {{cmd: string, args: string[]}}
 */
export function parserCommande(texte, prefixe) {
  if (!texte || !texte.startsWith(prefixe)) return { cmd: "", args: [] };
  const sansPrefix = texte.slice(prefixe.length).trim();
  const parties = sansPrefix.split(/\s+/);
  return {
    cmd: parties[0]?.toLowerCase() || "",
    args: parties.slice(1),
  };
}

/**
 * Génère un mot aléatoire pour le Loup Bavard
 * @returns {string}
 */
export function genererMotBavard() {
  const mots = [
    "citrouille", "parapluie", "horizon", "brouillard", "chandelle",
    "cristal", "éclipse", "fantôme", "grenouille", "harmonie",
    "illusion", "klaxon", "labyrinthe", "moustique", "neige",
    "orage", "puzzle", "rideau", "sifflet", "tempête",
    "univers", "violon", "wagon", "xylophone", "yaourt", "zèbre",
    "abricot", "boussole", "cravate", "dictionnaire",
  ];
  return randomItem(mots);
}

/**
 * Attend un certain nombre de millisecondes
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Vérifie si un rôle est du camp des loups
 * @param {string} role
 * @param {Object} CAMP
 * @returns {boolean}
 */
export function estLoup(role, CAMP_MAP) {
  return CAMP_MAP[role] === "loups";
}

/**
 * Vérifie si un rôle est du camp villageois
 */
export function estVillageois(role, CAMP_MAP) {
  return CAMP_MAP[role] === "villageois";
}

/**
 * Vérifie si un rôle est solitaire
 */
export function estSolo(role, CAMP_MAP) {
  return CAMP_MAP[role] === "solo";
}
