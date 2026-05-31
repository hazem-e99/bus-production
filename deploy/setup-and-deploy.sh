#!/usr/bin/env bash
# ==============================================================================
# Renad Bus Smart Transportation Platform - VPS Auto Setup & Deploy Script
# OS Target: Ubuntu 22.04 LTS (Jammy Jellyfish) or newer
# ==============================================================================

set -euo pipefail

# Style formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}   Renad Bus Platform - Production Auto-Deployment Script${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Enforce running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script as root (e.g., using sudo).${NC}" >&2
  exit 1
fi

PROJECT_DIR=$(pwd)

# Verify script is run from project root directory
if [ ! -d "$PROJECT_DIR/backend" ] || [ ! -d "$PROJECT_DIR/frontend" ]; then
  echo -e "${RED}Error: Please run this script from the project root directory (which contains backend and frontend).${NC}" >&2
  exit 1
fi

echo -e "\n${GREEN}[1/11] Updating system package list...${NC}"
apt-get update -y
apt-get install -y curl git nginx ufw gnupg certbot python3-certbot-nginx

echo -e "\n${GREEN}[2/11] Checking Node.js 20 installation...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1)" != "v20" ]; then
  echo -e "${BLUE}Installing Node.js 20...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo -e "Node.js $(node -v) is already installed."
fi

echo -e "\n${GREEN}[3/11] Checking PM2 installation...${NC}"
if ! command -v pm2 &> /dev/null; then
  echo -e "${BLUE}Installing PM2...${NC}"
  npm install -g pm2
else
  echo -e "PM2 $(pm2 -v) is already installed."
fi

echo -e "\n${GREEN}[4/11] Checking MongoDB 7.0 (Local Database)...${NC}"
if ! command -v mongosh &> /dev/null; then
  echo -e "${BLUE}Installing MongoDB 7.0...${NC}"
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor --yes -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -y
  apt-get install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
else
  echo -e "MongoDB is already installed. Restarting service..."
  systemctl restart mongod
fi

# Verify MongoDB is running
systemctl is-active --quiet mongod && echo -e "MongoDB is ${GREEN}running${NC}." || (echo -e "${RED}MongoDB failed to start${NC}" && exit 1)

echo -e "\n${GREEN}[5/11] Configuring Firewall (UFW)...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

echo -e "\n${GREEN}[6/11] Setting up Backend Environment (.env)...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -f .env ]; then
  echo -e "Creating backend .env from template..."
  cp .env.example .env
  # Generate a random JWT_SECRET
  RANDOM_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 48 || true)
  sed -i "s/JWT_SECRET=.*$/JWT_SECRET=$RANDOM_SECRET/" .env
  echo -e "${GREEN}Backend .env created and configured with a unique secure JWT_SECRET.${NC}"
else
  echo -e "Backend .env already exists. Skipping recreation."
fi

echo -e "\n${GREEN}[7/11] Installing Backend dependencies & building...${NC}"
npm install
npm run build

echo -e "\n${GREEN}[8/11] Seeding Local Database...${NC}"
npm run seed || node seed.js

echo -e "\n${GREEN}[9/11] Setting up Frontend Environment (.env)...${NC}"
cd "$PROJECT_DIR/frontend"
if [ ! -f .env ]; then
  echo -e "Creating frontend .env from template..."
  cp .env.example .env
  echo -e "${GREEN}Frontend .env created.${NC}"
else
  echo -e "Frontend .env already exists. Skipping recreation."
fi

echo -e "\n${GREEN}[10/11] Installing Frontend dependencies & building...${NC}"
npm install
# Clean cache before build
if [ -d .next ]; then
  rm -rf .next
fi
npm run build

echo -e "\n${GREEN}[11/11] Configuring Nginx Reverse Proxy...${NC}"
cd "$PROJECT_DIR"
if [ -f "/etc/nginx/sites-available/bus-system" ]; then
  rm -f "/etc/nginx/sites-available/bus-system"
fi
cp "$PROJECT_DIR/deploy/nginx/bus-system.conf" "/etc/nginx/sites-available/bus-system"
ln -sf "/etc/nginx/sites-available/bus-system" "/etc/nginx/sites-enabled/bus-system"
rm -f "/etc/nginx/sites-enabled/default"

echo -e "Testing Nginx config..."
nginx -t
echo -e "Reloading Nginx..."
systemctl reload nginx

echo -e "\n${GREEN}🚀 Starting services under PM2...${NC}"
pm2 start "$PROJECT_DIR/deploy/ecosystem.config.cjs" || pm2 restart "$PROJECT_DIR/deploy/ecosystem.config.cjs"
pm2 save
pm2 startup || true

echo -e "\n${BLUE}======================================================================${NC}"
echo -e "${GREEN}🎉 Platform successfully deployed!${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "Next steps:"
echo -e "1. Edit configuration files to map your custom domain names if needed:"
echo -e "   - Backend config: /var/www/production2026/backend/.env"
echo -e "   - Frontend config: /var/www/production2026/frontend/.env"
echo -e "   - Nginx server names: /etc/nginx/sites-available/bus-system"
echo -e "2. Secure your website with SSL certificate by running:"
echo -e "   certbot --nginx -d el-renad.com -d www.el-renad.com -d api.el-renad.com"
echo -e "${BLUE}======================================================================${NC}"
