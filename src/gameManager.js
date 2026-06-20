// ===== Gestionnaire principal du jeu =====
// Orchestre le cycle jour/nuit, les timers, la distribution des rôles

import CONFIG from "./config.js";
import PlayerManager from "./playerManager.js";
import VoteManager from "./voteManager.js";
import NightManager from "./nightManager.js";
import MayorManager from "./mayorManager.js";
import { creerTimer } from "./utils/timer.js";
import { genererMotBavard, parserCommande, formaterListeJoueurs, jidToMention } from "./utils/helpers.js";
import * as msg from "./utils/messages.js";

/**
 * États possibles de la partie
 */
const ETAT = {
  AUCUNE: "aucune",
  INSCRIPTION: "inscription",
  NUIT: "nuit",
  JOUR: "jour",
  VOTE: "vote",
  ELECTION_MAIRE: "election_maire",
  FINIE: "finie",
};

class GameManager {
  constructor(bot) {
    this.bot = bot;
    this.etat = ETAT.AUCUNE;
    this.phaseJour = 1;
    this.timer = null;
    this.groupeJid = null;

    // Sous-gestionnaires
    this.players = new PlayerManager();
    this.votes = new VoteManager();
    this.nuits = new NightManager();
    this.mayor = new MayorManager();

    // Callbacks pour les actions en attente (chasseur, fossoyeur, dictateur, etc.)
    this.actionsEnAttente = [];

    // Données de la partie en cours
    this.donnees = {
      mortsNuit: [],        // morts de la dernière nuit
      motBavard: null,      // mot du Loup Bavard pour ce tour
      dictateurActif: false,
      aElimineJour: false,   // true si un joueur a été éliminé au vote du jour
    };
  }

  /** Vérifie si une partie est en cours */
  get estEnCours() {
    return this.etat !== ETAT.AUCUNE && this.etat !== ETAT.FINIE;
  }

  /** Vérifie si les inscriptions sont ouvertes */
  get inscriptionsOuvertes() {
    return this.etat === ETAT.INSCRIPTION;
  }

  /** Vérifie si c'est la nuit */
  get estNuit() {
    return this.etat === ETAT.NUIT;
  }

  /** Initialise une nouvelle partie */
  async lancerPartie(groupeJid, adminJid, pseudoAdmin = "Admin") {
    try {
      this.groupeJid = groupeJid;
      this.players.reset();
      this.votes.reset();
      this.nuits.reset();
      this.mayor.reset();
      this.etat = ETAT.INSCRIPTION;
      this.phaseJour = 1;
    this.donnees = { mortsNuit: [], motBavard: null, dictateurActif: false, aElimineJour: false };
    this.actionsEnAttente = [];

      // Message d'annonce
      await this.bot.envoyerMessage(groupeJid, msg.msgLancement(pseudoAdmin, adminJid, CONFIG.DUREE_INSCRIPTION));

      // Timer d'inscription
      this.timer = creerTimer(CONFIG.DUREE_INSCRIPTION, null, async () => {
        await this.finaliserInscription();
      });
    } catch (err) {
      console.error("Erreur lancerPartie:", err);
      await this.bot.envoyerMessage(groupeJid, "❌ Erreur lors du lancement de la partie.");
      this.etat = ETAT.AUCUNE;
    }
  }

  /** Ajoute un joueur à la partie */
  async ajouterJoueur(jid, pseudo) {
    if (this.etat !== ETAT.INSCRIPTION) return "PARTIE_NON_EN_COURS";
    if (this.players.joueurs.length >= CONFIG.NBRE_MAX_JOUEURS) return "PARTIE_PLEINE";

    const joueur = this.players.ajouterJoueur(jid, pseudo);
    if (!joueur) return "DEJA_INSCRIT";

    await this.bot.envoyerMessage(this.groupeJid, msg.msgJoin(pseudo, joueur.jid, joueur.id));
    return "OK";
  }

  /** Ajoute du temps aux inscriptions */
  async ajouterTempsInscription() {
    if (this.etat !== ETAT.INSCRIPTION || !this.timer) return;
    this.timer.ajouter(CONFIG.AJOUT_INSCRIPTION);
    await this.bot.envoyerMessage(this.groupeJid, msg.msgAddtime(CONFIG.AJOUT_INSCRIPTION));
  }

  /** Force le démarrage de la partie */
  async forcerDemarrage(adminJid) {
    if (this.etat !== ETAT.INSCRIPTION) return;
    if (this.timer) this.timer.stop();
    this.timer = null;
    await this.bot.envoyerMessage(this.groupeJid, msg.msgStartForce("Admin", adminJid));
    await this.finaliserInscription();
  }

