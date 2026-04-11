#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=/var/www/production2026

echo "[1/6] Go to project directory"
cd "$PROJECT_DIR"

echo "[2/6] Pull latest code"
git pull

echo "[3/6] Build backend"
cd backend
npm install
npm run build

echo "[4/6] Build frontend"
cd ../frontend
npm install
npm run build

echo "[5/6] Restart PM2"
cd ..
pm2 restart deploy/ecosystem.config.cjs

echo "[6/6] Status"
pm2 status

echo "Deployment update finished successfully."
