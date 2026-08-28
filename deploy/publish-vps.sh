#!/usr/bin/env bash
set -Eeuo pipefail

# Build locally, upload a complete release, and atomically switch Caddy's document root.
# Usage: bash deploy/publish-vps.sh [user@host] [ssh-port]

REMOTE="${1:-${DEPLOY_SSH_TARGET:-}}"
SSH_PORT="${2:-${DEPLOY_SSH_PORT:-22}}"
SSH_IDENTITY_FILE="${DEPLOY_SSH_IDENTITY_FILE:-}"
REMOTE_ROOT="${DEPLOY_REMOTE_ROOT:-/var/www/mindnotespro}"
REMOTE_OWNER="${DEPLOY_REMOTE_OWNER:-}"
REMOTE_SUDO="${DEPLOY_REMOTE_SUDO-sudo -n}"
REMOTE_SUDO_PATTERN='^[-A-Za-z0-9._/ ]+$'

if [[ -z "$REMOTE" ]]; then
  echo "Usage: $0 user@server [ssh-port]" >&2
  exit 2
fi

if [[ ! "$REMOTE" =~ ^[A-Za-z0-9._-]+@([A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])$ ]]; then
  echo "SSH target must use the user@host format." >&2
  exit 2
fi

if [[ "$SSH_PORT" =~ [^0-9] || -z "$SSH_PORT" ]] ||
  ((10#$SSH_PORT < 1 || 10#$SSH_PORT > 65535)); then
  echo "SSH port must be an integer from 1 to 65535." >&2
  exit 2
fi

if [[ -n "$SSH_IDENTITY_FILE" && ! -f "$SSH_IDENTITY_FILE" ]]; then
  echo "DEPLOY_SSH_IDENTITY_FILE must point to a readable private key file." >&2
  exit 2
fi

if [[ ! "$REMOTE_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "DEPLOY_REMOTE_ROOT must be an absolute path containing only letters, numbers, dots, underscores, dashes, and slashes." >&2
  exit 2
fi

if [[ "$REMOTE_ROOT" == *//* || "$REMOTE_ROOT" == */./* || "$REMOTE_ROOT" == */../* ||
  "$REMOTE_ROOT" == */. || "$REMOTE_ROOT" == */.. ]]; then
  echo "DEPLOY_REMOTE_ROOT must not contain empty, dot, or parent-directory segments." >&2
  exit 2
fi

if [[ -n "$REMOTE_OWNER" && ! "$REMOTE_OWNER" =~ ^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$ ]]; then
  echo "DEPLOY_REMOTE_OWNER must use the user:group format." >&2
  exit 2
fi

REMOTE_USER="${REMOTE%@*}"
if [[ -n "$REMOTE_OWNER" && -z "$REMOTE_SUDO" && "${REMOTE_OWNER%%:*}" != "$REMOTE_USER" ]]; then
  echo "Without sudo, DEPLOY_REMOTE_OWNER user must match the SSH user ($REMOTE_USER)." >&2
  exit 2
fi

if [[ -n "$REMOTE_SUDO" && ! "$REMOTE_SUDO" =~ $REMOTE_SUDO_PATTERN ]]; then
  echo "DEPLOY_REMOTE_SUDO contains unsupported characters." >&2
  exit 2
fi

# Keep the shell command prefix explicit. An empty value is valid for root SSH;
# non-root accounts can use `sudo -n` when the release directory is root-owned.
SUDO_PREFIX="${REMOTE_SUDO:+$REMOTE_SUDO }"
SSH_ARGS=(-p "$SSH_PORT")
if [[ -n "$SSH_IDENTITY_FILE" ]]; then
  SSH_ARGS+=(-i "$SSH_IDENTITY_FILE")
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "Building for the root domain (VITE_APP_BASE=/)"
  VITE_APP_BASE=/ npm run build
fi

if [[ ! -f dist/index.html || ! -f dist/sw.js ]]; then
  echo "dist/ is missing or incomplete; run VITE_APP_BASE=/ npm run build first." >&2
  exit 2
fi

if grep -q '/mindnotes-pro/' dist/index.html; then
  echo "dist/index.html still contains the GitHub Pages /mindnotes-pro/ base path." >&2
  echo "Rebuild with VITE_APP_BASE=/ and retry." >&2
  exit 2
fi

release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD 2>/dev/null || echo manual)-$$"
remote_release="$REMOTE_ROOT/releases/$release_id"
remote_upload="$REMOTE_ROOT/releases/.upload-$release_id"
remote_link="$REMOTE_ROOT/.current-$release_id"

CHOWN_COMMAND=""
if [[ -n "$REMOTE_OWNER" ]]; then
  CHOWN_COMMAND="${SUDO_PREFIX}chown -R '$REMOTE_OWNER' '$remote_upload' && "
fi

echo "Uploading dist/ to $REMOTE:$remote_release"
ssh "${SSH_ARGS[@]}" "$REMOTE" "${SUDO_PREFIX}test -d '$REMOTE_ROOT/releases' && ${SUDO_PREFIX}test ! -e '$remote_release' && ${SUDO_PREFIX}test ! -e '$remote_upload' && ${SUDO_PREFIX}install -d -m 0755 '$remote_upload'"
if ! tar -C dist -czf - . | ssh "${SSH_ARGS[@]}" "$REMOTE" "${SUDO_PREFIX}tar -xzf - -C '$remote_upload'"; then
  echo "Upload failed; current remains unchanged. Remove the incomplete $remote_upload before retrying." >&2
  exit 1
fi
ssh "${SSH_ARGS[@]}" "$REMOTE" "${SUDO_PREFIX}find '$remote_upload' -type d -exec chmod 0755 {} + && ${SUDO_PREFIX}find '$remote_upload' -type f -exec chmod 0644 {} + && ${CHOWN_COMMAND}${SUDO_PREFIX}mv -T '$remote_upload' '$remote_release' && ${SUDO_PREFIX}rm -f '$remote_link' && ${SUDO_PREFIX}ln -s '$remote_release' '$remote_link' && ${SUDO_PREFIX}mv -Tf '$remote_link' '$REMOTE_ROOT/current'"
echo "Published $release_id"