  /** Finalise la phase d'inscription et distribue les rôles */
  async finaliserInscription() {
    if (this.players.joueurs.length < CONFIG.NBRE_MIN_JOUEURS) {
      await this.bot.envoyerMessage(this.groupeJid,
        msg.msgPasAssezJoueurs(this.players.joueurs.length, CONFIG.NBRE_MIN_JOUEURS));
      this.etat = ETAT.AUCUNE;
      this.sauvegarder();
      return;
    }

    // Distribution des rôles
    this.players.assignerRoles();

    // Envoyer les rôles en MP à chaque joueur
    for (const joueur of this.players.joueurs) {
      await this.bot.envoyerMessagePrive(joueur.jid, msg.mpReveleRole(joueur.role));
    }

    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgDistributionRole("Bot") + "\n" +
      msg.msgNbJoueursInscrits(this.players.joueurs.length, CONFIG.NBRE_MIN_JOUEURS));

    // Démarrer la nuit 1
    await this.demarrerNuit();
  }

  // ==================== CYCLE NUIT ====================

  async demarrerNuit() {
    this.etat = ETAT.NUIT;
    this.nuits.incrementerPhase();
    this.donnees.mortsNuit = [];
    this.donnees.dictateurActif = false;

    // Le Chasseur peut tirer à nouveau cette nuit (s'il a des balles restantes)
    for (const j of this.players.getVivants()) {
      if (j.role === CONFIG.ROLES.CHASSEUR) {
        j.aTireCetteNuit = false;
      }
    }

    // Si c'est la nuit 1 et qu'il y a un Mercenaire, on lui donne sa cible au lever du jour 1
    // Donc on ne fait rien de spécial ici pour le Mercenaire

    // Générer le mot pour le Loup Bavard
    const loupBavard = this.players.joueurs.find(
      (j) => j.role === CONFIG.ROLES.LOUP_BAVARD && j.estVivant
    );
    if (loupBavard) {
      this.donnees.motBavard = genererMotBavard();
      loupBavard.motBavard = this.donnees.motBavard;
      loupBavard.aPlaceMot = false;
    }

    // Annonce dans le groupe
    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgNuit(this.nuits.phaseNuit));

    // Envoyer les instructions à chaque joueur concerné
    await this.envoyerInstructionsNuit();

    // Démarrer le timer de collecte des actions
    this.nuits.demarrer(CONFIG.DUREE_NUIT,
      async () => {
        await this.resoudreNuit();
      },
      (restant) => {
        // Optionnel : afficher des rappels
      }
    );

    this.sauvegarder();
  }

  /** Envoie les instructions nocturnes à chaque joueur selon son rôle */
  async envoyerInstructionsNuit() {
    const vivants = this.players.getVivants();
    const isNuit1 = this.nuits.phaseNuit === 1;

    for (const joueur of vivants) {
      // ── Joueur infecté par le Loup Noir : il agit désormais comme un Loup ──
      // (ses anciennes actions de rôle sont remplacées par les actions de Loup)
      if (joueur.estInfecte) {
        await this.bot.envoyerMessagePrive(joueur.jid,
          msg.mpLoupInstructions(vivants));
        continue;
      }

      switch (joueur.role) {
        case CONFIG.ROLES.LOUP_GAROU:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpLoupInstructions(vivants));
          break;

        case CONFIG.ROLES.LOUP_NOIR:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpLoupNoirInstructions(vivants));
          break;

        case CONFIG.ROLES.LOUP_BAVARD:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpLoupInstructions(vivants));
          break;

        case CONFIG.ROLES.LOUP_BLANC:
          if (this.nuits.phaseNuit >= 2 && this.nuits.phaseNuit % 2 === 0) {
            await this.bot.envoyerMessagePrive(joueur.jid,
              msg.mpLoupBlancInstructions(vivants, this.nuits.phaseNuit));
          }
          break;

        case CONFIG.ROLES.VOYANTE:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpVoyanteInstructions(vivants));
          break;

        // Le Fou reçoit exactement les mêmes instructions que la Voyante
        // (il croit être la Voyante)
        case CONFIG.ROLES.FOU:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpFouInstructions(vivants));
          break;

        case CONFIG.ROLES.SORCIERE: {
          // La Sorcière pourra sauver la victime des loups après résolution
          // Message indiquant qu'elle peut utiliser ses potions maintenant
          await this.bot.envoyerMessagePrive(joueur.jid,
            `🧪 C'est la nuit. Tu as deux potions à utiliser.\n\n` +
            `🟢 \`-sauver\` → sauve la victime des loups cette nuit\n` +
            `🔴 \`-empoisonner [id]\` → tue un joueur de ton choix\n` +
            `⏭️ \`-passer\` → ne rien faire\n\n` +
            `Tu ne connais pas encore l'identité de la victime, mais tu peux déjà décider d'utiliser ta potion de vie.\n\n` +
            `Joueurs disponibles :\n${formaterListeJoueurs(vivants)}`);
          break;
        }

        case CONFIG.ROLES.GARDE:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpGardeInstructions(vivants, joueur.derniereProtectionId ?
              this.players.getParId(joueur.derniereProtectionId) : null));
          break;

        case CONFIG.ROLES.CUPIDON:
          if (isNuit1) {
            await this.bot.envoyerMessagePrive(joueur.jid,
              msg.mpCupidonInstructions(vivants));
          }
          break;

        case CONFIG.ROLES.PYROMANCIEN:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpPyromancienInstructions(vivants));
          break;

        case CONFIG.ROLES.NAIN_TRACASSIN:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpNainInstructions(vivants));
          break;

        case CONFIG.ROLES.RAT_MALADE:
          await this.bot.envoyerMessagePrive(joueur.jid,
            msg.mpRatInstructions(vivants));
          break;

        case CONFIG.ROLES.HERITIER:
          if (isNuit1) {
            await this.bot.envoyerMessagePrive(joueur.jid,
              msg.mpHeritierInstructions(vivants));
          }
          break;

        case CONFIG.ROLES.CHASSEUR:
          if (joueur.ballesChasseur > 0) {
            await this.bot.envoyerMessagePrive(joueur.jid,
              msg.mpChasseurInstructions(
                vivants.filter((j) => j.id !== joueur.id),
                joueur.ballesChasseur
              ));
          }
          break;
      }
    }
  }

  /** Résout toutes les actions de la nuit */
  async resoudreNuit() {
    const resultats = this.nuits.resoudreActions(this.players, this.mayor);

    // Traitement des résultats
    this.donnees.mortsNuit = resultats.morts || [];

    // Annonce des morts
    if (this.donnees.mortsNuit.length === 0) {
      await this.bot.envoyerMessage(this.groupeJid, msg.msgPersonneMorte());
    } else {
      for (const mort of this.donnees.mortsNuit) {
        await this.bot.envoyerMessage(this.groupeJid,
          msg.msgMortCause(mort.joueur.pseudo, mort.joueur.jid, mort.joueur.role, mort.cause));
        // Si le joueur mort est Le Fou, lui révéler son vrai rôle en MP
        if (mort.joueur.role === CONFIG.ROLES.FOU) {
          await this.bot.envoyerMessagePrive(
            mort.joueur.jid,
            `🃃 *Révélation* : Tu n'étais pas la Voyante...\n\n` +
            `Ton vrai rôle était *Le Fou* ! Tu as cru toute la partie avoir des ` +
            `pouvoirs de voyance, mais tes visions étaient entièrement inventées. 😄`
          );
        }
      }
    }

    // Gestion du Fossoyeur
    const fossoyeurMort = this.donnees.mortsNuit.find(
      (m) => m.joueur.role === CONFIG.ROLES.FOSSOYEUR
    );
    if (fossoyeurMort) {
      // Le Fossoyeur désigne quelqu'un
      // On stocke l'action en attente pour la résoudre plus tard
      this.actionsEnAttente.push({
        type: "fossoyeur",
        joueur: fossoyeurMort.joueur,
        resolve: async (cibleId) => {
          const cible = this.players.getParId(cibleId);
          if (!cible) return;

          // Trouver un joueur du camp opposé
          const campOppose = cible.camp === CONFIG.CAMP.LOUPS
            ? CONFIG.CAMP.VILLAGEOIS
            : CONFIG.CAMP.LOUPS;
          const oppose = this.players.getParCamp(campOppose)
            .filter((j) => j.id !== cible.id && j.estVivant);
          const opposeChoisi = oppose.length > 0
            ? oppose[Math.floor(Math.random() * oppose.length)]
            : null;

          await this.bot.envoyerMessage(this.groupeJid,
            msg.msgAnnonceFossoyeur(
              cible.pseudo, cible.role,
              opposeChoisi ? opposeChoisi.pseudo : "?",
              opposeChoisi ? opposeChoisi.role : "?"
            ));
        }
      });

      // Demander au Fossoyeur de désigner (via le bot qui le contacte en MP)
      const fossoyeurPlayer = fossoyeurMort.joueur;
      await this.bot.envoyerMessagePrive(fossoyeurPlayer.jid,
        msg.mpFossoyeurInstructions(this.players.getVivants()));
    }

    // Gestion du Chasseur : SUPPRIMÉE — le Chasseur agit désormais de son vivant,
    // chaque nuit, via `-tirer [id]` (voir actionChasseur), avec 2 balles au total
    // (1 utilisable par nuit). Voir envoyerInstructionsNuit() pour l'envoi des
    // instructions et actionChasseur() pour la résolution immédiate du tir.

    // Envoyer les résultats aux rôles concernés (Voyante)
    for (const vu of resultats.vus || []) {
      await this.bot.envoyerMessagePrive(vu.voyant.jid,
        msg.mpVoyanteResultat(vu.cible.id, vu.cible.pseudo, vu.role));
    }

    // Envoyer les faux résultats au Fou
    for (const vu of resultats.fouVus || []) {
      await this.bot.envoyerMessagePrive(vu.voyant.jid,
        msg.mpFouResultatFaux(vu.cible.id, vu.cible.pseudo, vu.fauxRole));
    }

    // Notifier les contaminés
    for (const contamine of resultats.contamines || []) {
      await this.bot.envoyerMessagePrive(contamine.jid, msg.mpNotificationContamine());
    }

    // Notifier les joueurs réellement infectés par le Loup Noir (req4)
    for (const infecte of resultats.infectesAppliques || []) {
      await this.bot.envoyerMessagePrive(infecte.jid, msg.mpNotificationInfecte());
    }

    // Notifier les deux amoureux désignés par Cupidon cette nuit (nuit 1, req3)
    for (const couple of resultats.amoureux || []) {
      await this.bot.envoyerMessagePrive(couple.j1.jid,
        msg.mpNotificationAmoureux(couple.j2.jid, couple.j2.pseudo));
      await this.bot.envoyerMessagePrive(couple.j2.jid,
        msg.mpNotificationAmoureux(couple.j1.jid, couple.j1.pseudo));
    }

    // Vérifier les conditions de victoire
    const victoire = this.players.verifierVictoire();
    if (victoire) {
      await this.terminerPartie(victoire);
      return;
    }

    // Passage au jour
    await this.demarrerJour();
  }

  // ==================== CYCLE JOUR ====================

  async demarrerJour() {
    this.etat = ETAT.JOUR;
    this.donnees.aElimineJour = false;

    await this.bot.envoyerMessage(this.groupeJid, msg.msgLeverSoleil());

    // Si c'est le jour 1 : élection du Maire + Mercenaire
    if (this.phaseJour === 1) {
      // Mercenaire : lui donner sa cible
      const mercenaire = this.players.joueurs.find(
        (j) => j.role === CONFIG.ROLES.MERCENAIRE && j.estVivant
      );
      if (mercenaire) {
        // La cible est aléatoire parmi les autres joueurs
        const autres = this.players.getVivants().filter((j) => j.id !== mercenaire.id);
        if (autres.length > 0) {
          const cible = autres[Math.floor(Math.random() * autres.length)];
          mercenaire.cibleMercenaireId = cible.id;
          await this.bot.envoyerMessagePrive(mercenaire.jid,
            msg.mpMercenaireCible(cible.id, cible.pseudo));
        }
      }

      // Élection du Maire
      await this.demarrerElectionMaire();
      return;
    }

    // Vérifier le Loup Bavard
    await this.verifierLoupBavard();

    // Vérifier les conditions de victoire
    const victoire = this.players.verifierVictoire();
    if (victoire) {
      await this.terminerPartie(victoire);
      return;
    }

    // Lancer le vote de jour
    await this.demarrerVote();
  }

  async demarrerElectionMaire() {
    this.etat = ETAT.ELECTION_MAIRE;
    const vivants = this.players.getVivants();

    await this.bot.envoyerMessage(this.groupeJid,
      "👑 Élection du Maire ! Chaque joueur vote en message privé.");

    for (const joueur of vivants) {
      await this.bot.envoyerMessagePrive(joueur.jid,
        msg.mpElectionMaireInstructions(vivants));
    }

    // Timer pour l'élection (plus court)
    this.timer = creerTimer(60, null, async () => {
      await this.finaliserElectionMaire();
    });
  }

  /** Traite un vote pour l'élection du Maire */
  async voterMaire(jid, cibleId) {
    if (this.etat !== ETAT.ELECTION_MAIRE) return;
    const joueur = this.players.getParJid(jid);
    if (!joueur || !joueur.estVivant) return;
    this.votes.voter(jid, cibleId);
    await this.bot.envoyerMessagePrive(jid, "✅ Vote enregistré !");
  }

  async finaliserElectionMaire() {
    const resultat = this.votes.calculerResultat();

    if (resultat.vainqueur) {
      this.mayor.elire(resultat.vainqueur);
      const maire = this.players.getParId(resultat.vainqueur);
      if (maire) {
        maire.estMaire = true;
        await this.bot.envoyerMessage(this.groupeJid, msg.msgMaireElu(maire.pseudo, maire.jid));
      }
    } else {
      await this.bot.envoyerMessage(this.groupeJid, "🤝 Égalité ! Pas de Maire élu pour l'instant.");
    }

    // Lancer le vote de jour
    await this.demarrerVote();
  }

  async demarrerVote() {
    this.etat = ETAT.VOTE;
    this.votes.reset();
    const vivants = this.players.getVivants();

    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgVoteJour());

    for (const joueur of vivants) {
      await this.bot.envoyerMessagePrive(joueur.jid,
        msg.mpVoteInstructions(vivants));
    }

    this.votes.demarrer(CONFIG.DUREE_VOTE,
      async (resultat) => {
        await this.finaliserVote(resultat);
      },
      null
    );
  }

  /** Traite un vote de jour */
  async voter(jid, cibleId) {
    if (this.etat !== ETAT.VOTE) return;
    const joueur = this.players.getParJid(jid);
    if (!joueur || !joueur.estVivant) return;

    const accepte = this.votes.voter(jid, cibleId);
    if (accepte) {
      await this.bot.envoyerMessagePrive(jid, "✅ Vote enregistré !");
    } else {
      await this.bot.envoyerMessagePrive(jid, "❌ Tu as déjà voté.");
    }
  }

  async finaliserVote(resultat) {
    // Vérifier si le Dictateur a utilisé son pouvoir
    if (this.donnees.dictateurActif) {
      // Le vote normal est ignoré si le Dictateur a parlé
      return;
    }

    if (resultat.vainqueur) {
      const elimine = this.players.getParId(resultat.vainqueur);
      if (elimine) {
        await this.bot.envoyerMessage(this.groupeJid,
          msg.msgResultatVote(elimine.pseudo, elimine.jid, resultat.maxVotes, resultat.totalVotes));

        // ── Révélation du rôle et de la cause de mort ───────────────────────
        await this.bot.envoyerMessage(this.groupeJid,
          msg.msgMortCause(elimine.pseudo, elimine.jid, elimine.role, "vote"));

        // Vérifier si c'est le Tanneur
        const estTanneur = elimine.role === CONFIG.ROLES.TANNEUR;

        this.donnees.aElimineJour = true;
        const mort = this.players.tuer(elimine.id);
        if (mort) {
          if (mort.amoureux) {
            await this.bot.envoyerMessage(this.groupeJid,
              msg.msgMortAmoureux(mort.amoureux.pseudo, mort.amoureux.jid, mort.amoureux.role));
          }

          // Révélation du Fou au moment du vote
          if (elimine.role === CONFIG.ROLES.FOU) {
            await this.bot.envoyerMessagePrive(
              elimine.jid,
              `🃃 *Révélation* : Tu n'étais pas la Voyante...\n\n` +
              `Ton vrai rôle était *Le Fou* ! Tu as cru toute la partie avoir des ` +
              `pouvoirs de voyance, mais tes visions étaient entièrement inventées. 😄`
            );
          }

          // Vérifier si le Mercenaire a gagné (jour 1, sa cible éliminée au vote)
          if (this.phaseJour === 1) {
            for (const joueur of this.players.joueurs) {
              if (joueur.role === CONFIG.ROLES.MERCENAIRE &&
                  joueur.cibleMercenaireId === elimine.id) {
                await this.terminerPartie({
                  equipeGagnante: CONFIG.CAMP.SOLITAIRE,
                  gagnants: [joueur],
                  raison: "Le Mercenaire a éliminé sa cible au vote du jour 1"
                });
                return;
              }
            }
          }

          // Vérifier le Tanneur
          if (estTanneur) {
            await this.terminerPartie({
              equipeGagnante: CONFIG.CAMP.SOLITAIRE,
              gagnants: [elimine],
              raison: "Le Tanneur a été éliminé par le vote du village"
            });
            return;
          }
        }
      }
    } else {
      await this.bot.envoyerMessage(this.groupeJid, msg.msgEgalite());

      // Si égalité et Maire, le Maire tranche
      if (this.mayor.aMaire() && resultat.egaux.length > 1) {
        const maire = this.players.getParId(this.mayor.getMaireId());
        if (maire && maire.estVivant) {
          // Demander au Maire de trancher
          const egauxVivants = resultat.egaux
            .map((id) => this.players.getParId(id))
            .filter((j) => j && j.estVivant);

          await this.bot.envoyerMessagePrive(maire.jid,
            msg.mpMaireDepartageInstructions(egauxVivants));

          // Stocker l'action en attente
          this.actionsEnAttente.push({
            type: "maire_departage",
            egaux: resultat.egaux,
            resolve: async (cibleId) => {
              if (!resultat.egaux.includes(cibleId)) return;
              const elimine = this.players.getParId(cibleId);
              if (!elimine) return;

              this.donnees.aElimineJour = true;

              await this.bot.envoyerMessage(this.groupeJid,
                `👑 Le Maire (${jidToMention(maire.jid)}) a tranché : ${jidToMention(elimine.jid)} est éliminé !`);

              // ── Révélation du rôle et de la cause de mort ──────────────────
              await this.bot.envoyerMessage(this.groupeJid,
                msg.msgMortCause(elimine.pseudo, elimine.jid, elimine.role, "maire_departage"));

              const mort = this.players.tuer(elimine.id);
              if (mort?.amoureux) {
                await this.bot.envoyerMessage(this.groupeJid,
                  msg.msgMortAmoureux(mort.amoureux.pseudo, mort.amoureux.jid, mort.amoureux.role));
              }
              await this.verifierFinDeJour();
            }
          });

          return; // On attend la décision du Maire
        }
      }
    }

    await this.verifierFinDeJour();
  }

  async verifierLoupBavard() {
    const loupBavard = this.players.joueurs.find(
      (j) => j.role === CONFIG.ROLES.LOUP_BAVARD && j.estVivant
    );
    if (loupBavard && !loupBavard.aPlaceMot && this.donnees.motBavard) {
      // Le Loup Bavard n'a pas placé son mot → il meurt
      await this.bot.envoyerMessagePrive(loupBavard.jid,
        `💀 Tu n'as pas placé le mot "${this.donnees.motBavard}" et tu meurs en punition !`);
      await this.bot.envoyerMessage(this.groupeJid, msg.msgLoupBavardMort());
      this.players.tuer(loupBavard.id);
      return true;
    }
    return false;
  }

  async verifierFinDeJour() {
    const victoire = this.players.verifierVictoire();
    if (victoire) {
      await this.terminerPartie(victoire);
      return;
    }

    // À partir du jour 2, si personne n'a été éliminé au vote, on recommence un jour
    if (this.phaseJour >= 2 && !this.donnees.aElimineJour) {
      await this.bot.envoyerMessage(this.groupeJid,
        "🔁 Personne n'a été éliminé. Un nouveau jour de vote commence !");
      this.phaseJour--; // On ne change pas le numéro de jour
      await this.demarrerVote();
      return;
    }

    this.phaseJour++;
    await this.demarrerNuit();
  }

  // ==================== ACTIONS SPÉCIALES ====================

  /** Action du Dictateur : coup d'État, valable à n'importe quel tour de jour (req2) */
  async actionDictateur(jid, cibleId) {
    // Le coup d'État ne peut se faire qu'en journée (jour ou phase de vote),
    // mais à N'IMPORTE QUEL tour de jour de la partie — pas seulement le premier.
    if (this.etat !== ETAT.VOTE && this.etat !== ETAT.JOUR) return false;
    const joueur = this.players.getParJid(jid);
    if (!joueur || joueur.role !== CONFIG.ROLES.DICTATEUR || joueur.aUtiliseDictateur) return false;

    const cible = this.players.getParId(cibleId);
    if (!cible || !cible.estVivant) return false;

    joueur.aUtiliseDictateur = true;
    this.donnees.dictateurActif = true;

    this.donnees.aElimineJour = true;

    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgDictateurCoup(cible.pseudo, cible.jid));

    const mort = this.players.tuer(cible.id);

    // ── Révélation du rôle et de la cause de mort (req5) ──────────────────
    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgMortCause(cible.pseudo, cible.jid, cible.role, "dictateur"));

    // Vérifier si la cible était un loup
    if (cible.camp === CONFIG.CAMP.LOUPS) {
      // Le Dictateur devient Maire
      this.mayor.elire(joueur.id);
      joueur.estMaire = true;
      await this.bot.envoyerMessage(this.groupeJid,
        msg.msgDictateurMort("Loup-Garou", joueur.pseudo, joueur.jid, cible.pseudo, cible.jid));
    } else {
      // Le Dictateur meurt
      await this.bot.envoyerMessage(this.groupeJid,
        msg.msgDictateurMort("innocent", joueur.pseudo, joueur.jid, cible.pseudo, cible.jid));
      this.players.tuer(joueur.id);
    }

    if (mort?.amoureux) {
      await this.bot.envoyerMessage(this.groupeJid,
        msg.msgMortAmoureux(mort.amoureux.pseudo, mort.amoureux.jid, mort.amoureux.role));
    }

    await this.verifierFinDeJour();
    return true;
  }

  /**
   * Action du Chasseur (req1) : 2 balles au total, 1 utilisable par nuit,
   * pour abattre immédiatement le joueur de son choix. La mort est précisée
   * comme étant causée par le Chasseur (req5).
   */
  async actionChasseur(jid, cibleId) {
    if (this.etat !== ETAT.NUIT) return false;

    const joueur = this.players.getParJid(jid);
    if (!joueur || !joueur.estVivant || joueur.role !== CONFIG.ROLES.CHASSEUR) return false;
    if (joueur.ballesChasseur <= 0) {
      await this.bot.envoyerMessagePrive(jid, "❌ Tu n'as plus de balles dans ton fusil.");
      return false;
    }
    if (joueur.aTireCetteNuit) {
      await this.bot.envoyerMessagePrive(jid, "❌ Tu ne peux tirer qu'une seule fois par nuit.");
      return false;
    }

    const cible = this.players.getParId(cibleId);
    if (!cible || !cible.estVivant || cible.id === joueur.id) return false;

    joueur.ballesChasseur -= 1;
    joueur.aTireCetteNuit = true;

    const mort = this.players.tuer(cible.id);

    await this.bot.envoyerMessagePrive(jid, "🔫 Tir effectué !");

    // ── Annonce au groupe : la mort est précisée comme un tir du Chasseur ──
    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgChasseurTire(cible.pseudo, cible.jid, joueur.ballesChasseur));
    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgMortCause(cible.pseudo, cible.jid, cible.role, "chasseur"));

    if (mort?.amoureux) {
      await this.bot.envoyerMessage(this.groupeJid,
        msg.msgMortAmoureux(mort.amoureux.pseudo, mort.amoureux.jid, mort.amoureux.role));
    }

    // Une mort en pleine nuit peut déclencher une condition de victoire immédiate
    const victoire = this.players.verifierVictoire();
    if (victoire) {
      await this.terminerPartie(victoire);
    }

    return true;
  }

  /** Action du Fossoyeur */
  async actionFossoyeur(jid, cibleId) {
    const attente = this.actionsEnAttente.find(
      (a) => a.type === "fossoyeur" && a.joueur.jid === jid
    );
    if (!attente) return false;

    await attente.resolve(cibleId);
    this.actionsEnAttente = this.actionsEnAttente.filter((a) => a !== attente);
    return true;
  }

  /** Enregistre une action de nuit */
  async actionNuit(jid, type, cible, cible2 = null) {
    if (this.etat !== ETAT.NUIT) return false;
    const joueur = this.players.getParJid(jid);
    if (!joueur || !joueur.estVivant) return false;

    const accepte = this.nuits.enregistrerAction(jid, type, cible, cible2);
    if (accepte) {
      await this.bot.envoyerMessagePrive(jid, "✅ Action enregistrée !");
    } else {
      await this.bot.envoyerMessagePrive(jid, "❌ Tu as déjà agi cette nuit.");
    }
    return accepte;
  }

  /** Vérifie si le mot du Loup Bavard a été placé par le joueur */
  async verifierMotBavard(jid, texte) {
    const joueur = this.players.getParJid(jid);
    if (!joueur || joueur.role !== CONFIG.ROLES.LOUP_BAVARD) return;
    if (!joueur.estVivant) return;
    if (joueur.aPlaceMot) return;
    if (!this.donnees.motBavard) return;
    if (this.etat !== ETAT.JOUR && this.etat !== ETAT.VOTE && this.etat !== ETAT.ELECTION_MAIRE) return;

    // Vérifier si le mot est présent dans le message (insensible à la casse)
    if (texte.toLowerCase().includes(this.donnees.motBavard.toLowerCase())) {
      joueur.aPlaceMot = true;
      await this.bot.envoyerMessagePrive(jid,
        `✅ Mot "${this.donnees.motBavard}" bien placé !`);
    }
  }

  // ==================== FIN DE PARTIE ====================

  async terminerPartie(victoire) {
    this.etat = ETAT.FINIE;

    // Traduire le nom du camp vainqueur
    let nomCamp = victoire.equipeGagnante;
    if (victoire.equipeGagnante === CONFIG.CAMP.LOUPS) nomCamp = "Loups-Garous";
    else if (victoire.equipeGagnante === CONFIG.CAMP.VILLAGEOIS) nomCamp = "Villageois";
    else if (victoire.equipeGagnante === CONFIG.CAMP.SOLITAIRE) nomCamp = "Solitaires";
    else if (victoire.equipeGagnante === "couple") nomCamp = "Couple d'Amoureux";

    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgFinPartie(
        victoire.gagnants.map((g) => `${g.pseudo} (${g.role})`),
        nomCamp
      ));

    // Révéler tous les rôles
    const revel = this.players.joueurs
      .map((j) => `${j.pseudo} : ${j.role} (${j.estVivant ? "Vivant" : "Mort"})`)
      .join("\n");
    await this.bot.envoyerMessage(this.groupeJid, `📋 Rôles de la partie :\n${revel}`);

    // Arrêter tous les timers
    if (this.timer) this.timer.stop();
    this.votes.stopper();
    this.sauvegarder();
  }

  async forcerFin(adminJid) {
    if (!this.estEnCours) return;
    this.etat = ETAT.FINIE;
    if (this.timer) this.timer.stop();
    this.votes.stopper();
    await this.bot.envoyerMessage(this.groupeJid, msg.msgForceFin("Admin"));
    this.sauvegarder();
  }

  async resetPartie() {
    if (this.timer) this.timer.stop();
    this.votes.stopper();
    this.etat = ETAT.AUCUNE;
    this.phaseJour = 1;
    this.groupeJid = null;
    this.timer = null;
    this.players.reset();
    this.votes.reset();
    this.nuits.reset();
    this.mayor.reset();
    this.donnees = { mortsNuit: [], motBavard: null, dictateurActif: false, aElimineJour: false };
    this.actionsEnAttente = [];
    this.bot.sauvegarderPartie(null);
    await this.bot.envoyerMessage(this.groupeJid, "🗑️ Partie réinitialisée. Toutes les données ont été effacées.");
  }

  // ==================== SKIP ====================

  async skipPhase() {
    if (!this.estEnCours) return false;

    switch (this.etat) {
      case ETAT.INSCRIPTION:
        if (this.timer) this.timer.stop();
        this.timer = null;
        await this.finaliserInscription();
        return true;

      case ETAT.NUIT:
        this.nuits.finaliser();
        return true;

      case ETAT.VOTE:
        this.votes.finaliser();
        return true;

      case ETAT.ELECTION_MAIRE:
        if (this.timer) this.timer.stop();
        this.timer = null;
        await this.finaliserElectionMaire();
        return true;

      default:
        return false;
    }
  }

  // ==================== STATUT ====================

  async afficherStatut() {
    if (!this.estEnCours) {
      await this.bot.envoyerMessage(this.groupeJid, "❌ Aucune partie en cours.");
      return;
    }

    const etatNom = {
      inscription: "📝 Inscriptions",
      nuit: "🌙 Nuit",
      jour: "☀️ Jour",
      vote: "🗳️ Vote",
      election_maire: "👑 Élection du Maire",
    }[this.etat] || this.etat;

    const liste = formaterListeJoueurs(this.players.getVivants());
    await this.bot.envoyerMessage(this.groupeJid,
      msg.msgStatut(etatNom, liste, this.phaseJour));
  }

  // ==================== PERSISTANCE ====================

  sauvegarder() {
    // La sauvegarde est gérée par le bot
    this.bot.sauvegarderPartie({
      etat: this.etat,
      phaseJour: this.phaseJour,
      groupeJid: this.groupeJid,
      players: this.players.toJSON(),
      votes: this.votes.toJSON(),
      nuits: this.nuits.toJSON(),
      mayor: this.mayor.toJSON(),
      donnees: this.donnees,
    });
  }

  restaurer(donnees) {
    this.etat = donnees.etat;
    this.phaseJour = donnees.phaseJour;
    this.groupeJid = donnees.groupeJid;
    this.players.fromJSON(donnees.players);
    this.votes.fromJSON(donnees.votes);
    this.nuits.fromJSON(donnees.nuits);
    this.mayor.fromJSON(donnees.mayor);
    this.donnees = donnees.donnees || { mortsNuit: [], motBavard: null, dictateurActif: false };
  }
}

export default GameManager;
export { ETAT };
