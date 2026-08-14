#!/usr/bin/env bash
# Tail logs for a given component.
#
# Usage: ./deploy/logs.sh {backend|frontend|nginx|mongo} [lines]

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "$SCRIPT_DIR/lib/config.sh"

TARGET="${1:-}"
LINES="${2:-100}"

case "$TARGET" in
  backend)
    exec journalctl -u "$BACKEND_SERVICE" -n "$LINES" -f
    ;;
  frontend)
    exec journalctl -u "$FRONTEND_SERVICE" -n "$LINES" -f
    ;;
  nginx)
    exec journalctl -u nginx -n "$LINES" -f
    ;;
  mongo|mongodb)
    exec journalctl -u mongod -n "$LINES" -f
    ;;
  *)
    echo "Usage: $0 {backend|frontend|nginx|mongo} [lines]"
    exit 1
    ;;
esac
