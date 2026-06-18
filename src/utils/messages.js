// ===== Templates de messages (groupe et MP) =====

import { formaterListeJoueurs } from "./helpers.js";

// ==================== Messages de groupe ====================

export function msgLancement(pseudo, jid, duree) {
  return `👑 @${jid} a lancé une partie de Loup-Garou !\n\nLes inscriptions sont ouvertes pour ${duree} secondes.\nTapez \`-join\` pour participer !`;
}

export function msgJoin(pseudo, jid, id) {
  return `✅ @${jid} a rejoint la partie ! (ID: ${id})`;
}

export function msgAddtime(secondes) {
  return `⏱️ ${secondes} secondes ajoutées au compteur d'inscription !`;
}

export function msgStartForce(pseudo, jid) {
  return `⚡ @${jid} a forcé le début de la partie !`;
}

export function msgDistributionRole(pseudo) {
  return `🎭 Les rôles ont été distribués ! La partie commence.`;
}

export function msgNbJoueursInscrits(nb, min) {
  return `📋 ${nb} joueurs inscrits. Minimum requis : ${min}.`;
}

export function msgPasAssezJoueurs(nb, min) {
  return `❌ ${nb} joueurs seulement. Minimum requis : ${min}. Partie annulée.`;
}

export function msgNuit(phase) {
  return `🌙 La nuit tombe sur le village... (Phase ${phase})\n\nChaque joueur concerné reçoit ses instructions en message privé.`;
}

export function msgLeverSoleil() {
  return `☀️ Le jour se lève sur le village !`;
}

export function msgMortNuit(pseudo, jid, role) {
  return `💀 @${jid} (${role}) a été tué cette nuit.`;
}

export function msgPersonneMorte() {
  return `☀️ Personne n'est mort cette nuit. Le village s'éveille paisiblement...`;
}

export function msgVoteJour() {
  return `🗳️ Le vote du village commence !\n\nChaque joueur vivant reçoit ses instructions de vote en message privé.`;
}

export function msgResultatVote(pseudo, jid, nbVotes, totalVotes) {
  return `📊 Résultat du vote : @${jid} est éliminé avec ${nbVotes}/${totalVotes} voix.`;
}

export function msgEgalite() {
  return `🤝 Égalité parfaite ! Personne n'est éliminé aujourd'hui.`;
}

export function msgMaireElu(pseudo, jid) {
  return `👑 @${jid} est élu Maire du village !`;
}

export function msgFinPartie(vainqueurs, camps) {
  return `🏆 Partie terminée ! Victoire des ${camps} : ${vainqueurs.join(", ")}`;
}

export function msgForceFin(pseudo, jid) {
  return `🛑 @${jid} a mis fin à la partie.`;
}

export function msgStatut(phase, joueursListe, jour) {
  return `📋 **Statut de la partie**\nPhase : ${phase}\nJour : ${jour}\n\nJoueurs en vie :\n${joueursListe}`;
}

export function msgAnnonceFossoyeur(pseudo1, jid1, role1, pseudo2, jid2, role2) {
  return `⚰️ Le Fossoyeur désigne @${jid1} (${role1}).\nDepuis l'au-delà, un nom est apparu : @${jid2} (${role2}).`;
}

export function msgChasseurTire(pseudo, jid) {
  return `🔫 Le Chasseur a tiré sur @${jid} !`;
}

export function msgDictateurCoup(pseudo, jid) {
  return `⚡ Le Dictateur impose l'élimination de @${jid} !`;
}

export function msgDictateurMort(roleCible, pseudoDictateur, jidDictateur, pseudoCible, jidCible) {
  if (roleCible === "Loup-Garou") {
    return `👑 @${jidCible} était un Loup ! @${jidDictateur} devient Maire du village !`;
  }
  return `💀 @${jidCible} n'était pas un Loup. @${jidDictateur} paie de sa vie cette erreur.`;
}

export function msgLoupBavardMot(mot) {
  return `📢 Le Loup Bavard doit placer le mot "${mot}" dans un message du groupe avant la fin du jour !`;
}

export function msgLoupBavardMort() {
  return `💀 Le Loup Bavard n'a pas placé son mot et meurt en punition !`;
}

export function msgHeritierPowers(role) {
  return `👑 L'Héritier a reçu les pouvoirs de ${role} !`;
}

