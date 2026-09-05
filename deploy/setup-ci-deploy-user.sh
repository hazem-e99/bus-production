#!/usr/bin/env bash
# ONE-TIME, run manually by root on the VPS (not part of deploy.sh, and
# never run by CI itself). Creates a dedicated, least-privilege system user
# that GitHub Actions uses to trigger deployments — instead of giving CI
# your root SSH key.
#
# The user can log in over SSH (key-only) and, via a narrow NOPASSWD sudoers
# rule, run ONLY a root-owned entrypoint (/usr/local/sbin/deploy-elrenad) as
# root — nothing else, and nothing it can itself modify.
#
# SECURITY NOTE: this user owns the git working tree at $PROJECT_DIR (it
# needs to git pull/checkout before triggering a deploy), which means it
# owns deploy/deploy.sh and deploy/lib/*.sh too. Sudo-whitelisting that
# CI-writable path directly would be equivalent to unrestricted root access
# (CI could rewrite deploy.sh, then sudo-execute its own code as root). To
# avoid that, this script instead copies the current deploy/ tree into a
# ROOT-OWNED location outside the repo (/usr/local/lib/elrenad-deploy) and
# points the sudoers rule at a root-owned wrapper
# (/usr/local/sbin/deploy-elrenad) that runs the frozen copy — never the
# repo's own copy.
#
# Consequence: changes to deploy/deploy.sh or deploy/lib/*.sh do NOT take
# effect for CI-triggered deploys until a human reviews them and re-runs
# this script as root, which re-syncs the frozen copy. This is deliberate —
# it's the actual privilege boundary between "CI can ship app code changes"
# and "CI can run arbitrary code as root".
#
# This is entirely independent from elrenad.tech's own elrenad-tech-ci /
# deploy-elrenadtech setup — different user, different SSH key, different
# frozen copy, different sudoers rule, different entrypoint path. Neither
# can invoke or modify the other's.
#
# Usage (on the VPS, as root):
#   ./deploy/setup-ci-deploy-user.sh "ssh-ed25519 AAAA... github-actions"
#
# The argument is the PUBLIC key GitHub Actions will authenticate with (the
# matching private key goes into the VPS_SSH_KEY GitHub secret — never onto
# this server). Safe to re-run any time (e.g. after reviewing a deploy/
# script change) — every step here is idempotent.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "$SCRIPT_DIR/lib/config.sh"

CI_USER="elrenad-ci"
PUB_KEY="${1:-}"

FROZEN_DIR="/usr/local/lib/elrenad-deploy"
ENTRYPOINT="/usr/local/sbin/deploy-elrenad"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./deploy/setup-ci-deploy-user.sh '<public-key>'" >&2
  exit 1
fi
if [ -z "$PUB_KEY" ]; then
  echo "Usage: $0 '<ssh-public-key-for-github-actions>'" >&2
  exit 1
fi

if ! id -u "$CI_USER" >/dev/null 2>&1; then
  echo "Creating CI deploy user '$CI_USER'..."
  useradd --create-home --shell /bin/bash "$CI_USER"
else
  echo "User '$CI_USER' already exists."
  # /usr/sbin/nologin refuses ALL command execution, including a single
  # non-interactive `ssh user@host cmd` — not just interactive logins. If an
  # earlier run of this script set that shell, fix it so CI can actually run
  # its one allowed command. The security boundary here is the sudoers rule
  # below (and this user's own low privilege), not the login shell.
  usermod --shell /bin/bash "$CI_USER"
fi

install -d -m 700 -o "$CI_USER" -g "$CI_USER" "/home/$CI_USER/.ssh"
AUTH_KEYS="/home/$CI_USER/.ssh/authorized_keys"
touch "$AUTH_KEYS"
grep -qxF "$PUB_KEY" "$AUTH_KEYS" 2>/dev/null || echo "$PUB_KEY" >> "$AUTH_KEYS"
chown "$CI_USER:$CI_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

