// Webseite wird gehostet (UptimeRobot), damit der Bot wach bleibt
const express = require('express');
const app = express();

// Zeigt an, dass der Bot läuft
app.get('/', (req, res) => {
  console.log('UptimeRobot oder Browser hat die Seite aufgerufen');
  res.send('Bot läuft ✅');
});

// Startet den Webserver auf Port 3000 oder den von Render vorgegebenen Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webserver läuft auf Port ${PORT}`);
});

// Importiert die benötigten Klassen aus discord.js
const { Client, GatewayIntentBits } = require('discord.js');

// Holt den Token aus den Umgebungsvariablen (z.B. bei Render hinterlegt)
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Fehler: Discord Token ist nicht gesetzt. Bitte Umgebungsvariable DISCORD_TOKEN anlegen.');
  process.exit(1);
}

// Erstellt eine neue Instanz des Bots (Clients)
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Es wird ausgegeben, dass der Bot läuft
client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
});

// Event-Listener, der auf Slash-Befehle reagiert und ausführt
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`Empfange Befehl: ${interaction.commandName}`);

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

// Meldet sich mit dem Token an
client.login(token);

// Sprints erstellen
const cron = require('node-cron');
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  // Dienstags um 20:00 Uhr (Serverzeit) Sprint starten
  cron.schedule('0 20 * * 2', async () => {
    const channelId = 'DEINE_CHANNEL_ID_HIER'; // Channel für die Nachrichten
    const channel = await client.channels.fetch(1230852093045379195);

    if (!channel) {
      console.log('Channel nicht gefunden!');
      return;
    }

    // Sprint-Ankündigung
    await channel.send('🚀 Der Sprint startet jetzt und läuft 30 Minuten! Viel Erfolg allen!');

    // 30 Minuten später Sprint beenden
    setTimeout(async () => {
      await channel.send('⏰ Der Sprint ist jetzt vorbei. Gut gemacht! 🎉');
    }, 30 * 60 * 1000); // 30 Minuten in ms
  });

});

client.login(token);
