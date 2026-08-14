#!/usr/bin/env bash
# Dependency install + production build for both apps, plus the admin
# bootstrap step. Both package.json files ship an npm package-lock.json
# (lockfileVersion 3) and no packageManager/engines override, so `npm ci` is
# the correct deterministic install for both.

build_backend_install() {
  log_info "backend: npm ci"
  ( cd "$BACKEND_DIR" && npm ci )
  log_ok "Backend dependencies installed."
}

build_backend_compile() {
  log_info "backend: npm run build (nest build)"
  ( cd "$BACKEND_DIR" && npm run build )
  chown -R "root:$APP_GROUP" "$BACKEND_DIR/dist"
  chmod -R g+rX "$BACKEND_DIR/dist"
  log_ok "Backend built -> backend/dist"
}

build_frontend_install() {
  log_info "frontend: npm ci"
  ( cd "$FRONTEND_DIR" && npm ci )
  log_ok "Frontend dependencies installed."
}

build_frontend_compile() {
  log_info "frontend: npm run build (next build)"
  ( cd "$FRONTEND_DIR" && rm -rf .next && npm run build )
  chown -R "root:$APP_GROUP" "$FRONTEND_DIR/.next"
  chmod -R g+rX "$FRONTEND_DIR/.next"
  log_ok "Frontend built -> frontend/.next"
}

bootstrap_admin() {
  if [ ! -f "$BACKEND_DIR/dist/modules/users/user.schema.js" ]; then
    log_err "Compiled User schema not found — did the backend build succeed?"
    exit 1
  fi

  log_info "Ensuring admin account ${ADMIN_EMAIL} exists with Admin permissions..."
  (
    cd "$BACKEND_DIR"
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
    ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_BOOTSTRAP_PASSWORD" node scripts/bootstrap-admin.js
  )
  log_ok "Admin account check complete."
}