export function msgCoupleAmoureux(p1, j1, p2, j2) {
  return `💕 @${j1} et @${j2} sont amoureux !`;
}

export function msgContamination(jp1, jid1, jp2, jid2) {
  return `☣️ @${jid1} et @${jid2} ont été contaminés par le Rat Malade.`;
}

export function msgTonnerresExplosion(joueurs) {
  return `💥 Les tonneaux explosent ! ${joueurs.map((j) => `@${j.jid}`).join(", ")} ${joueurs.length > 1 ? "sont" : "est"} réduit(s) en cendres.`;
}

export function msgTonnerrePose(joueur) {
  return `🛢️ Un tonneau a été posé chez @${joueur.jid}.`;
}

// ==================== Messages MP ====================

export function mpReveleRole(role) {
  return `🎭 Votre rôle est : **${role}**\n\nVous recevrez vos instructions en fonction de votre rôle et de la phase de jeu.`;
}

export function mpLoupInstructions(joueurs) {
  return `🌙 C'est la nuit. Tu peux dévorer un joueur ou choisir de ne pas agir.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-tuer [id]\`     → ex: -tuer 2\n\`-passer\`        → ne pas agir cette nuit`;
}

export function mpLoupNoirInstructions(joueurs) {
  return `🌙 C'est la nuit. Tu es un Loup Noir.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-tuer [id]\`        → dévorer un joueur\n\`-infecter [id]\`    → infecter la victime (1 fois par partie)\n\`-passer\`           → ne pas agir cette nuit`;
}

export function mpLoupBlancInstructions(joueurs, nuit) {
  return `🌙 C'est la nuit. Tu es le Loup Blanc.\n\n${nuit % 2 === 0 ? "Cette nuit, tu peux dévorer un joueur (y compris un Loup) !" : "Cette nuit, tu ne peux pas agir (une nuit sur deux)."}\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-devorer [id]\`    → dévorer un joueur\n\`-passer\`          → ne pas agir cette nuit`;
}

export function mpVoyanteInstructions(joueurs) {
  return `🔮 C'est la nuit. Tu peux sonder un joueur pour découvrir son rôle.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-voir [id]\`   → ex: -voir 3`;
}

export function mpVoyanteResultat(id, pseudo, jid, role) {
  return `🔮 @${jid} (ID: ${id}) est : **${role}**`;
}

export function mpSorciereInstructions(victime, joueurs) {
  let msg = `🧪 C'est la nuit. Un joueur a été attaqué par les loups.\n\n`;
  if (victime) {
    msg += `💀 La victime des loups est : @${victime.jid} (ID: ${victime.id})\n\n`;
  } else {
    msg += `💀 Personne n'a été attaqué cette nuit.\n\n`;
  }
  msg += `Tu as deux potions :\n🟢 Potion de vie (1 utilisation)\n🔴 Potion de mort (1 utilisation)\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-sauver\`          → sauver la victime\n\`-empoisonner [id]\`→ empoisonner un joueur\n\`-passer\`          → ne rien faire cette nuit`;
  return msg;
}

export function mpGardeInstructions(joueurs, derniereProtection) {
  let msg = `🛡️ C'est la nuit. Tu peux protéger un joueur (pas deux fois de suite la même personne).\n\n`;
  if (derniereProtection) {
    msg += `⚠️ Tu as protégé @${derniereProtection.jid} la nuit dernière.\n\n`;
  }
  msg += `Joueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-proteger [id]\`  → ex: -proteger 2`;
  return msg;
}

export function mpCupidonInstructions(joueurs) {
  return `💘 C'est la première nuit. Tu dois désigner deux amoureux.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-lier [id1] [id2]\`  → ex: -lier 2 5`;
}

export function mpVoteInstructions(joueurs) {
  return `🗳️ Vote du jour ! Qui doit être éliminé ?\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-voter [id]\`   → ex: -voter 3`;
}

export function mpElectionMaireInstructions(joueurs) {
  return `👑 Élection du Maire ! Vote pour le joueur de ton choix.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-maire [id]\`   → ex: -maire 3`;
}

export function mpMaireDepartageInstructions(egaux) {
  return `👑 En tant que Maire, c'est à toi de trancher !\n\nJoueurs ex-æquo :\n${formaterListeJoueurs(egaux)}\n\nCommande :\n\`-trancher [id]\`  → ex: -trancher 2`;
}

