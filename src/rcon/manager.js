import rconClient from './client.js';

class RCONManager {
  constructor() {
    this.client = rconClient;
    this.connected = false;
  }

  async connect() {
    const result = await this.client.connect();
    this.connected = result;
    return result;
  }

  async execute(command, params = '') {
    return this.client.execute(command, params);
  }

  async getPlayers() {
    return this.client.getPlayers();
  }

  async getServerDetails() {
    return this.client.getServerDetails();
  }

  async sendCustomCommand(commandString) {
    return this.client.sendCustomCommand(commandString);
  }

  async disconnect() {
    await this.client.disconnect();
  }

  isConnected() {
    return this.client.connected;
  }
}

export const rconManager = new RCONManager();
export default rconManager;
