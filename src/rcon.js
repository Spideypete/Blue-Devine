const { Rcon } = require('rcon-client');

class EvrimaRCON {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return true;
    try {
      this.client = new Rcon({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
      });
      await this.client.connect();
      this.connected = true;
      return true;
    } catch (error) {
      console.error('RCON connection failed:', error);
      throw new Error(`RCON connection failed: ${error.message}`);
    }
  }

  async send(command) {
    if (!this.connected) await this.connect();
    try {
      const response = await this.client.send(command);
      return response || 'Command executed successfully (no output).';
    } catch (error) {
      console.error(`RCON command failed (${command}):`, error);
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client && this.connected) {
      try {
        await this.client.end();
      } catch (e) {
        // ignore
      }
      this.connected = false;
      this.client = null;
    }
  }

  async getPlayers() {
    const response = await this.send('ShowPlayers');
    const players = [];
    const lines = response.split('\n').filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(.+?)\s+([\d.]+)\s+(.+)$/);
      if (match) {
        players.push({
          id: parseInt(match[1]),
          name: match[2].trim(),
          steamId: match[3].trim(),
          raw: match[4].trim(),
        });
      }
    }
    return players;
  }

  async getServerDetails() {
    const response = await this.send('ServerDetails');
    return response;
  }

  async kickPlayer(playerId) {
    return this.send(`KickPlayer ${playerId}`);
  }

  async banPlayer(playerId) {
    return this.send(`BanPlayer ${playerId}`);
  }

  async sendAnnouncement(message) {
    return this.send(`Announce ${message}`);
  }

  async saveServer() {
    return this.send('SaveServer');
  }

  async restartServer(delay = 10) {
    return this.send(`RestartServer ${delay}`);
  }

  async pauseServer() {
    return this.send('PauseServer');
  }

  async toggleAI(enabled) {
    return this.send(enabled ? 'EnableAI' : 'DisableAI');
  }

  async toggleHumans(enabled) {
    return this.send(enabled ? 'EnableHumans' : 'DisableHumans');
  }

  async setGrowthMultiplier(multiplier) {
    return this.send(`GrowthMultiplier ${multiplier}`);
  }

  async wipeCorpses() {
    return this.send('WipeCorpses');
  }

  async updatePlayables() {
    return this.send('UpdatePlayables');
  }

  async toggleWhitelist(enabled) {
    return this.send(enabled ? 'EnableWhitelist' : 'DisableWhitelist');
  }

  async addWhitelist(steamId) {
    return this.send(`AddWhitelist ${steamId}`);
  }

  async removeWhitelist(steamId) {
    return this.send(`RemoveWhitelist ${steamId}`);
  }

  async getQueueStatus() {
    return this.send('QueueStatus');
  }

  async setAIDensity(density) {
    return this.send(`AIDensity ${density}`);
  }

  async genericCommand(command) {
    return this.send(command);
  }
}

module.exports = EvrimaRCON;
