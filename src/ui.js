const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

class UI {
  static embed(title, description, color = 0x3498db) {
    return {
      title: `🦖 ${title}`,
      description,
      color,
      footer: { text: 'Evrima Control Center' },
      timestamp: new Date().toISOString(),
    };
  }

  static mainMenuEmbed() {
    return {
      ...this.embed('Evrima Control Center', 'Select a category below to manage your server:'),
      color: 0x2ecc71,
    };
  }

  static button(label, emoji, customId, style = ButtonStyle.Primary) {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setEmoji(emoji)
      .setStyle(style);
  }

  static dangerButton(label, emoji, customId) {
    return this.button(label, emoji, customId, ButtonStyle.Danger);
  }

  static secondaryButton(label, emoji, customId) {
    return this.button(label, emoji, customId, ButtonStyle.Secondary);
  }

  static successButton(label, emoji, customId) {
    return this.button(label, emoji, customId, ButtonStyle.Success);
  }

  static paginationButtons(currentPage, totalPages, baseId) {
    const row = new ActionRowBuilder();
    if (currentPage > 0) {
      row.addComponents(this.secondaryButton('Previous', '◀️', `${baseId}_prev`));
    }
    row.addComponents(this.secondaryButton(`Page ${currentPage + 1}/${totalPages}`, '📄', `${baseId}_info`));
    if (currentPage < totalPages - 1) {
      row.addComponents(this.secondaryButton('Next', '▶️', `${baseId}_next`));
    }
    row.addComponents(this.secondaryButton('Back', '🏠', `${baseId}_back`));
    return row;
  }

  static playerSelectMenu(players, customId) {
    const options = players.slice(0, 25).map((p) => ({
      label: p.name.slice(0, 50),
      value: `player_${p.id}`,
      description: `Steam: ${p.steamId} | ID: ${p.id}`,
    }));
    return new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a player...')
      .addOptions(options);
  }

  static actionRow(...components) {
    const row = new ActionRowBuilder();
    for (const c of components) {
      if (Array.isArray(c)) {
        row.addComponents(...c);
      } else {
        row.addComponents(c);
      }
    }
    return row;
  }

  static textModal(title, customId, inputs) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(`🦖 ${title}`);
    const rows = [];
    for (const input of inputs) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(input.id)
            .setLabel(input.label)
            .setStyle(input.style || TextInputStyle.Short)
            .setPlaceholder(input.placeholder || '')
            .setRequired(input.required !== false)
            .setMaxLength(input.maxLength || 4000)
        )
      );
    }
    modal.addComponents(...rows);
    return modal;
  }

  static confirmationModal(customId) {
    return this.textModal('Confirm Action', customId, [
      { id: 'confirm', label: 'Type CONFIRM to proceed', placeholder: 'CONFIRM', required: true, maxLength: 10 },
    ]);
  }
}

module.exports = UI;
