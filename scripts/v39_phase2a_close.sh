#!/usr/bin/env bash
set -euo pipefail

# Phase 2A prerequisite-P production closure.
# NO AeroDataBox REST/FIDS/subscription/refill/smoke/probe call is made here.
# This script only binds/verifies local production security + retention storage.

need() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "BLOCKED:${name}_REQUIRED" >&2
    exit 1
  fi
}

need V39_PRODUCTION_DATABASE_OWNER_URL
need V39_PROVIDER_BLOB_BUCKET_ID
need V39_DATABASE_TARGET_CONFIRM
need V39_PUBLIC_WEBHOOK_BASE_URL
need V39_PHASE2_OWNER_APPROVED

if [[ "${V39_DATABASE_TARGET_CONFIRM,,}" != "production" ]]; then
  echo "BLOCKED:V39_DATABASE_TARGET_CONFIRM_must_equal_production" >&2
  exit 1
fi
if [[ "${V39_PHASE2_OWNER_APPROVED}" != "1" ]]; then
  echo "BLOCKED:V39_PHASE2_OWNER_APPROVED_must_equal_1" >&2
  exit 1
fi
if [[ "${V39_PUBLIC_WEBHOOK_BASE_URL}" != https://* ]]; then
  echo "BLOCKED:V39_PUBLIC_WEBHOOK_BASE_URL_must_be_https" >&2
  exit 1
fi

# Preserve the caller-confirmed production bindings. Sourcing generated .env
# evidence must never silently replace these with stale duplicate lines.
CALLER_V39_PRODUCTION_DATABASE_OWNER_URL="$V39_PRODUCTION_DATABASE_OWNER_URL"
CALLER_V39_PROVIDER_BLOB_BUCKET_ID="$V39_PROVIDER_BLOB_BUCKET_ID"
CALLER_V39_PUBLIC_WEBHOOK_BASE_URL="$V39_PUBLIC_WEBHOOK_BASE_URL"

# Older Phase-2A retries could leave duplicate generated evidence keys in .env.
# The writers update the first matching line, while `source .env` uses the last
# matching line. That allowed stale role/webhook/retention evidence to override
# freshly generated evidence. Canonicalize managed keys to their first (freshly
# updated) occurrence before every reload.
canonicalize_generated_env() {
  [[ -f .env ]] || return 0
  local tmp
  tmp="$(mktemp .env.v39.XXXXXX)"
  awk '
    BEGIN {
      split("V39_DATABASE_RUNTIME_URL V39_DB_ROLE_EVIDENCE V39_WEBHOOK_SECURITY_EVIDENCE WEBHOOK_BASE_URL V39_PHASE2_RETENTION_SCOPE_EVIDENCE V39_RETENTION_DEPLOYMENT_EVIDENCE V39_PROVIDER_BLOB_MODE V39_PREPAID_RAW_RETENTION_HOURS V39_PHASE2_RETENTION_APPLY_ARMED", keys, " ")
      for (i in keys) managed[keys[i]] = 1
    }
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      key = $0
      sub(/=.*/, "", key)
      if (managed[key]) {
        if (seen[key]++) next
      }
    }
    { print }
  ' .env > "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" .env
}

load_generated_env() {
  canonicalize_generated_env
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  # Caller-supplied production bindings are authoritative and must survive any
  # generated local evidence reload.
  export V39_PRODUCTION_DATABASE_OWNER_URL="$CALLER_V39_PRODUCTION_DATABASE_OWNER_URL"
  export V39_PROVIDER_BLOB_BUCKET_ID="$CALLER_V39_PROVIDER_BLOB_BUCKET_ID"
  export V39_DATABASE_TARGET_CONFIRM=production
  export V39_PUBLIC_WEBHOOK_BASE_URL="$CALLER_V39_PUBLIC_WEBHOOK_BASE_URL"
  export V39_PHASE2_OWNER_APPROVED=1
}

# Canonicalize any stale duplicate generated evidence left by prior retries
# before the first production-role verification.
load_generated_env

printf '%s\n' "[2A/5] Provision/reconcile least-privilege production runtime role"
npx tsx scripts/provision_runtime_role_v39.ts
load_generated_env

printf '%s\n' "[2A/5] Configure/verify HTTPS secret webhook evidence"
npx tsx scripts/configure_webhook_evidence_v39.ts
load_generated_env

printf '%s\n' "[2A/5] Prepare owner-approved Phase-2 retention evidence (destructive apply remains OFF)"
npx tsx scripts/prepare_phase2_p_evidence_v39.ts --owner-approved
load_generated_env

# Explicitly force the isolated blob boundary required by P. The evidence
# preparer writes this too; repeat here so subprocess inheritance is unambiguous.
export V39_PROVIDER_BLOB_MODE=required
export V39_PREPAID_RAW_RETENTION_HOURS=168
export V39_PHASE2_RETENTION_APPLY_ARMED=0

printf '%s\n' "[2A/5] Run live prerequisite-P verification (synthetic bucket write/read/delete/absence + runtime checks)"
npx tsx scripts/v39_security_verify_v39.ts

printf '%s\n' "[2A/5] Record cryptographic prerequisite-P PASS from the fresh receipt"
npx tsx scripts/v39_record_p_pass_v39.ts

node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync('artifacts/prepaid-security-retention-pass.json', 'utf8'));
if (p.status !== 'PASS' || !/^[a-f0-9]{64}$/.test(String(p.artifact_sha256 || ''))) {
  throw new Error('BLOCKED:PHASE2A_PASS_ARTIFACT_INVALID');
}
console.log(JSON.stringify({
  phase: '2A',
  status: 'PASS',
  artifact_sha256: p.artifact_sha256,
  verified_at_utc: p.verified_at_utc,
  next: 'Phase 2B fresh Gate 1 coverage',
}, null, 2));
NODE
