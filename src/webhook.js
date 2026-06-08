import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import 'dotenv/config';
import http from 'http';
import { exec } from 'child_process';

const WEBHOOK_TOKEN = process.env.DEPLOY_WEBHOOK_TOKEN;
const ALLOWED_USERS = (process.env.DEPLOY_ALLOWED_USERS || '').split(',').filter(Boolean);

export function startDeployWebhook(loggerClient) {
  if (!WEBHOOK_TOKEN) {
    console.log('[Webhook] No DEPLOY_WEBHOOK_TOKEN set. Webhook handler disabled.');
    return;
  }

  const PORT = process.env.WEBHOOK_PORT || 3001;

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

        exec('bash deploy.sh', (error, stdout, stderr) => {
          if (error) {
            console.error('[Webhook] Deploy failed:', error);
            sendDeployLog(loggerClient, '❌ Deploy Failed', '```' + stderr.slice(0, 500) + '```', 0xff0000);
          } else {
            console.log('[Webhook] Deploy successful');
            sendDeployLog(loggerClient, '✅ Deploy Successful', 'Bot has been updated and restarted.', 0x00ff00);
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

async function sendDeployLog(client, title, description, color) {
  if (!client || !process.env.LOG_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (channel) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color),
        ],
      });
    }
  } catch (error) {
    console.error('[Webhook] Failed to send log:', error.message);
  }
}
