import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import fs from "fs-extra";
import qrcode from "qrcode-terminal";
import path from "path";
import GameManager from "./src/gameManager.js";
import CONFIG from "./src/config.js";
import {
  parserCommande,
  getJid,
  getSender,
  isPrivateChat,
} from "./src/utils/helpers.js";
import { msgPing } from "./src/utils/messages.js";

const logger = pino({ level: "silent" });
const AUTH_DIR = path.resolve(process.cwd(), "auth_info");

class Bot {
  constructor() {
    this.game = new GameManager(this);
    this.sock = null;
    this.connected = false;
    this.isStarting = false;
    this.lastQr = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10; // Limite les tentatives de reconnexion
  }

  /** Backoff exponentiel, plafonné à 5 min */
  _delay() {
    return Math.floor(Math.min(4000 * Math.pow(2, this.reconnectAttempts), 300_000));
  }

  /** Ferme proprement la socket courante */
  _destroySocket() {
    if (!this.sock) return;
    try {
      this.sock.ev.removeAllListeners();
      this.sock.end(undefined);
    } catch (e) {
      console.error(chalk.red("Erreur fermeture socket:"), e.message);
    }
    this.sock = null;
  }

  async initialiser() {
    if (this.isStarting) return;
    this.isStarting = true;
    this._destroySocket();

    try {
      fs.ensureDirSync(AUTH_DIR);
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(chalk.blue(`ℹ️ Utilisation de la version WhatsApp Web v${version.join(".")} (Est la plus récente : ${isLatest})`));

      this.sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        version,
        browser: ["Ubuntu", "Chrome", "120.0.0.0"],
        markOnlineOnConnect: false,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 30_000,
        retryRequestDelayMs: 3_000,
        // Option nécessaire pour éviter certains bugs de reconnexion
        syncFullHistory: false,
      });

      // Un seul traitement de "close" par socket
      let closedOnce = false;

      this.sock.ev.on("creds.update", async (creds) => {
        if (fs.existsSync(AUTH_DIR)) {
          await saveCreds(creds);
        }
      });

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── QR Code ──────────────────────────────────────────────────────
        if (qr && qr !== this.lastQr) {
          this.lastQr = qr;
          console.clear();
          console.log(chalk.cyan("\n" + "═".repeat(50)));
          console.log(chalk.green.bold("  📱 SCANNEZ LE QR CODE AVEC WHATSAPP"));
          console.log(chalk.gray("  Paramètres › Appareils liés › Lier un appareil"));
          console.log(chalk.cyan("═".repeat(50) + "\n"));
          
          // Afficher réellement le QR Code dans le terminal
          qrcode.generate(qr, { small: true });
        }

        // ── Connecté ──────────────────────────────────────────────────────
        if (connection === "open") {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.lastQr = null;
          closedOnce = false;
          console.log(chalk.green.bold("✅ Bot connecté avec succès !"));
          await this.chargerPartie();
        }

        // ── Déconnecté ────────────────────────────────────────────────────
        if (connection === "close" && !closedOnce) {
          closedOnce = true;
          this.connected = false;
          this.lastQr = null;

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const error = lastDisconnect?.error;

          console.log(chalk.yellow(`\n⚠️  Connexion fermée (code : ${statusCode ?? "inconnu"})`));
          if (error) {
            console.error(chalk.red("Erreur:"), error.message);
          }
          this._destroySocket();

          // Vérifier si on a atteint la limite de tentatives
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(chalk.red(`❌ Nombre maximum de tentatives (${this.maxReconnectAttempts}) atteint. Arrêt du bot.`));
            this.isStarting = false;
            return;
          }

