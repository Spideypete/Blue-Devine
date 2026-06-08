#!/bin/bash
# Pterodactyl deployment script for Evrima RCON Bot + Web Terminal

set -e

BOT_DIR="/home/container"
ENV_FILE="${BOT_DIR}/.env"

echo "=========================================="
echo "  Evrima RCON Bot - Pterodactyl Deploy"
echo "=========================================="
echo ""

cd "${BOT_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Please create .env from .env.example before starting."
    echo ""
fi

echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"
echo ""

echo "📦 Installing dependencies..."
npm install --production --omit=dev
echo "✅ Dependencies installed"
echo ""

echo "🔧 Installing PM2 globally..."
npm install -g pm2
echo "✅ PM2 ready"
echo ""

echo "🚀 Starting bot + web terminal with PM2..."
pm2 start ecosystem.config.js --env production

echo "📊 PM2 status:"
pm2 list

echo ""
echo "✅ Bot and web terminal are running!"
echo "🌐 Web terminal: http://0.0.0.0:3000"
