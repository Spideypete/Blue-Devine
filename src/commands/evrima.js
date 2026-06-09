import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { hasPermission, getUserRole } from '../permissions/roles.js';
import rconManager from '../rcon/manager.js';
import { logger } from '../utils/logger.js';
import { canAfford, spendBalance, getBalance, getSetting } from '../economy/coins.js';

export const data = new SlashCommandBuilder()
  .setName('evrima')
  .setDescription('Evrima Server Control Panel')
  .addSubcommand((sub) => sub.setName('help').setDescription('Show available commands'))
  .addSubcommand((sub) => sub.setName('playerlist').setDescription('List all online players'))
  .addSubcommand((sub) => sub.setName('getplayerdata').setDescription('Get detailed player data').addStringOption((opt) => opt.setName('steamid').setDescription('Steam ID (optional)').setRequired(false)))
  .addSubcommand((sub) => sub.setName('kick').setDescription('Kick a player').addStringOption((opt) => opt.setName('player').setDescription('Steam ID or Name').setRequired(true)).addStringOption((opt) => opt.setName('reason').setDescription('Kick reason').setRequired(false)))
  .addSubcommand((sub) => sub.setName('ban').setDescription('Ban a player')
    .addStringOption((opt) => opt.setName('name').setDescription('Player name').setRequired(true))
    .addStringOption((opt) => opt.setName('steamid').setDescription('Steam ID').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Ban reason').setRequired(false))
    .addStringOption((opt) => opt.setName('duration').setDescription('Duration').setRequired(false)))
  .addSubcommand((sub) => sub.setName('unban').setDescription('Unban a player').addStringOption((opt) => opt.setName('steamid').setDescription('Steam ID to unban').setRequired(true)))
  .addSubcommand((sub) => sub.setName('slay').setDescription('Kill a player instantly').addStringOption((opt) => opt.setName('steamid').setDescription('Steam ID').setRequired(true)))
  .addSubcommand((sub) => sub.setName('announce').setDescription('Send announcement').addStringOption((opt) => opt.setName('message').setDescription('Announcement message').setRequired(true)))
  .addSubcommand((sub) => sub.setName('directmessage').setDescription('Send direct message to player').addStringOption((opt) => opt.setName('player').setDescription('Steam ID or Name').setRequired(true)).addStringOption((opt) => opt.setName('message').setDescription('Message content').setRequired(true)))
  .addSubcommand((sub) => sub.setName('save').setDescription('Save the server').addStringOption((opt) => opt.setName('backup').setDescription('Optional backup name').setRequired(false)))
  .addSubcommand((sub) => sub.setName('serverdetails').setDescription('Get server details'))
  .addSubcommand((sub) => sub.setName('queue').setDescription('Get queue status'))
  .addSubcommand((sub) => sub.setName('pause').setDescription('Toggle server pause'))
  .addSubcommand((sub) => sub.setName('toggleai').setDescription('Toggle AI on/off'))
  .addSubcommand((sub) => sub.setName('togglemigrations').setDescription('Toggle migrations'))
  .addSubcommand((sub) => sub.setName('togglegrowthmultiplier').setDescription('Toggle growth multiplier'))
  .addSubcommand((sub) => sub.setName('setgrowthmultiplier').setDescription('Set growth multiplier value').addNumberOption((opt) => opt.setName('value').setDescription('Multiplier value').setRequired(true)))
  .addSubcommand((sub) => sub.setName('wipecorpses').setDescription('Wipe all corpses'))
  .addSubcommand((sub) => sub.setName('togglewhitelist').setDescription('Toggle whitelist'))
  .addSubcommand((sub) => sub.setName('addwhitelist').setDescription('Add player to whitelist').addStringOption((opt) => opt.setName('playerid').setDescription('Steam ID').setRequired(true)))
  .addSubcommand((sub) => sub.setName('removewhitelist').setDescription('Remove player from whitelist').addStringOption((opt) => opt.setName('playerid').setDescription('Steam ID').setRequired(true)))
  .addSubcommand((sub) => sub.setName('playables').setDescription('Get playable dinosaurs list'))
  .addSubcommand((sub) => sub.setName('updateplayables').setDescription('Update playable dinosaurs').addStringOption((opt) => opt.setName('config').setDescription('Comma-separated dino classes').setRequired(true)))
  .addSubcommand((sub) => sub.setName('togglehumans').setDescription('Toggle humans on/off'))
  .addSubcommand((sub) => sub.setName('custom').setDescription('Send custom RCON command').addStringOption((opt) => opt.setName('command').setDescription('Full RCON command').setRequired(true)));

export const evrimaCommand = { data, execute };

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'help') {
    return showHelp(interaction);
  }

  const userRole = getUserRole(interaction.member);

  if (!hasPermission(userRole, subcommand)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Access Denied')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const { rateLimiter } = await import('../utils/rateLimiter.js');
  if (rateLimiter.isLimited(interaction.user.id)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏳ Rate Limited')
          .setDescription(`Please wait ${rateLimiter.getRemainingTime(interaction.user.id)}s before using another command.`)
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  if (subcommand !== 'help') {
    const canUse = await canAfford(interaction.user.id, subcommand);
    if (!canUse) {
      const balance = await getBalance(interaction.user.id);
      const cost = await (await import('../economy/coins.js')).getCommandCost(subcommand);
      const symbol = await getSetting('currency_symbol') || '🪙';
      const name = await getSetting('currency_name') || 'coins';
      
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`This command costs **${cost} ${symbol}**\nYour balance: **${balance} ${name}**\nUse \`/daily\` to earn ${symbol} or \`/balance\` to check your funds.`)
          .setColor(0xff0000)]
      });
    }
    
    const costResult = await spendBalance(interaction.user.id, (await (await import('../economy/coins.js')).getCommandCost(subcommand)) || 0, `/${subcommand}`);
    if (!costResult.success) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('❌ Transaction Failed').setDescription(costResult.message).setColor(0xff0000)]
      });
    }
  }

  try {
    switch (subcommand) {
      case 'playerlist':
        return handlePlayerList(interaction);
      case 'getplayerdata':
        return handleGetPlayerData(interaction);
      case 'kick':
        return handleKick(interaction);
      case 'ban':
        return handleBan(interaction);
      case 'unban':
        return handleUnban(interaction);
      case 'slay':
        return handleSlay(interaction);
      case 'announce':
        return handleAnnounce(interaction);
      case 'directmessage':
        return handleDirectMessage(interaction);
      case 'save':
        return handleSave(interaction);
      case 'serverdetails':
        return handleServerDetails(interaction);
      case 'queue':
        return handleQueue(interaction);
      case 'pause':
        return handlePause(interaction);
      case 'toggleai':
        return handleToggle(interaction, 'toggleai');
      case 'togglemigrations':
        return handleToggle(interaction, 'togglemigrations');
      case 'togglegrowthmultiplier':
        return handleToggle(interaction, 'togglegrowthmultiplier');
      case 'setgrowthmultiplier':
        return handleSetGrowthMultiplier(interaction);
      case 'wipecorpses':
        return handleWipeCorpses(interaction);
      case 'togglewhitelist':
        return handleToggleWhitelist(interaction);
      case 'addwhitelist':
        return handleWhitelist(interaction, 'addwhitelist');
      case 'removewhitelist':
        return handleWhitelist(interaction, 'removewhitelist');
      case 'playables':
        return handlePlayables(interaction, 'playables', null);
      case 'updateplayables':
        return handlePlayables(interaction, 'updateplayables', interaction.options.getString('config'));
      case 'togglehumans':
        return handleToggleHumans(interaction);
      case 'custom':
        return handleCustom(interaction);
      default:
        return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Unknown command').setColor(0xff0000)] });
    }
  } catch (error) {
    console.error(`[Command] ${subcommand} error:`, error);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Command Failed')
          .setDescription(error.message || 'An unexpected error occurred')
          .setColor(0xff0000),
      ],
    });
  }
}

function showHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🦖 Evrima RCON Bot - Help')
    .setDescription('All available slash commands:')
    .setColor(0x3498db)
    .addFields(
      { name: '👥 Player Management', value: '`/evrima playerlist` `/evrima getplayerdata` `/evrima kick` `/evrima ban` `/evrima unban` `/evrima slay`', inline: false },
      { name: '📢 Communication', value: '`/evrima announce` `/evrima directmessage`', inline: false },
      { name: '🖥️ Server', value: '`/evrima save` `/evrima serverdetails` `/evrima queue` `/evrima pause`', inline: false },
      { name: '🌍 World', value: '`/evrima toggleai` `/evrima togglemigrations` `/evrima togglegrowthmultiplier` `/evrima setgrowthmultiplier` `/evrima wipecorpses` `/evrima togglehumans`', inline: false },
      { name: '📋 Whitelist', value: '`/evrima togglewhitelist` `/evrima addwhitelist` `/evrima removewhitelist`', inline: false },
      { name: '🦕 Playables', value: '`/evrima playables` `/evrima updateplayables`', inline: false },
      { name: '💻 Custom', value: '`/evrima custom`', inline: false }
    )
    .setFooter({ text: 'Evrima RCON Bot' });

  return interaction.reply({ embeds: [embed] });
}

