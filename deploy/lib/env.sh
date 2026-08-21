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
    _append_missing_backend_env_vars "$env_file"
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
MAIL_FROM_NAME=El Renad
MAIL_REPLY_TO=
EOF
  chown "root:$APP_GROUP" "$env_file"
  chmod 640 "$env_file"
  log_ok "backend/.env created (mode 640, readable by $APP_GROUP)."
}

# Appends newly-introduced, non-secret env vars to an existing backend/.env
# without touching any existing line (never overwrites secrets or manual
# customization). Safe to run on every deploy — only appends a key if it is
# completely absent from the file.
_append_missing_backend_env_vars() {
  local env_file="$1"
  local appended=0

  if ! grep -q '^MAIL_FROM_NAME=' "$env_file"; then
    printf '\nMAIL_FROM_NAME=El Renad\n' >> "$env_file"
    appended=1
  fi
  if ! grep -q '^MAIL_REPLY_TO=' "$env_file"; then
    printf 'MAIL_REPLY_TO=\n' >> "$env_file"
    appended=1
  fi

  if [ "$appended" = "1" ]; then
    log_ok "backend/.env: added new MAIL_FROM_NAME/MAIL_REPLY_TO defaults (existing values untouched)."
  fi
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
