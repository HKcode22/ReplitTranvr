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

load_generated_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  # Caller-supplied production bindings are authoritative and must survive any
  # generated local evidence reload.
  export V39_PRODUCTION_DATABASE_OWNER_URL
  export V39_PROVIDER_BLOB_BUCKET_ID
  export V39_DATABASE_TARGET_CONFIRM=production
  export V39_PUBLIC_WEBHOOK_BASE_URL
  export V39_PHASE2_OWNER_APPROVED=1
}

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
