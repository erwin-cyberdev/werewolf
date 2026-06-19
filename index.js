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
import QRCode from "qrcode";
import path from "path";
import { createServer } from "http";
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
const QR_PORT = process.env.PORT || process.env.QR_PORT || 3000;

// ─── Serveur HTTP pour afficher le QR Code via /qr ───────────────────────────

let currentQrData = null; // Stocke le dernier QR code brut

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  if (url.pathname === "/qr") {
    if (!currentQrData) {
      // Pas encore de QR code disponible
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
      <html lang="fr">
      <head>
      <meta charset="UTF-8" />
      <meta http-equiv="refresh" content="5" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Loup-Garou Bot — QR Code</title>
      <style>
      body { font-family: sans-serif; display: flex; flex-direction: column;
        align-items: center; justify-content: center; min-height: 100vh;
        margin: 0; background: #0a0a0a; color: #e0e0e0; }
        .card { background: #1a1a2e; border-radius: 16px; padding: 40px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5); text-align: center; max-width: 420px; }
          h1 { color: #7fdd47; margin-bottom: 8px; }
          p { color: #aaa; margin-bottom: 0; }
          .loader { width: 48px; height: 48px; border: 5px solid #333;
            border-top-color: #7fdd47; border-radius: 50%;
            animation: spin 1s linear infinite; margin: 24px auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
            </style>
            </head>
            <body>
            <div class="card">
            <h1>🐺 Loup-Garou Bot</h1>
            <div class="loader"></div>
            <p>En attente du QR code…<br/>La page se rafraîchit automatiquement.</p>
            </div>
            </body>
            </html>`);
      return;
    }

    // Générer l'image PNG du QR code
    try {
      const qrImageBase64 = await QRCode.toDataURL(currentQrData, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
      <html lang="fr">
      <head>
      <meta charset="UTF-8" />
      <meta http-equiv="refresh" content="30" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Loup-Garou Bot — Scanner le QR Code</title>
      <style>
      body { font-family: sans-serif; display: flex; flex-direction: column;
        align-items: center; justify-content: center; min-height: 100vh;
        margin: 0; background: #0a0a0a; color: #e0e0e0; }
        .card { background: #1a1a2e; border-radius: 16px; padding: 40px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5); text-align: center; max-width: 420px; }
          h1 { color: #7fdd47; margin-bottom: 8px; }
          .subtitle { color: #aaa; font-size: 0.9rem; margin-bottom: 24px; }
          img { border-radius: 12px; border: 4px solid #7fdd47;
            box-shadow: 0 0 24px rgba(127,221,71,0.3); }
            .steps { text-align: left; margin-top: 24px; color: #bbb; font-size: 0.85rem; line-height: 1.7; }
            .steps b { color: #7fdd47; }
            .refresh { margin-top: 16px; font-size: 0.75rem; color: #555; }
            </style>
            </head>
            <body>
            <div class="card">
            <h1>🐺 Loup-Garou Bot</h1>
            <p class="subtitle">Scannez ce QR code avec WhatsApp</p>
            <img src="${qrImageBase64}" alt="QR Code WhatsApp" width="260" height="260" />
            <div class="steps">
            <b>1.</b> Ouvrez WhatsApp sur votre téléphone<br/>
            <b>2.</b> Allez dans <b>Paramètres › Appareils liés</b><br/>
            <b>3.</b> Appuyez sur <b>Lier un appareil</b><br/>
            <b>4.</b> Scannez ce code
            </div>
            <p class="refresh">⟳ Page rafraîchie automatiquement toutes les 30 s</p>
            </div>
            </body>
            </html>`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Erreur génération QR : " + err.message);
    }
    return;
  }

  // Route racine — redirection vers /qr
  if (url.pathname === "/") {
    res.writeHead(302, { Location: "/qr" });
    res.end();
    return;
  }

  // Toute autre route
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 — Page non trouvée");
});

httpServer.listen(QR_PORT, () => {
  console.log(chalk.cyan(`🌐 Serveur QR démarré sur le port ${QR_PORT} — accédez à /qr pour scanner`));
});

// ─── Bot ─────────────────────────────────────────────────────────────────────

class Bot {
  constructor() {
    this.game = new GameManager(this);
    this.sock = null;
    this.connected = false;
    this.isStarting = false;
    this.lastQr = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
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
          syncFullHistory: false,
      });

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
          currentQrData = qr; // ← expose au serveur HTTP

          console.clear();
          console.log(chalk.cyan("\n" + "═".repeat(50)));
          console.log(chalk.green.bold("  📱 SCANNEZ LE QR CODE AVEC WHATSAPP"));
          console.log(chalk.gray("  Paramètres › Appareils liés › Lier un appareil"));
          console.log(chalk.cyan(`  Ou visitez : http://localhost:${QR_PORT}/qr`));
          console.log(chalk.cyan("═".repeat(50) + "\n"));

          // Afficher aussi dans le terminal
          qrcode.generate(qr, { small: true });
        }

        // ── Connecté ──────────────────────────────────────────────────────
        if (connection === "open") {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.lastQr = null;
          currentQrData = null; // ← efface le QR une fois connecté
          closedOnce = false;
          console.log(chalk.green.bold("✅ Bot connecté avec succès !"));
          await this.chargerPartie();
        }

        // ── Déconnecté ────────────────────────────────────────────────────
        if (connection === "close" && !closedOnce) {
          closedOnce = true;
          this.connected = false;
          this.lastQr = null;
          currentQrData = null;

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const error = lastDisconnect?.error;

          console.log(chalk.yellow(`\n⚠️  Connexion fermée (code : ${statusCode ?? "inconnu"})`));
          if (error) {
            console.error(chalk.red("Erreur:"), error.message);
          }
          this._destroySocket();

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(chalk.red(`❌ Nombre maximum de tentatives (${this.maxReconnectAttempts}) atteint. Arrêt du bot.`));
            this.isStarting = false;
            return;
          }

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
