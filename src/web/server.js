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
    { name: 'announce', args: ['message'], desc: 'Broadcast message to all players' },
    { name: 'directmessage', args: ['player', 'message'], desc: 'Send private message (EOS ID, Steam ID, or Name)' },
    { name: 'toggleglobalchat', args: ['0/1'], desc: 'Disable/Enable global chat' },
  ]},
  { category: 'Moderation', commands: [
    { name: 'ban', args: ['player', 'reason'], desc: 'Ban a player' },
    { name: 'kick', args: ['player', 'reason'], desc: 'Kick a player' },
    { name: 'togglewhitelist', args: ['0/1'], desc: 'Disable/Enable whitelist' },
    { name: 'addwhitelist', args: ['playerId'], desc: 'Add player(s) to whitelist' },
    { name: 'removewhitelist', args: ['playerId'], desc: 'Remove player(s) from whitelist' },
  ]},
  { category: 'Info', commands: [
    { name: 'playerlist', args: [], desc: 'List all online players' },
    { name: 'getplayerdata', args: [], desc: 'Get detailed stats per player' },
    { name: 'serverdetails', args: [], desc: 'Get server configuration' },
    { name: 'getqueuestatus', args: [], desc: 'Get server queue status' },
    { name: 'getplayables', args: [], desc: 'Get list of available playable dinosaurs' },
  ]},
  { category: 'Server', commands: [
    { name: 'save', args: ['backupName?'], desc: 'Save game data' },
    { name: 'pause', args: [], desc: 'Pause the server' },
    { name: 'custom', args: ['command'], desc: 'Send custom command' },
    { name: 'togglenetupdatedistancechecks', args: ['0/1'], desc: 'Toggle network update distance checks' },
  ]},
  { category: 'World', commands: [
    { name: 'wipecorpses', args: [], desc: 'Remove all corpses' },
    { name: 'toggleai', args: ['0/1'], desc: 'Disable/Enable AI spawns' },
    { name: 'disableaiclasses', args: ['class[,class,...]'], desc: 'Update AI spawn list' },
    { name: 'aidensity', args: ['0.0-1.0'], desc: 'Set AI spawn density' },
    { name: 'toggleailearning', args: ['0/1'], desc: 'Toggle AI learning' },
    { name: 'togglemigrations', args: ['0/1'], desc: 'Toggle dinosaur migrations' },
  ]},
  { category: 'Admin', commands: [
    { name: 'updateplayables', args: ['class:enabled/disabled'], desc: 'Update playable dinosaur classes' },
    { name: 'togglegrowthmultiplier', args: ['0/1'], desc: 'Toggle growth multiplier' },
    { name: 'setgrowthmultiplier', args: ['value'], desc: 'Set growth multiplier value' },
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
    ws.send(JSON.stringify({ type: 'connected', data: `Connected to ${host}:${port}` }));
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', data: `Connection failed: ${err.message}` }));
  }
}

async function handleCommand(ws, data) {
  const { command, args } = data;
  const timestamp = new Date().toLocaleTimeString();

  ws.send(JSON.stringify({ type: 'output', data: `[${timestamp}] > ${command} ${args ? ',' + args : ''}` }));

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
