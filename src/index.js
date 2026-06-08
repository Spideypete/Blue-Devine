import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';
import rconManager from './rcon/manager.js';
import { logger } from './utils/logger.js';
import { evrimaCommand, handleButtonInteraction } from './commands/evrima.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.commands.set(evrimaCommand.data.name, evrimaCommand);

client.once('ready', async () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  console.log(`[Discord] Serving ${client.guilds.cache.size} guilds`);
  logger.setClient(client);

  try {
    console.log('[Discord] Registering slash commands...');
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    const commandsData = [evrimaCommand.data.toJSON()];

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
      }
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('[Interaction] Error:', error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [
            {
              title: '❌ Error',
              description: 'An unexpected error occurred while processing your request.',
              color: 0xff0000,
            },
          ],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [
            {
              title: '❌ Error',
              description: 'An unexpected error occurred while processing your request.',
              color: 0xff0000,
            },
          ],
          ephemeral: true,
        });
      }
    } catch (e) {
      console.error('[Interaction] Failed to send error message:', e);
    }
  }
});

process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Disconnecting RCON...');
  await rconManager.disconnect();
  console.log('[Shutdown] Disconnecting Discord...');
  await client.destroy();
  console.log('[Shutdown] Goodbye');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await rconManager.disconnect();
  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
