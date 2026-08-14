#!/usr/bin/env bash
# MongoDB: install locally, lock to 127.0.0.1, and run under a dedicated
# least-privilege application user instead of the (nonexistent by default)
# superadmin account. Safe to re-run: every step checks current state first.

install_mongodb() {
  if command -v mongod >/dev/null 2>&1; then
    log_ok "MongoDB already installed ($(mongod --version | head -1))."
  else
    log_info "Installing MongoDB ${MONGO_MAJOR}..."
    # shellcheck disable=SC1091
    . /etc/os-release
    local codename="${VERSION_CODENAME:-noble}"
    _mongo_add_repo "$codename"
    if ! (apt-get update -y && apt-get install -y mongodb-org mongodb-mongosh); then
      log_warn "MongoDB repo for '${codename}' failed — retrying with 'jammy' packages (binary-compatible with Ubuntu 24.04)."
      rm -f "/etc/apt/sources.list.d/mongodb-org-${MONGO_MAJOR}.list"
      _mongo_add_repo "jammy"
      apt-get update -y
      apt-get install -y mongodb-org mongodb-mongosh
    fi
  fi

  # mongodump/mongorestore ship separately since MongoDB 4.4+.
  if ! command -v mongodump >/dev/null 2>&1; then
    apt-get install -y mongodb-database-tools || log_warn "mongodb-database-tools not available — deploy/backup.sh will fail until it is installed."
  fi

  systemctl enable mongod >/dev/null 2>&1 || true
  if systemctl is-active --quiet mongod; then
    log_ok "mongod already running — leaving it alone."
  else
    systemctl start mongod
  fi
  _mongo_wait_ready

  _mongo_enforce_localhost_bind
  _mongo_ensure_app_user
}

_mongo_add_repo() {
  local codename="$1"
  curl -fsSL "https://pgp.mongodb.com/server-${MONGO_MAJOR}.asc" \
    | gpg --dearmor --yes -o "/usr/share/keyrings/mongodb-server-${MONGO_MAJOR}.gpg"
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_MAJOR}.gpg ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/${MONGO_MAJOR} multiverse" \
    > "/etc/apt/sources.list.d/mongodb-org-${MONGO_MAJOR}.list"
}

# Waits for mongod to be both systemd-active AND actually accepting TCP
# connections on 127.0.0.1:27017. `systemctl is-active` can report "active"
# slightly before mongod's listener is actually ready (WiredTiger
# recovery/startup), which previously caused the very next mongosh call to
# fail with ECONNREFUSED right after a restart. Checked at the TCP layer
# (not via mongosh) so this works whether or not auth is enabled yet.
_mongo_wait_ready() {
  local i
  for i in $(seq 1 30); do
    if systemctl is-active --quiet mongod && (exec 3<>"/dev/tcp/127.0.0.1/27017") 2>/dev/null; then
      exec 3>&- 2>/dev/null || true
      exec 3<&- 2>/dev/null || true
      return 0
    fi
    sleep 1
  done
  log_err "mongod did not become ready (active + accepting connections on 127.0.0.1:27017) in time. Last logs:"
  journalctl -u mongod --no-pager -n 30 || true
  exit 1
}

_mongo_enforce_localhost_bind() {
  local conf=/etc/mongod.conf
  if grep -qE '^\s*bindIp:\s*127\.0\.0\.1\s*$' "$conf"; then
    log_ok "MongoDB already bound to 127.0.0.1 only."
    return
  fi
  log_warn "MongoDB is not locked to 127.0.0.1 — fixing (backup saved next to mongod.conf)."
  cp "$conf" "${conf}.bak.$(date +%Y%m%d%H%M%S)"
  if grep -qE '^\s*bindIp:' "$conf"; then
    sed -i -E 's/^([[:space:]]*)bindIp:.*/\1bindIp: 127.0.0.1/' "$conf"
  else
    printf '\nnet:\n  bindIp: 127.0.0.1\n' >> "$conf"
  fi
  systemctl restart mongod
  _mongo_wait_ready
  log_ok "MongoDB now bound to 127.0.0.1 only."
}

_mongo_ensure_app_user() {
  if grep -qE '^\s*authorization:\s*enabled\s*$' /etc/mongod.conf; then
    log_ok "MongoDB authentication already enabled; dedicated app user assumed present."
    return
  fi

  if [ -z "${MONGO_APP_PASSWORD:-}" ]; then
    log_err "MONGO_APP_PASSWORD is not set — ensure_secrets must run before install_mongodb."
    exit 1
  fi

  log_info "Creating dedicated MongoDB user '${MONGO_APP_USER}' (readWrite on '${DB_NAME}' only, not a superadmin)..."
  mongosh --quiet --eval "
    const dbase = db.getSiblingDB('${DB_NAME}');
    if (dbase.getUser('${MONGO_APP_USER}')) {
      print('exists');
    } else {
      dbase.createUser({ user: '${MONGO_APP_USER}', pwd: '${MONGO_APP_PASSWORD}', roles: [{ role: 'readWrite', db: '${DB_NAME}' }] });
      print('created');
    }
  "

  local conf=/etc/mongod.conf
  if ! grep -qE '^\s*security:\s*$' "$conf"; then
    printf '\nsecurity:\n  authorization: enabled\n' >> "$conf"
  elif ! grep -qE '^\s*authorization:\s*enabled\s*$' "$conf"; then
    sed -i '/^security:[[:space:]]*$/a\  authorization: enabled' "$conf"
  fi

  systemctl restart mongod
  _mongo_wait_ready
  log_ok "MongoDB authentication enabled with dedicated application user."
}
