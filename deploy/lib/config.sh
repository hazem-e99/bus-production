#!/usr/bin/env bash
# Shared constants for every deploy/*.sh script. Sourcing this file has no
# side effects — safe to pull into deploy.sh, status.sh, logs.sh, restart.sh
# and backup.sh alike.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

DOMAIN_PRIMARY="el-renad.com"
DOMAIN_WWW="www.el-renad.com"

APP_NAME="elrenad"
APP_USER="elrenad"
APP_GROUP="elrenad"

BACKEND_PORT=7126
FRONTEND_PORT=3000

# Node 22 is the current Maintenance LTS release: fully supported, security
# patches only, no feature churn. Next.js 15 / React 19 / NestJS 10 only
# require Node >=18.18, so the conservative LTS is preferred over the newer
# Active LTS for a production VPS.
NODE_MAJOR=22

# MongoDB 8.0 is the first series with an official "noble" (Ubuntu 24.04)
# APT repository; mongo.sh falls back to the "jammy" packages (which run
# fine on 24.04) if the noble repo is ever unavailable.
MONGO_MAJOR=8.0
DB_NAME="bus-system"
MONGO_APP_USER="elrenad_app"

UPLOADS_PERSIST_DIR="/var/lib/${APP_NAME}/uploads"
SECRETS_DIR="/etc/${APP_NAME}"
SECRETS_FILE="$SECRETS_DIR/secrets.env"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOCK_FILE="/run/lock/${APP_NAME}-deploy.lock"

BACKEND_SERVICE="elrenad-backend"
FRONTEND_SERVICE="elrenad-frontend"

ADMIN_EMAIL="admin@elrenad.com"
