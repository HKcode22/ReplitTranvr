#!/usr/bin/env bash
set -euo pipefail

# Phase 2B -> 2E closure after prerequisite-P PASS.
# This runner is intentionally FREE/provider-health only through Gate 1 and the
# frame's hash-matching coverage re-read. It performs no FIDS, refill,
# subscription mutation, safety smoke, or probe. It stops before Phase 2F.
#
# --resume-after-2c is only for a partial run where Gate 1 and the hash-locked
# reference freeze already succeeded. It validates that frozen chain and skips
# re-measuring Gate 1 so a retry cannot silently change the frozen inputs.

usage() {
  cat >&2 <<'EOF'
USAGE:
  bash scripts/v39_phase2b_e_close.sh \
    --auth AUTH-YYYYMMDD-ID \
    --auth-file path/to/gate1-auth.json \
    --evidence-id GATE-1-YYYYMMDD-ID \
    [--resume-after-2c]
EOF
  exit 2
}

AUTH=""
AUTH_FILE=""
EVIDENCE_ID=""
RESUME_AFTER_2C=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --auth) AUTH="${2:-}"; shift 2 ;;
    --auth-file) AUTH_FILE="${2:-}"; shift 2 ;;
    --evidence-id) EVIDENCE_ID="${2:-}"; shift 2 ;;
    --resume-after-2c) RESUME_AFTER_2C=1; shift ;;
    *) usage ;;
  esac
done

[[ "$AUTH" =~ ^AUTH-[0-9]{8}-[A-Z0-9]+$ ]] || usage
[[ "$EVIDENCE_ID" =~ ^GATE-1-[0-9]{8}-[A-Z0-9]+$ ]] || usage
[[ -n "$AUTH_FILE" && -f "$AUTH_FILE" ]] || usage
[[ -f artifacts/prepaid-security-retention-pass.json ]] || {
  echo "BLOCKED:PHASE2A_P_PASS_ARTIFACT_MISSING" >&2
  exit 1
}

# Phase 2A intentionally writes the restricted runtime credential only to the
# ignored local .env. A fresh shell does not inherit it, so load the ignored env
# for this runner if the credential is not already present. Do not print it.
if [[ -z "${V39_DATABASE_RUNTIME_URL:-}" && -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
[[ -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || {
  echo "BLOCKED:V39_DATABASE_RUNTIME_URL_REQUIRED_FOR_PHASE2D_2E" >&2
  exit 1
}

if [[ "$RESUME_AFTER_2C" -eq 0 ]]; then
  printf '%s\n' "[2B] Fresh Gate 1 coverage measurement (documented-free endpoints only)"
  npx tsx scripts/measure_coverage.ts \
    --auth "$AUTH" \
    --auth-file "$AUTH_FILE" \
    --evidence-id "$EVIDENCE_ID"

  printf '%s\n' "[2C] Materialize and verify the repository-pinned exogenous reference under binding f.8"
  npx tsx scripts/v39_materialize_pinned_traffic_reference_v39.ts

  printf '%s\n' "[2C] Write/reuse the hash-locked run-specific reference freeze"
  npx tsx scripts/v39_freeze_record_v39.ts reference
else
  printf '%s\n' "[2B/2C] Resume requested: validate existing frozen Gate-1/reference chain; do not re-measure Gate 1"
  node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha64 = /^[a-f0-9]{64}$/i;
const gate1 = read('artifacts/gate1-coverage.json');
const reference = read('artifacts/reference-freeze-record.json');
if (gate1.status !== 'PASS') throw new Error('BLOCKED:PHASE2B_EXISTING_GATE1_NOT_PASS');
if (!sha64.test(String(gate1.artifact_sha256 ?? ''))) throw new Error('BLOCKED:PHASE2B_EXISTING_GATE1_HASH_INVALID');
if (reference.status !== 'READY_FROZEN_REFERENCE') throw new Error('BLOCKED:PHASE2C_EXISTING_REFERENCE_NOT_READY');
if (!sha64.test(String(reference.artifact_sha256 ?? ''))) throw new Error('BLOCKED:PHASE2C_EXISTING_REFERENCE_HASH_INVALID');
if (reference.gate1_artifact_sha256 !== gate1.artifact_sha256) throw new Error('BLOCKED:PHASE2C_GATE1_BINDING_MISMATCH');
console.log(JSON.stringify({
  phase2b: 'PASS_REUSED_FROZEN',
  gate1_artifact_sha256: gate1.artifact_sha256,
  phase2c: 'PASS_REUSED_FROZEN',
  reference_freeze_artifact_sha256: reference.artifact_sha256,
}, null, 2));
NODE
fi

printf '%s\n' "[2D-preflight] Verify final-frame schema contract before any coverage re-read"
npx tsx scripts/v39_check_phase2d_schema_contract_v39.ts

printf '%s\n' "[2D] Rebuild/hash the final frame from frozen Gate-1 coverage + frozen reference"
npx tsx scripts/build_final_frame_v39.ts

printf '%s\n' "[2E] Write/reuse the hash-locked preprobe_reference_freeze_record"
npx tsx scripts/v39_freeze_record_v39.ts preprobe

node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gate1 = read('artifacts/gate1-coverage.json');
const reference = read('artifacts/reference-freeze-record.json');
const preprobe = read('artifacts/preprobe-reference-freeze-record.json');
if (gate1.status !== 'PASS') throw new Error('BLOCKED:PHASE2B_GATE1_NOT_PASS');
if (reference.status !== 'READY_FROZEN_REFERENCE') throw new Error('BLOCKED:PHASE2C_REFERENCE_FREEZE_NOT_READY');
if (preprobe.status !== 'READY_FROZEN_PREPROBE_REFERENCE') throw new Error('BLOCKED:PHASE2E_PREPROBE_NOT_READY');
if (reference.gate1_artifact_sha256 !== gate1.artifact_sha256) throw new Error('BLOCKED:PHASE2C_GATE1_BINDING_MISMATCH');
if (preprobe.gate1_artifact_sha256 !== gate1.artifact_sha256) throw new Error('BLOCKED:PHASE2E_GATE1_BINDING_MISMATCH');
if (!Array.isArray(preprobe.shortlist) || preprobe.shortlist.length !== 12) throw new Error('BLOCKED:PHASE2E_SHORTLIST_NOT_12');
if (!preprobe.shortlist.some((x) => x.icao === 'WSSS') || !preprobe.shortlist.some((x) => x.icao === 'OMAA')) {
  throw new Error('BLOCKED:PHASE2E_REQUIRED_ANCHORS_MISSING');
}
console.log(JSON.stringify({
  phase2b: 'PASS',
  gate1_artifact_sha256: gate1.artifact_sha256,
  phase2c: 'PASS',
  reference_freeze_artifact_sha256: reference.artifact_sha256,
  phase2d: 'PASS',
  frame_version: preprobe.frame_version,
  frame_hash: preprobe.frame_hash,
  phase2e: 'PASS',
  preprobe_artifact_sha256: preprobe.artifact_sha256,
  preprobe_file_sha256: sha('artifacts/preprobe-reference-freeze-record.json'),
  shortlist_count: preprobe.shortlist.length,
  next: 'MANDATORY STOP before separately authorized Phase 2F safety smoke',
}, null, 2));
NODE
