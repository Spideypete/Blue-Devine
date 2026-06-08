const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

class Logger {
  static log(action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      discordUser: details.discordUser || 'Unknown',
      discordId: details.discordId || 'Unknown',
      action,
      target: details.target || 'N/A',
      serverResponse: details.serverResponse || 'N/A',
      success: details.success !== false,
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_FILE, line);
    return entry;
  }

  static async sendAuditEmbed(client, config, entry) {
    const channelId = config.discord?.auditChannelId;
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      const embed = {
        title: '🔒 Audit Log',
        color: entry.success ? 0x00ff00 : 0xff0000,
        fields: [
          { name: 'User', value: entry.discordUser, inline: true },
          { name: 'Action', value: entry.action, inline: true },
          { name: 'Target', value: String(entry.target).slice(0, 500), inline: false },
          { name: 'Timestamp', value: entry.timestamp, inline: true },
          { name: 'Success', value: entry.success ? 'Yes' : 'No', inline: true },
        ],
        footer: { text: 'Evrima Control Center' },
        timestamp: entry.timestamp,
      };
      if (entry.serverResponse && entry.serverResponse !== 'N/A') {
        embed.fields.push({ name: 'Response', value: String(entry.serverResponse).slice(0, 1000), inline: false });
      }
      await channel.send({ embeds: [embed] });
    } catch (e) {
      console.error('Failed to send audit embed:', e);
    }
  }
}

module.exports = Logger;
