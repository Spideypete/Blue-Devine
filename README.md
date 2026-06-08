# 🦖 Evrima RCON Bot

Production-ready Discord bot for controlling The Isle Evrima servers via RCON. Built for Pterodactyl deployment.

## Features

- **Slash Commands** - 20+ commands covering all Evrima RCON functionality
- **Evrima RCON Protocol** - Custom binary protocol support (not Source RCON)
- **Persistent Connections** - Reusable RCON connection with auto-reconnect
- **Role-Based Permissions** - OWNER, ADMIN, MODERATOR, USER tiers
- **Rate Limiting** - 5 commands per minute per user
- **Audit Logging** - All actions logged to Discord channel
- **Error Handling** - Graceful failures with user-friendly embeds
- **Pterodactyl Ready** - Environment variable configuration

## Requirements

- Node.js >= 18.0.0
- Discord Bot Token with Applications Commands intent
- The Isle Evrima server with RCON enabled
- RCON password from Game.ini

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
LOG_CHANNEL_ID=your_log_channel_id
OWNER_ROLE_ID=owner_role_id
ADMIN_ROLE_ID=admin_role_id
MOD_ROLE_ID=mod_role_id
RCON_HOST=127.0.0.1
RCON_PORT=8888
RCON_PASSWORD=your_rcon_password
RCON_TIMEOUT=10000
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application, add bot
3. Enable **Applications Commands** intent
4. Invite with `bot` + `applications.commands` scopes
5. Required permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`

## RCON Setup

In your server's `Game.ini`:

```ini
[/Script/TheIsle.TIGameSession]
bRconEnabled=True
RconPort=8888
RconPassword=your_secure_password
```

Restart server after changes. Open port 8888 in firewall.

## Commands

### Player Management
- `/evrima playerlist` - List all online players
- `/evrima getplayerdata` - Get detailed player data
- `/evrima kick` - Kick a player (requires confirmation)
- `/evrima ban` - Ban a player (requires confirmation)
- `/evrima unban` - Unban a player

### Communication
- `/evrima announce` - Send server-wide announcement
- `/evrima directmessage` - Send private message to player

### Server
- `/evrima save` - Save server state
- `/evrima serverdetails` - Get server configuration
- `/evrima queue` - Get queue status
- `/evrima pause` - Pause server
- `/evrima unpause` - Unpause server

### World
- `/evrima toggleai` - Toggle AI on/off
- `/evrima togglemigrations` - Toggle migrations
- `/evrima togglegrowthmultiplier` - Toggle growth multiplier
- `/evrima setgrowthmultiplier` - Set growth multiplier value
- `/evrima wipecorpses` - Remove all corpses
- `/evrima aidensity` - Set AI spawn density (0.0-1.0)
- `/evrima togglehumans` - Toggle human characters

### Whitelist
- `/evrima togglewhitelist` - Enable/disable whitelist
- `/evrima addwhitelist` - Add player to whitelist
- `/evrima removewhitelist` - Remove player from whitelist

### Playables
- `/evrima playables` - List all playable dinosaurs
- `/evrima updateplayables` - Update playable dinosaur configuration

### Custom
- `/evrima custom` - Send any raw RCON command

## Permissions

| Role | Access |
|------|--------|
| OWNER | Full access to all commands |
| ADMIN | All RCON commands |
| MODERATOR | Player management, announcements, server info |
| USER | No access |

Configure via Discord role IDs in `.env`.

## Pterodactyl Deployment

1. Create new Node.js server
2. Upload bot files
3. Set environment variables in Pterodactyl panel
4. Set startup command: `node src/index.js`
5. Install dependencies: `npm install --production`

## Architecture

```
src/
├── index.js              # Discord client + slash command registration
├── commands/
│   └── evrima.js         # All command handlers
├── permissions/
│   └── roles.js          # Role-based access control
├── rcon/
│   ├── client.js         # Evrima binary RCON protocol implementation
│   └── manager.js        # Connection management wrapper
└── utils/
    ├── logger.js         # Audit logging to Discord channel
    └── rateLimiter.js    # Per-user rate limiting
```

## RCON Protocol

The bot implements Evrima's custom binary RCON protocol:

- Auth: `0x01 + password + NUL`
- Commands: `0x02 + opcode_byte + params + NUL`
- Response: `0x03 + data`

Uses proper opcodes for all 27 documented Evrima commands.

## Error Handling

- RCON connection failure: Auto-reconnect with exponential backoff
- Invalid commands: Returns error embed
- Timeout: Configurable via `RCON_TIMEOUT`
- Rate limit: Returns remaining wait time

## License

MIT
