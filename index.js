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
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Sprints erstellen
const cron = require('node-cron');

// Es wird ausgegeben, dass der Bot läuft und Cronjobs starten
client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  const channelId = 'DEINE_CHANNEL_ID_HIER'; // Channel für die Nachrichten

  // Funktion zum Starten eines Sprints
  async function startSprint(day) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.log('Channel nicht gefunden!');
        return;
      }

      // Sprint-Ankündigung
      await channel.send(`🚀 Der Sprint startet jetzt am ${day} und läuft 30 Minuten! Viel Erfolg allen!`);

      // 30 Minuten später Sprint beenden
      setTimeout(async () => {
        await channel.send('⏰ Der Sprint ist jetzt vorbei. Gut gemacht! 🎉');
      }, 30 * 60 * 1000); // 30 Minuten in ms

    } catch (error) {
      console.error('Fehler beim Sprint:', error);
    }
  }

  // Dienstags um 20:00 Uhr
  cron.schedule('0 20 * * 2', () => {
    startSprint('Dienstag');
  });

  // Test
  cron.schedule('40 21 * * 5', () => {
    startSprint('Freitag');
  });

  // Donnerstags um 20:00 Uhr
  cron.schedule('0 20 * * 4', () => {
    startSprint('Donnerstag');
  });
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
