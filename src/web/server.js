import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rconClient from '../rcon/client.js';
import {
  getCommandCost, setCommandCost, getSetting, setSetting,
  getAllAccounts, getTransactionHistory
} from '../economy/coins.js';

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
    if (!host || !port) {
      throw new Error('Host and port are required');
    }
    rconClient.host = host;
    rconClient.port = parseInt(port);
    rconClient.password = password || '';
    rconClient.onData = (text) => {
      ws.send(JSON.stringify({ type: 'output', data: text }));
    };
    await rconClient.connect();
    ws.send(JSON.stringify({ type: 'connected', data: `${host}:${port}` }));
  } catch (err) {
    rconClient.onData = null;
    let userMessage = `Connection failed: ${err.message}`;
    if (err.code === 'ECONNREFUSED') {
      userMessage = `Connection refused — check that RCON is enabled on ${host}:${port} and the port is open.`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      userMessage = `Invalid host "${host}" — check the server IP or hostname.`;
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      userMessage = `Connection timed out — check the IP/port and firewall settings.`;
    } else if (err.message.includes('authentication')) {
      userMessage = `Authentication failed — check the RCON password.`;
    }
    ws.send(JSON.stringify({ type: 'error', data: userMessage }));
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

app.get('/api/economy/costs', async (req, res) => {
  try {
    const { getDb, ensureDb } = await import('../economy/coins.js');
    await ensureDb();
    const db = (await import('../economy/coins.js')).getDb();
    const result = db.exec('SELECT command_name, cost, enabled, description FROM command_costs ORDER BY command_name');
    const costs = {};
    if (result.length > 0) {
      for (const row of result[0].values) {
        const [cmd, cost, enabled, desc] = row;
        costs[cmd] = { cost, enabled: !!enabled, description: desc };
      }
    }
    res.json(costs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/economy/cost', async (req, res) => {
  try {
    const { command, cost } = req.body;
    const { setCommandCost } = await import('../economy/coins.js');
    await setCommandCost(command, cost);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/economy/cost/toggle', async (req, res) => {
  try {
    const { command } = req.body;
    const { getCommandCost, setCommandCost } = await import('../economy/coins.js');
    const current = await getCommandCost(command);
    await setCommandCost(command, current, !current);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/economy/settings', async (req, res) => {
  try {
    const { getDb, ensureDb } = await import('../economy/coins.js');
    await ensureDb();
    const db = (await import('../economy/coins.js')).getDb();
    const result = db.exec('SELECT key, value FROM settings');
    const settings = {};
    if (result.length > 0) {
      for (const row of result[0].values) {
        settings[row[0]] = row[1];
      }
    }
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/economy/settings', async (req, res) => {
  try {
    const { setSetting } = await import('../economy/coins.js');
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await setSetting(key, String(value));
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/economy/leaderboard', async (req, res) => {
  try {
    const { getAllAccounts } = await import('../economy/coins.js');
    const accounts = await getAllAccounts();
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/database/dinos', async (req, res) => {
  try {
    const { getAllDinoPrices, ensureInventoryDb } = await import('../economy/inventory.js');
    await ensureInventoryDb();
    const prices = await getAllDinoPrices();
    const { DINOS } = await import('../economy/dinos.js');
    
    const data = Object.entries(DINOS).map(([key, dino]) => ({
      key,
      name: dino.name,
      diet: dino.diet,
      hasPrime: dino.hasPrime,
      price: prices[key]?.price || 1,
      enabled: prices[key]?.enabled ?? true
    }));
    
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/database/dinos/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { price, enabled } = req.body;
    const { setDinoPrice } = await import('../economy/inventory.js');
    await setDinoPrice(key, parseInt(price));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/database/players', async (req, res) => {
  try {
    const { ensureDb } = await import('../economy/coins.js');
    await ensureDb();
    const db = (await import('../economy/coins.js')).getDb();
    
    const result = db.exec(`
      SELECT a.discord_id, a.steam_id, a.balance, a.last_daily,
             COUNT(i.id) as inventory_count
      FROM accounts a
      LEFT JOIN dino_inventory i ON a.discord_id = i.discord_id
      GROUP BY a.discord_id
      ORDER BY a.balance DESC
    `);
    
    const players = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        players.push({
          discord_id: row[0],
          steam_id: row[1],
          balance: row[2],
          last_daily: row[3],
          inventory_count: row[4]
        });
      }
    }
    
    res.json(players);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/database/inventory', async (req, res) => {
  try {
    const { ensureInventoryDb } = await import('../economy/inventory.js');
    await ensureInventoryDb();
    const db = (await import('../economy/inventory.js')).getDb();
    
    const result = db.exec(`
      SELECT i.*, d.name as dino_name, d.diet as dino_diet
      FROM dino_inventory i
      LEFT JOIN dino_prices d ON i.dino_key = d.dino_key
      ORDER BY i.purchased_at DESC
    `);
    
    const items = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        const obj = {};
        result[0].columns.forEach((col, i) => obj[col] = row[i]);
        items.push(obj);
      }
    }
    
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/database/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ensureInventoryDb } = await import('../economy/inventory.js');
    await ensureInventoryDb();
    const db = (await import('../economy/inventory.js')).getDb();
    db.run('DELETE FROM dino_inventory WHERE id = ?', [id]);
    (await import('../economy/inventory.js')).saveDatabase();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/database/mutations', async (req, res) => {
  try {
    const { MUTATION_INFO, DIET_MUTATIONS } = await import('../economy/dinos.js');
    const list = Object.entries(MUTATION_INFO).map(([key, info]) => ({
      key,
      name: info.name,
      diet: info.diet,
      desc: info.desc,
      value: info.value
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/database/mutations/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { price, enabled } = req.body;
    const { ensureInventoryDb } = await import('../economy/inventory.js');
    await ensureInventoryDb();
    const db = (await import('../economy/inventory.js')).getDb();
    db.run('INSERT OR REPLACE INTO mutation_prices (mutation_key, price, enabled) VALUES (?, ?, ?)',
      [key, parseInt(price), enabled ? 1 : 0]);
    (await import('../economy/inventory.js')).saveDatabase();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/database/mutation-prices', async (req, res) => {
  try {
    const { ensureInventoryDb } = await import('../economy/inventory.js');
    await ensureInventoryDb();
    const db = (await import('../economy/inventory.js')).getDb();
    const result = db.exec('SELECT mutation_key, price, enabled FROM mutation_prices ORDER BY mutation_key');
    const prices = {};
    if (result.length > 0) {
      for (const row of result[0].values) {
        prices[row[0]] = { price: row[1], enabled: !!row[2] };
      }
    }
    res.json(prices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`[Web] RCON Terminal running on http://0.0.0.0:${PORT}`);
});
