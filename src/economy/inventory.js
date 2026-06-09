import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DINOS, MUTATION_INFO, getAvailableMutations, getSlotMutationRange } from './dinos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/inventory.db');

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
    CREATE TABLE IF NOT EXISTS dino_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      dino_key TEXT NOT NULL,
      gender TEXT NOT NULL,
      growth INTEGER NOT NULL,
      is_prime INTEGER DEFAULT 0,
      mutation_slot_1 TEXT,
      mutation_slot_2 TEXT,
      mutation_slot_3 TEXT,
      mutation_slot_4 TEXT,
      purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discord_id) REFERENCES accounts(discord_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dino_prices (
      dino_key TEXT PRIMARY KEY,
      price INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mutation_prices (
      mutation_key TEXT PRIMARY KEY,
      price INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1
    )
  `);

  seedDefaultPrices();
  saveDatabase();
}

function seedDefaultPrices() {
  for (const [key, dino] of Object.entries(DINOS)) {
    try {
      db.run('INSERT OR IGNORE INTO dino_prices (dino_key, price) VALUES (?, ?)',
        [key, 1]);
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

export { saveDatabase };

function getDb() {
  if (!db) throw new Error('Inventory database not initialized');
  return db;
}

export { getDb as getInvDb };

export async function ensureInventoryDb() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

export async function purchaseDino(discordId, dinoKey, gender, growth, isPrime, mutations) {
  await ensureInventoryDb();
  const price = await getDinoPrice(dinoKey);
  
  const { spendBalance } = await import('../economy/coins.js');
  const result = await spendBalance(discordId, price, `bought ${DINOS[dinoKey]?.name || dinoKey}`);
  
  if (!result.success) {
    return result;
  }

  const d = getDb();
  d.run(
    `INSERT INTO dino_inventory 
     (discord_id, dino_key, gender, growth, is_prime, mutation_slot_1, mutation_slot_2, mutation_slot_3, mutation_slot_4)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      discordId,
      dinoKey,
      gender,
      growth,
      isPrime ? 1 : 0,
      mutations[0] || null,
      mutations[1] || null,
      mutations[2] || null,
      mutations[3] || null
    ]
  );
  saveDatabase();
  
  return { success: true, newBalance: result.newBalance, price };
}

export async function getInventory(discordId) {
  await ensureInventoryDb();
  const result = getDb().exec(
    'SELECT * FROM dino_inventory WHERE discord_id = ? ORDER BY purchased_at DESC',
    [discordId]
  );
  
  if (result.length === 0) return [];
  
  return result[0].values.map(row => {
    const obj = {};
    result[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function getDinoPrice(dinoKey) {
  await ensureInventoryDb();
  const result = getDb().exec('SELECT price FROM dino_prices WHERE dino_key = ?', [dinoKey]);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return 1;
}

export async function setDinoPrice(dinoKey, price, enabled = true) {
  await ensureInventoryDb();
  getDb().run(
    'INSERT OR REPLACE INTO dino_prices (dino_key, price, enabled) VALUES (?, ?, ?)',
    [dinoKey, price, enabled ? 1 : 0]
  );
  saveDatabase();
}

export async function getAllDinoPrices() {
  await ensureInventoryDb();
  const result = getDb().exec('SELECT dino_key, price, enabled FROM dino_prices ORDER BY dino_key');
  const prices = {};
  if (result.length > 0) {
    for (const row of result[0].values) {
      prices[row[0]] = { price: row[1], enabled: !!row[2] };
    }
  }
  return prices;
}

export async function getDinoById(id) {
  await ensureInventoryDb();
  const result = getDb().exec('SELECT * FROM dino_inventory WHERE id = ?', [id]);
  if (result.length > 0 && result[0].values.length > 0) {
    const obj = {};
    result[0].columns.forEach((col, i) => obj[col] = result[0].values[0][i]);
    return obj;
  }
  return null;
}

export { getAvailableMutations, getSlotMutationRange, DINOS, MUTATION_INFO };
