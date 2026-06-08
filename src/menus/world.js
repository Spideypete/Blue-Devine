const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UI = require('../ui');
const Security = require('../security');
const Logger = require('../logger');

module.exports = {
  data: {
    name: 'world',
    type: 1,
  },
  async execute(interaction) {
    if (!(await Security.ensureAuthorized(interaction))) return;
    const embed = UI.embed('World Controls', 'Manage world settings:');
    embed.color = 0x27ae60;
    const row = UI.actionRow(
      UI.button('Toggle AI', '🤖', 'world_toggle_ai'),
      UI.button('AI Density', '📊', 'world_ai_density'),
      UI.button('Toggle Humans', '🧑‍🤝‍🧑', 'world_toggle_humans'),
      UI.button('Growth Multiplier', '🌱', 'world_growth'),
      UI.button('Wipe Corpses', '🗑️', 'world_wipe_corpses'),
      UI.button('Update Playables', '🔄', 'world_update_playables')
    );
    await interaction.update({ embeds: [embed], components: [row] });
  },
};

module.exports.toggleAI = async (interaction) => {
  try {
    const result = await interaction.client.rcon.toggleAI(true);
    Logger.log('Toggle AI', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'EnableAI', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('AI Toggled', `AI enabled.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.aiDensity = async (interaction) => {
  const modal = UI.textModal('AI Density', 'world_ai_density_modal', [
    { id: 'density', label: 'Density value', placeholder: '1.0', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.toggleHumans = async (interaction) => {
  try {
    const result = await interaction.client.rcon.toggleHumans(true);
    Logger.log('Toggle Humans', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'EnableHumans', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Humans Toggled', `Humans enabled.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.growth = async (interaction) => {
  const modal = UI.textModal('Growth Multiplier', 'world_growth_modal', [
    { id: 'multiplier', label: 'Multiplier', placeholder: '1.0', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.wipeCorpses = async (interaction) => {
  try {
    const result = await interaction.client.rcon.wipeCorpses();
    Logger.log('Wipe Corpses', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'WipeCorpses', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Corpses Wiped', `All corpses have been removed.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.updatePlayables = async (interaction) => {
  try {
    const result = await interaction.client.rcon.updatePlayables();
    Logger.log('Update Playables', { discordUser: interaction.user.tag, discordId: interaction.user.id, action: 'UpdatePlayables', serverResponse: result });
    await interaction.update({ embeds: [UI.embed('Playables Updated', `Playables updated.\n\`\`\`${result}\`\`\``)], components: [] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};
