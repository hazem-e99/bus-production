#!/usr/bin/env bash
# UFW firewall: allow SSH + HTTP/HTTPS only. Never touches MongoDB (27017)
# or the app ports (3000/7126), which stay bound to 127.0.0.1 and are
# unreachable from outside regardless of firewall state. Existing rules are
# preserved — `ufw allow` on an already-allowed rule is a no-op.

configure_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    log_warn "ufw not found — skipping firewall configuration."
    return
  fi

  # Allow SSH before enabling, so we never lock ourselves out.
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1
  ufw allow 80/tcp >/dev/null 2>&1
  ufw allow 443/tcp >/dev/null 2>&1

  if ufw status | grep -q "Status: active"; then
    log_ok "UFW already active — rules ensured."
  else
    ufw --force enable >/dev/null 2>&1
    log_ok "UFW enabled."
  fi

  log_info "$(ufw status | head -1)"
}
