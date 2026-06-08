const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UI = require('../ui');
const Security = require('../security');
const Logger = require('../logger');

module.exports = {
  data: {
    name: 'announcements',
    type: 1,
  },
  async execute(interaction) {
    if (!(await Security.ensureAuthorized(interaction))) return;
    const embed = UI.embed('Announcements', 'Choose an action:');
    embed.color = 0xe74c3c;
    const row = UI.actionRow(
      UI.button('Send Announcement', '📢', 'announce_send'),
      UI.button('Schedule Announcement', '⏰', 'announce_schedule'),
      UI.button('Auto Announcements', '🤖', 'announce_auto')
    );
    await interaction.update({ embeds: [embed], components: [row] });
  },
};

module.exports.send = async (interaction) => {
  const modal = UI.textModal('Send Announcement', 'announce_send_modal', [
    { id: 'message', label: 'Announcement Message', placeholder: 'Enter message...', required: true, style: TextInputStyle.Paragraph },
  ]);
  await interaction.showModal(modal);
};

module.exports.schedule = async (interaction) => {
  const modal = UI.textModal('Schedule Announcement', 'announce_schedule_modal', [
    { id: 'message', label: 'Announcement Message', placeholder: 'Enter message...', required: true, style: TextInputStyle.Paragraph },
    { id: 'delay', label: 'Delay (seconds)', placeholder: '60', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.auto = async (interaction) => {
  const config = interaction.client.config;
  const autoAnnouncements = config.autoAnnouncements || [];
  const embed = UI.embed('Auto Announcements', autoAnnouncements.length === 0 ? 'No auto announcements configured.' : JSON.stringify(autoAnnouncements, null, 2), 0xe67e22);
  const row = UI.actionRow(
    UI.button('Add Auto Announcement', '➕', 'announce_auto_add'),
    UI.button('Remove Auto Announcement', '➖', 'announce_auto_remove'),
    UI.button('Back', '🏠', 'main_menu')
  );
  await interaction.update({ embeds: [embed], components: [row] });
};
