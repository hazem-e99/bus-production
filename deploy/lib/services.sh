#!/usr/bin/env bash
# Renders and (re)installs the systemd units for backend + frontend, then
# restarts both. Regenerating the unit file every run is cheap and keeps it
# in sync if paths/ports ever change; the actual app data (Mongo, uploads,
# secrets) is never touched by this step.

configure_services() {
  local node_bin
  node_bin="$(command -v node)"

  _render_unit "$PROJECT_DIR/deploy/systemd/elrenad-backend.service.template" \
    "/etc/systemd/system/${BACKEND_SERVICE}.service" \
    "$node_bin" "$BACKEND_DIR" "$BACKEND_DIR/dist/main.js"

  _render_unit "$PROJECT_DIR/deploy/systemd/elrenad-frontend.service.template" \
    "/etc/systemd/system/${FRONTEND_SERVICE}.service" \
    "$node_bin" "$FRONTEND_DIR" "$FRONTEND_DIR/node_modules/next/dist/bin/next"

  systemctl daemon-reload
  systemctl enable "$BACKEND_SERVICE" "$FRONTEND_SERVICE" >/dev/null 2>&1 || true

  log_info "Restarting backend and frontend services..."
  systemctl restart "$BACKEND_SERVICE"
  systemctl restart "$FRONTEND_SERVICE"

  sleep 2
  systemctl is-active --quiet "$BACKEND_SERVICE" \
    && log_ok "$BACKEND_SERVICE active" \
    || { log_err "$BACKEND_SERVICE failed to start"; journalctl -u "$BACKEND_SERVICE" --no-pager -n 40; exit 1; }
  systemctl is-active --quiet "$FRONTEND_SERVICE" \
    && log_ok "$FRONTEND_SERVICE active" \
    || { log_err "$FRONTEND_SERVICE failed to start"; journalctl -u "$FRONTEND_SERVICE" --no-pager -n 40; exit 1; }
}

_render_unit() {
  local template="$1" dest="$2" node_bin="$3" workdir="$4" entry="$5"
  sed \
    -e "s#__APP_USER__#${APP_USER}#g" \
    -e "s#__APP_GROUP__#${APP_GROUP}#g" \
    -e "s#__NODE_BIN__#${node_bin}#g" \
    -e "s#__WORKDIR__#${workdir}#g" \
    -e "s#__ENTRY__#${entry}#g" \
    -e "s#__FRONTEND_PORT__#${FRONTEND_PORT}#g" \
    -e "s#__UPLOADS_PERSIST_DIR__#${UPLOADS_PERSIST_DIR}#g" \
    -e "s#__BACKEND_SERVICE__#${BACKEND_SERVICE}#g" \
    "$template" > "$dest"
  chmod 644 "$dest"
}
