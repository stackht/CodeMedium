#!/usr/bin/env bash
#
# Code Medium - Oracle Cloud Always Free single-VM setup
#
# Runs the full stack on one always-free Oracle VM:
#   nginx (static frontend)  +  Node/Express backend  +  PostgreSQL
#
# Usage:
#   sudo bash setup.sh [project-path]
#
#   project-path  optional absolute path to an already-cloned copy of the repo.
#                 If omitted, the repo is cloned from GitHub.
#
# Re-running this script is safe: it pulls latest code and restarts services
# while preserving your database and backend/.env.

set -euo pipefail

APP_USER="${APP_USER:-ubuntu}"
APP_DIR="/opt/codemedium"
WEB_DIR="/var/www/codemedium"
REPO_URL="${REPO_URL:-https://github.com/stackht/CodeMedium.git}"
BRANCH="${BRANCH:-main}"
DB_USER="codemedium"
DB_NAME="codemedium"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash setup.sh"
  exit 1
fi

echo "==> Installing system packages (nginx, postgresql, git, build tools)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx postgresql postgresql-contrib git curl ca-certificates build-essential openssl

# Swap so `next build` survives on the 1GB micro instance.
if [ ! -f /swapfile ]; then
  echo "==> Creating 4G swap file..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node.js 22 LTS (NodeSource)
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  echo "==> Installing Node.js 22 via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node -v) / npm $(npm -v)"

# Tune PostgreSQL for low-memory instance
PG_CONF="$(sudo -u postgres psql -tAc 'SHOW config_file')"
if ! grep -q 'codemedium-tuned' "$PG_CONF"; then
  echo "==> Tuning PostgreSQL shared buffers..."
  sed -i "s/^#\?shared_buffers = .*/shared_buffers = 128MB # codemedium-tuned/" "$PG_CONF"
  sed -i "s/^#\?effective_cache_size = .*/effective_cache_size = 384MB # codemedium-tuned/" "$PG_CONF"
  systemctl restart postgresql
fi

# PostgreSQL role + database (password persisted so re-runs stay consistent)
echo "==> Creating PostgreSQL role/database..."
if [ -f /etc/codemedium-db-password ]; then
  DB_PASSWORD="$(cat /etc/codemedium-db-password)"
else
  DB_PASSWORD="$(openssl rand -hex 24)"
  echo "${DB_PASSWORD}" > /etc/codemedium-db-password
  chmod 600 /etc/codemedium-db-password
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
fi
if ! sudo -u postgres psql -lqt | cut -d '|' -f 1 | grep -qw "${DB_NAME}"; then
  sudo -u postgres createdb -O ${DB_USER} ${DB_NAME}
fi

# Get project code
if [ -n "${1:-}" ]; then
  echo "==> Copying project from $1 ..."
  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}"
  cp -a "$1"/. "${APP_DIR}"/
  rm -rf "${APP_DIR}/node_modules" "${APP_DIR}/backend/node_modules"
else
  if [ ! -d "${APP_DIR}/.git" ]; then
    echo "==> Cloning ${REPO_URL} ..."
    git clone -b "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  else
    echo "==> Pulling latest in ${APP_DIR} ..."
    git -C "${APP_DIR}" fetch origin
    git -C "${APP_DIR}" checkout "${BRANCH}"
    git -C "${APP_DIR}" pull
  fi
fi
chown -R "${APP_USER}":"${APP_USER}" "${APP_DIR}"

# Backend .env (only written once; edit it afterwards for real secrets)
ENV_FILE="${APP_DIR}/backend/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "==> Writing backend/.env ..."
  JWT_SECRET="$(openssl rand -hex 32)"
  cat > "${ENV_FILE}" <<EOF
PORT=8080
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
OTP_TTL_MINUTES=10
OTP_COOLDOWN_SECONDS=60
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=app-password
SMTP_FROM="Code Medium <your@email.com>"
BREVO_API_KEY=
ADMIN_USERNAME=root
ADMIN_PASSWORD=change-me
CORS_ORIGIN=
EOF
  chown "${APP_USER}":"${APP_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  echo "    !!! Edit ${ENV_FILE} and set SMTP / ADMIN_PASSWORD, then: sudo systemctl restart codemedium-backend"
fi

# Backend: deps, prisma client, migrations
echo "==> Installing backend dependencies + running migrations..."
cd "${APP_DIR}/backend"
sudo -u "${APP_USER}" npm ci
sudo -u "${APP_USER}" npm run prisma:generate
sudo -u "${APP_USER}" npx prisma migrate deploy

# Frontend: static export with same-origin /api base
echo "==> Building frontend (NEXT_PUBLIC_API_BASE_URL=/api)..."
cd "${APP_DIR}"
sudo -u "${APP_USER}" npm ci
sudo -u "${APP_USER}" env NEXT_PUBLIC_API_BASE_URL=/api NEXT_TELEMETRY_DISABLED=1 npm run build
rm -rf "${WEB_DIR}"
mkdir -p "${WEB_DIR}"
cp -a "${APP_DIR}/out/." "${WEB_DIR}/"
chown -R "${APP_USER}":"${APP_USER}" "${WEB_DIR}"

# nginx site
echo "==> Installing nginx site + systemd unit..."
cp "${APP_DIR}/deploy/oracle/nginx-codemedium.conf" /etc/nginx/sites-available/codemedium
ln -sf /etc/nginx/sites-available/codemedium /etc/nginx/sites-enabled/codemedium
rm -f /etc/nginx/sites-enabled/default
nginx -t

# systemd service
cp "${APP_DIR}/deploy/oracle/codemedium-backend.service" /etc/systemd/system/codemedium-backend.service
systemctl daemon-reload
systemctl enable --now codemedium-backend

systemctl reload nginx

sleep 2
echo ""
echo "==> Backend health check:"
curl -fsS http://127.0.0.1:8080/health || echo "WARN: backend not responding yet (check: sudo systemctl status codemedium-backend)"
echo ""
echo "==> Done. Next steps:"
echo "   1. Edit ${ENV_FILE} (SMTP credentials, ADMIN_USERNAME/ADMIN_PASSWORD, BREVO_API_KEY)"
echo "      then: sudo systemctl restart codemedium-backend"
echo "   2. Open http://$(hostname -I | awk '{print $1}') in a browser."
echo "   3. For HTTPS, attach a domain (A record -> this VM IP) then run:"
echo "      sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx"
