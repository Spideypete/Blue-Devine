# 🦖 Evrima Control Center

Discord-based control panel for The Isle Evrima servers using RCON. Replicates a professional RCON web panel entirely inside Discord.

## Features

- **Main Dashboard** - One-click access to all server controls
- **Player Management** - List, search, view data, kick, ban, and direct message players
- **Announcements** - Send instant, scheduled, or automatic announcements
- **World Controls** - Toggle AI, adjust AI density, toggle humans, set growth multiplier, wipe corpses, update playables
- **Server Controls** - Save, view details, check queue, restart, pause server
- **Whitelist Management** - Enable/disable whitelist, add/remove Steam IDs, view list
- **Custom Console** - Execute any RCON command with history and favorites
- **Audit Logging** - Every action logged with Discord user, action, target, timestamp, and server response
- **Role-Based Security** - Only authorized Discord roles can access admin functions
- **Confirmation Dialogs** - Destructive actions require confirmation

## Requirements

- Node.js 18.0.0 or higher
- A Discord bot token with Applications Commands intent
- The Isle Evrima server with RCON enabled
- RCON password

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `config.example.json` to `config.json`
4. Fill in your Discord bot token, client ID, guild ID, audit channel ID, RCON host, port, password, and authorized role IDs
5. Register Discord application commands (slash commands) with:
   ```bash
   # You'll need to use the Discord Developer Portal or a script to register commands
   ```
6. Start the bot:
   ```bash
   npm start
   ```

## Configuration

Edit `config.json` with your settings:

```json
{
  "discord": {
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_BOT_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID",
    "auditChannelId": "YOUR_AUDIT_LOG_CHANNEL_ID"
  },
  "rcon": {
    "host": "127.0.0.1",
    "port": 27015,
    "password": "YOUR_RCON_PASSWORD"
  },
  "authorizedRoles": ["ROLE_ID_1", "ROLE_ID_2"],
  "autoAnnouncements": [],
  "favoriteCommands": []
}
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add a bot to the application
4. Under **Bot**, enable:
   - **Presence Intent** (if needed)
   - **Server Members Intent**
5. Copy the bot token
6. Under **OAuth2 > URL Generator**, select:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`, `Read Message History`
7. Use the generated URL to invite the bot to your server

## RCON Setup

Enable RCON on your Evrima server by adding these settings to your server configuration (usually `Game.ini` or server launch parameters):

```
RCONEnabled=True
RCONPort=27015
RCONPassword=your_password_here
```

## Project Structure

```
evrima-bot/
├── src/
│   ├── index.js          - Main bot entry point
│   ├── rcon.js           - RCON client wrapper
│   ├── ui.js             - UI helper functions (embeds, buttons, modals)
│   ├── security.js       - Role-based access control
│   ├── logger.js         - Audit logging with Discord embeds
│   └── menus/
│       ├── players.js    - Player management menu
│       ├── announcements.js - Announcement menu
│       ├── world.js      - World controls menu
│       ├── server.js     - Server controls menu
│       └── whitelist.js  - Whitelist management menu
├── config.example.json   - Example configuration file
├── package.json          - Node.js dependencies
└── README.md             - This file
```

## Commands

The bot uses Discord buttons and dropdowns for all interactions. No text commands needed.

### Main Menu
- **Players** - Access player management tools
- **Announcements** - Send server announcements
- **World Controls** - Adjust world settings
- **Server Controls** - Manage server operations
- **Whitelist** - Manage whitelist
- **Live Status** - View real-time server status
- **Custom Console** - Execute raw RCON commands

## Logging

All actions are logged locally to `logs/audit.log` and optionally posted to a Discord audit channel. Each log entry contains:

- Timestamp
- Discord user (name and ID)
- Action performed
- Target (player ID, Steam ID, etc.)
- Server response
- Success/failure status

## Security

- Administrative actions are restricted to Discord roles specified in `config.json`
- Users with the `Administrator` permission always have access
- Destructive actions (kick, ban, restart, wipe) require typing "CONFIRM"
- All actions are logged to the audit channel

## Troubleshooting

**Bot doesn't respond:**
- Ensure the bot token is correct
- Check that the bot is online in your server
- Verify the bot has the required permissions

**RCON connection fails:**
- Verify RCON is enabled on your server
- Check the RCON port and password
- Ensure firewall allows the connection

**Commands not working:**
- Make sure your role is in the `authorizedRoles` list
- Check console for error messages

## License

MIT
