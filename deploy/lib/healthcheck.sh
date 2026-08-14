#!/usr/bin/env bash
# Post-deploy verification. Never fatal on its own — deploy.sh reports the
# overall result but always finishes so the summary/instructions print.

run_health_checks() {
  local ok=1

  _check_service mongod "MongoDB" || ok=0
  _check_service nginx "Nginx" || ok=0
  _check_service "$BACKEND_SERVICE" "Backend service" || ok=0
  _check_service "$FRONTEND_SERVICE" "Frontend service" || ok=0

  # Public, lightweight, DB-backed endpoint — exercises Mongo connectivity
  # without needing auth (see backend/src/modules/settings/settings.controller.ts).
  if curl -fsS -o /dev/null "http://127.0.0.1:${BACKEND_PORT}/api/Settings/maintenance-mode"; then
    log_ok "Backend responds locally on 127.0.0.1:${BACKEND_PORT}"
  else
    log_err "Backend did not respond on 127.0.0.1:${BACKEND_PORT}"
    ok=0
  fi

  if curl -fsS -o /dev/null "http://127.0.0.1:${FRONTEND_PORT}"; then
    log_ok "Frontend responds locally on 127.0.0.1:${FRONTEND_PORT}"
  else
    log_err "Frontend did not respond on 127.0.0.1:${FRONTEND_PORT}"
    ok=0
  fi

  if curl -fsS -o /dev/null -H "Host: ${DOMAIN_PRIMARY}" "http://127.0.0.1"; then
    log_ok "Nginx serves ${DOMAIN_PRIMARY} over HTTP"
  else
    log_warn "Nginx did not respond for ${DOMAIN_PRIMARY} over HTTP"
    ok=0
  fi

  if [ -f "/etc/letsencrypt/live/${DOMAIN_PRIMARY}/fullchain.pem" ]; then
    if curl -fsS -o /dev/null "https://${DOMAIN_PRIMARY}"; then
      log_ok "https://${DOMAIN_PRIMARY} is reachable"
    else
      log_warn "https://${DOMAIN_PRIMARY} not reachable yet (DNS/propagation?)"
    fi
    if curl -fsS -o /dev/null "https://${DOMAIN_PRIMARY}/api/Settings/maintenance-mode"; then
      log_ok "API reachable through https://${DOMAIN_PRIMARY}/api (frontend<->backend wired correctly)"
    else
      log_warn "API not reachable yet through HTTPS"
    fi
  else
    log_warn "No certificate yet — https://${DOMAIN_PRIMARY} not checked (see the DNS section above)."
  fi

  return $((1 - ok))
}

_check_service() {
  local unit="$1" label="$2"
  if systemctl is-active --quiet "$unit"; then
    log_ok "${label}: active"
    return 0
  else
    log_err "${label}: NOT active"
    return 1
  fi
}
