#!/usr/bin/env bash
# Backs up MongoDB, uploaded files, and the production env files into a
# timestamped folder under /var/backups/elrenad. Read-only against the live
# database — mongodump never modifies data. Does not touch SSL certificates
# (those are Certbot's responsibility and are trivially reissuable).
#
# Usage: sudo ./deploy/backup.sh
#
# To restore MongoDB from a backup (manual — never run automatically):
#   mongorestore --uri="<MONGODB_URI from backend/.env>" \
#     --drop /var/backups/elrenad/<timestamp>/mongodb/bus-system
#   ("--drop" replaces existing collections with the backup's contents —
#   only use it when you actually intend to roll back production data.)

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "$SCRIPT_DIR/lib/config.sh"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./deploy/backup.sh" >&2
  exit 1
fi

if [ ! -f "$SECRETS_FILE" ]; then
  echo "No secrets file at $SECRETS_FILE — has this server been deployed yet?" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
DEST="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$DEST"

echo "Backing up to $DEST ..."

if command -v mongodump >/dev/null 2>&1; then
  mongodump \
    --uri="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}" \
    --out="$DEST/mongodb"
  echo "  MongoDB dumped."
else
  echo "  mongodump not found (install mongodb-database-tools) — skipping database backup." >&2
fi

if [ -d "$UPLOADS_PERSIST_DIR" ]; then
  tar -czf "$DEST/uploads.tar.gz" -C "$(dirname "$UPLOADS_PERSIST_DIR")" "$(basename "$UPLOADS_PERSIST_DIR")"
  echo "  Uploads archived."
fi

[ -f "$BACKEND_DIR/.env" ] && cp "$BACKEND_DIR/.env" "$DEST/backend.env"
[ -f "$FRONTEND_DIR/.env" ] && cp "$FRONTEND_DIR/.env" "$DEST/frontend.env"
echo "  Environment files copied."

chmod -R go-rwx "$DEST"

# Conservative retention: keep the most recent 14 backups only.
ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +15 | while read -r old; do
  rm -rf "$old"
  echo "  Removed old backup: $old"
done

echo "Backup complete: $DEST"
