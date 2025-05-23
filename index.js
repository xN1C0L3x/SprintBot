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