          // 401 / 405 / loggedOut = session révoquée → effacer et nouveau QR
          if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 405) {
            console.log(chalk.red("🚫 Session révoquée. Effacement et nouveau QR dans 5 s…"));
            try {
              fs.removeSync(AUTH_DIR);
              console.log(chalk.green("✅ Session effacée avec succès."));
            } catch (e) {
              console.error(chalk.red("Erreur effacement session:"), e.message);
            }
            this.reconnectAttempts = 0;
            this.isStarting = false;
            setTimeout(() => this.initialiser(), 5_000);
            return;
          }

          // Autres erreurs réseau → backoff exponentiel
          this.reconnectAttempts++;
          const delay = this._delay();
          console.log(chalk.blue(`🔄 Reconnexion dans ${Math.round(delay / 1000)} s (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})…`));
          this.isStarting = false;
          setTimeout(() => this.initialiser(), delay);
        }
      });

      this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) await this.traiterMessage(msg);
      });

    } catch (err) {
      console.error(chalk.red("Erreur initialisation :"), err.message);
      this._destroySocket();

      // Vérifier si on a atteint la limite de tentatives
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log(chalk.red(`❌ Nombre maximum de tentatives atteint. Arrêt du bot.`));
        this.isStarting = false;
        return;
      }

      this.reconnectAttempts++;
      this.isStarting = false;
      const delay = this._delay();
      console.log(chalk.blue(`🔄 Nouvelle tentative dans ${Math.round(delay / 1000)} s…`));
      setTimeout(() => this.initialiser(), delay);
      return;
    }

    this.isStarting = false;
  }

  // ─── Traitement des messages ─────────────────────────────────────────────────

  async traiterMessage(msg) {
    if (!msg.message || msg.key?.fromMe) return;

    const texte = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      ""
    ).trim();

    if (!texte) return;

    const jid     = getJid(msg);
    const sender  = getSender(msg);
    
    // Logger les messages reçus
    console.log(chalk.gray(`[MSG] De: ${sender} | Dans: ${jid} | Contenu: "${texte}"`));
    const estPrive = isPrivateChat(jid);
    const { cmd, args } = parserCommande(texte, CONFIG.PREFIXE);

    if (!cmd) {
      if (!estPrive && this.game.estEnCours)
        await this.game.verifierMotBavard(sender, texte);
      return;
    }

    const pseudo = msg.pushName || sender.split("@")[0];

    if (estPrive) {
      await this.traiterPrive(sender, pseudo, cmd, args, msg);
    } else {
      await this.traiterGroupe(jid, sender, pseudo, cmd, args, msg);
    }
  }

  async traiterPrive(jid, pseudo, cmd, args, msg) {
    // Commande ping disponible partout, même en privé
    if (cmd === "ping") {
      const latence = Date.now() - (msg?.messageTimestamp * 1000 || Date.now());
      await this.envoyerMessage(jid, msgPing(Math.max(0, latence)));
      return;
    }

    const g = this.game;
    if (!g.estEnCours) return;

    const cible  = (i) => args[i] != null ? parseInt(args[i]) : null;
    const cible2 = (i) => args[i] != null ? (isNaN(args[i]) ? args[i] : parseInt(args[i])) : null;

    switch (cmd) {
      case "tuer": case "devorer": case "voir": case "proteger":
      case "lier": case "parier": case "contaminer": case "poser":
      case "exploser": case "choisir": case "infecter": case "sauver":
      case "empoisonner": case "passer":
        await g.actionNuit(jid, cmd, cible(0), cible2(1));
        break;
      case "votermaire": case "maire": {
        const id = cible(0);
        if (id != null) await g.voterMaire(jid, id);
        break;
      }
      case "voter": case "vote": {
        const id = cible(0);
        if (id != null) await g.voter(jid, id);
        break;
      }
      case "coup": {
        const id = cible(0);
        if (id != null) await g.actionDictateur(jid, id);
        break;
      }
      case "tirer": {
        const id = cible(0);
        if (id != null) await g.actionChasseur(jid, id);
        break;
      }
      case "designer": {
        const id = cible(0);
        if (id != null) await g.actionFossoyeur(jid, id);
        break;
      }
      case "trancher": {
        const id = cible(0);
        if (id != null) {
          const attente = g.actionsEnAttente.find(
            (a) => a.type === "maire_departage" && a.egaux.includes(id)
          );
          if (attente) await attente.resolve(id);
        }
        break;
      }
    }
  }

  async traiterGroupe(jid, sender, pseudo, cmd, args, msg) {
    const g = this.game;

    // Commande ping — disponible sans partie en cours
    if (cmd === "ping") {
      const latence = Date.now() - (msg?.messageTimestamp * 1000 || Date.now());
      await this.envoyerMessage(jid, msgPing(Math.max(0, latence)));
      return;
    }

    switch (cmd) {
      case "start": case "lancer":
        await g.lancerPartie(jid, sender, args[0] || pseudo);
        break;
      case "join":
        await g.ajouterJoueur(sender, args[0] || pseudo);
        break;
      case "addtime":
        await g.ajouterTempsInscription();
        break;
      case "forcestart": case "forcer":
        await g.forcerDemarrage(sender);
        break;
      case "forcestop": case "stop":
        await g.forcerFin(sender);
        break;
      case "statut": case "status":
        if (jid !== g.groupeJid) return;
        await g.afficherStatut();
        break;
      case "help": case "aide":
      case "menu":
        await this.envoyerMessage(jid, this.msgMenu());
        break;
      case "skip":
        await g.skipPhase();
        break;
      case "reset":
        await g.resetPartie();
        break;
    }
  }

  // ─── Envoi ───────────────────────────────────────────────────────────────────

  async envoyerMessage(jid, texte) {
    if (!this.sock || !this.connected) return;
    try {
      if (CONFIG.AFFICHER_ECRITURE) {
        await this.sock.sendPresenceUpdate("composing", jid);
        const delai = Math.min(Math.max(texte.length * 20, 400), 1500);
        await new Promise((resolve) => setTimeout(resolve, delai));
        await this.sock.sendPresenceUpdate("paused", jid);
      }

      const options = { text: texte };
      const mentions = this._extraireMentions(texte);
      if (mentions) options.mentions = mentions;

      console.log(chalk.gray(`[MSG ENVOYÉ] À: ${jid} | Contenu: "${texte.replace(/\n/g, ' ')}"`));
      await this.sock.sendMessage(jid, options);
    } catch (err) {
      console.error(chalk.red("Erreur envoi :"), err.message);
    }
  }

  /** Extrait les JIDs WhatsApp du texte pour les transformer en vraies mentions */
  _extraireMentions(texte) {
    const jids = texte.match(/[\d]+@[sw]\.whatsapp\.net/g);
    return jids ? [...new Set(jids)] : undefined;
  }

  async envoyerMessagePrive(jid, texte) {
    await this.envoyerMessage(jid, texte);
  }

  msgMenu() {
    const p = CONFIG.PREFIXE;
    return [
      "🐺 *Loup-Garou Bot* — Menu des commandes\n",
      "*Groupe :*",
      `\`${p}start\` — Lancer une partie`,
      `\`${p}join\` — Rejoindre la partie`,
      `\`${p}addtime\` — +30s aux inscriptions`,
      `\`${p}forcestart\` — Forcer le début`,
      `\`${p}stop\` — Forcer la fin`,
      `\`${p}reset\` — Réinitialiser la partie`,
      `\`${p}statut\` — Voir l'état de la partie`,
      `\`${p}skip\` — Passer à la phase suivante`,
      `\`${p}ping\` — Tester la latence`,
      `\`${p}menu\` — Afficher ce menu\n`,
      "*Message privé (pendant la partie) :*",
      "`-tuer`, `-devorer`, `-voir`, `-proteger`",
      "`-lier`, `-parier`, `-contaminer`, `-poser`",
      "`-exploser`, `-choisir`, `-infecter`",
      "`-sauver`, `-empoisonner`, `-passer`",
      "`-voter`, `-maire`, `-coup`, `-tirer`",
      "`-designer`, `-trancher`",
    ].join("\n");
  }

  // ─── Sauvegarde ──────────────────────────────────────────────────────────────

  sauvegarderPartie(donnees) {
    try {
      fs.ensureDirSync("data");
      fs.writeJsonSync(CONFIG.FICHIER_SAUVEGARDE, donnees);
    } catch (err) {
      console.error(chalk.red("Erreur sauvegarde :"), err.message);
    }
  }

  async chargerPartie() {
    try {
      if (fs.existsSync(CONFIG.FICHIER_SAUVEGARDE)) {
        const donnees = fs.readJsonSync(CONFIG.FICHIER_SAUVEGARDE);
        if (donnees && this.game?.restaurer) {
          this.game.restaurer(donnees);
          console.log(chalk.blue("📂 Partie restaurée."));
        }
      }
    } catch (err) {
      console.error(chalk.red("Erreur restauration :"), err.message);
    }
  }
}

// ─── Démarrage ───────────────────────────────────────────────────────────────

console.log(chalk.cyan.bold("\n🐺 Démarrage du bot Loup-Garou…\n"));
const bot = new Bot();
bot.initialiser().catch((err) => {
  console.error(chalk.red("Erreur fatale :"), err);
  process.exit(1);
});

export default bot;
