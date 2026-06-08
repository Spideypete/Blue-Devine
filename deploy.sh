#!/bin/bash
# Pterodactyl deployment script for Evrima RCON Bot

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

echo "🚀 Starting bot..."
npm start
