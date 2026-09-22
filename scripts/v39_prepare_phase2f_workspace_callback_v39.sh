#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

CURRENT_HEAD="$(git rev-parse HEAD | tr '[:upper:]' '[:lower:]')"
if [[ ! "$CURRENT_HEAD" =~ ^[a-f0-9]{40}$ ]]; then
  echo 'REFUSED:CURRENT_GIT_HEAD_INVALID'
  exit 1
fi

CURRENT_BUCKET="${V39_PROVIDER_BLOB_BUCKET_ID:-}"
case "$CURRENT_BUCKET" in
  replit-objstore-*) CORRECT_BUCKET="$CURRENT_BUCKET" ;;
  eplit-objstore-*) CORRECT_BUCKET="r${CURRENT_BUCKET}" ;;
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

if [[ -z "$DOMAIN" || "$DOMAIN" != *.replit.dev ]]; then
  echo 'REFUSED:NO_REPLIT_WORKSPACE_PUBLIC_DOMAIN'
  exit 1
fi
if [[ "$DOMAIN" == "travnr.com" || "$DOMAIN" == "www.travnr.com" ]]; then
  echo 'REFUSED:WORKSPACE_CALLBACK_RESOLVED_TO_PRODUCTION_DOMAIN'
  exit 1
fi
BASE="https://${DOMAIN}"

# IMPORTANT: do not kill or replace Replit's configured `npm run dev` owner of
# port 5000. The normal managed app now registers both the prepaid webhook route
# and the exact V3.9 workspace-health contract. This keeps the callback on the
# same lifecycle Replit itself restarts after a workspace/runtime replacement.
if ! (echo >/dev/tcp/127.0.0.1/5000) >/dev/null 2>&1; then
  echo 'REFUSED:WORKSPACE_PORT_5000_NOT_LISTENING'
  exit 1
fi

check_health() {
  local url="$1"
  local label="$2"
  URL="$url" EXPECTED_HEAD="$CURRENT_HEAD" LABEL="$label" node <<'NODE'
(async () => {
  const url = String(process.env.URL || "");
  const expectedHead = String(process.env.EXPECTED_HEAD || "").toLowerCase();
  const label = String(process.env.LABEL || "health");
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const ownerMode = String(json?.runtime_owner_mode || "");
  const ownerContract =
    (ownerMode === "replit-managed-project" &&
      json?.managed_replit_workflow === true &&
      json?.detached_workspace_server === false) ||
    (ownerMode === "phase2g-detached-npm-run-dev" &&
      json?.managed_replit_workflow === false &&
      json?.detached_workspace_server === true);
  const pass = response.status === 200 &&
    json?.schema === "v39.phase2f-workspace-runtime.v1" &&
    json?.status === "PASS" &&
    json?.prepaid_route_registered === true &&
    json?.provider_mutation === false &&
    ownerContract &&
    String(json?.git_head || "").toLowerCase() === expectedHead;
  if (!pass) {
    console.error(JSON.stringify({
      status: "REFUSED",
      reason: `${label.toUpperCase()}_WORKSPACE_HEALTH_CONTRACT_FAILED`,
      http_status: response.status,
      content_type: response.headers.get("content-type"),
      expected_git_head: expectedHead,
      observed: json ?? text.slice(0, 240),
    }, null, 2));
    process.exit(2);
  }
  console.log(JSON.stringify({
    status: "PASS",
    label,
    git_head: json.git_head,
    route_owner: json.route_owner,
    runtime_owner_mode: ownerMode,
    managed_replit_workflow: json.managed_replit_workflow === true,
    detached_workspace_server: json.detached_workspace_server === true,
  }));
})().catch((error) => {
  console.error(JSON.stringify({
    status: "REFUSED",
    reason: `${String(process.env.LABEL || "health").toUpperCase()}_WORKSPACE_HEALTH_REQUEST_FAILED`,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(2);
});
NODE
}

check_health "http://127.0.0.1:5000/__v39/workspace-runtime" "local"
check_health "$BASE/__v39/workspace-runtime" "public"

export V39_PROVIDER_BLOB_BUCKET_ID="$CORRECT_BUCKET"
export V39_PROVIDER_BLOB_MODE="required"
export V39_WORKSPACE_CALLBACK_BASE_URL="$BASE"
export V39_PUBLIC_WEBHOOK_BASE_URL="$BASE"
export WEBHOOK_BASE_URL="$BASE"

# Exercises wrong-secret rejection, correct-secret prepaid ingress, retention,
# and cleanup without creating a provider subscription or spending Alert credits.
npx tsx scripts/v39_verify_workspace_callback_v39.ts

echo
printf 'WORKSPACE_CALLBACK_PREP=PASS\n'
printf 'WORKSPACE_CALLBACK_BASE=%s\n' "$BASE"
OWNER_MODE="$(curl -fsS "http://127.0.0.1:5000/__v39/workspace-runtime" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).runtime_owner_mode||"unknown")}catch{console.log("unknown")}})')"
printf 'WORKSPACE_SERVER_OWNER_MODE=%s\n' "$OWNER_MODE"
printf 'WORKSPACE_SERVER_GIT_HEAD=%s\n' "$CURRENT_HEAD"
printf 'PORT_TAKEOVER_PERFORMED=false\n'
printf 'DEPLOYMENT_PERFORMED=false\n'
printf 'AERODATABOX_PROVIDER_CALLED=false\n'
printf 'ALERT_CREDITS_SPENT=0\n'