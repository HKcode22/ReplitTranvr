#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

mkdir -p artifacts
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PID_FILE="artifacts/phase2f-workspace-v3-server.pid"
LOG_FILE="artifacts/phase2f-workspace-v3-server-${STAMP}.log"

CURRENT_BUCKET="${V39_PROVIDER_BLOB_BUCKET_ID:-}"
case "$CURRENT_BUCKET" in
  replit-objstore-*)
    CORRECT_BUCKET="$CURRENT_BUCKET"
    ;;
  eplit-objstore-*)
    CORRECT_BUCKET="r${CURRENT_BUCKET}"
    ;;
  *)
    echo 'REFUSED:V39_PROVIDER_BLOB_BUCKET_ID_UNEXPECTED_OR_MISSING'
    exit 1
    ;;
esac

DOMAIN=""
if [[ -n "${REPLIT_DEV_DOMAIN:-}" ]]; then
  DOMAIN="${REPLIT_DEV_DOMAIN#https://}"
  DOMAIN="${DOMAIN#http://}"
  DOMAIN="${DOMAIN%%/*}"
fi

if [[ -z "$DOMAIN" && -n "${REPLIT_DOMAINS:-}" ]]; then
  IFS=',' read -ra DOMAINS <<< "$REPLIT_DOMAINS"
  for raw in "${DOMAINS[@]}"; do
    d="${raw#https://}"
    d="${d#http://}"
    d="${d%%/*}"
    if [[ "$d" == *.replit.dev ]]; then
      DOMAIN="$d"
      break
    fi
  done
fi

if [[ -z "$DOMAIN" ]]; then
  echo 'REFUSED:NO_REPLIT_WORKSPACE_PUBLIC_DOMAIN'
  echo "REPLIT_DEV_DOMAIN_PRESENT=$([[ -n "${REPLIT_DEV_DOMAIN:-}" ]] && echo yes || echo no)"
  echo "REPLIT_DOMAINS_PRESENT=$([[ -n "${REPLIT_DOMAINS:-}" ]] && echo yes || echo no)"
  exit 1
fi

BASE="https://${DOMAIN}"
if [[ "$DOMAIN" == "travnr.com" || "$DOMAIN" == "www.travnr.com" ]]; then
  echo 'REFUSED:WORKSPACE_CALLBACK_RESOLVED_TO_PRODUCTION_DOMAIN'
  exit 1
fi

# Stop only a prior callback server that this helper itself started.
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ "$OLD_PID" =~ ^[0-9]+$ ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$OLD_PID" 2>/dev/null; then break; fi
      sleep 0.25
    done
  fi
  rm -f "$PID_FILE"
fi

# If port 5000 is occupied, invoke the guarded takeover helper. It will stop
# ONLY a repo-owned, recognized Replit dev process (npm run dev / tsx server/index.ts)
# and will refuse any unknown process. No blind fuser/pkill/process-group kill.
if (echo >/dev/tcp/127.0.0.1/5000) >/dev/null 2>&1; then
  echo 'PORT_5000_BUSY=YES'
  npx tsx scripts/v39_safe_takeover_port5000_v39.ts
fi

# Refuse if anything still owns the port after the guarded takeover attempt.
if (echo >/dev/tcp/127.0.0.1/5000) >/dev/null 2>&1; then
  echo 'REFUSED:PORT_5000_STILL_IN_USE_AFTER_GUARDED_TAKEOVER'
  exit 1
fi

nohup env \
  NODE_ENV=development \
  PORT=5000 \
  V39_PROVIDER_BLOB_BUCKET_ID="$CORRECT_BUCKET" \
  V39_PROVIDER_BLOB_MODE="required" \
  V39_PUBLIC_WEBHOOK_BASE_URL="$BASE" \
  WEBHOOK_BASE_URL="$BASE" \
  npx tsx scripts/v39_workspace_v3_server_v39.ts \
  >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

LOCAL_OK=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 2 "http://127.0.0.1:5000/__v39/workspace-runtime" >/dev/null 2>&1; then
    LOCAL_OK=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if [[ "$LOCAL_OK" -ne 1 ]]; then
  echo 'REFUSED:WORKSPACE_CALLBACK_SERVER_DID_NOT_START'
  echo "SERVER_LOG=$LOG_FILE"
  tail -80 "$LOG_FILE" || true
  exit 1
fi

PUBLIC_OK=0
for _ in $(seq 1 40); do
  if curl -fsS --max-time 3 "$BASE/__v39/workspace-runtime" >/dev/null 2>&1; then
    PUBLIC_OK=1
    break
  fi
  sleep 0.75
done

if [[ "$PUBLIC_OK" -ne 1 ]]; then
  echo 'REFUSED:WORKSPACE_PUBLIC_DOMAIN_NOT_REACHABLE'
  echo "WORKSPACE_CALLBACK_BASE=$BASE"
  echo "SERVER_LOG=$LOG_FILE"
  exit 1
fi

export V39_PROVIDER_BLOB_BUCKET_ID="$CORRECT_BUCKET"
export V39_PROVIDER_BLOB_MODE="required"
export V39_WORKSPACE_CALLBACK_BASE_URL="$BASE"
export V39_PUBLIC_WEBHOOK_BASE_URL="$BASE"
export WEBHOOK_BASE_URL="$BASE"

npx tsx scripts/v39_verify_workspace_callback_v39.ts

echo
printf 'WORKSPACE_CALLBACK_PREP=PASS\n'
printf 'WORKSPACE_CALLBACK_BASE=%s\n' "$BASE"
printf 'WORKSPACE_SERVER_PID=%s\n' "$SERVER_PID"
printf 'WORKSPACE_SERVER_LOG=%s\n' "$LOG_FILE"
printf 'DEPLOYMENT_PERFORMED=false\n'
printf 'AERODATABOX_PROVIDER_CALLED=false\n'
printf 'ALERT_CREDITS_SPENT=0\n'
