const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalSubmitInteraction } = require('discord.js');
const fs = require('fs');
const path = require('path');
const EvrimaRCON = require('./rcon');
const UI = require('./ui');
const Security = require('./security');
const Logger = require('./logger');
const menus = {
  players: require('./menus/players'),
  announcements: require('./menus/announcements'),
  world: require('./menus/world'),
  server: require('./menus/server'),
  whitelist: require('./menus/whitelist'),
};

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const DEFAULT_CONFIG = {
  discord: { token: '', clientId: '', guildId: '', auditChannelId: '' },
  rcon: { host: '127.0.0.1', port: 27015, password: '' },
  authorizedRoles: [],
  autoAnnouncements: [],
  favoriteCommands: [],
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return DEFAULT_CONFIG;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.config = loadConfig();
client.rcon = new EvrimaRCON(client.config.rcon);
client.favoriteCommands = client.config.favoriteCommands || [];

function getCommandHandler(customId) {
  const parts = customId.split('_');
  const base = parts[0];
  const action = parts.slice(1).join('_');
  const menuMap = {
    players: menus.players,
    announce: menus.announcements,
    world: menus.world,
    server: menus.server,
    whitelist: menus.whitelist,
  };
  const menu = menuMap[base];
  if (!menu) return null;
  if (action === 'menu') return menu.execute.bind(menu);
  const handler = menu[action];
  if (handler) return handler;
  const altAction = parts.slice(2).join('_');
  return menu[altAction] || null;
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand() || interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
    try {
      const customId = interaction.customId || interaction.commandName;
      if (interaction.isButton() && customId === 'main_menu') {
        if (!(await Security.ensureAuthorized(interaction))) return;
        const embed = UI.mainMenuEmbed();
        const row = UI.actionRow(
          UI.button('Players', '👥', 'players_menu'),
          UI.button('Announcements', '📢', 'announcements_menu'),
          UI.button('World Controls', '🌍', 'world_menu'),
          UI.button('Server Controls', '⚙️', 'server_menu'),
          UI.button('Whitelist', '📋', 'whitelist_menu')
        );
        const row2 = UI.actionRow(
          UI.button('Live Status', '📈', 'live_status'),
          UI.button('Custom Console', '💻', 'console_menu')
        );
        await interaction.update({ embeds: [embed], components: [row, row2] });
        return;
      }

      if (customId === 'console_menu') {
        if (!(await Security.ensureAuthorized(interaction))) return;
        const embed = UI.embed('Custom Console', 'Execute any RCON command or use favorites:');
        embed.color = 0x2c3e50;
        const favs = client.favoriteCommands || [];
        const favButtons = favs.slice(0, 5).map((cmd, i) => UI.secondaryButton(cmd.slice(0, 20), '⭐', `console_fav_${i}`));
        const row = UI.actionRow(
          UI.button('Execute Command', '▶️', 'console_execute'),
          ...favButtons,
          UI.button('Back', '🏠', 'main_menu')
        );
        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }

      if (customId === 'console_execute') {
        const modal = UI.textModal('RCON Console', 'console_execute_modal', [
          { id: 'command', label: 'Command', placeholder: '/command arg1 arg2...', required: true },
        ]);
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('console_fav_')) {
        const index = parseInt(customId.split('_')[2]);
        const cmd = client.favoriteCommands[index];
        if (cmd) {
          try {
            const result = await client.rcon.genericCommand(cmd);
            Logger.log('Custom Console', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: `Favorite: ${cmd}`, serverResponse: result });
            await interaction.update({ embeds: [UI.embed('Console Output', `\`\`\`${cmd}\`\`\`\n\`\`\`${result}\`\`\``)], components: [] });
          } catch (error) {
            await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
          }
        }
        return;
      }

      if (customId === 'live_status') {
        try {
          const details = await client.rcon.getServerDetails();
          const players = await client.rcon.getPlayers();
          const embed = UI.embed('Live Server Status', `\`\`\`${details}\`\`\`\n**Online Players:** ${players.length}`);
          embed.color = 0x2ecc71;
          await interaction.update({ embeds: [embed], components: [UI.actionRow(UI.button('Back', '🏠', 'main_menu'))] });
        } catch (error) {
          await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
        }
        return;
      }

      if (customId === 'players_menu') {
        await menus.players.execute(interaction);
        return;
      }

      if (customId === 'announcements_menu') {
        await menus.announcements.execute(interaction);
        return;
      }

      if (customId === 'world_menu') {
        await menus.world.execute(interaction);
        return;
      }

      if (customId === 'server_menu') {
        await menus.server.execute(interaction);
        return;
      }

      if (customId === 'whitelist_menu') {
        await menus.whitelist.execute(interaction);
        return;
      }

      if (customId === 'players_search') {
        await menus.players.search(interaction);
        return;
      }

      if (customId.startsWith('players_list')) {
        const page = interaction.values ? interaction.values[0] : (interaction.customId.endsWith('_next') ? '1' : interaction.customId.endsWith('_prev') ? '-1' : '0');
        const players = await client.rcon.getPlayers();
        const itemsPerPage = 10;
        const totalPages = Math.ceil(players.length / itemsPerPage) || 1;
        let currentPage = parseInt(page) || 0;
        if (interaction.customId.endsWith('_next')) currentPage = Math.min(currentPage + 1, totalPages - 1);
        if (interaction.customId.endsWith('_prev')) currentPage = Math.max(currentPage - 1, 0);
        const start = currentPage * itemsPerPage;
        const pagePlayers = players.slice(start, start + itemsPerPage);
        const description = pagePlayers.map((p) => `**${p.id}** - ${p.name}\n*Steam: ${p.steamId}*`).join('\n\n') || 'No players online.';
        const embed = {
          ...UI.embed(`Player List (${players.length} online)`, description),
          footer: { text: `Page ${currentPage + 1}/${totalPages}` },
        };
        const row = UI.paginationButtons(currentPage, totalPages, 'players_list');
        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }

      if (customId.startsWith('players_data_select')) {
        const playerId = customId.split('_').pop();
        const players = await client.rcon.getPlayers();
        const player = players.find((p) => String(p.id) === playerId);
        if (player) {
          const embed = {
            ...UI.embed(`Player: ${player.name}`, `**ID:** ${player.id}\n**Steam ID:** ${player.steamId}`),
            color: 0x3498db,
          };
          const row = UI.actionRow(UI.button('Back', '🏠', 'players_menu'));
          await interaction.update({ embeds: [embed], components: [row] });
        } else {
          await interaction.update({ embeds: [UI.embed('Error', 'Player not found.', 0xff0000)], components: [] });
        }
        return;
      }

      if (customId.startsWith('players_kick_select')) {
        const playerId = customId.split('_').pop();
        const players = await client.rcon.getPlayers();
        const player = players.find((p) => String(p.id) === playerId);
        if (!player) {
          await interaction.update({ embeds: [UI.embed('Error', 'Player not found.', 0xff0000)], components: [] });
          return;
        }
        const modal = UI.confirmationModal('players_kick_confirm');
        modal.setCustomId(`players_kick_confirm_${playerId}`);
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('players_kick_confirm')) {
        const playerId = customId.split('_').pop();
        const value = interaction.fields.getTextInputValue('confirm');
        if (value !== 'CONFIRM') {
          await interaction.reply({ embeds: [UI.embed('Cancelled', 'Action cancelled.', 0xffa500)], ephemeral: true });
          return;
        }
        try {
          const players = await client.rcon.getPlayers();
          const player = players.find((p) => String(p.id) === playerId);
          const result = await client.rcon.kickPlayer(playerId);
          Logger.log('Kick Player', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: player?.name || playerId, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Player Kicked', `${player?.name || playerId} has been kicked.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId.startsWith('players_ban_select')) {
        const playerId = customId.split('_').pop();
        const players = await client.rcon.getPlayers();
        const player = players.find((p) => String(p.id) === playerId);
        if (!player) {
          await interaction.update({ embeds: [UI.embed('Error', 'Player not found.', 0xff0000)], components: [] });
          return;
        }
        const modal = UI.confirmationModal('players_ban_confirm');
        modal.setCustomId(`players_ban_confirm_${playerId}`);
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('players_ban_confirm')) {
        const playerId = customId.split('_').pop();
        const value = interaction.fields.getTextInputValue('confirm');
        if (value !== 'CONFIRM') {
          await interaction.reply({ embeds: [UI.embed('Cancelled', 'Action cancelled.', 0xffa500)], ephemeral: true });
          return;
        }
        try {
          const players = await client.rcon.getPlayers();
          const player = players.find((p) => String(p.id) === playerId);
          const result = await client.rcon.banPlayer(playerId);
          Logger.log('Ban Player', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: player?.name || playerId, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Player Banned', `${player?.name || playerId} has been banned.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId.startsWith('players_dm_select')) {
        const playerId = customId.split('_').pop();
        const players = await client.rcon.getPlayers();
        const player = players.find((p) => String(p.id) === playerId);
        if (!player) {
          await interaction.update({ embeds: [UI.embed('Error', 'Player not found.', 0xff0000)], components: [] });
          return;
        }
        const modal = UI.textModal('Message Player', 'players_dm_modal', [
          { id: 'message', label: 'Message', placeholder: 'Enter message...', required: true, style: TextInputStyle.Paragraph },
        ]);
        modal.setCustomId(`players_dm_modal_${playerId}`);
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('players_dm_modal_')) {
        const playerId = customId.split('_').pop();
        const message = interaction.fields.getTextInputValue('message');
        try {
          const result = await client.rcon.send(`MessagePlayer ${playerId} ${message}`);
          const players = await client.rcon.getPlayers();
          const player = players.find((p) => String(p.id) === playerId);
          Logger.log('DM Player', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: player?.name || playerId, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Message Sent', `Message sent to ${player?.name || playerId}.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'announce_send') {
        await menus.announcements.send(interaction);
        return;
      }

      if (customId === 'announce_schedule') {
        await menus.announcements.schedule(interaction);
        return;
      }

      if (customId === 'announce_auto') {
        await menus.announcements.auto(interaction);
        return;
      }

      if (customId.startsWith('announce_send_modal') || customId.startsWith('announce_schedule_modal')) {
        const message = interaction.fields.getTextInputValue('message');
        try {
          let result;
          if (customId.startsWith('announce_schedule_modal')) {
            const delay = interaction.fields.getTextInputValue('delay');
            setTimeout(async () => {
              result = await client.rcon.sendAnnouncement(message);
              Logger.log('Scheduled Announcement', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: 'All Players', serverResponse: result });
            }, parseInt(delay) * 1000);
            await interaction.reply({ embeds: [UI.embed('Announcement Scheduled', `Announcement will be sent in ${delay} seconds.`)], ephemeral: true });
          } else {
            result = await client.rcon.sendAnnouncement(message);
            Logger.log('Send Announcement', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: 'All Players', serverResponse: result });
            await interaction.reply({ embeds: [UI.embed('Announcement Sent', `Announcement sent.\n\`\`\`${result}\`\`\``)], ephemeral: true });
          }
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'world_toggle_ai') {
        await menus.world.toggleAI(interaction);
        return;
      }

      if (customId === 'world_ai_density') {
        await menus.world.aiDensity(interaction);
        return;
      }

      if (customId.startsWith('world_ai_density_modal')) {
        const density = interaction.fields.getTextInputValue('density');
        try {
          const result = await client.rcon.setAIDensity(density);
          Logger.log('AI Density', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: `AIDensity ${density}`, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('AI Density Set', `Density set to ${density}.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'world_toggle_humans') {
        await menus.world.toggleHumans(interaction);
        return;
      }

      if (customId.startsWith('world_growth_modal')) {
        const multiplier = interaction.fields.getTextInputValue('multiplier');
        try {
          const result = await client.rcon.setGrowthMultiplier(multiplier);
          Logger.log('Growth Multiplier', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: `GrowthMultiplier ${multiplier}`, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Growth Multiplier Set', `Multiplier set to ${multiplier}.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'world_wipe_corpses') {
        await menus.world.wipeCorpses(interaction);
        return;
      }

      if (customId === 'world_update_playables') {
        await menus.world.updatePlayables(interaction);
        return;
      }

      if (customId === 'server_save') {
        await menus.server.save(interaction);
        return;
      }

      if (customId === 'server_details') {
        await menus.server.details(interaction);
        return;
      }

      if (customId === 'server_queue') {
        await menus.server.queue(interaction);
        return;
      }

      if (customId.startsWith('server_restart_modal')) {
        const delay = interaction.fields.getTextInputValue('delay');
        try {
          const result = await client.rcon.restartServer(parseInt(delay));
          Logger.log('Restart Server', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: `RestartServer ${delay}`, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Restart Scheduled', `Server will restart in ${delay} seconds.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'server_pause') {
        await menus.server.pause(interaction);
        return;
      }

      if (customId === 'whitelist_enable') {
        await menus.whitelist.enable(interaction);
        return;
      }

      if (customId === 'whitelist_disable') {
        await menus.whitelist.disable(interaction);
        return;
      }

      if (customId.startsWith('whitelist_add_modal')) {
        const steamId = interaction.fields.getTextInputValue('steamId');
        try {
          const result = await client.rcon.addWhitelist(steamId);
          Logger.log('Add Whitelist', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: steamId, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Added to Whitelist', `${steamId} added.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId.startsWith('whitelist_remove_modal')) {
        const steamId = interaction.fields.getTextInputValue('steamId');
        try {
          const result = await client.rcon.removeWhitelist(steamId);
          Logger.log('Remove Whitelist', { discordUser: interaction.user.tag, discordId: interaction.user.id, target: steamId, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Removed from Whitelist', `${steamId} removed.\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId === 'whitelist_view') {
        await menus.whitelist.view(interaction);
        return;
      }

      if (customId === 'console_execute_modal') {
        const command = interaction.fields.getTextInputValue('command');
        try {
          const result = await client.rcon.genericCommand(command);
          Logger.log('Custom Console', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: command, serverResponse: result });
          await interaction.reply({ embeds: [UI.embed('Console Output', `\`\`\`${command}\`\`\`\n\`\`\`${result}\`\`\``)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId.startsWith('players_search_modal')) {
        const query = interaction.fields.getTextInputValue('query').toLowerCase();
        try {
          const players = await client.rcon.getPlayers();
          const matches = players.filter((p) => p.name.toLowerCase().includes(query) || p.steamId.includes(query));
          const description = matches.length === 0 ? 'No matches found.' : matches.map((p) => `**${p.id}** - ${p.name}\n*Steam: ${p.steamId}*`).join('\n\n');
          await interaction.reply({ embeds: [UI.embed(`Search Results (${matches.length})`, description)], ephemeral: true });
        } catch (error) {
          await interaction.reply({ embeds: [UI.embed('Error', error.message, 0xff0000)], ephemeral: true });
        }
        return;
      }

      if (customId.startsWith('announce_auto_add') || customId === 'announce_auto_add') {
        const modal = UI.textModal('Add Auto Announcement', 'announce_auto_add_modal', [
          { id: 'message', label: 'Message', placeholder: 'Message...', required: true, style: TextInputStyle.Paragraph },
          { id: 'interval', label: 'Interval (minutes)', placeholder: '30', required: true },
        ]);
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('announce_auto_add_modal')) {
        const message = interaction.fields.getTextInputValue('message');
        const interval = parseInt(interaction.fields.getTextInputValue('interval'));
        client.config.autoAnnouncements = client.config.autoAnnouncements || [];
        client.config.autoAnnouncements.push({ message, interval, enabled: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(client.config, null, 2));
        await interaction.reply({ embeds: [UI.embed('Auto Announcement Added', `Message will be sent every ${interval} minutes.`)], ephemeral: true });
        return;
      }

    } catch (error) {
      console.error('Interaction error:', error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [UI.embed('Error', 'An unexpected error occurred.', 0xff0000)], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [UI.embed('Error', 'An unexpected error occurred.', 0xff0000)], ephemeral: true });
        }
      } catch (e) {
        // ignore
      }
    }
  }
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const embed = UI.mainMenuEmbed();
  const row = UI.actionRow(
    UI.button('Players', '👥', 'players_menu'),
    UI.button('Announcements', '📢', 'announcements_menu'),
    UI.button('World Controls', '🌍', 'world_menu'),
    UI.button('Server Controls', '⚙️', 'server_menu'),
    UI.button('Whitelist', '📋', 'whitelist_menu')
  );
  const row2 = UI.actionRow(
    UI.button('Live Status', '📈', 'live_status'),
    UI.button('Custom Console', '💻', 'console_menu')
  );
  const channel = await client.channels.fetch(client.config.discord.guildId).catch(() => null);
  if (channel) {
    await channel.send({ embeds: [embed], components: [row, row2] });
  }
});

process.on('SIGINT', async () => {
  await client.rcon.disconnect();
  process.exit(0);
});

client.login(client.config.discord.token);
