const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UI = require('../ui');
const Security = require('../security');
const Logger = require('../logger');

module.exports = {
  data: {
    name: 'whitelist',
    type: 1,
  },
  async execute(interaction) {
    if (!(await Security.ensureAuthorized(interaction))) return;
    const embed = UI.embed('Whitelist Management', 'Manage whitelist settings:');
    embed.color = 0xf39c12;
    const row = UI.actionRow(
      UI.button('Enable Whitelist', '✅', 'whitelist_enable'),
      UI.button('Disable Whitelist', '❌', 'whitelist_disable'),
      UI.button('Add Steam ID', '➕', 'whitelist_add'),
      UI.button('Remove Steam ID', '➖', 'whitelist_remove'),
      UI.button('View List', '📋', 'whitelist_view')
    );
    await interaction.update({ embeds: [embed], components: [row] });
  },
};

module.exports.enable = async (interaction) => {
  try {
    const result = await interaction.client.rcon.toggleWhitelist(true);
    Logger.log('Enable Whitelist', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'EnableWhitelist', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Whitelist Enabled', `Whitelist enabled.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.disable = async (interaction) => {
  try {
    const result = await interaction.client.rcon.toggleWhitelist(false);
    Logger.log('Disable Whitelist', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'DisableWhitelist', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Whitelist Disabled', `Whitelist disabled.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.add = async (interaction) => {
  const modal = UI.textModal('Add to Whitelist', 'whitelist_add_modal', [
    { id: 'steamId', label: 'Steam ID', placeholder: '76561198000000000', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.remove = async (interaction) => {
  const modal = UI.textModal('Remove from Whitelist', 'whitelist_remove_modal', [
    { id: 'steamId', label: 'Steam ID', placeholder: '76561198000000000', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.view = async (interaction) => {
  try {
    const result = await interaction.client.rcon.send('ShowWhitelist');
    Logger.log('View Whitelist', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'ShowWhitelist', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Whitelist', `\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};