export function mpChasseurInstructions(joueurs) {
  return `🔫 Tu es mort. Tu peux emmener quelqu'un avec toi (30 secondes) !\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-tirer [id]\`  → ex: -tirer 3\n\`-passer\`      → ne pas tirer`;
}

export function mpFossoyeurInstructions(joueurs) {
  return `⚰️ Tu es mort. Désigne un joueur pour révéler son rôle et celui d'un membre du camp opposé.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-designer [id]\`  → ex: -designer 4`;
}

export function mpDictateurInstructions(joueurs) {
  return `⚡ En tant que Dictateur, tu peux imposer une fois l'élimination d'un joueur.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-coup [id]\`  → ex: -coup 5`;
}

export function mpNainInstructions(joueurs) {
  return `👺 C'est la nuit, Nain Tracassin. Parie sur le rôle d'un joueur !\nSi tu trouves le bon rôle, il meurt. Sinon, il peut tenter de deviner ton rôle.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nRôles possibles : Loup-Garou, Voyante, Sorcière, Garde, Simple Villageois, Chasseur\n\nCommande :\n\`-parier [id] [role]\`  → ex: -parier 3 Voyante`;
}

export function mpRatInstructions(joueurs) {
  return `🐀 C'est la nuit. Tu dois contaminer 2 joueurs.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-contaminer [id1] [id2]\`  → ex: -contaminer 2 5`;
}

export function mpPyromancienInstructions(joueurs) {
  return `🔥 C'est la nuit, Pyromancien. Choisis ton action :\n- Poser un tonneau chez un joueur\n- Faire exploser tous les tonneaux\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommandes :\n\`-poser [id]\`      → poser un tonneau\n\`-exploser\`        → faire tout exploser`;
}

export function mpHeritierInstructions(joueurs) {
  return `👑 C'est la première nuit. Choisis ton testataire.\nÀ sa mort, tu hériteras de ses pouvoirs non consommés.\n\nJoueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\nCommande :\n\`-choisir [id]\`  → ex: -choisir 4`;
}

export function mpNotificationContamine() {
  return `☣️ Tu as été contaminé par le Rat Malade. Le Rat Malade gagnera si tout le monde est contaminé.`;
}

export function mpNotificationInfecte() {
  return `🧛 Tu as été infecté par le Loup Noir ! Tu rejoins le camp des Loups tout en conservant tes pouvoirs.`;
}

export function mpMercenaireCible(id, pseudo) {
  return `🎯 Ta cible est @${pseudo} (ID: ${id}). Si tu la fais éliminer au vote du jour 1, tu gagnes immédiatement !`;
}

export function mpMercenairePerdu() {
  return `😞 Ta cible n'a pas été éliminée au jour 1. Tu deviens Simple Villageois.`;
}

// ==================== Le Fou ====================

/**
 * Instructions nocturnes du Fou (identiques à celles de la Voyante).
 * Le Fou croit être la Voyante, donc le message ne doit pas trahir son vrai rôle.
 */
export function mpFouInstructions(joueurs) {
  return (
    `🔮 C'est la nuit. Tu peux sonder un joueur pour découvrir son rôle.\n\n` +
    `Joueurs disponibles :\n${formaterListeJoueurs(joueurs)}\n\n` +
    `Commande :\n\`-voir [id]\`   → ex : -voir 3`
  );
}

/**
 * Résultat (faux) envoyé au Fou.
 * @param {number} id - ID de la cible réelle
 * @param {string} pseudoCible - pseudo de la cible réelle
 * @param {string} fauxRole  - rôle aléatoire (pas le vrai)
 */
export function mpFouResultatFaux(id, pseudoCible, fauxRole) {
  return `🔮 @${pseudoCible} (ID : ${id}) est : *${fauxRole}*`;
}

// ==================== Ping ====================

/**
 * Réponse à la commande -ping.
 * @param {number} latenceMs - latence en millisecondes
 */
export function msgPing(latenceMs) {
  const bars = latenceMs < 300 ? '🟢🟢🟢' : latenceMs < 700 ? '🟡🟡⚪' : '🔴⚪⚪';
  return (
    `🏓 *Pong !* Le bot est en ligne.\n` +
    `⏱️ Latence : *${latenceMs} ms* ${bars}`
  );
}

