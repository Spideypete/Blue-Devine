const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UI = require('../ui');
const Security = require('../security');
const Logger = require('../logger');

module.exports = {
  data: {
    name: 'players',
    type: 1,
  },
  async execute(interaction) {
    if (!(await Security.ensureAuthorized(interaction))) return;
    const embed = UI.embed('Players Menu', 'Choose an action:');
    embed.color = 0x3498db;
    const row = UI.actionRow(
      UI.button('Player List', '👥', 'players_list'),
      UI.button('Player Search', '🔍', 'players_search'),
      UI.button('Get Player Data', '📋', 'players_data'),
      UI.button('Kick Player', '👢', 'players_kick'),
      UI.button('Ban Player', '🔨', 'players_ban'),
      UI.button('Direct Message', '💬', 'players_dm')
    );
    await interaction.update({ embeds: [embed], components: [row] });
  },
};

module.exports.list = async (interaction) => {
  try {
    const players = await interaction.client.rcon.getPlayers();
    const itemsPerPage = 10;
    const totalPages = Math.ceil(players.length / itemsPerPage) || 1;
    const page = interaction.values?.[0] || '0';
    const currentPage = parseInt(page) || 0;
    const start = currentPage * itemsPerPage;
    const pagePlayers = players.slice(start, start + itemsPerPage);
    const description = pagePlayers
      .map((p) => `**${p.id}** - ${p.name}\n*Steam: ${p.steamId}*`)
      .join('\n\n') || 'No players online.';
    const embed = {
      ...UI.embed(`Player List (${players.length} online)`, description),
      footer: { text: `Page ${currentPage + 1}/${totalPages}` },
    };
    const row = UI.paginationButtons(currentPage, totalPages, 'players_list');
    await interaction.update({ embeds: [embed], components: [row] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.search = async (interaction) => {
  const modal = UI.textModal('Search Player', 'players_search_modal', [
    { id: 'query', label: 'Player name or Steam ID', placeholder: 'Enter search term...', required: true },
  ]);
  await interaction.showModal(modal);
};

module.exports.data = async (interaction) => {
  try {
    const players = await interaction.client.rcon.getPlayers();
    if (players.length === 0) {
      await interaction.update({ embeds: [UI.embed('No Players', 'No players online.', 0xff0000)], components: [] });
      return;
    }
    const selectRow = UI.actionRow(UI.playerSelectMenu(players, 'players_data_select'));
    const embed = UI.embed('Select a Player', 'Choose a player to view detailed data:');
    await interaction.update({ embeds: [embed], components: [selectRow] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.kick = async (interaction) => {
  try {
    const players = await interaction.client.rcon.getPlayers();
    if (players.length === 0) {
      await interaction.update({ embeds: [UI.embed('No Players', 'No players online.', 0xff0000)], components: [] });
      return;
    }
    const selectRow = UI.actionRow(UI.playerSelectMenu(players, 'players_kick_select'));
    const embed = UI.embed('Kick Player', 'Select a player to kick:');
    await interaction.update({ embeds: [embed], components: [selectRow] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.ban = async (interaction) => {
  try {
    const players = await interaction.client.rcon.getPlayers();
    if (players.length === 0) {
      await interaction.update({ embeds: [UI.embed('No Players', 'No players online.', 0xff0000)], components: [] });
      return;
    }
    const selectRow = UI.actionRow(UI.playerSelectMenu(players, 'players_ban_select'));
    const embed = UI.embed('Ban Player', 'Select a player to ban:');
    await interaction.update({ embeds: [embed], components: [selectRow] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};

module.exports.dm = async (interaction) => {
  try {
    const players = await interaction.client.rcon.getPlayers();
    if (players.length === 0) {
      await interaction.update({ embeds: [UI.embed('No Players', 'No players online.', 0xff0000)], components: [] });
      return;
    }
    const selectRow = UI.actionRow(UI.playerSelectMenu(players, 'players_dm_select'));
    const embed = UI.embed('Direct Message Player', 'Select a player to message:');
    await interaction.update({ embeds: [embed], components: [selectRow] });
  } catch (error) {
    await interaction.update({ embeds: [UI.embed('Error', error.message, 0xff0000)], components: [] });
  }
};
