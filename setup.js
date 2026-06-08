const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const EXAMPLE_PATH = path.join(__dirname, 'config.example.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function setup() {
  console.log('🦖 Evrima Control Center - Setup\n');

  if (fs.existsSync(CONFIG_PATH)) {
    const overwrite = await question('config.json already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  const example = JSON.parse(fs.readFileSync(EXAMPLE_PATH, 'utf8'));

  console.log('\n--- Discord Configuration ---');
  example.discord.token = await question('Discord Bot Token: ');
  example.discord.clientId = await question('Bot Client ID: ');
  example.discord.guildId = await question('Guild ID: ');
  example.discord.auditChannelId = await question('Audit Log Channel ID (optional): ') || '';

  console.log('\n--- RCON Configuration ---');
  example.rcon.host = await question('RCON Host (default 127.0.0.1): ') || '127.0.0.1';
  example.rcon.port = parseInt(await question('RCON Port (default 27015): ') || '27015');
  example.rcon.password = await question('RCON Password: ');

  console.log('\n--- Authorized Roles ---');
  const rolesInput = await question('Enter authorized role IDs (comma-separated): ');
  example.authorizedRoles = rolesInput.split(',').map((r) => r.trim()).filter(Boolean);

  console.log('\n--- Favorite Commands (optional) ---');
  const favsInput = await question('Enter favorite commands (comma-separated): ');
  example.favoriteCommands = favsInput.split(',').map((c) => c.trim()).filter(Boolean);

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(example, null, 2));
  console.log('\n✅ config.json created successfully!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm start');
  rl.close();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});
