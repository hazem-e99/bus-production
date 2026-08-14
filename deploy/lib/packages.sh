#!/usr/bin/env bash
# System package installation: base tools + Node.js. MongoDB has its own
# module (mongo.sh) since it needs a dedicated repo and post-install config.

install_system_packages() {
  export DEBIAN_FRONTEND=noninteractive
  log_info "apt-get update..."
  apt-get update -y

  log_info "Installing base packages (curl, git, build-essential, nginx, certbot, ufw)..."
  apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    build-essential \
    git \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx

  log_ok "System packages installed."
}

install_node() {
  if command -v node >/dev/null 2>&1 && node -v | grep -q "^v${NODE_MAJOR}\."; then
    log_ok "Node.js $(node -v) already installed."
  else
    log_info "Installing Node.js ${NODE_MAJOR}.x via NodeSource..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
  fi
  log_ok "node $(node -v) / npm $(npm -v)"
}