# The CI user needs to `git pull` the repo before triggering a deploy, so it
# needs ownership of the working tree. This is safe precisely because the
# code that actually RUNS AS ROOT (below) is a separate, frozen, root-owned
# copy that this chown never touches.
chown -R "$CI_USER:$CI_USER" "$PROJECT_DIR"
sudo -u "$CI_USER" git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

# BUT: backend/.env and frontend/.env are gitignored (never touched by git,
# so the chown -R above is the only thing that ever reassigns them) and
# backend/.env MUST stay readable by the elrenad service user
# (deploy/lib/env.sh sets it to root:elrenad, mode 640, specifically so
# ONLY root and the elrenad group can read it). Leaving it owned by
# elrenad-ci:elrenad-ci — a user/group the elrenad service user isn't a
# member of — makes it unreadable to the running backend, which only
# surfaces the next time the service restarts (EACCES on backend/.env), not
# immediately. Restore it every time this script runs, idempotently.
ENV_FILE="$BACKEND_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  chown "root:$APP_GROUP" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
fi

# --- Sync the frozen, root-owned deploy copy -------------------------------
echo "Syncing frozen deploy copy: $PROJECT_DIR/deploy -> $FROZEN_DIR"
mkdir -p "$FROZEN_DIR"
rsync -a --delete "$PROJECT_DIR/deploy/" "$FROZEN_DIR/" 2>/dev/null || cp -a "$PROJECT_DIR/deploy/." "$FROZEN_DIR/"
chown -R root:root "$FROZEN_DIR"
find "$FROZEN_DIR" -type d -exec chmod 700 {} \;
find "$FROZEN_DIR" -type f -exec chmod 600 {} \;
chmod 700 "$FROZEN_DIR/deploy.sh"

cat > "$ENTRYPOINT" <<EOF
#!/usr/bin/env bash
# Root-owned CI deployment entrypoint for el-renad.com.
# NOT part of the git repository at $PROJECT_DIR — $CI_USER owns that repo
# working tree for git pull/checkout purposes, but has no write access to
# this file or to $FROZEN_DIR. This is the actual privilege boundary; see
# deploy/setup-ci-deploy-user.sh for why.
#
# To intentionally update the deployment logic this runs: review the change
# in $PROJECT_DIR/deploy/, then re-run (as root):
#   sudo $PROJECT_DIR/deploy/setup-ci-deploy-user.sh "<ci-pubkey>"
set -Eeuo pipefail
export ELRENAD_PROJECT_DIR="$PROJECT_DIR"
exec "$FROZEN_DIR/deploy.sh"
EOF
chown root:root "$ENTRYPOINT"
chmod 700 "$ENTRYPOINT"
bash -n "$ENTRYPOINT"
bash -n "$FROZEN_DIR/deploy.sh"

SUDOERS_FILE="/etc/sudoers.d/${CI_USER}"
cat > "$SUDOERS_FILE" <<EOF
# Managed by deploy/setup-ci-deploy-user.sh — do not edit by hand.
# Allows ONLY: sudo $ENTRYPOINT, with NO arguments.
# $ENTRYPOINT and $FROZEN_DIR are root-owned and outside the
# git-controlled $PROJECT_DIR working tree, so $CI_USER (which owns that
# working tree) cannot modify what this sudo rule actually executes as root.
${CI_USER} ALL=(root) NOPASSWD: ${ENTRYPOINT} ""
EOF
chmod 440 "$SUDOERS_FILE"
visudo -c -f "$SUDOERS_FILE"

echo "OK. '$CI_USER' can SSH in with the supplied key and run:"
echo "  ssh $CI_USER@<this-server> 'cd $PROJECT_DIR && git pull && sudo $ENTRYPOINT'"
echo "Nothing else — no other sudo command, no write access to $ENTRYPOINT or $FROZEN_DIR,"
echo "no access to /etc/elrenadtech (elrenad.tech's secrets) or elrenad.tech's files."
