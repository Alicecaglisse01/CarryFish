const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] });

let leaderboard = {};

// Charger le classement si existe
const leaderboardFile = "leaderboard.json";
if (fs.existsSync(leaderboardFile)) {
  leaderboard = JSON.parse(fs.readFileSync(leaderboardFile));
}

// Sauvegarder le classement
function saveLeaderboard() {
  fs.writeFileSync(leaderboardFile, JSON.stringify(leaderboard, null, 2));
}

// Envoyer un poisson aléatoire
async function sendFish() {
  const channelId = config.channels[Math.floor(Math.random() * config.channels.length)];
  const channel = client.channels.cache.get(channelId);

  
  if (!channel) return;
  
  const fishImage = config.fishImages[Math.floor(Math.random() * config.fishImages.length)];
  const message = await channel.send({ content: "🐟 Blup blup ! Un poisson sauvage apparaît !", files: [fishImage] });

  await message.react("🐟");

  // Vérifier qui réagit en premier
  const filter = (reaction, user) => reaction.emoji.name === "🐟" && !user.bot;
  const collector = message.createReactionCollector({ filter, max: 1, time: 60000 });

  collector.on("collect", (reaction, user) => {
    leaderboard[user.username] = (leaderboard[user.username] || 0) + 1;
    saveLeaderboard();
    message.delete();
    channel.send(`🎉 ${user} a attrapé le poisson et gagne 1 point ! 🏆`);
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      channel.send("Le poisson s'est échappé... 😢");
    }
  });
}

// Variable pour savoir si le jeu a démarré
let gameStarted = false;
let fishInterval;

// Lancer le bot
client.once("ready", () => {
  console.log(`🐟 CarryFish est en ligne sous ${client.user.tag} !`);
});

// Commande !startpoisson
client.on("messageCreate", (message) => {
  // Vérifier si l'utilisateur est un admin et si la commande est !startpoisson
  if (message.content.startsWith("!startpoisson") && message.member.permissions.has("ADMINISTRATOR")) {
    // Récupérer le message de la commande (tout après !startpoisson)
    const args = message.content.split(" ").slice(1).join(" ");
    
    // Message par défaut si aucun argument n'est donné
    let explanation = args || "🎣 **La chasse aux poissons commence !**\n" +
    "Bienvenue dans le jeu de pêche ! Toutes les 10 minutes, un poisson sauvage apparaîtra dans un salon choisi aléatoirement. 🐟\n" +
    "Les membres doivent réagir au message avec l'emoji 🐟 pour attraper le poisson et gagner 1 point !\n" +
    "Bonne chance à tous les pêcheurs ! 🎉";

    // Créer un embed pour le message d'explication
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎣 Concours de pêche lancé !")
      .setDescription(explanation);

    // Envoyer le message d'explication dans #général
    const generalChannel = message.guild.channels.cache.get("1164586303153782897");
    if (!generalChannel) return message.reply("Le salon #général n'existe pas.");
    generalChannel.send({ embeds: [embed] });

    // Démarrer le jeu (si ce n'est pas déjà fait)
    if (!gameStarted) {
      gameStarted = true;
      fishInterval = setInterval(sendFish, 600000); // Un poisson toutes les 10 minutes ✅
    } else {
      message.channel.send("La chasse aux poissons a déjà commencé !");
    }
  }

  // Commande !forcepoisson pour forcer l'apparition d'un poisson
  if (message.content === "!forcepoisson" && message.member.permissions.has("ADMINISTRATOR")) {
    // Forcer l'apparition immédiate d'un poisson
    sendFish();
    
    // Reprendre l'intervalle normal après 10 minutes
    clearInterval(fishInterval);
    fishInterval = setInterval(sendFish, 600000); // Un poisson toutes les 10 minute après l'apparition forcée
    message.channel.send("🐟 Un poisson sauvage a été forcé d'apparaître ! Le jeu continue.");
  }

 // Commande !score pour afficher le classement
 if (message.content === "!score") {
    // Créer un embed pour afficher le classement
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🏆 Classement des pêcheurs 🏆");

    // Créer le classement pour tout le monde
    let ranking = Object.entries(leaderboard)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // On affiche seulement les 10 premiers
      .map(entry => `${entry[0]} - ${entry[1]} pts`)
      .join("\n");

    embed.setDescription(ranking || "Aucun pêcheur pour l'instant !");
    
    // Ajouter la position de l'utilisateur
    const userRank = Object.entries(leaderboard)
      .sort((a, b) => b[1] - a[1])
      .findIndex(entry => entry[0] === message.author.username) + 1;
    
    const userPoints = leaderboard[message.author.username] || 0;

    // Modification pour afficher "1ère place" pour la 1ère position
    let userPosition = "";
    if (userRank === 1) {
      userPosition = `Tu es actuellement à la **1ère place** avec **${userPoints} points**.`;
    } else {
      userPosition = `Tu es actuellement à la **${userRank}ème place** avec **${userPoints} points**.`;
    }

    embed.addFields({
      name: "🔹 Votre position :",
      value: userPosition,
      inline: false
    });

    embed.setFooter({ text: "Merci d'avoir participé !" });

    // Afficher l'embed avec le classement dans le salon
    message.channel.send({ embeds: [embed] });
  }

  // Commande !stoppoisson pour arrêter le jeu
  if (message.content === "!stoppoisson" && message.member.permissions.has("ADMINISTRATOR")) {
    // Arrêter l'intervalle de poissons
    clearInterval(fishInterval);
    gameStarted = false;

    // Afficher le message de fin avec le classement final dans #général
    let finalRanking = Object.entries(leaderboard)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Afficher seulement les 10 premiers
      .map((entry, index) => `${index + 1}. ${entry[0]} - ${entry[1]} pts`)
      .join("\n");

    // Créer un embed pour afficher le classement final
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("🎣 Concours de pêche terminé ! 🎣")
      .setDescription(`Voici le classement final des pêcheurs :\n\n${finalRanking || "Aucun pêcheur n'a participé !"}\n\nMerci à tous d'avoir participé !`)
      .setFooter({ text: "À bientôt pour un nouveau concours !" });

    // Envoyer l'embed dans #général
    const generalChannel = message.guild.channels.cache.find(ch => ch.name === "général");
    if (!generalChannel) return message.reply("Le salon #général n'existe pas.");

    generalChannel.send({ embeds: [embed] });
  }
});

client.login(config.token);
