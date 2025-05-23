const { Client, GatewayIntentBits } = require('discord.js');
const token = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

client.login(token);
