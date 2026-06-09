import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { 
  getBalance, createAccount, linkSteam, addBalance, spendBalance, 
  getCommandCost, setCommandCost, getSetting, setSetting,
  getAllAccounts, getTransactionHistory, canAfford, ensureDb
} from '../economy/coins.js';

export const coinCommands = {
  balance: {
    data: new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your coin balance'),
    execute: async (interaction) => {
      await interaction.deferReply({ flags: 64 });
      const balance = await getBalance(interaction.user.id);
      const account = await createAccount(interaction.user.id);
      const symbol = await getSetting('currency_symbol') || '🪙';
      const name = await getSetting('currency_name') || 'coins';
      
      const embed = new EmbedBuilder()
        .setTitle(`${symbol} Your Balance`)
        .setDescription(`**${account} ${name}**`)
        .setColor(0x3498db);
      
      await interaction.editReply({ embeds: [embed] });
    }
  },

  daily: {
    data: new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Claim your daily coins'),
    execute: async (interaction) => {
      await interaction.deferReply({ flags: 64 });
      await ensureDb();
      const account = await createAccount(interaction.user.id);
      const now = new Date().toISOString();
      const lastDaily = account.last_daily;
      const dailyAmount = parseInt(await getSetting('daily_reward') || '50');
      
      if (lastDaily) {
        const last = new Date(lastDaily);
        const hoursSince = (Date.now() - last.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const remaining = Math.ceil(24 - hoursSince);
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('⏳ Daily Already Claimed')
              .setDescription(`Come back in **${remaining} hours**`)
              .setColor(0xffa500)]
          });
        }
      }
      
      await addBalance(interaction.user.id, dailyAmount, 'daily', 'Daily reward');
      
      const newBalance = await getBalance(interaction.user.id);
      const symbol = await getSetting('currency_symbol') || '🪙';
      const name = await getSetting('currency_name') || 'coins';
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Daily Reward Claimed')
        .setDescription(`+${dailyAmount} ${symbol}\nNew balance: **${newBalance} ${name}**`)
        .setColor(0x2ecc71);
      
      await interaction.editReply({ embeds: [embed] });
    }
  },

  link: {
    data: new SlashCommandBuilder()
      .setName('link')
      .setDescription('Link your Steam ID to your Discord account')
      .addStringOption((opt) => opt.setName('steamid').setDescription('Your Steam ID64').setRequired(true)),
    execute: async (interaction) => {
      await interaction.deferReply({ flags: 64 });
      const steamId = interaction.options.getString('steamid');
      const result = await linkSteam(interaction.user.id, steamId);
      
      const embed = new EmbedBuilder()
        .setTitle(result.success ? '✅ Account Linked' : '⚠️ Link Failed')
        .setDescription(result.message)
        .setColor(result.success ? 0x2ecc71 : 0xffa500);
      
      await interaction.editReply({ embeds: [embed] });
    }
  },

  admin: {
    data: new SlashCommandBuilder()
      .setName('coins')
      .setDescription('Admin coin management')
      .addSubcommand((sub) => sub
        .setName('give')
        .setDescription('Give coins to a user')
        .addUserOption((opt) => opt.setName('user').setDescription('Discord user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)))
      .addSubcommand((sub) => sub
        .setName('take')
        .setDescription('Take coins from a user')
        .addUserOption((opt) => opt.setName('user').setDescription('Discord user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)))
      .addSubcommand((sub) => sub
        .setName('cost')
        .setDescription('Set command cost')
        .addStringOption((opt) => opt.setName('command').setDescription('Command name').setRequired(true))
        .addIntegerOption((opt) => opt.setName('cost').setDescription('Cost (0 = free)').setRequired(true)))
      .addSubcommand((sub) => sub
        .setName('costs')
        .setDescription('View all command costs'))
      .addSubcommand((sub) => sub
        .setName('settings')
        .setDescription('View coin settings'))
      .addSubcommand((sub) => sub
        .setName('history')
        .setDescription('View transaction history')
        .addUserOption((opt) => opt.setName('user').setDescription('User (optional)').setRequired(false)))
      .addSubcommand((sub) => sub
        .setName('leaderboard')
        .setDescription('View top coin holders')),
    execute: async (interaction) => {
      const subcommand = interaction.options.getSubcommand();
      
      const isOwner = interaction.user.id === process.env.OWNER_ID || 
                     interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID);
      
      if (!isOwner && subcommand !== 'costs' && subcommand !== 'settings' && subcommand !== 'leaderboard' && subcommand !== 'history') {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setDescription('Admin only').setColor(0xff0000)],
          flags: 64
        });
      }
      
      switch (subcommand) {
        case 'give':
          return handleGive(interaction);
        case 'take':
          return handleTake(interaction);
        case 'cost':
          return handleSetCost(interaction);
        case 'costs':
          return handleCosts(interaction);
        case 'settings':
          return handleSettings(interaction);
        case 'history':
          return handleHistory(interaction);
        case 'leaderboard':
          return handleLeaderboard(interaction);
      }
    }
  }
};

export async function handleCoinCommand(interaction) {
  const command = coinCommands[interaction.commandName];
  if (command) {
    await command.execute(interaction);
  }
}

async function handleGive(interaction) {
  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'Admin give';
  
  await addBalance(user.id, amount, 'admin_give', reason);
  
  const newBalance = await getBalance(user.id);
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  const embed = new EmbedBuilder()
    .setTitle('💰 Coins Given')
    .setDescription(`Gave **${amount} ${symbol}** to ${user.tag}\nNew balance: **${newBalance} ${name}**`)
    .setColor(0x2ecc71);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleTake(interaction) {
  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'Admin take';
  
  const result = await spendBalance(user.id, amount, reason);
  
  if (!result.success) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('❌ Failed').setDescription(result.message).setColor(0xff0000)],
      flags: 64
    });
  }
  
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  const embed = new EmbedBuilder()
    .setTitle('💸 Coins Taken')
    .setDescription(`Took **${amount} ${symbol}** from ${user.tag}\nNew balance: **${result.newBalance} ${name}**`)
    .setColor(0xe74c3c);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleSetCost(interaction) {
  const commandName = interaction.options.getString('command').toLowerCase();
  const cost = interaction.options.getInteger('cost');
  
  await setCommandCost(commandName, cost);
  
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Command Cost Updated')
    .setDescription(`\`/${commandName}\` now costs **${cost} ${symbol}**`)
    .setColor(0x3498db);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleCosts(interaction) {
  await ensureDb();
  const result = (await import('../economy/coins.js')).getDb().exec(
    'SELECT command_name, cost, enabled, description FROM command_costs ORDER BY command_name'
  );
  
  if (result.length === 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 Command Costs').setDescription('No costs configured').setColor(0x3498db)] });
  }
  
  const rows = result[0].values;
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  const fields = rows.map(([cmd, cost, enabled, desc]) => ({
    name: `/${cmd}`,
    value: enabled ? `**${cost} ${symbol}** — ${desc}` : '**FREE**',
    inline: true
  }));
  
  const embed = new EmbedBuilder()
    .setTitle(`📋 Command Costs (${name})`)
    .addFields(fields.slice(0, 25))
    .setColor(0x3498db);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction) {
  await ensureDb();
  const result = (await import('../economy/coins.js')).getDb().exec('SELECT key, value FROM settings');
  
  if (result.length === 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚙️ Settings').setDescription('No settings found').setColor(0x3498db)] });
  }
  
  const rows = result[0].values;
  const fields = rows.map(([key, value]) => ({
    name: key,
    value: `**${value}**`,
    inline: true
  }));
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Coin System Settings')
    .addFields(fields)
    .setColor(0x3498db);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction) {
  const user = interaction.options.getUser('user');
  const targetId = user ? user.id : interaction.user.id;
  
  await interaction.deferReply({ flags: 64 });
  const history = await getTransactionHistory(targetId, 10);
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  if (history.length === 0) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('📜 Transaction History').setDescription('No transactions found').setColor(0x3498db)]
    });
  }
  
  const lines = history.map(t => {
    const sign = t.amount > 0 ? '+' : '';
    const type = t.type === 'earn' ? '🟢' : t.type === 'spend' ? '🔴' : '⚪';
    return `${type} ${sign}${t.amount} ${symbol} — ${t.reason || t.type}`;
  });
  
  const embed = new EmbedBuilder()
    .setTitle('📜 Transaction History')
    .setDescription(lines.join('\n'))
    .setColor(0x3498db);
  
  await interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
  const accounts = await getAllAccounts();
  const symbol = await getSetting('currency_symbol') || '🪙';
  const name = await getSetting('currency_name') || 'coins';
  
  if (accounts.length === 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No accounts yet').setColor(0x3498db)] });
  }
  
  const top = accounts.slice(0, 10);
  const lines = top.map((acc, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} <@${acc.discord_id}> — **${acc.balance} ${symbol}**`;
  });
  
  const embed = new EmbedBuilder()
    .setTitle(`🏆 Top ${name} Holders`)
    .setDescription(lines.join('\n'))
    .setColor(0xf39c12);
  
  await interaction.reply({ embeds: [embed] });
}

