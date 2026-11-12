#!/usr/bin/env bash
# ==============================================================================
# Hangover Backend: PM2 to Production Docker Compose Cutover Script
# Target Downtime: < 2 minutes (Budget: < 10 minutes)
# ==============================================================================
set -euo pipefail

START_TIME=$(date +%s)
echo "============================================================"
echo " Starting Hangover PM2 -> Docker Compose Cutover"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "============================================================"

# Ensure we are in the server deployment directory
SERVER_DIR="${SERVER_DIR:-$HOME/server}"
cd "$SERVER_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
if [ ! -f "$COMPOSE_FILE" ]; then
  if [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
  else
    echo "[-] ERROR: Neither docker-compose.prod.yml nor docker-compose.yml found in $SERVER_DIR"
    exit 1
  fi
fi
echo "[+] Using Compose file: $COMPOSE_FILE"

if [ ! -f ".env" ]; then
  echo "[-] ERROR: .env file not found in $SERVER_DIR"
  exit 1
fi

# Ensure DATABASE_URL uses internal Docker network host (postgres:5432)
sed -i -e 's|@localhost:5433/|@postgres:5432/|g' \
       -e 's|@127.0.0.1:5433/|@postgres:5432/|g' \
       -e 's|@localhost:5432/|@postgres:5432/|g' \
       -e 's|@127.0.0.1:5432/|@postgres:5432/|g' .env

# Load environment configuration safely
PORT=$(grep -E '^PORT=' .env | cut -d '=' -f2 | tr -d '\r"' || echo "8080")
PORT=${PORT:-8080}
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d '=' -f2 | tr -d '\r"' || echo "admin")
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d '=' -f2 | tr -d '\r"' || echo "hangover")

# ------------------------------------------------------------------------------
# Phase A: Preparation & Pre-flight Inspection
# ------------------------------------------------------------------------------
echo ""
echo "[*] Phase A: Pre-flight Verification & Backup"

# 1. Verify existing PostgreSQL container
if docker ps -a --format '{{.Names}}' | grep -q "^hangover-postgres$"; then
  echo "[+] Found existing hangover-postgres container."
else
  echo "[-] WARNING: hangover-postgres container not found running by exact name."
fi

# 2. Verify volume existence
if docker volume ls --format '{{.Name}}' | grep -q "^server_postgres_data$"; then
  echo "[+] Verified existing Docker volume: server_postgres_data"
else
  echo "[-] ERROR: server_postgres_data volume not found! Aborting to prevent data loss."
  exit 1
fi

# 3. Create a timestamped logical database backup
BACKUP_FILE="$HOME/backup_hangover_$(date +%Y%m%d_%H%M%S).sql"
echo "[+] Creating logical PostgreSQL backup at: $BACKUP_FILE"
docker exec hangover-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

# Verify backup size
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[-] ERROR: PostgreSQL backup file is empty! Aborting cutover."
  exit 1
fi
BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "[+] Backup successfully verified! Size: $BACKUP_SIZE"

# 4. Pull release images if specified
if [ -n "${BACKEND_IMAGE:-}" ]; then
  echo "[+] Pulling backend release image: $BACKEND_IMAGE"
  docker pull "$BACKEND_IMAGE"
fi
if [ -n "${MIGRATE_IMAGE:-}" ]; then
  echo "[+] Pulling migrate release image: $MIGRATE_IMAGE"
  docker pull "$MIGRATE_IMAGE"
fi

# ------------------------------------------------------------------------------
# Phase B: Database Transition
# ------------------------------------------------------------------------------
echo ""
echo "[*] Phase B: Database Transition"

# Stop existing standalone container
echo "[+] Stopping old standalone postgres container..."
docker stop hangover-postgres || true
echo "[+] Removing old standalone container metadata (preserving volume server_postgres_data)..."
docker rm hangover-postgres || true

# Bring up PostgreSQL under Compose management
echo "[+] Starting PostgreSQL via Docker Compose..."
docker compose -f "$COMPOSE_FILE" up -d postgres

# Wait for PostgreSQL healthcheck
echo "[+] Waiting for PostgreSQL to be healthy..."
PG_HEALTHY=0
for i in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" ps postgres --filter "status=running" | grep -q "healthy"; then
    echo "[+] PostgreSQL is healthy and accepting connections!"
    PG_HEALTHY=1
    break
  fi
  sleep 1
done

if [ "$PG_HEALTHY" -ne 1 ]; then
  echo "[-] ERROR: PostgreSQL container failed to become healthy. Check logs:"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 postgres
  exit 1
fi

# Quick connectivity & table check
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT current_database(), count(*) FROM pg_tables WHERE schemaname='public';"

# ------------------------------------------------------------------------------
# Phase C: Application Transition & Migrations
# ------------------------------------------------------------------------------
echo ""
echo "[*] Phase C: Application Transition & Migrations"

# 1. Run migrations using one-shot container
echo "[+] Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" run --rm migrate

# 2. Decommission PM2 process to release port 8080
if command -v pm2 > /dev/null 2>&1; then
  if pm2 list | grep -q "hangover-api"; then
    echo "[+] Stopping and deleting PM2 process hangover-api..."
    pm2 stop hangover-api || true
    pm2 delete hangover-api || true
    pm2 save || true
    echo "[+] PM2 process successfully decommissioned."
  fi
fi

# 3. Start Backend via Docker Compose
echo "[+] Starting Backend container under Docker Compose..."
docker compose -f "$COMPOSE_FILE" up -d backend

# 4. Poll health check endpoint
echo "[+] Polling application health endpoint at http://127.0.0.1:${PORT}/health..."
APP_HEALTHY=0
for i in {1..30}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" || true)
  if [ "$STATUS" = "200" ]; then
    echo "[+] Backend is healthy (HTTP 200)!"
    APP_HEALTHY=1
    break
  fi
  echo "    Waiting for backend /health (HTTP $STATUS)... ($i/30)"
  sleep 2
done

if [ "$APP_HEALTHY" -ne 1 ]; then
  echo "[-] ERROR: Backend failed health verification. Container logs:"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 backend
  exit 1
fi

# ------------------------------------------------------------------------------
# Phase D: Completion & Verification
# ------------------------------------------------------------------------------
echo ""
echo "[*] Phase D: Final Verification"

echo "[+] Current Docker Compose services:"
docker compose -f "$COMPOSE_FILE" ps

echo "[+] Checking PM2 status:"
if command -v pm2 > /dev/null 2>&1; then
  pm2 list
fi

echo "[+] Cleaning up dangling images..."
docker image prune -f

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "============================================================"
echo " Hangover Cutover Successfully Completed!"
echo " Total Elapsed Time: ${ELAPSED} seconds"
echo " Backup file saved at: $BACKUP_FILE"
echo "============================================================"
