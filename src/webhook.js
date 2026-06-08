import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const WEBHOOK_TOKEN = process.env.DEPLOY_WEBHOOK_TOKEN;
const ALLOWED_USERS = (process.env.DEPLOY_ALLOWED_USERS || '').split(',').filter(Boolean);

if (!WEBHOOK_TOKEN) {
  console.log('[Webhook] No DEPLOY_WEBHOOK_TOKEN set. Webhook handler disabled.');
} else {
  const http = require('http');
  const PORT = process.env.WEBHOOK_PORT || 3000;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === `/deploy/${WEBHOOK_TOKEN}`) {
      try {
        const body = await new Promise((resolve) => {
          let data = '';
          req.on('data', (chunk) => { data += chunk; });
          req.on('end', () => resolve(data));
        });

        const payload = JSON.parse(body || '{}');
        const userId = payload.user_id || payload.userId;

        if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
          res.writeHead(403);
          res.end('Forbidden: User not authorized');
          return;
        }

        console.log('[Webhook] Deploy triggered by user:', userId);

        const { exec } = require('child_process');
        exec('bash deploy.sh', (error, stdout, stderr) => {
          if (error) {
            console.error('[Webhook] Deploy failed:', error);
            if (process.env.DISCORD_TOKEN && process.env.LOG_CHANNEL_ID) {
              const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
              if (channel) {
                channel.send({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle('❌ Deploy Failed')
                      .setDescription('```' + stderr.slice(0, 500) + '```')
                      .setColor(0xff0000),
                  ],
                });
              }
            }
          } else {
            console.log('[Webhook] Deploy successful');
            if (process.env.DISCORD_TOKEN && process.env.LOG_CHANNEL_ID) {
              const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
              if (channel) {
                channel.send({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle('✅ Deploy Successful')
                      .setDescription('Bot has been updated and restarted.')
                      .setColor(0x00ff00),
                  ],
                });
              }
            }
          }
        });

        res.writeHead(200);
        res.end('Deploy triggered');
      } catch (error) {
        console.error('[Webhook] Error:', error);
        res.writeHead(500);
        res.end('Error');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`[Webhook] Deployment webhook listening on port ${PORT}`);
  });
}

if (process.env.DISCORD_TOKEN) {
  client.once('ready', () => {
    console.log(`[Webhook] Logged in as ${client.user.tag}`);
  });
  client.login(process.env.DISCORD_TOKEN);
}
