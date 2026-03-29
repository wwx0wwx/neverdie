#!/usr/bin/env bash
set -euo pipefail

# NeverDie Panel — one-line installer
# Usage:
#   First panel:  bash install.sh
#   Join cluster: bash install.sh --panel-id <id> --panel-secret <secret> --bootstrap https://<existing-panel>

PANEL_ID=""
PANEL_SECRET_ARG=""
BOOTSTRAP_URL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --panel-id)     PANEL_ID="$2";          shift 2 ;;
    --panel-secret) PANEL_SECRET_ARG="$2";  shift 2 ;;
    --bootstrap)    BOOTSTRAP_URL="$2";     shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Detect OS ────────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="$ID"
else
  echo "Cannot detect OS"; exit 1
fi

install_pkg() {
  case "$OS_ID" in
    ubuntu|debian) apt-get install -y "$@" ;;
    centos|rhel|fedora) yum install -y "$@" ;;
    *) echo "Unsupported OS: $OS_ID"; exit 1 ;;
  esac
}

echo "[neverdie] Detected OS: $OS_ID"

# ── Install Node.js 24 ───────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node --version)" != v24* ]]; then
  echo "[neverdie] Installing Node.js 24..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  install_pkg nodejs
fi

# ── Install pnpm ─────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "[neverdie] Installing pnpm..."
  npm install -g pnpm
fi

# ── Install nginx ────────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "[neverdie] Installing nginx..."
  install_pkg nginx
fi

# ── Clone / update repo ──────────────────────────────────────────────────────
INSTALL_DIR="/opt/neverdie"
REPO_URL="https://github.com/YOUR_ORG/neverdie.git"  # ← update before use

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "[neverdie] Updating existing install..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "[neverdie] Cloning repository..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
pnpm install --frozen-lockfile
pnpm build

# ── Interactive config if first-panel install ─────────────────────────────────
ENV_FILE="$INSTALL_DIR/apps/panel/.env"

if [ ! -f "$ENV_FILE" ]; then
  cp "$INSTALL_DIR/apps/panel/.env.example" "$ENV_FILE"

  read -rp "Panel domain (e.g. panel.example.com): " DOMAIN
  read -rp "Peer panel URLs (comma-separated, leave blank if first panel): " PEERS

  JWT_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
  P_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")

  sed -i "s|PANEL_DOMAIN=panel.example.com|PANEL_DOMAIN=$DOMAIN|" "$ENV_FILE"
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
  sed -i "s|PANEL_SECRET=.*|PANEL_SECRET=$P_SECRET|" "$ENV_FILE"
  [ -n "$PEERS" ] && sed -i "s|PANEL_PEERS=.*|PANEL_PEERS=$PEERS|" "$ENV_FILE"

  # Inject join-cluster args if provided
  if [ -n "$PANEL_ID" ]; then
    echo "PANEL_PEER_ID=$PANEL_ID" >> "$ENV_FILE"
  fi
  if [ -n "$PANEL_SECRET_ARG" ]; then
    sed -i "s|PANEL_SECRET=.*|PANEL_SECRET=$PANEL_SECRET_ARG|" "$ENV_FILE"
  fi
  if [ -n "$BOOTSTRAP_URL" ]; then
    sed -i "s|PANEL_PEERS=.*|PANEL_PEERS=$BOOTSTRAP_URL|" "$ENV_FILE"
  fi
fi

# ── Read domain from .env for nginx ─────────────────────────────────────────
DOMAIN=$(grep '^PANEL_DOMAIN=' "$ENV_FILE" | cut -d= -f2)

# ── Write nginx config ───────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/neverdie"
cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass         http://127.0.0.1:41731;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/neverdie
nginx -t && systemctl reload nginx

# ── Systemd service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/neverdie-panel.service <<EOF
[Unit]
Description=NeverDie Panel
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR/apps/panel
EnvironmentFile=$ENV_FILE
ExecStart=$(which node) --experimental-sqlite dist-server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now neverdie-panel

echo ""
echo "[neverdie] ✓ Panel installed and running."
echo "[neverdie]   Open http://$DOMAIN and complete setup."
