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
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');


if (!token) {
  console.error('Fehler: Discord Token ist nicht gesetzt. Bitte Umgebungsvariable DISCORD_TOKEN anlegen.');
  process.exit(1);
}
if (!clientId) {
  console.error('Fehler: Client ID ist nicht gesetzt. Bitte Umgebungsvariable CLIENT_ID anlegen.');
  process.exit(1);
}
if (!guildId) {
  console.error('Warnung: GUILD_ID nicht gesetzt. Slash-Befehle werden global registriert (kann bis zu 1 Stunde dauern).');
}

// Erstellt eine neue Instanz des Bots (Clients)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // wichtig für Text-Commands
  ]
});

// REST-Client für Slash-Befehle
const rest = new REST({ version: '10' }).setToken(token);

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

  await channel.send(`🚀 Der Sprint startet jetzt${dayName ? ' am ' + dayName : ''} und läuft ${minutes} Minuten! Nutzt \`!join <Startwortanzahl>\` oder \`/join <startwortanzahl>\` zum Mitmachen.`);

  // Sprint Ende nach der Zeit
  setTimeout(async () => {
    currentSprint.ended = true;
    await channel.send('⏰ Der Sprint ist vorbei! Jetzt könnt ihr eure Endwortzahl mit `!wc <Endwortanzahl>` oder `/wc <endwortanzahl>` eingeben. Ihr habt 2 Minuten Zeit.');

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

// Registriert Slash-Befehle beim Start
client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Antwortet mit Pong!'),

    new SlashCommandBuilder()
      .setName('sprint')
      .setDescription('Startet einen Sprint')
      .addIntegerOption(option =>
        option.setName('minuten')
          .setDescription('Dauer des Sprints in Minuten')
          .setRequired(false)),

    new SlashCommandBuilder()
      .setName('join')
      .setDescription('Tritt einem laufenden Sprint bei')
      .addIntegerOption(option =>
        option.setName('startwortanzahl')
          .setDescription('Startwortanzahl')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('wc')
      .setDescription('Gibt die Endwortanzahl nach dem Sprint ein')
      .addIntegerOption(option =>
        option.setName('endwortanzahl')
          .setDescription('Endwortanzahl')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('cancel')
      .setDescription('Bricht den aktuellen Sprint ab'),
  ].map(command => command.toJSON());

  try {
    console.log('Slash-Befehle werden registriert...');
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log('Slash-Befehle lokal registriert.');
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('Slash-Befehle global registriert (Dauert bis zu 1 Stunde).');
    }
  } catch (error) {
    console.error('Fehler bei Slash-Befehle-Registrierung:', error);
  }

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

// Event-Listener für Nachrichten, um !Commands zu verarbeiten
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.channel.send('Pong!');
  }

  if (command === 'sprint') {
    const minutes = parseInt(args[0]) || 30;
    await startSprint(message.channel, minutes);
  }

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

  else if (command === 'cancel') {
    if (!currentSprint) {
      return message.channel.send('❌ Es läuft kein Sprint zum Abbrechen.');
    }

    currentSprint = null;
    return message.channel.send('Der Sprint wurde abgebrochen.');
  }
});

// Event-Listener für Slash-Commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  else if (commandName === 'sprint') {
    const minutes = interaction.options.getInteger('minuten') || 30;
    const channel = interaction.channel;
    await startSprint(channel, minutes);
    await interaction.reply(`🚀 Sprint wurde für ${minutes} Minuten gestartet.`);
  }

  else if (commandName === 'join') {
    if (!currentSprint || currentSprint.ended) {
      await interaction.reply({ content: '❌ Es läuft kein aktiver Sprint.', ephemeral: true });
      return;
    }
    const startCount = interaction.options.getInteger('startwortanzahl');
    currentSprint.participants[interaction.user.id] = {
      start: startCount,
      end: null
    };
    await interaction.reply(`<@${interaction.user.id}> ist dem Sprint mit ${startCount} Wörtern beigetreten!`);
  }

  else if (commandName === 'wc') {
    if (!currentSprint || !currentSprint.ended) {
      await interaction.reply({ content: '❌ Du kannst deine Endwortanzahl erst nach dem Sprint eingeben.', ephemeral: true });
      return;
    }
    if (!currentSprint.participants[interaction.user.id]) {
      await interaction.reply({ content: '❌ Du hast nicht am Sprint teilgenommen.', ephemeral: true });
      return;
    }
    const endCount = interaction.options.getInteger('endwortanzahl');
    currentSprint.participants[interaction.user.id].end = endCount;
    await interaction.reply(`<@${interaction.user.id}> hat ${endCount} Wörter eingetragen.`);
  }

  else if (commandName === 'cancel') {
    if (!currentSprint) {
      await interaction.reply({ content: '❌ Es läuft kein Sprint zum Abbrechen.', ephemeral: true });
      return;
    }
    currentSprint = null;
    await interaction.reply('Der Sprint wurde abgebrochen.');
  }
});

// Meldet sich mit dem Token an
client.login(token);

