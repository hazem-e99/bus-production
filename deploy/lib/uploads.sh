#!/usr/bin/env bash
# Persistent storage for user-uploaded files (profile pictures, via multer's
# `./uploads` relative dir — see backend/src/modules/users/users.module.ts
# and backend/src/main.ts). We symlink backend/uploads into a directory
# outside the git checkout so redeploys (and `git clean`) can never touch
# uploaded files, and existing uploads are migrated in on first run rather
# than discarded.

ensure_uploads() {
  mkdir -p "$UPLOADS_PERSIST_DIR"
  chown -R "$APP_USER:$APP_GROUP" "$UPLOADS_PERSIST_DIR"
  chmod 750 "$UPLOADS_PERSIST_DIR"

  local link="$BACKEND_DIR/uploads"

  if [ -L "$link" ]; then
    local target
    target="$(readlink -f "$link")"
    if [ "$target" = "$(readlink -f "$UPLOADS_PERSIST_DIR")" ]; then
      log_ok "backend/uploads already links to persistent storage."
      return
    fi
    log_warn "backend/uploads points somewhere unexpected ($target) — leaving it as-is."
    return
  fi

  if [ -d "$link" ]; then
    log_info "Migrating existing backend/uploads contents into persistent storage (nothing is deleted)..."
    shopt -s dotglob nullglob
    for f in "$link"/*; do
      mv -n "$f" "$UPLOADS_PERSIST_DIR/"
    done
    shopt -u dotglob nullglob
    rmdir "$link" 2>/dev/null || {
      log_warn "backend/uploads is not empty after migration — leaving the directory in place instead of symlinking."
      return
    }
  fi

  ln -s "$UPLOADS_PERSIST_DIR" "$link"
  log_ok "backend/uploads -> $UPLOADS_PERSIST_DIR"
}
