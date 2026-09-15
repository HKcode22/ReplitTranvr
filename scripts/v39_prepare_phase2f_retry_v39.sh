#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
mkdir -p artifacts SEPmd

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
if [[ ! -f "$PREPROBE" ]]; then
  echo "BLOCKED:PREPROBE_ARTIFACT_MISSING=$PREPROBE"
  exit 1
fi

printf 'PHASE2F_RETRY_PREP_PAID_ACTION=false\n'
printf 'PHASE2F_RETRY_PREP_DEPLOYMENT=false\n'
printf 'STEP=offline_tests_and_typecheck\n'

npx vitest run \
  tests/prepaid_probe_runtime_v39.test.ts \
  tests/phase2f_live_failclosed_v39.test.ts \
  tests/phase2f_auth_contract_v39.test.ts \
  tests/phase2f_deployment_binding_v39.test.ts \
  tests/phase2f_workspace_ingress_binding_v39.test.ts \
  tests/phase2_handoff_v39.test.ts

npx tsc --noEmit

printf 'STEP=refresh_workspace_callback_current_head\n'
# This is a no-provider/no-deployment callback verification. It safely stops
# only the prior helper-owned callback process or a recognized repo dev server,
# then starts the exact current workspace code on the public replit.dev ingress.
bash scripts/v39_prepare_phase2f_workspace_callback_v39.sh

CALLBACK="$(ls -1t artifacts/phase2f-workspace-callback-verification-*.json 2>/dev/null | head -1 || true)"
if [[ -z "$CALLBACK" || ! -f "$CALLBACK" ]]; then
  echo 'BLOCKED:NO_FRESH_WORKSPACE_CALLBACK_RECEIPT'
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
INGRESS="artifacts/phase2f-workspace-ingress-binding-${STAMP}.json"
RUNTIME="artifacts/phase2f-smoke-runtime-${STAMP}.json"
AUTH_FILE="SEPmd/V3.9_PHASE2F_AUTH_${STAMP}.json"
PREP_RECEIPT="artifacts/phase2f-retry-prep-${STAMP}.json"

printf 'STEP=build_workspace_ingress_binding\n'
npx tsx scripts/v39_build_phase2f_workspace_ingress_binding_v39.ts \
  --receipt "$CALLBACK" \
  --out "$INGRESS"

printf 'STEP=freeze_smoke_runtime\n'
npx tsx scripts/v39_prepare_phase2f_smoke_runtime_v39.ts \
  --preprobe "$PREPROBE" \
  --out "$RUNTIME" \
  --pre-smoke-margin 50 \
  --settlement-initial-wait-s 30 \
  --settlement-poll-s 10 \
  --settlement-stable-reads 3 \
  --settlement-timeout-s 600 \
  --watchdog-poll-ms 5000

RUNTIME_SHA="$(sha256sum "$RUNTIME" | awk '{print $1}')"
if [[ ! "$RUNTIME_SHA" =~ ^[a-f0-9]{64}$ ]]; then
  echo 'BLOCKED:RUNTIME_FILE_SHA_INVALID'
  exit 1
fi

START="$(node -e 'process.stdout.write(new Date().toISOString())')"
EXPIRES="$(node -e 'process.stdout.write(new Date(Date.now()+2*60*60*1000).toISOString())')"
AUTH_ID="AUTH-${STAMP:0:8}-P2F${STAMP:9:6}"

printf 'STEP=create_draft_auth_not_authorized\n'
npx tsx scripts/v39_prepare_phase2f_auth_v39.ts \
  --auth "$AUTH_ID" \
  --icao WSSS \
  --minutes 5 \
  --alert-ceiling 100 \
  --start "$START" \
  --expires "$EXPIRES" \
  --cleanup-owner phase2f-workspace-smoke-owner \
  --out "$AUTH_FILE" \
  --preprobe "$PREPROBE" \
  --runtime-file "$RUNTIME" \
  --runtime-sha "$RUNTIME_SHA"

printf 'STEP=write_guarded_prep_receipt\n'
npx tsx scripts/v39_write_phase2f_retry_prep_receipt_v39.ts \
  --callback "$CALLBACK" \
  --ingress "$INGRESS" \
  --runtime "$RUNTIME" \
  --runtime-sha "$RUNTIME_SHA" \
  --auth "$AUTH_FILE" \
  --out "$PREP_RECEIPT"

printf '\nPHASE2F_RETRY_PREP=PASS_DRAFT_ONLY_NOT_AUTHORIZED\n'
printf 'PAID_ACTION_PERFORMED=false\n'
printf 'DEPLOYMENT_PERFORMED=false\n'
printf 'PAID_SMOKE_RUN=false\n'
printf 'AUTH_APPROVED=false\n'
printf 'NEXT=HUMAN_REVIEW_EXACT_AUTH_AND_SHA\n'
printf 'PREP_RECEIPT=%s\n' "$PREP_RECEIPT"
