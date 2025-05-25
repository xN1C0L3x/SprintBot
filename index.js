// Importiere benötigte Pakete
const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');

// Starte eine Express-Webseite (für UptimeRobot, damit der Bot wach bleibt)
const app = express();
app.get('/', (req, res) => {
  console.log('UptimeRobot oder Browser hat die Seite aufgerufen');
  res.send('Bot läuft ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webserver läuft auf Port ${PORT}`);
});

// Umgebungsvariablen einlesen
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || null; // optional

// Fehlerprüfung für Umgebungsvariablen
if (!token) {
  console.error('Fehler: DISCORD_TOKEN fehlt');
  process.exit(1);
}
if (!clientId) {
  console.error('Fehler: CLIENT_ID fehlt');
  process.exit(1);
}
if (!guildId) {
  console.warn('GUILD_ID fehlt – Slash-Befehle werden global registriert');
}

// Channel-ID für automatische Sprints (ersetzen mit deinem Channel)
const channelId = '1230852093045379195'; // <-- HIER deine Channel-ID eintragen

// Bot-Client erstellen
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const rest = new REST({ version: '10' }).setToken(token);
const PREFIX = '!';

let currentSprint = null; // aktiver Sprintstatus

// Funktion zum Starten eines Sprints
async function startSprint(channel, minutes = 30, dayName = '') {
  if (currentSprint && !currentSprint.ended) {
    await channel.send('⚠️ Ein Sprint läuft bereits!');
    return;
  }

  currentSprint = {
    endTime: Date.now() + minutes * 60000,
    participants: {},
    ended: false
  };

  await channel.send(`🚀 Der Sprint startet jetzt${dayName ? ' am ' + dayName : ''} und läuft ${minutes} Minuten! Nutzt \`!join <Startwortanzahl>\` oder \`/join <startwortanzahl>\` zum Mitmachen.`);

  setTimeout(async () => {
    if (!currentSprint) return;
    currentSprint.ended = true;
    await channel.send('⏰ Der Sprint ist vorbei! Jetzt könnt ihr eure Endwortzahl mit `!wc <Endwortanzahl>` oder `/wc <endwortanzahl>` eingeben. Ihr habt 2 Minuten Zeit.');

    setTimeout(async () => {
      if (!currentSprint) return;
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
    }, 2 * 60 * 1000);
  }, minutes * 60000);
}

// Slash-Befehle registrieren
client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Antwortet mit Pong!'),
    new SlashCommandBuilder().setName('sprint').setDescription('Startet einen Sprint').addIntegerOption(opt => opt.setName('minuten').setDescription('Dauer in Minuten').setRequired(false)),
    new SlashCommandBuilder().setName('join').setDescription('Tritt einem Sprint bei').addIntegerOption(opt => opt.setName('startwortanzahl').setDescription('Startwortanzahl').setRequired(true)),
    new SlashCommandBuilder().setName('wc').setDescription('Endwortanzahl eingeben').addIntegerOption(opt => opt.setName('endwortanzahl').setDescription('Endwortanzahl').setRequired(true)),
    new SlashCommandBuilder().setName('cancel').setDescription('Sprint abbrechen')
  ].map(cmd => cmd.toJSON());

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Slash-Befehle GUILD-weit registriert.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Slash-Befehle GLOBAL registriert.');
    }
  } catch (err) {
    console.error('Fehler bei Registrierung:', err);
  }

  // Cron-Jobs für automatische Sprints (deutsche Zeit)
  cron.schedule('0 20 * * 2', async () => {
    const channel = await client.channels.fetch(channelId);
    if (channel) startSprint(channel, 30, 'Dienstag');
  }, { timezone: 'Europe/Berlin' });

  cron.schedule('0 20 * * 4', async () => {
    const channel = await client.channels.fetch(channelId);
    if (channel) startSprint(channel, 30, 'Donnerstag');
  }, { timezone: 'Europe/Berlin' });

  cron.schedule('15 15 * * 0', async () => {
    const channel = await client.channels.fetch(channelId);
    if (channel) startSprint(channel, 30, 'Sonntag');
  }, { timezone: 'Europe/Berlin' });
});

// Message-Handler für Text-Kommandos (!)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [command, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);

  if (command === 'ping') return message.channel.send('Pong!');
  if (command === 'sprint') return startSprint(message.channel, parseInt(args[0]) || 30);

  if (command === 'join') {
    if (!currentSprint || currentSprint.ended) return message.channel.send('❌ Kein aktiver Sprint.');
    const start = parseInt(args[0]);
    if (isNaN(start)) return message.channel.send('Ungültige Startwortanzahl.');
    currentSprint.participants[message.author.id] = { start, end: null };
    return message.channel.send(`<@${message.author.id}> ist dem Sprint mit ${start} Wörtern beigetreten!`);
  }

  if (command === 'wc') {
    if (!currentSprint || !currentSprint.ended) return message.channel.send('❌ Kein beendeter Sprint.');
    if (!currentSprint.participants[message.author.id]) return message.channel.send('❌ Du hast nicht teilgenommen.');
    const end = parseInt(args[0]);
    if (isNaN(end)) return message.channel.send('Ungültige Endwortanzahl.');
    currentSprint.participants[message.author.id].end = end;
    return message.channel.send(`<@${message.author.id}> hat ${end} Wörter eingetragen.`);
  }

  if (command === 'cancel') {
    if (!currentSprint) return message.channel.send('❌ Kein Sprint läuft.');
    currentSprint = null;
    return message.channel.send('Sprint wurde abgebrochen.');
  }
});

// Slash-Command-Handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ping') return interaction.reply('Pong!');
  if (commandName === 'sprint') {
    const minutes = interaction.options.getInteger('minuten') || 30;
    await startSprint(interaction.channel, minutes);
    return interaction.reply(`🚀 Sprint über ${minutes} Minuten gestartet.`);
  }
  if (commandName === 'join') {
    if (!currentSprint || currentSprint.ended) return interaction.reply({ content: '❌ Kein aktiver Sprint.', ephemeral: true });
    const start = interaction.options.getInteger('startwortanzahl');
    currentSprint.participants[interaction.user.id] = { start, end: null };
    return interaction.reply(`<@${interaction.user.id}> ist dem Sprint mit ${start} Wörtern beigetreten!`);
  }
  if (commandName === 'wc') {
    if (!currentSprint || !currentSprint.ended) return interaction.reply({ content: '❌ Kein beendeter Sprint.', ephemeral: true });
    if (!currentSprint.participants[interaction.user.id]) return interaction.reply({ content: '❌ Du hast nicht teilgenommen.', ephemeral: true });
    const end = interaction.options.getInteger('endwortanzahl');
    currentSprint.participants[interaction.user.id].end = end;
    return interaction.reply(`<@${interaction.user.id}> hat ${end} Wörter eingetragen.`);
  }
  if (commandName === 'cancel') {
    if (!currentSprint) return interaction.reply({ content: '❌ Kein Sprint läuft.', ephemeral: true });
    currentSprint = null;
    return interaction.reply('Sprint wurde abgebrochen.');
  }
});

// Bot anmelden
client.login(token);
