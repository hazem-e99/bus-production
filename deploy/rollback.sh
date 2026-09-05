#!/usr/bin/env bash
# Rolls el-renad.com back to a previous commit and redeploys it. Rollback
# is: reset the working tree to a known-good commit, then re-run the same
# deploy.sh that got that commit working the first time.
#
# elrenad.tech's own repo/services/database are never touched by this.
# Database changes made by the failed release are NOT undone — this only
# rolls back code. For a database rollback see deploy/backup.sh's restore
# instructions.
#
# Usage:
#   sudo ./deploy/rollback.sh <commit-sha>
#   sudo ./deploy/rollback.sh          # rolls back to the previous commit (HEAD~1)

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "$SCRIPT_DIR/lib/config.sh"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./deploy/rollback.sh [commit-sha]" >&2
  exit 1
fi

cd "$PROJECT_DIR"

TARGET="${1:-HEAD~1}"
CURRENT="$(git rev-parse HEAD)"
RESOLVED="$(git rev-parse "$TARGET" 2>/dev/null || true)"

if [ -z "$RESOLVED" ]; then
  echo "Could not resolve '$TARGET' to a commit in $PROJECT_DIR." >&2
  exit 1
fi

echo "Rolling back el-renad.com: $CURRENT -> $RESOLVED"
git fetch --all --quiet || true
git reset --hard "$RESOLVED"

echo "Re-running deploy.sh at this commit..."
"$SCRIPT_DIR/deploy.sh"

echo "Rollback complete. If this was wrong, roll forward again with:"
echo "  sudo ./deploy/rollback.sh $CURRENT"
