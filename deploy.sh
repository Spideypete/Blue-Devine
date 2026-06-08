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

# Backup .env if it exists
if [ -f ".env" ]; then
    cp .env .env.backup
fi

# Reset any local changes and pull latest
git reset --hard
git clean -fd
git pull origin main

# Restore .env
if [ -f ".env.backup" ]; then
    mv .env.backup .env
fi

echo "✅ Code updated"
echo ""

echo "📦 Installing dependencies..."
npm install --production --omit=dev
echo "✅ Dependencies installed"
echo ""

echo "🌐 Starting web terminal..."
node src/web/server.js &
WEB_PID=$!

echo "🤖 Starting Discord bot..."
npm start &
BOT_PID=$!

cleanup() {
    echo ""
    echo "[Shutdown] Stopping services..."
    kill $WEB_PID 2>/dev/null || true
    kill $BOT_PID 2>/dev/null || true
    wait
    echo "[Shutdown] Done"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
