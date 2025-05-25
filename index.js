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
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // wichtig für Text-Commands
  ]
});

// Sprints erstellen
const cron = require('node-cron');

const PREFIX = '!';

// Channel ID für automatische Sprints (hier musst du deine Channel ID eintragen)
const channelId = '1230852093045379195';

// Sprint-Status
let currentSprint = null; // null oder Objekt { endTime, participants, ended }

// Funktion Sprint starten (manuell oder automatisch)
async function startSprint(channel, minutes = 30, dayName = '') {
  if (currentSprint && !currentSprint.ended) {
    await channel.send('⚠️ Ein Sprint läuft bereits!');
    return;
  }

  currentSprint = {
    endTime: Date.now() + minutes * 60000,
    participants: {}, // userId: { start: number, end: number|null }
    ended: false
  };

  await channel.send(`🚀 Der Sprint startet jetzt${dayName ? ' am ' + dayName : ''} und läuft ${minutes} Minuten! Nutzt \`!join <Startwortanzahl>\` zum Mitmachen.`);

  // Sprint Ende nach der Zeit
  setTimeout(async () => {
    currentSprint.ended = true;
    await channel.send('⏰ Der Sprint ist vorbei! Jetzt könnt ihr eure Endwortzahl mit `!wc <Endwortanzahl>` eingeben. Ihr habt 2 Minuten Zeit.');

    // Nach 2 Minuten Sprint abschließen & Ergebnisse senden
    setTimeout(async () => {
      let results = '🏁 Sprint-Ergebnisse:\n';
      for (const [userId, data] of Object.entries(currentSprint.participants)) {
        if (data.end !== null && typeof data.start === 'number') {
          const diff = data.end - data.start;
          results += `<@${userId}> hat ${diff} Wörter geschrieben.\n`;
        } else {
          results += `<@${userId}> hat keine Endwortanzahl angegeben.\n`;
        }
      }
      await channel.send(results);
      currentSprint = null;
    }, 2 * 60 * 1000); // 2 Minuten
  }, minutes * 60000);
}

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  // Cronjobs für automatische Sprints
  if (!channelId || channelId === 'DEINE_CHANNEL_ID_HIER') {
    console.warn('WARNUNG: Du musst die Channel ID in "channelId" im Code eintragen, um automatische Sprints zu nutzen.');
  }

  // Dienstags um 20:00 Uhr deutscher Zeit
cron.schedule('0 20 * * 2', async () => {
  const channel = await client.channels.fetch(channelId);
  if (channel) startSprint(channel, 30, 'Dienstag');
}, {
  timezone: 'Europe/Berlin'
});

 // Donnerstags um 20:00 Uhr deutscher Zeit
cron.schedule('0 20 * * 4', async () => {
  const channel = await client.channels.fetch(channelId);
  if (channel) startSprint(channel, 30, 'Donnerstag');
}, {
  timezone: 'Europe/Berlin'
});
  
 // Test am Sonntag um 15:00 Uhr deutscher Zeit
cron.schedule('15 15 * * 0', async () => {
  const channel = await client.channels.fetch(channelId);
  if (channel) startSprint(channel, 30, 'Sonntag');
}, {
  timezone: 'Europe/Berlin'
});
});

// Event-Listener für Nachrichten, um Commands zu verarbeiten
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.channel.send('Pong!');
  }

  // Sprint starten manuell: !sprint [minuten]
  if (command === 'sprint') {
    const minutes = parseInt(args[0]) || 30;
    await startSprint(message.channel, minutes);
  }

  // Mit Sprint joinen: !join <startwortanzahl>
  else if (command === 'join') {
    if (!currentSprint || currentSprint.ended) {
      return message.channel.send('❌ Es läuft kein aktiver Sprint.');
    }

    const startCount = parseInt(args[0]);
    if (isNaN(startCount) || startCount < 0) {
      return message.channel.send('Bitte gib eine gültige Startwortanzahl an. Beispiel: `!join 100`');
    }

    currentSprint.participants[message.author.id] = {
      start: startCount,
      end: null
    };

    return message.channel.send(`<@${message.author.id}> ist dem Sprint mit ${startCount} Wörtern beigetreten!`);
  }

  // Wortanzahl nach Sprint eingeben: !wc <endwortanzahl>
  else if (command === 'wc') {
    if (!currentSprint || !currentSprint.ended) {
      return message.channel.send('❌ Du kannst deine Endwortanzahl erst nach dem Sprint eingeben.');
    }

    if (!currentSprint.participants[message.author.id]) {
      return message.channel.send('❌ Du hast nicht am Sprint teilgenommen.');
    }

    const endCount = parseInt(args[0]);
    if (isNaN(endCount) || endCount < 0) {
      return message.channel.send('Bitte gib eine gültige Endwortanzahl an. Beispiel: `!wc 350`');
    }

    currentSprint.participants[message.author.id].end = endCount;
    return message.channel.send(`<@${message.author.id}> hat ${endCount} Wörter eingetragen.`);
  }

  // Sprint abbrechen: !cancel
  else if (command === 'cancel') {
    if (!currentSprint) {
      return message.channel.send('❌ Es läuft kein Sprint zum Abbrechen.');
    }

    currentSprint = null;
    return message.channel.send('Der Sprint wurde abgebrochen.');
  }
});

// Event-Listener, der auf Slash-Befehle reagiert und ausführt (dein bestehender ping-Befehl)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`Empfange Befehl: ${interaction.commandName}`);

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

// Meldet sich mit dem Token an
client.login(token);
