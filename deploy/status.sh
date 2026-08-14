#!/usr/bin/env bash
# Snapshot of the running deployment.
#
# Usage: sudo ./deploy/status.sh

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "$SCRIPT_DIR/lib/config.sh"

svc_status() {
  systemctl is-active "$1" 2>/dev/null || echo "not-installed"
}

echo "================================================================"
echo " El Renad — Status"
echo "================================================================"

printf "%-12s %s\n" "Backend:"  "$(svc_status "$BACKEND_SERVICE")"
printf "%-12s %s\n" "Frontend:" "$(svc_status "$FRONTEND_SERVICE")"
printf "%-12s %s\n" "MongoDB:"  "$(svc_status mongod)"
printf "%-12s %s\n" "Nginx:"    "$(svc_status nginx)"

echo
echo "-- Disk usage (/) --"
df -h / 2>/dev/null || true

echo
echo "-- Memory --"
free -h 2>/dev/null || true

echo
echo "-- Listening ports (80, 443, ${FRONTEND_PORT}, ${BACKEND_PORT}, 27017) --"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep -E ":(80|443|${FRONTEND_PORT}|${BACKEND_PORT}|27017)\b" \
    || echo "(nothing listening on the expected ports — see logs)"
else
  echo "ss not available"
fi

echo
echo "-- TLS certificate --"
if [ -f "/etc/letsencrypt/live/${DOMAIN_PRIMARY}/fullchain.pem" ]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN_PRIMARY}/fullchain.pem" \
      | sed 's/^/  /'
  else
    echo "  Certificate present (install openssl to see expiry)"
  fi
else
  echo "  No certificate installed yet for ${DOMAIN_PRIMARY}"
fi
echo "================================================================"
