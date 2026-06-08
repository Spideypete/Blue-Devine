import { EmbedBuilder } from 'discord.js';

class Logger {
  constructor() {
    this.logChannelId = process.env.LOG_CHANNEL_ID || null;
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  formatResponse(response) {
    if (!response) return 'No response';
    if (typeof response === 'string') return response;
    if (typeof response === 'object') {
      try {
        return JSON.stringify(response, null, 2);
      } catch {
        return String(response);
      }
    }
    return String(response);
  }

  async log(command, user, target = 'N/A', response = null, success = true) {
    const timestamp = new Date().toISOString();
    const formattedResponse = this.formatResponse(response);

    console.log(`[LOG] ${timestamp} | ${user.tag} | ${command} | Target: ${target} | Success: ${success}`);

    if (this.logChannelId && this.client && formattedResponse !== 'No response') {
      try {
        const channel = await this.client.channels.fetch(this.logChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('🔒 Audit Log')
            .setColor(success ? 0x00ff00 : 0xff0000)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
              { name: 'Command', value: command, inline: true },
              { name: 'Target', value: String(target).slice(0, 500), inline: false },
              { name: 'Timestamp', value: timestamp, inline: true },
              { name: 'Success', value: success ? 'Yes' : 'No', inline: true }
            )
            .setFooter({ text: 'Evrima RCON Bot' })
            .setTimestamp();

          const responsePreview = String(formattedResponse).slice(0, 1000);
          if (responsePreview) {
            embed.addFields({ name: 'Response', value: responsePreview, inline: false });
          }

          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('[Logger] Failed to send log to Discord:', error.message);
      }
    }

    return { timestamp, user: user.tag, userId: user.id, command, target, response: formattedResponse, success };
  }
}

export const logger = new Logger();
