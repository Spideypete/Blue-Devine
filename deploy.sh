#!/bin/bash
# Pterodactyl deployment script for Evrima RCON Bot
# Handles local changes, .env preservation, and auto-start

set -e

BOT_DIR="/home/container"
ENV_FILE="${BOT_DIR}/.env"

echo "=========================================="
echo "  Evrima RCON Bot - Pterodactyl Deploy"
echo "=========================================="
echo ""

cd "${BOT_DIR}"

# Backup .env before any git operations
if [ -f "${ENV_FILE}" ]; then
    echo "💾 Backing up .env..."
    cp "${ENV_FILE}" "${ENV_FILE}.backup"
fi

echo "📥 Resetting to latest GitHub code..."

# Stash any local changes (including untracked)
git stash --include-untracked --force 2>/dev/null || true

# Fetch latest and hard reset
git fetch origin
git reset --hard origin/main
git clean -fd

# Restore .env
if [ -f "${ENV_FILE}.backup" ]; then
    echo "♻️  Restoring .env..."
    mv "${ENV_FILE}.backup" "${ENV_FILE}"
fi

echo "✅ Code updated"
echo ""

echo "📦 Installing dependencies..."
npm install --production --omit=dev
echo "✅ Dependencies installed"
echo ""

echo "🚀 Starting bot..."
npm start
