#!/bin/bash
# Pterodactyl deployment script for Evrima RCON Bot
# This script handles git pull, dependency installation, and bot startup

set -e

BOT_DIR="/home/container"
ENV_FILE="${BOT_DIR}/.env"

echo "=========================================="
echo "  Evrima RCON Bot - Pterodactyl Deploy"
echo "=========================================="
echo ""

# Navigate to bot directory
cd "${BOT_DIR}"

# Check if .env exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Please create .env from .env.example before starting."
    echo ""
fi

# Git pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production
echo "✅ Dependencies installed"
echo ""

# Start the bot
echo "🚀 Starting bot..."
npm start
