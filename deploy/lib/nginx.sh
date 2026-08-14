#!/usr/bin/env bash
# Renders the Nginx site from the template and reloads. Once certbot has
# issued a certificate it rewrites this same file to add the HTTPS server
# blocks + redirect — so once a certificate exists we stop regenerating the
# file from the plain-HTTP template and only validate/reload it, to avoid
# wiping out certbot's edits on every future deploy.

configure_nginx() {
  local site_file="/etc/nginx/sites-available/${APP_NAME}"
  local cert_file="/etc/letsencrypt/live/${DOMAIN_PRIMARY}/fullchain.pem"

  if [ -f "$cert_file" ]; then
    log_ok "HTTPS already configured for ${DOMAIN_PRIMARY} — leaving certbot-managed config as-is."
  else
    log_info "Rendering Nginx site for ${DOMAIN_PRIMARY}..."
    sed \
      -e "s#@@DOMAIN_PRIMARY@@#${DOMAIN_PRIMARY}#g" \
      -e "s#@@DOMAIN_WWW@@#${DOMAIN_WWW}#g" \
      -e "s#@@BACKEND_PORT@@#${BACKEND_PORT}#g" \
      -e "s#@@FRONTEND_PORT@@#${FRONTEND_PORT}#g" \
      "$PROJECT_DIR/deploy/nginx/el-renad.conf.template" > "$site_file"
  fi

  ln -sf "$site_file" "/etc/nginx/sites-enabled/${APP_NAME}"
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t; then
    systemctl reload nginx
    log_ok "Nginx configured and reloaded."
  else
    log_err "Nginx config validation failed — not reloading. Fix the error above and re-run."
    exit 1
  fi
}
