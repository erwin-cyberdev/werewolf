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
 * Formate un JID pour mention WhatsApp réelle.
 * Le texte doit contenir le JID complet (ex: "237691234567@s.whatsapp.net")
 * précédé d'un "@" pour que Baileys le reconnaisse comme une vraie mention.
 * La partie visible affichée par WhatsApp sera uniquement le numéro.
 * @param {string} jid - JID complet, ex: "237691234567@s.whatsapp.net"
 * @returns {string}
 */
export function jidToMention(jid) {
  if (!jid) return "@inconnu";
  // Normalise le JID : on s'assure qu'il se termine par @s.whatsapp.net
  // (les JIDs de groupe d'un participant sont déjà sous cette forme)
  const normalized = jid.includes("@") ? jid : jid + "@s.whatsapp.net";
  // WhatsApp affiche uniquement le numéro, mais le JID complet doit être
  // présent dans le texte pour que l'API le reconnaisse comme une mention.
  return "@" + normalized;
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
