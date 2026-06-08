const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UI = require('../ui');
const Security = require('../security');
const Logger = require('../logger');

module.exports = {
  data: {
    name: 'server',
    type: 1,
  },
  async execute(interaction) {
    if (!(await Security.ensureAuthorized(interaction))) return;
    const embed = UI.embed('Server Controls', 'Manage your server:');
    embed.color = 0x8e44ad;
    const row = UI.actionRow(
      UI.button('Save Server', '💾', 'server_save'),
      UI.button('Server Details', 'ℹ️', 'server_details'),
      UI.button('Queue Status', '📋', 'server_queue'),
      UI.button('Restart Server', '🔁', 'server_restart'),
      UI.button('Pause Server', '⏸️', 'server_pause')
    );
    await interaction.update({ embeds: [embed], components: [row] });
  },
};

module.exports.save = async (interaction) => {
  try {
    const result = await interaction.client.rcon.saveServer();
    Logger.log('Save Server', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'SaveServer', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Server Saved', `Server saved successfully.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.details = async (interaction) => {
  try {
    const result = await interaction.client.rcon.getServerDetails();
    Logger.log('Server Details', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'ServerDetails', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Server Details', `\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.queue = async (interaction) => {
  try {
    const result = await interaction.client.rcon.getQueueStatus();
    Logger.log('Queue Status', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'QueueStatus', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Queue Status', `\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.restart = async (interaction) => {
  const modal = UI.textModal('Restart Server', 'server_restart_modal', [
    { id: 'delay', label: 'Delay (seconds)', placeholder: '10', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.pause = async (interaction) => {
  try {
    const result = await interaction.client.rcon.pauseServer();
    Logger.log('Pause Server', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'PauseServer', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Server Paused', `Server paused.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};
