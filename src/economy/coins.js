import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/coins.db');

let db = null;
let sqlJs = null;

async function initDatabase() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqlJs = await initSqlJs();
  const exists = fs.existsSync(DB_PATH);

  if (exists) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new sqlJs.Database(buffer);
  } else {
    db = new sqlJs.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      discord_id TEXT PRIMARY KEY,
      steam_id TEXT,
      balance INTEGER DEFAULT 0,
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_daily TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      reason TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS command_costs (
      command_name TEXT PRIMARY KEY,
      cost INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  seedDefaultCosts();
  seedDefaultSettings();
  saveDatabase();
}

function seedDefaultCosts() {
  const costs = [
    ['playerlist', 5, 1, 'List all online players'],
    ['getplayerdata', 10, 1, 'Get detailed player data'],
    ['kick', 25, 1, 'Kick a player'],
    ['ban', 50, 1, 'Ban a player'],
    ['unban', 30, 1, 'Unban a player'],
    ['slay', 40, 1, 'Instantly kill a player'],
    ['announce', 15, 1, 'Send server announcement'],
    ['directmessage', 15, 1, 'Send direct message to player'],
    ['save', 20, 1, 'Save the server'],
    ['wipecorpses', 35, 1, 'Wipe all corpses'],
    ['toggleai', 20, 1, 'Toggle AI on/off'],
    ['togglemigrations', 20, 1, 'Toggle migrations'],
    ['togglewhitelist', 20, 1, 'Toggle whitelist'],
    ['addwhitelist', 25, 1, 'Add player to whitelist'],
    ['removewhitelist', 25, 1, 'Remove player from whitelist'],
    ['updateplayables', 30, 1, 'Update playable dinosaurs'],
    ['togglehumans', 20, 1, 'Toggle humans'],
    ['custom', 10, 1, 'Send custom RCON command'],
    ['togglegrowthmultiplier', 20, 1, 'Toggle growth multiplier'],
    ['setgrowthmultiplier', 25, 1, 'Set growth multiplier'],
    ['togglenetupdatedistancechecks', 20, 1, 'Toggle network distance checks'],
    ['toggleailearning', 20, 1, 'Toggle AI learning'],
    ['aidensity', 25, 1, 'Set AI density'],
    ['disableaiclasses', 30, 1, 'Disable AI classes'],
    ['getqueuestatus', 10, 1, 'Get queue status'],
    ['getplayables', 10, 1, 'Get playable species'],
    ['serverdetails', 5, 1, 'Get server details'],
    ['pause', 15, 1, 'Pause/unpause server'],
  ];

  for (const [cmd, cost, enabled, desc] of costs) {
    try {
      db.run('INSERT OR IGNORE INTO command_costs (command_name, cost, enabled, description) VALUES (?, ?, ?, ?)',
        [cmd, cost, enabled ? 1 : 0, desc]);
    } catch (e) {
      // ignore duplicates
    }
  }
}

function seedDefaultSettings() {
  const settings = [
    ['daily_reward', '50'],
    ['starting_balance', '100'],
    ['currency_name', 'coins'],
    ['currency_symbol', '🪙'],
  ];

  for (const [key, value] of settings) {
    try {
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    } catch (e) {
      // ignore
    }
  }
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function ensureDb() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

export async function getBalance(discordId) {
  await ensureDb();
  const result = getDb().exec('SELECT balance FROM accounts WHERE discord_id = ?', [discordId]);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

export async function getAccount(discordId) {
  await ensureDb();
  const result = getDb().exec('SELECT * FROM accounts WHERE discord_id = ?', [discordId]);
  if (result.length > 0 && result[0].values.length > 0) {
    const row = result[0].values[0];
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }
  return null;
}

export async function createAccount(discordId, steamId = null) {
  await ensureDb();
  const startingBalance = parseInt(getSetting('starting_balance') || '100');
  getDb().run(
    'INSERT OR IGNORE INTO accounts (discord_id, steam_id, balance) VALUES (?, ?, ?)',
    [discordId, steamId, startingBalance]
  );
  if (steamId) {
    getDb().run('UPDATE accounts SET steam_id = ? WHERE discord_id = ?', [steamId, discordId]);
  }
  saveDatabase();
  return startingBalance;
}

export async function linkSteam(discordId, steamId) {
  await ensureDb();
  const existing = getDb().exec('SELECT steam_id FROM accounts WHERE discord_id = ?', [discordId]);
  if (existing.length > 0 && existing[0].values.length > 0 && existing[0].values[0][0]) {
    return { success: false, message: 'Account already linked. Contact an admin to change it.' };
  }
  getDb().run('INSERT OR REPLACE INTO accounts (discord_id, steam_id, balance) VALUES (?, ?, COALESCE((SELECT balance FROM accounts WHERE discord_id = ?), 0))',
    [discordId, steamId, discordId]);
  saveDatabase();
  return { success: true, message: `Linked Steam ID ${steamId} to your account.` };
}

export async function addBalance(discordId, amount, type = 'earn', reason = '') {
  await ensureDb();
  await createAccount(discordId);
  getDb().run('UPDATE accounts SET balance = balance + ? WHERE discord_id = ?', [amount, discordId]);
  getDb().run('INSERT INTO transactions (discord_id, amount, type, reason) VALUES (?, ?, ?, ?)',
    [discordId, amount, type, reason]);
  saveDatabase();
}

export async function spendBalance(discordId, amount, reason = '') {
  await ensureDb();
  await createAccount(discordId);
  const current = await getBalance(discordId);
  if (current < amount) {
    return { success: false, message: `Insufficient funds. You have ${current} ${getSetting('currency_symbol') || '🪙'} but need ${amount}.` };
  }
  getDb().run('UPDATE accounts SET balance = balance - ? WHERE discord_id = ?', [amount, discordId]);
  getDb().run('INSERT INTO transactions (discord_id, amount, type, reason) VALUES (?, ?, ?, ?)',
    [discordId, -amount, 'spend', reason]);
  saveDatabase();
  return { success: true, newBalance: current - amount };
}

export async function getCommandCost(commandName) {
  await ensureDb();
  const result = getDb().exec('SELECT cost, enabled FROM command_costs WHERE command_name = ?', [commandName]);
  if (result.length > 0 && result[0].values.length > 0) {
    const [cost, enabled] = result[0].values[0];
    return enabled ? cost : null;
  }
  return null;
}

export async function setCommandCost(commandName, cost, enabled = true) {
  await ensureDb();
  getDb().run(
    'INSERT OR REPLACE INTO command_costs (command_name, cost, enabled, description) VALUES (?, ?, ?, COALESCE((SELECT description FROM command_costs WHERE command_name = ?), ?))',
    [commandName, cost, enabled ? 1 : 0, commandName, commandName]
  );
  saveDatabase();
}

export async function getSetting(key) {
  await ensureDb();
  const result = getDb().exec('SELECT value FROM settings WHERE key = ?', [key]);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

export async function setSetting(key, value) {
  await ensureDb();
  getDb().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  saveDatabase();
}

export async function getAllAccounts() {
  await ensureDb();
  const result = getDb().exec('SELECT discord_id, steam_id, balance, last_daily FROM accounts ORDER BY balance DESC');
  if (result.length > 0) {
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }
  return [];
}

export async function getTransactionHistory(discordId = null, limit = 50) {
  await ensureDb();
  let query = 'SELECT * FROM transactions';
  const params = [];
  if (discordId) {
    query += ' WHERE discord_id = ?';
    params.push(discordId);
  }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  const result = getDb().exec(query, params);
  if (result.length > 0) {
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }
  return [];
}

export async function canAfford(discordId, commandName) {
  const cost = await getCommandCost(commandName);
  if (cost === null) return true; // free or disabled
  const balance = await getBalance(discordId);
  if (balance === null) return false;
  return balance >= cost;
}

export default {
  ensureDb,
  getBalance,
  getAccount,
  createAccount,
  linkSteam,
  addBalance,
  spendBalance,
  getCommandCost,
  setCommandCost,
  getSetting,
  setSetting,
  getAllAccounts,
  getTransactionHistory,
  canAfford,
};
