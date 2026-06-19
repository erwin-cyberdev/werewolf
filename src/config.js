// ===== Configuration du bot =====

const CONFIG = {
  // Durées des phases (en secondes)
  DUREE_INSCRIPTION: 90,          // 1 min 30 pour les inscriptions
  DUREE_NUIT: 150,                // 2 min 30 pour les actions de nuit
  DUREE_VOTE: 150,                // 2 min 30 pour le vote de jour
  DUREE_CHASSEUR: 30,             // 30 sec pour le tir du chasseur
  AJOUT_INSCRIPTION: 30,          // 30 sec ajoutées par -addtime
  NBRE_MIN_JOUEURS: 5,            // Minimum de joueurs pour lancer
  NBRE_MAX_JOUEURS: 20,           // Maximum de joueurs

  // Préfixe des commandes
  PREFIXE: "-",

  // Afficher "est en train d'écrire" lors de l'envoi de messages
  AFFICHER_ECRITURE: true,

  // Fichier de persistance
  FICHIER_SAUVEGARDE: "./data/sauvegarde.json",

  // Liste de tous les rôles disponibles
  ROLES: {
    // Camp Loups-Garous
    LOUP_GAROU: "Loup-Garou",
    LOUP_NOIR: "Loup Noir",
    LOUP_BAVARD: "Loup Bavard",

    // Camp Solitaires
    LOUP_BLANC: "Loup Blanc",
    MERCENAIRE: "Mercenaire",
    NAIN_TRACASSIN: "Nain Tracassin",
    RAT_MALADE: "Rat Malade",
    TANNEUR: "Tanneur",
    FOU: "Le Fou",

    // Camp Villageois
    SIMPLE_VILLAGEOIS: "Simple Villageois",
    VOYANTE: "Voyante",
    SORCIERE: "Sorcière",
    CHASSEUR: "Chasseur",
    GARDE: "Garde",
    CUPIDON: "Cupidon",
    FOSSOYEUR: "Fossoyeur",
    DICTATEUR: "Dictateur",
    CHAPERON_ROUGE: "Chaperon Rouge",
    PYROMANCIEN: "Pyromancien",
    HERITIER: "Héritier",
  },

  // Camps
  CAMP: {
    LOUPS: "loups",
    VILLAGEOIS: "villageois",
    SOLITAIRE: "solo",
  },

  // Ordre de priorité des actions nocturnes (index = priorité, plus petit = plus prioritaire)
  PRIORITE_NUIT: {
    NAIN_TRACASSIN: 0,
    LOUPS: 1,
    GARDE: 2,
    SORCIERE: 3,
    PYROMANCIEN: 4,
    CUPIDON: 5,
    VOYANTE: 6,
    FOU: 6,        // même priorité que Voyante, résultat faux
    RAT_MALADE: 7,
    HERITIER: 8,
  },

  // Propriétaire du bot (admin) - configurez via variable d'environnement ou modifiez directement
  ADMIN_NUMERO: process.env.ADMIN_NUMBER || "78529702158422@s.whatsapp.net",
};

export default CONFIG;
