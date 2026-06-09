import net from 'net';

const COMMAND_OPCODES = {
  announce: 0x10,
  directmessage: 0x11,
  serverdetails: 0x12,
  wipecorpses: 0x13,
  getplayables: 0x14,
  updateplayables: 0x15,
  togglemigrations: 0x19,
  ban: 0x20,
  togglegrowthmultiplier: 0x21,
  setgrowthmultiplier: 0x22,
  togglenetupdatedistancechecks: 0x23,
  kick: 0x30,
  playerlist: 0x40,
  save: 0x50,
  pause: 0x60,
  getplayerdata: 0x77,
  custom: 0x70,
  togglewhitelist: 0x81,
  addwhitelist: 0x82,
  removewhitelist: 0x83,
  toggleglobalchat: 0x84,
  togglehumans: 0x86,
  toggleai: 0x90,
  disableaiclasses: 0x91,
  aidensity: 0x92,
  getqueuestatus: 0x93,
  toggleailearning: 0x94,
};

class EvrimaRCONClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.host = process.env.RCON_HOST || '127.0.0.1';
    this.port = parseInt(process.env.RCON_PORT) || 8888;
    this.password = process.env.RCON_PASSWORD || '';
    this.timeout = parseInt(process.env.RCON_TIMEOUT) || 10000;
    this.commandQueue = [];
    this.processing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.onData = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket) {
        return resolve(true);
      }

      const socket = new net.Socket();
      this.socket = socket;
      socket.setTimeout(this.timeout);

      let resolved = false;
      const cleanup = (err) => {
        if (!resolved) {
          resolved = true;
          socket.removeListener('connect', onConnect);
          socket.removeListener('error', onError);
          socket.removeListener('close', onClose);
          socket.removeListener('timeout', onTimeout);
          socket.removeListener('data', onData);
          if (err) reject(err);
        }
      };

      const onConnect = async () => {
        try {
          await this._authenticate();
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log(`[RCON] Connected to ${this.host}:${this.port}`);
          cleanup();
          this._startKeepAlive();
          this._processQueue();
          resolve(true);
        } catch (error) {
          socket.destroy();
          this.connected = false;
          this.socket = null;
          cleanup(error);
        }
      };

      const onError = (error) => {
        console.error('[RCON] Socket error:', error.message);
        this.connected = false;
        this.socket = null;
        cleanup(error);
      };

      const onClose = () => {
        this.connected = false;
        this.socket = null;
        this._stopKeepAlive();
        console.log('[RCON] Connection closed');
        cleanup(new Error('Connection closed'));
      };

      const onTimeout = () => {
        console.log('[RCON] Connection timeout');
        socket.destroy();
        cleanup(new Error('Connection timeout'));
      };

      const onData = (chunk) => {
        const text = chunk.toString('utf8').replace(/\0+$/, '');
        if (text && this.onData) {
          this.onData(text);
        }
      };

      socket.on('connect', onConnect);
      socket.on('error', onError);
      socket.on('close', onClose);
      socket.on('timeout', onTimeout);
      socket.on('data', onData);
      socket.connect(this.port, this.host);
    });
  }

  async _authenticate() {
    const authPacket = Buffer.from([0x01, ...Buffer.from(this.password, 'utf8'), 0x00]);
    const response = await this._sendRaw(authPacket);
    
    if (response && response.includes('Password Accepted')) {
      return;
    }
    throw new Error('Incorrect RCON password');
  }

  _sendRaw(data) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Not connected to RCON'));
      }

      let responseBuffer = Buffer.alloc(0);
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.socket.removeListener('data', onData);
          this.socket.removeListener('end', onEnd);
          this.socket.removeListener('error', onError);
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('RCON response timeout'));
      }, this.timeout);

      const onData = (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);

        const nullIndex = responseBuffer.indexOf(0x00);
        if (nullIndex !== -1) {
          cleanup();
          let response = responseBuffer.slice(0, nullIndex).toString('utf8');
          if (response.startsWith('\x03')) {
            response = response.slice(1);
          }
          resolve(response);
        }
      };

      const onEnd = () => {
        cleanup();
        let response = '';
        if (responseBuffer.length > 0) {
          if (responseBuffer[0] === 0x03) {
            response = responseBuffer.slice(1).toString('utf8').replace(/\0+$/, '');
          } else {
            response = responseBuffer.toString('utf8').replace(/\0+$/, '');
          }
        }
        resolve(response);
      };

      const onError = (error) => {
        cleanup();
        reject(error);
      };

      this.socket.on('data', onData);
      this.socket.on('end', onEnd);
      this.socket.on('error', onError);
      this.socket.write(data);
    });
  }

  async execute(command, params = '') {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          if (!this.connected) {
            await this.connect();
          }

          const opcode = COMMAND_OPCODES[command.toLowerCase()];
          let packet;

          if (opcode !== undefined) {
            packet = Buffer.from([0x02, opcode, ...Buffer.from(params, 'utf8'), 0x00]);
          } else {
            packet = Buffer.from([0x02, ...Buffer.from(`${command} ${params}`.trim(), 'utf8'), 0x00]);
          }

          const response = await this._sendRaw(packet);
          
          if (response === undefined || response === null) {
            resolve({ success: true, data: '(command sent — no response body)' });
          } else {
            resolve({ success: true, data: response });
          }
        } catch (error) {
          this.connected = false;
          this.socket = null;
          reject(error);
        }
      };

      task();
    });
  }

  async getPlayers() {
    const result = await this.execute('playerlist');
    const players = [];
    const lines = result.data.split('\n').filter((line) => line.trim());
    
    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(.+?)\s+([\d.]+|[\w-]+)\s*(.*)?$/);
      if (match) {
        players.push({
          id: parseInt(match[1]),
          name: match[2].trim(),
          steamId: match[3].trim(),
          eosId: match[4] ? match[4].trim() : null,
        });
      }
    }
    
    return players;
  }

  async getServerDetails() {
    const result = await this.execute('serverdetails');
    return result.data;
  }

  async getPlayerData() {
    const result = await this.execute('getplayerdata');
    return result.data;
  }

  async getPlayables() {
    const result = await this.execute('getplayables');
    return result.data;
  }

  async getQueueStatus() {
    const result = await this.execute('getqueuestatus');
    return result.data;
  }

  async sendCustomCommand(commandString) {
    const result = await this.execute('custom', commandString);
    return result.data;
  }

  _keepAliveTimer = null;

  _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAliveTimer = setInterval(async () => {
      if (!this.connected) return;
      try {
        await this.execute('serverdetails');
      } catch (e) {
        console.log('[RCON] Keep-alive failed, connection may be dead');
      }
    }, 30000);
  }

  _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  _processQueue() {
    if (this.processing || this.commandQueue.length === 0) return;
    this.processing = true;

    const processNext = async () => {
      while (this.commandQueue.length > 0 && this.connected) {
        const task = this.commandQueue.shift();
        try {
          await task();
        } catch (error) {
          console.error('[RCON] Queue task failed:', error.message);
        }
      }
      this.processing = false;
    };

    processNext();
  }

  async disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.commandQueue = [];
    this._stopKeepAlive();
  }
}

export const rconClient = new EvrimaRCONClient();
export default rconClient;
