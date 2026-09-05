#!/usr/bin/env bash
# Dependency install + production build for both apps, plus the admin
# bootstrap step.
#
# SECURITY: deploy.sh itself runs as root, but everything in this file that
# executes repository-controlled code (npm ci / npm run build — which runs
# package.json lifecycle scripts and node_modules/.bin binaries — and
# scripts/bootstrap-admin.js) is executed via _as_build_user, which drops
# privileges to $APP_USER (elrenad) first. elrenad-ci (which owns this git
# working tree) can push arbitrary backend/frontend code, but the worst it
# can do is run code as the unprivileged elrenad service user — the exact
# same blast radius as the app's own runtime, never root. Root only touches
# the *output* of these steps (a plain chown, no code execution) after the
# fact.
#
# Both package.json files ship an npm package-lock.json (lockfileVersion 3),
# so `npm ci` is the correct deterministic install.

BUILD_USER="$APP_USER"
BUILD_HOME="/var/lib/${APP_NAME}-build-home"

_ensure_build_home() {
  mkdir -p "$BUILD_HOME/.npm-cache"
  chown -R "$BUILD_USER:$APP_GROUP" "$BUILD_HOME"
  chmod 700 "$BUILD_HOME"
}

# Runs "$1" as $BUILD_USER (never root) with a writable HOME/npm cache. This
# is the ONLY place build.sh executes repository-controlled shell/Node code.
_as_build_user() {
  _ensure_build_home
  runuser -u "$BUILD_USER" -- env -i \
    HOME="$BUILD_HOME" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    npm_config_cache="$BUILD_HOME/.npm-cache" \
    bash -c "$1"
}

# build_*_compile chowns dist/.next to root afterward (so the running
# service, which only has group-read, can't tamper with its own compiled
# code) — but that means the NEXT build's unprivileged npm ci/next build
# can't recreate/rm -rf a root-owned node_modules or .next left over from a
# previous (pre-hardening) build. Hand each one back to $BUILD_USER right
# before touching it; this is a plain chown of a fixed path, not code
# execution, so it's safe for root to do directly. A no-op once everything
# has cycled through at least one build under this scheme.
_reclaim_for_build_user() {
  local path="$1"
  [ -e "$path" ] && chown -R "$BUILD_USER:$APP_GROUP" "$path"
}

build_backend_install() {
  _reclaim_for_build_user "$BACKEND_DIR/node_modules"
  log_info "backend: npm ci (as $BUILD_USER, not root)"
  _as_build_user "cd '$BACKEND_DIR' && npm ci"
  log_ok "Backend dependencies installed."
}

build_backend_compile() {
  _reclaim_for_build_user "$BACKEND_DIR/dist"
  log_info "backend: npm run build (nest build) (as $BUILD_USER, not root)"
  _as_build_user "cd '$BACKEND_DIR' && npm run build"
  chown -R "root:$APP_GROUP" "$BACKEND_DIR/dist"
  chmod -R g+rX "$BACKEND_DIR/dist"
  log_ok "Backend built -> backend/dist"
}

build_frontend_install() {
  _reclaim_for_build_user "$FRONTEND_DIR/node_modules"
  log_info "frontend: npm ci (as $BUILD_USER, not root)"
  _as_build_user "cd '$FRONTEND_DIR' && npm ci"
  log_ok "Frontend dependencies installed."
}

build_frontend_compile() {
  _reclaim_for_build_user "$FRONTEND_DIR/.next"
  log_info "frontend: npm run build (next build) (as $BUILD_USER, not root)"
  _as_build_user "cd '$FRONTEND_DIR' && rm -rf .next && npm run build"
  chown -R "root:$APP_GROUP" "$FRONTEND_DIR/.next"
  chmod -R g+rX "$FRONTEND_DIR/.next"
  log_ok "Frontend built -> frontend/.next"
}

bootstrap_admin() {
  if [ ! -f "$BACKEND_DIR/dist/modules/users/user.schema.js" ]; then
    log_err "Compiled User schema not found — did the backend build succeed?"
    exit 1
  fi

  log_info "Ensuring admin account ${ADMIN_EMAIL} exists with Admin permissions (as $BUILD_USER, not root)..."
  _as_build_user "cd '$BACKEND_DIR' && set -a && source .env && set +a && ADMIN_EMAIL='$ADMIN_EMAIL' ADMIN_PASSWORD='$ADMIN_BOOTSTRAP_PASSWORD' node scripts/bootstrap-admin.js"
  log_ok "Admin account check complete."
}
