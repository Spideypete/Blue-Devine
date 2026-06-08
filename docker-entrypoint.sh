#!/bin/bash
# Pterodactyl entrypoint script
# Handles safe startup with git pull and dependency installation

set -e

BOT_DIR="/home/container"
ENV_FILE="${BOT_DIR}/.env"

echo "=========================================="
echo "  Evrima RCON Bot - Pterodactyl Entrypoint"
echo "=========================================="

cd "${BOT_DIR}"

# Check if .env exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Copy .env.example to .env and configure your settings."
    echo ""
fi

# Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production
echo "✅ Dependencies installed"

# Start bot
echo "🚀 Starting bot..."
exec npm start