async function executeRCON(command, params = '') {
  return rconManager.execute(command, params);
}

async function handlePlayerList(interaction) {
  const players = await rconManager.getPlayers();
  const response = players.map((p) => `${p.id} - ${p.name} (${p.steamId || p.eosId || 'N/A'})`).join('\n') || 'No players online';
  await logger.log('playerlist', interaction.user, 'Server', `Found ${players.length} players`, true);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('👥 Online Players').setDescription(`Total: ${players.length}\n\`\`\`${response}\`\`\``).setColor(0x3498db)] });
}

async function handleGetPlayerData(interaction) {
  const steamId = interaction.options.getString('steamid') || '';
  const result = await executeRCON('getplayerdata', steamId);
  const response = JSON.stringify(result.data, null, 2);
  await logger.log('getplayerdata', interaction.user, steamId || 'All', response, true);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📋 Player Data').setDescription(`\`\`\`json\n${response.slice(0, 4000)}\`\`\``).setColor(0x3498db)] });
}

async function handleKick(interaction) {
  const player = interaction.options.getString('player');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Confirm KICK')
    .setDescription(`Are you sure you want to kick **${player}**?\nReason: ${reason}`)
    .setColor(0xffa500);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_kick_${encodeURIComponent(player)}_${encodeURIComponent(reason)}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cancel_kick`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleBan(interaction) {
  const name = interaction.options.getString('name');
  const steamId = interaction.options.getString('steamid');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const duration = interaction.options.getString('duration') || '0';

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Confirm BAN')
    .setDescription(`Are you sure you want to ban **${name}**?\nSteam ID: ${steamId}\nReason: ${reason}\nDuration: ${duration}`)
    .setColor(0xffa500);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_ban_${encodeURIComponent(name)}_${encodeURIComponent(steamId)}_${encodeURIComponent(reason)}_${encodeURIComponent(duration)}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cancel_ban`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleUnban(interaction) {
  const steamId = interaction.options.getString('steamid');
  const result = await executeRCON('unban', steamId);
  await logger.log('unban', interaction.user, steamId, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('✅ Unban').setDescription(`Unbanned ${steamId}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleSlay(interaction) {
  const steamId = interaction.options.getString('steamid');
  const result = await executeRCON('slay', steamId);
  await logger.log('slay', interaction.user, steamId, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('⚔️ Player Slain').setDescription(`Slayed ${steamId}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleAnnounce(interaction) {
  const message = interaction.options.getString('message');
  const result = await executeRCON('announce', message);
  await logger.log('announce', interaction.user, 'All Players', message, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📢 Announcement Sent').setDescription(`Message: ${message}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleDirectMessage(interaction) {
  const player = interaction.options.getString('player');
  const message = interaction.options.getString('message');
  const result = await executeRCON('directmessage', `${player},${message}`);
  await logger.log('directmessage', interaction.user, player, message, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('💬 Direct Message Sent').setDescription(`To: ${player}\nMessage: ${message}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleSave(interaction) {
  const backup = interaction.options.getString('backup') || '';
  const result = await executeRCON('save', backup);
  await logger.log('save', interaction.user, backup || 'Server', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('💾 Server Saved').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleServerDetails(interaction) {
  const details = await rconManager.getServerDetails();
  await logger.log('serverdetails', interaction.user, 'Server', details, true);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('ℹ️ Server Details').setDescription(`\`\`\`${details}\`\`\``).setColor(0x3498db)] });
}

async function handleQueue(interaction) {
  const result = await executeRCON('getqueuestatus');
  await logger.log('queue', interaction.user, 'Server', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📋 Queue Status').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0x3498db)] });
}

async function handlePause(interaction) {
  const result = await executeRCON('pause');
  await logger.log('pause', interaction.user, 'Server', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('⏸️ Server Pause Toggled').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0xffa500)] });
}

async function handleToggle(interaction, commandName) {
  const result = await executeRCON(commandName);
  await logger.log(commandName, interaction.user, commandName, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('✅ Toggled').setDescription(`${commandName}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleSetGrowthMultiplier(interaction) {
  const value = interaction.options.getNumber('value');
  const result = await executeRCON('setgrowthmultiplier', String(value));
  await logger.log('setgrowthmultiplier', interaction.user, `Multiplier: ${value}`, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🌱 Growth Multiplier Set').setDescription(`Value: ${value}x\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleWipeCorpses(interaction) {
  const result = await executeRCON('wipecorpses');
  await logger.log('wipecorpses', interaction.user, 'All Corpses', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🗑️ Corpses Wiped').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleToggleWhitelist(interaction) {
  const result = await executeRCON('togglewhitelist');
  await logger.log('togglewhitelist', interaction.user, 'Whitelist', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📋 Whitelist Toggled').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleWhitelist(interaction, action) {
  const playerId = interaction.options.getString('playerid');
  const command = action === 'addwhitelist' ? 'addwhitelist' : 'removewhitelist';
  const result = await executeRCON(command, playerId);
  await logger.log(action, interaction.user, playerId, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📋 Whitelist Updated').setDescription(`${action === 'addwhitelist' ? 'Added' : 'Removed'} ${playerId}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handlePlayables(interaction, action, config) {
  if (action === 'playables') {
    const playables = await rconManager.client.getPlayables();
    const response = JSON.stringify(playables, null, 2);
    await logger.log('playables', interaction.user, 'Server', response, true);
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🦕 Playable Dinosaurs').setDescription(`\`\`\`json\n${response.slice(0, 4000)}\`\`\``).setColor(0x3498db)] });
  } else {
    const result = await executeRCON('updateplayables', config);
    await logger.log('updateplayables', interaction.user, config, result.data, result.success);
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🦕 Playables Updated').setDescription(`Config: ${config}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
  }
}

async function handleToggleHumans(interaction) {
  const result = await executeRCON('togglehumans');
  await logger.log('togglehumans', interaction.user, 'Humans', result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🧑 Humans Toggled').setDescription(`\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleAIDensity(interaction, density) {
  const result = await executeRCON('aidensity', String(density));
  await logger.log('aidensity', interaction.user, `Density: ${density}`, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📊 AI Density Set').setDescription(`Density: ${density}\n\`\`\`${result.data}\`\`\``).setColor(0x00ff00)] });
}

async function handleCustom(interaction) {
  const command = interaction.options.getString('command');
  const result = await executeRCON('custom', command);
  await logger.log('custom', interaction.user, command, result.data, result.success);
  return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('💻 Custom Command').setDescription(`Command: \`${command}\`\nResponse: \`\`\`${result.data}\`\`\``).setColor(0x3498db)] });
}

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('confirm_')) {
    const parts = customId.split('_');
    const action = parts[1];
    
    try {
      let params;
      if (action === 'ban') {
        const name = decodeURIComponent(parts[2]);
        const steamId = decodeURIComponent(parts[3]);
        const reason = decodeURIComponent(parts[4]);
        const duration = decodeURIComponent(parts[5]);
        params = `${name},${steamId},${reason},${duration}`;
      } else {
        const player = decodeURIComponent(parts[2]);
        const reason = decodeURIComponent(parts[3]);
        params = `${player},${reason}`;
      }
      
      const result = await rconManager.execute(action, params);
      const target = action === 'ban' ? params.split(',')[0] : decodeURIComponent(parts[2]);
      await logger.log(action, interaction.user, target, result.data, result.success);

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(`✅ ${action.toUpperCase()} Successful`)
            .setDescription(`${target} has been ${action}ed.\n\`\`\`${result.data}\`\`\``)
            .setColor(0x00ff00),
        ],
        components: [],
      });
    } catch (error) {
      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Action Failed')
            .setDescription(error.message)
            .setColor(0xff0000),
        ],
        components: [],
      });
    }
  }

  if (customId.startsWith('cancel_')) {
    return interaction.update({
      embeds: [new EmbedBuilder().setTitle('🚫 Cancelled').setDescription('Action cancelled.').setColor(0xffa500)],
      components: [],
    });
  }
}
