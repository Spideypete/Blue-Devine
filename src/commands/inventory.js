import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { DINOS, MUTATION_INFO } from '../economy/dinos.js';
import { getInventory, getDinoById } from '../economy/inventory.js';
import { getSetting, spendBalance, getBalance } from '../economy/coins.js';
import { ensureDb } from '../economy/coins.js';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('View your purchased dinosaurs');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });
  
  const inventory = await getInventory(interaction.user.id);
  const symbol = await getSetting('currency_symbol') || '🪙';
  
  if (inventory.length === 0) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('📦 Inventory')
        .setDescription('You haven\'t purchased any dinosaurs yet.\nUse `/buy` to purchase one!')
        .setColor(0x3498db)]
    });
  }
  
  const msg = await showInventoryPage(interaction, inventory, 0, symbol);
  
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 180000,
    filter: i => i.user.id === interaction.user.id
  });
  
  let page = 0;
  const perPage = 5;
  const totalPages = Math.ceil(inventory.length / perPage);
  
  collector.on('collect', async i => {
    if (i.customId === 'inv_prev') page = Math.max(0, page - 1);
    else if (i.customId === 'inv_next') page = Math.min(totalPages - 1, page + 1);
    else if (i.customId.startsWith('grow_')) {
      const itemId = parseInt(i.customId.replace('grow_', ''));
      await handleGrow(i, itemId, interaction.user.id);
      collector.stop();
      return;
    }
    else return;
    
    const start = page * perPage;
    const pageItems = inventory.slice(start, start + perPage);
    await showInventoryPage(i, pageItems, page, symbol, totalPages);
  });
}

async function showInventoryPage(interaction, items, page, symbol, totalPages) {
  totalPages = totalPages || Math.ceil(items.length / 5);
  
  const fields = items.map(item => {
    const dino = DINOS[item.dino_key];
    if (!dino) return null;
    const muts = [item.mutation_slot_1, item.mutation_slot_2, item.mutation_slot_3, item.mutation_slot_4]
      .filter(Boolean).map(m => MUTATION_INFO[m]?.name || m).join(', ') || 'None';
    const growCost = Math.ceil((100 - item.growth) * 0.5);
    return {
      name: `${item.is_prime ? '⭐ ' : ''}${dino.name} (ID: ${item.id})`,
      value: `**${item.gender}** | **${item.growth}%** growth${item.is_prime ? ' | **Prime**' : ''}\n🧬 ${muts}\n💰 Grow cost: ${growCost} ${symbol}\n🕐 ${item.purchased_at?.split('T')[0] || 'Unknown'}`,
      inline: false
    };
  }).filter(Boolean);
  
  const embed = new EmbedBuilder()
    .setTitle('📦 Your Inventory')
    .addFields(fields.slice(0, 5))
    .setFooter({ text: `Page ${page + 1}/${totalPages}` })
    .setColor(0x3498db);
  
  const rows = [];
  
  if (totalPages > 1) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inv_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('inv_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
    ));
  }
  
  if (items.length > 0) {
    const growButtons = items.map(item => {
      const growCost = Math.ceil((100 - item.growth) * 0.5);
      return new ButtonBuilder()
        .setCustomId(`grow_${item.id}`)
        .setLabel(`🌱 Grow ${item.id}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(item.growth >= 100);
    });
    rows.push(new ActionRowBuilder().addComponents(...growButtons));
  }
  
  return interaction.editReply({ embeds: [embed], components: rows }) || interaction.update({ embeds: [embed], components: rows });
}

async function handleGrow(interaction, itemId, userId) {
  await interaction.deferReply({ flags: 64 });
  
  const item = await getDinoById(itemId);
  if (!item) {
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Item not found').setColor(0xff0000)] });
  }
  
  if (item.discord_id !== userId) {
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('This is not your dino').setColor(0xff0000)] });
  }
  
  if (item.growth >= 100) {
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('⚠️ Max Growth').setDescription('This dino is already 100% growth').setColor(0xffa500)] });
  }
  
  const dino = DINOS[item.dino_key];
  const growCost = Math.ceil((100 - item.growth) * 0.5);
  const symbol = await getSetting('currency_symbol') || '🪙';
  
  const balance = await getBalance(userId);
  if (balance < growCost) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Insufficient Funds')
        .setDescription(`Growing costs **${growCost} ${symbol}**\nYour balance: **${balance} ${symbol}**`)
        .setColor(0xff0000)]
    });
  }
  
  const result = await spendBalance(userId, growCost, `grow ${dino.name} (ID: ${itemId})`);
  if (!result.success) {
    return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.message).setColor(0xff0000)] });
  }
  
  const steamId = await getSteamId(userId);
  if (!steamId) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Not Linked')
        .setDescription('Link your Steam ID first using `/link <steamid64>`')
        .setColor(0xff0000)]
    });
  }
  
  const newGrowth = 100;
  
  try {
    const rconResult = await rconManager.execute('custom', `growth ${steamId} ${newGrowth}`);
    
    const embed = new EmbedBuilder()
      .setTitle('🌱 Growth Started')
      .setDescription(`Your **${dino.name}** will grow to **100%** over **60 seconds**.\n\nStand still in-game as this species!`)
      .addFields(
        { name: '💰 Cost', value: `${growCost} ${symbol}`, inline: true },
        { name: '💳 New Balance', value: `${result.newBalance} ${symbol}`, inline: true },
        { name: '⏱️ Timer', value: '60 seconds', inline: true }
      )
      .setColor(0x2ecc71);
    
    await interaction.editReply({ embeds: [embed] });
    
    setTimeout(async () => {
      try {
        const checkResult = await rconManager.execute('custom', `getplayerdata ${steamId}`);
        const data = parsePlayerData(checkResult.data);
        if (data && data.currentGrowth && data.currentGrowth >= 95) {
          await interaction.followUp({
            embeds: [new EmbedBuilder()
              .setTitle('✅ Growth Complete!')
              .setDescription(`Your **${dino.name}** is now **100% growth**!`)
              .setColor(0x2ecc71)],
            flags: 64
          });
        }
      } catch (e) {
        await interaction.followUp({
          embeds: [new EmbedBuilder()
            .setTitle('⚠️ Growth Check')
            .setDescription('Could not verify growth. Check in-game.')
            .setColor(0xffa500)],
          flags: 64
        });
      }
    }, 65000);
    
  } catch (err) {
    await spendBalance(userId, growCost, `grow refund ${dino.name}`);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('❌ RCON Failed').setDescription(`Growth command failed: ${err.message}`).setColor(0xff0000)]
    });
  }
}

async function getSteamId(discordId) {
  await ensureDb();
  const db = (await import('../economy/coins.js')).getDb();
  const result = db.exec('SELECT steam_id FROM accounts WHERE discord_id = ?', [discordId]);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

function parsePlayerData(raw) {
  if (!raw) return null;
  const growthMatch = raw.match(/Growth[:\s]+(\d+)/i);
  if (growthMatch) {
    return { currentGrowth: parseInt(growthMatch[1]) };
  }
  return null;
}

