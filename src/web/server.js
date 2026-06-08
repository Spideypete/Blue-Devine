import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rconClient from '../rcon/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.WEB_PORT || 3000;

app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

const COMMANDS = [
  { category: 'Communication', commands: [
    { name: 'announce', args: ['message'], desc: 'Broadcast a message to all players' },
    { name: 'directmessage', args: ['player', 'message'], desc: 'Send a direct message to a player' },
    { name: 'toggleglobalchat', args: ['0/1'], desc: 'Disable/Enable global chat' },
  ]},
  { category: 'Info', commands: [
    { name: 'serverdetails', args: [], desc: 'Show current server configuration' },
    { name: 'playerlist', args: [], desc: 'List all connected players' },
    { name: 'getplayerdata', args: ['SteamID64?'], desc: 'Get player class, growth, health, location' },
    { name: 'getqueuestatus', args: [], desc: 'Show queue status when server is full' },
    { name: 'getplayables', args: [], desc: 'List currently playable species' },
  ]},
  { category: 'Moderation', commands: [
    { name: 'kick', args: ['player', 'reason'], desc: 'Kick a player' },
    { name: 'ban', args: ['player', 'SteamID64', 'reason', 'duration'], desc: 'Ban a player' },
    { name: 'slay', args: ['SteamID64'], desc: 'Instantly kill a player\'s dinosaur' },
    { name: 'togglewhitelist', args: [], desc: 'Enable/disable whitelist mode' },
    { name: 'addwhitelist', args: ['playerId'], desc: 'Add player(s) to whitelist' },
    { name: 'removewhitelist', args: ['playerId'], desc: 'Remove player(s) from whitelist' },
  ]},
  { category: 'Server', commands: [
    { name: 'save', args: ['backupName?'], desc: 'Force a save (optional named backup)' },
    { name: 'pause', args: [], desc: 'Pause/unpause the server' },
    { name: 'custom', args: ['command'], desc: 'Send custom command' },
    { name: 'togglenetupdatedistancechecks', args: ['0/1'], desc: 'Toggle network update distance checks' },
  ]},
  { category: 'World', commands: [
    { name: 'wipecorpses', args: [], desc: 'Remove all corpses from the map' },
    { name: 'toggleai', args: ['0/1'], desc: 'Disable/Enable AI spawns' },
    { name: 'disableaiclasses', args: ['Class1,Class2'], desc: 'Block specific AI species from spawning' },
    { name: 'aidensity', args: ['0.0-1.0'], desc: 'Set AI spawn density' },
    { name: 'toggleailearning', args: ['0/1'], desc: 'Toggle AI learning' },
    { name: 'togglemigrations', args: ['0/1'], desc: 'Toggle migration zones' },
  ]},
  { category: 'Admin', commands: [
    { name: 'updateplayables', args: ['Class:enabled/disabled'], desc: 'Update which species are playable' },
    { name: 'togglegrowthmultiplier', args: [], desc: 'Toggle growth on/off without restart' },
    { name: 'setgrowthmultiplier', args: ['value'], desc: 'Change growth speed live (e.g., 2.0)' },
    { name: 'togglehumans', args: ['0/1'], desc: 'Disable/Enable humans' },
  ]},
];

const COMMAND_MAP = {};
for (const cat of COMMANDS) {
  for (const cmd of cat.commands) {
    COMMAND_MAP[cmd.name] = { ...cmd, category: cat.category };
  }
}

wss.on('connection', (ws) => {
  console.log('[Web] Client connected');

  ws.send(JSON.stringify({ type: 'commands', data: COMMANDS }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'connect':
          await handleConnect(ws, msg.data);
          break;
        case 'command':
          await handleCommand(ws, msg.data);
          break;
        case 'disconnect':
          await handleDisconnect(ws);
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', data: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[Web] Client disconnected');
  });
});

async function handleConnect(ws, data) {
  const { host, port, password } = data;
  try {
    rconClient.host = host;
    rconClient.port = parseInt(port);
    rconClient.password = password;
    await rconClient.connect();
    ws.send(JSON.stringify({ type: 'connected', data: `${host}:${port}` }));
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', data: `Connection failed: ${err.message}` }));
  }
}

async function handleCommand(ws, data) {
  const { command, args } = data;
  const timestamp = new Date().toLocaleTimeString();

  const argsDisplay = args ? ` ${args}` : '';
  ws.send(JSON.stringify({ type: 'output', data: `[${timestamp}] > ${command}${argsDisplay}` }));

  try {
    let result;
    if (command === 'custom') {
      result = await rconClient.sendCustomCommand(args);
    } else {
      result = await rconClient.execute(command, args);
    }
    const response = typeof result === 'object' ? result.data : result;
    const respTimestamp = new Date().toLocaleTimeString();
    ws.send(JSON.stringify({ type: 'output', data: `[${respTimestamp}] < ${response}` }));
  } catch (err) {
    const errTimestamp = new Date().toLocaleTimeString();
    ws.send(JSON.stringify({ type: 'output', data: `[${errTimestamp}] ERROR: ${err.message}` }));
  }
}

async function handleDisconnect(ws) {
  await rconClient.disconnect();
  ws.send(JSON.stringify({ type: 'disconnected', data: 'Disconnected' }));
}

server.listen(PORT, () => {
  console.log(`[Web] RCON Terminal running on http://0.0.0.0:${PORT}`);
});
