#!/usr/bin/env bash
# Writes backend/.env and frontend/.env on first deploy only. Both files are
# gitignored, so once created they simply persist on disk across every
# future `git pull && sudo ./deploy/deploy.sh` — this function will find
# them already present and leave them completely untouched, which is what
# preserves secrets and any manual customization (e.g. MAIL_USER/MAIL_PASS).

ensure_env_files() {
  _ensure_backend_env
  _ensure_frontend_env
}

_ensure_backend_env() {
  local env_file="$BACKEND_DIR/.env"
  if [ -f "$env_file" ]; then
    log_ok "backend/.env already exists — leaving it untouched."
    return
  fi

  log_info "Creating backend/.env..."
  cat > "$env_file" <<EOF
NODE_ENV=production
PORT=${BACKEND_PORT}
HOST=127.0.0.1

MONGODB_URI=mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}
DB_NAME=${DB_NAME}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=7d

CORS_ORIGIN=https://${DOMAIN_PRIMARY},https://${DOMAIN_WWW},http://localhost:3000

UPLOAD_DIR=./uploads

MAIL_USER=
MAIL_PASS=
EOF
  chown "root:$APP_GROUP" "$env_file"
  chmod 640 "$env_file"
  log_ok "backend/.env created (mode 640, readable by $APP_GROUP)."
}

_ensure_frontend_env() {
  local env_file="$FRONTEND_DIR/.env"
  if [ -f "$env_file" ]; then
    log_ok "frontend/.env already exists — leaving it untouched."
    return
  fi

  log_info "Creating frontend/.env..."
  cat > "$env_file" <<EOF
NODE_ENV=production

NEXT_PUBLIC_APP_URL=https://${DOMAIN_PRIMARY}
NEXT_PUBLIC_API_BASE_URL=https://${DOMAIN_PRIMARY}/api
NEXT_PUBLIC_BACKEND_ORIGIN=https://${DOMAIN_PRIMARY}

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
NEXT_PUBLIC_CURRENCY=EGP
EOF
  chmod 644 "$env_file"
  log_ok "frontend/.env created."
  log_warn "NEXT_PUBLIC_* values are baked in at build time — if you edit frontend/.env later, rebuild with 'sudo ./deploy/deploy.sh'."
}
