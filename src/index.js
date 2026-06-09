import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';
import rconManager from './rcon/manager.js';
import { logger } from './utils/logger.js';
import { evrimaCommand, handleButtonInteraction } from './commands/evrima.js';
import { startDeployWebhook } from './webhook.js';
import { coinCommands } from './commands/coins.js';
import { data as buyData, execute as buyExecute } from './commands/buy.js';
import { data as inventoryData, execute as inventoryExecute } from './commands/inventory.js';
import { ensureDb } from './economy/coins.js';
import { ensureInventoryDb } from './economy/inventory.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.commands.set(evrimaCommand.data.name, evrimaCommand);

for (const [name, cmd] of Object.entries(coinCommands)) {
  client.commands.set(name, cmd);
}

client.commands.set(buyData.name, { data: buyData, execute: buyExecute });
client.commands.set(inventoryData.name, { data: inventoryData, execute: inventoryExecute });

client.once('ready', async () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  console.log(`[Discord] Serving ${client.guilds.cache.size} guilds`);
  logger.setClient(client);
  startDeployWebhook(client);

  try {
    await ensureDb();
    console.log('[Economy] Database initialized');
  } catch (e) {
    console.error('[Economy] Database init failed:', e);
  }

  try {
    await ensureInventoryDb();
    console.log('[Inventory] Database initialized');
  } catch (e) {
    console.error('[Inventory] Database init failed:', e);
  }

  try {
    console.log('[Discord] Registering slash commands...');
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    const commandsData = [evrimaCommand.data.toJSON()];

    for (const cmd of Object.values(coinCommands)) {
      commandsData.push(cmd.data.toJSON());
    }
    commandsData.push(buyData.toJSON());
    commandsData.push(inventoryData.toJSON());

    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID), { body: commandsData });

    console.log('[Discord] Slash commands registered successfully');
  } catch (error) {
    console.error('[Discord] Failed to register commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
        return;
      }
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('[Discord] Interaction error:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [new (await import('discord.js')).EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred').setColor(0xff0000)] });
      } else {
        await interaction.reply({ embeds: [new (await import('discord.js')).EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred').setColor(0xff0000)], flags: 64 });
      }
    } catch (e) {
      // ignore
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

