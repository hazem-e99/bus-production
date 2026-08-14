#!/usr/bin/env bash
#
# El Renad Bus System — production deployment for Ubuntu 24.04 LTS.
#
# Usage:
#   sudo ./deploy/deploy.sh
#
# Safe to re-run at any time (first deploy and every future update):
#   git pull
#   sudo ./deploy/deploy.sh
#
# It provisions Node.js, MongoDB, Nginx and Certbot; builds and starts the
# backend (NestJS) and frontend (Next.js) as systemd services under a
# dedicated non-root user; and issues SSL once DNS points at this server.
# See DEPLOY_VPS_AR.md for the full walkthrough.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"

# shellcheck source=lib/config.sh
source "$LIB_DIR/config.sh"
# shellcheck source=lib/log.sh
source "$LIB_DIR/log.sh"

STAGE="startup"
on_error() {
  local exit_code=$? line=$1
  echo >&2
  log_err "Deployment failed during stage '${STAGE}' (deploy.sh line ${line}, exit code ${exit_code})."
  log_err "Nothing destructive has happened — fix the issue above and simply re-run:"
  log_err "  sudo ./deploy/deploy.sh"
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

if [ "$(id -u)" -ne 0 ]; then
  log_err "This script must be run as root: sudo ./deploy/deploy.sh"
  exit 1
fi

# shellcheck source=lib/preflight.sh
source "$LIB_DIR/preflight.sh"
# shellcheck source=lib/packages.sh
source "$LIB_DIR/packages.sh"
# shellcheck source=lib/mongo.sh
source "$LIB_DIR/mongo.sh"
# shellcheck source=lib/secrets.sh
source "$LIB_DIR/secrets.sh"
# shellcheck source=lib/env.sh
source "$LIB_DIR/env.sh"
# shellcheck source=lib/uploads.sh
source "$LIB_DIR/uploads.sh"
# shellcheck source=lib/build.sh
source "$LIB_DIR/build.sh"
# shellcheck source=lib/services.sh
source "$LIB_DIR/services.sh"
# shellcheck source=lib/firewall.sh
source "$LIB_DIR/firewall.sh"
# shellcheck source=lib/nginx.sh
source "$LIB_DIR/nginx.sh"
# shellcheck source=lib/dns_ssl.sh
source "$LIB_DIR/dns_ssl.sh"
# shellcheck source=lib/healthcheck.sh
source "$LIB_DIR/healthcheck.sh"

# Prevent two concurrent deployments from stomping on each other.
mkdir -p "$(dirname "$LOCK_FILE")"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log_err "Another deployment is already running (lock: $LOCK_FILE). Aborting."
  exit 1
fi

echo "================================================================"
echo " El Renad Production Deployment — ${DOMAIN_PRIMARY}"
echo "================================================================"

STEP=0
run_stage() {
  STEP=$((STEP + 1))
  STAGE="$1"
  log_step "$STEP" "$1"
  shift
  "$@"
}

run_stage "Validating environment"                 validate_os
run_stage "Creating application user & directories" ensure_app_user_and_dirs
run_stage "Installing system packages"              install_system_packages
run_stage "Configuring Node.js"                      install_node
run_stage "Preparing secrets"                        ensure_secrets
run_stage "Configuring MongoDB"                      install_mongodb
run_stage "Preparing production environment files"   ensure_env_files
run_stage "Linking persistent uploads storage"        ensure_uploads
run_stage "Installing backend dependencies"           build_backend_install
run_stage "Building backend"                          build_backend_compile
run_stage "Installing frontend dependencies"          build_frontend_install
run_stage "Building frontend"                         build_frontend_compile
run_stage "Creating/updating admin account"           bootstrap_admin
run_stage "Configuring services"                      configure_services
run_stage "Configuring firewall"                      configure_firewall
run_stage "Configuring Nginx"                         configure_nginx
run_stage "Checking DNS"                              check_dns
run_stage "Configuring SSL"                           configure_ssl

STEP=$((STEP + 1))
STAGE="Running health checks"
log_step "$STEP" "Running health checks"
HEALTH_OK=1
run_health_checks || HEALTH_OK=0

HTTPS_READY=0
[ -f "/etc/letsencrypt/live/${DOMAIN_PRIMARY}/fullchain.pem" ] && HTTPS_READY=1

echo
echo "================================================================"
if [ "$HEALTH_OK" = "1" ]; then
  log_ok "Deployment completed successfully."
else
  log_warn "Deployment finished but some health checks failed — see above."
fi
echo "================================================================"
if [ "$HTTPS_READY" = "1" ]; then
  echo "  Frontend : https://${DOMAIN_PRIMARY}"
  echo "  API      : https://${DOMAIN_PRIMARY}/api"
else
  echo "  Frontend : http://${DOMAIN_PRIMARY}  (HTTPS pending — see DNS section above)"
  echo "  API      : http://${DOMAIN_PRIMARY}/api"
fi
echo "  Admin    : ${ADMIN_EMAIL}"
echo "  Status   : sudo ./deploy/status.sh"
echo "  Logs     : ./deploy/logs.sh backend|frontend|nginx|mongo"
echo "  Restart  : sudo ./deploy/restart.sh"
echo "  Backup   : sudo ./deploy/backup.sh"
echo "================================================================"
