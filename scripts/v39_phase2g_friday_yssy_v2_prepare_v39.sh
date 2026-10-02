#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
PREPROBE_SHA="b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870"

SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"

AMENDMENT="artifacts/phase2g-compact6-early-pilot-scope-reduction-freeze-20261002.json"
EXPECTED_AMENDMENT_GIT_BLOB="2a87f483263217a77733c548f916adfbcf609f59"

EXPECTED_ICAO="YSSY"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20261002-18.json"
BUDGET="P2G-S1-20261002-18"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20261002_P2G19.json"
AUTH_ID="AUTH-20261002-P2G19"
AUTH_START="2026-10-02T11:00:00Z"
AUTH_EXPIRES="2026-10-02T15:10:00Z"

require_repo_state() {
  [[ "$(git branch --show-current)" == "main" ]] || {
    echo "REFUSED:WRONG_BRANCH expected=main current=$(git branch --show-current)"
    exit 2
  }

  git fetch origin main >/dev/null 2>&1

  local head remote protected
  head="$(git rev-parse HEAD)"
  remote="$(git rev-parse origin/main)"

  [[ "$head" == "$remote" ]] || {
    echo "REFUSED:LOCAL_MAIN_NOT_SYNCED"
    echo "local_head=$head"
    echo "origin_main=$remote"
    exit 2
  }

  protected="$(
    git status --porcelain=v1 --untracked-files=all --       server scripts migrations tests .github/workflows
  )"

  [[ -z "$protected" ]] || {
    echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
    printf '%s\n' "$protected"
    exit 2
  }

  echo "SOURCE_STATE=PASS"
  echo "GIT_HEAD=$head"
  echo "GIT_TREE=$(git rev-parse HEAD^{tree})"
}

verify_scope_freeze() {
  [[ -f "$AMENDMENT" ]] || {
    echo "REFUSED:EARLY_PILOT_SCOPE_FREEZE_MISSING=$AMENDMENT"
    exit 2
  }

  local blob sha
  blob="$(git hash-object "$AMENDMENT")"
  sha="$(sha256sum "$AMENDMENT" | awk '{print $1}')"

  [[ "$blob" == "$EXPECTED_AMENDMENT_GIT_BLOB" ]] || {
    echo "REFUSED:EARLY_PILOT_SCOPE_GIT_BLOB_MISMATCH"
    echo "expected_blob=$EXPECTED_AMENDMENT_GIT_BLOB"
    echo "actual_blob=$blob"
    exit 2
  }

  node --input-type=module - "$AMENDMENT" <<'NODE'
import fs from "node:fs";
const p=process.argv[2];
const j=JSON.parse(fs.readFileSync(p,"utf8"));
const s=j?.early_pilot_scope_reduction;
if (
  j?.status !== "READY_FROZEN_COMPACT6_AMENDMENT" ||
  s?.authorized !== true ||
  s?.scope_version !== "v39-phase2g-early-pilot-scope-reduction-1" ||
  JSON.stringify(s?.ordered_new_targets) !== JSON.stringify(["YSSY","SKBO"]) ||
  JSON.stringify(s?.deferred_icaos) !== JSON.stringify(["LKPR"]) ||
  s?.no_automatic_retry_after_new_target !== true ||
  s?.target_selection_uses_preoutcome_frozen_attributes !== true ||
  s?.outcome_informed_scope_change !== true
) {
  console.error("REFUSED:EARLY_PILOT_SCOPE_CONTRACT");
  process.exit(2);
}
NODE

  echo "EARLY_PILOT_SCOPE_GIT_BLOB=$blob"
  echo "EARLY_PILOT_SCOPE_SHA256=$sha"
}

case "${1:-help}" in
  static)
    require_repo_state
    verify_scope_freeze

    npx vitest run       tests/phase2g_early_pilot_scope_v39.test.ts       tests/phase2g_compact6_reconciliation_v39.test.ts       tests/phase2g_p2g17_mmun_recovery_v39.test.ts       tests/phase2g_stage1_persistent_launch_v39.test.ts       tests/phase2g_stage1_rerun_policy_v39.test.ts       tests/phase2g_source_head_auth_binding_v39.test.ts       tests/phase2g_zero_credit_callback_binding_v39.test.ts       tests/phase2g_historical_failure_regressions_v39.test.ts       tests/phase2g_boot_migration_v39.test.ts       tests/phase2g_scientific_health_v39.test.ts       tests/phase2g_scientific_observability_wiring_v39.test.ts       tests/phase2g_unlogged_runtime_integrity_v39.test.ts       tests/prepaid_identity_adapter_v39.test.ts       tests/prepaid_identity_persistence_v39.test.ts       tests/prepaid_identity_resolution_v39.test.ts       tests/prepaid_physical_metrics_v39.test.ts       tests/anchor_promotion_v39.test.ts

    npx tsc --noEmit

    echo "FRIDAY_YSSY_V2_STATIC=PASS"
    ;;

  selector)
    require_repo_state
    verify_scope_freeze

    echo "provider_calls=0"
    echo "provider_mutations=0"
    echo "database_mutations=0"

    node --import tsx --input-type=module <<'NODE'
import {
  loadFrozenProbeArtifact,
} from "./server/lib/disruption/anchorPromotion_v39.ts";
import {
  loadPhase2gCompact6AmendmentV39,
} from "./server/lib/disruption/phase2Compact6_v39.ts";
import {
  readStage1EvidenceV39,
  chooseNextStage1TargetV39,
} from "./scripts/v39_probe_stage1_owner_v39.ts";
import {
  v39Pool as pool,
} from "./server/lib/disruption/db_v39.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const preprobePath="artifacts/preprobe-reference-freeze-record.json";
const preprobeSha="b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";
const amendmentPath="artifacts/phase2g-compact6-early-pilot-scope-reduction-freeze-20261002.json";
const amendmentSha=createHash("sha256")
  .update(readFileSync(amendmentPath))
  .digest("hex");

try {
  const {artifact:preprobe}=loadFrozenProbeArtifact(
    preprobePath,
    preprobeSha,
  );
  const compact=loadPhase2gCompact6AmendmentV39({
    expectedSha256:amendmentSha,
    sourcePreprobeFileSha256:preprobeSha,
    preprobe,
    path:amendmentPath,
  });
  const evidence=await readStage1EvidenceV39(preprobeSha);
  const next=chooseNextStage1TargetV39(
    {...preprobe,shortlist:compact.effectiveShortlist},
    evidence,
    compact.amendment,
  );

  const report={
    schema:"p2g19.yssy.scope-selector.v1",
    scope_sha256:amendmentSha,
    next,
    expected:{icao:"YSSY",replacement:false},
    status:
      next?.icao==="YSSY" &&
      next?.replacement===false
        ? "PASS_NEXT_YSSY"
        : "BLOCKED_UNEXPECTED_NEXT",
  };
  console.log(JSON.stringify(report,null,2));
  if(report.status!=="PASS_NEXT_YSSY") process.exitCode=2;
} finally {
  await pool.end();
}
NODE
    ;;

  account-readonly)
    require_repo_state
    verify_scope_freeze

    echo "provider_call=read_only_balance_and_subscription_list"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"

    node --import tsx --input-type=module <<'NODE'
import {
  getBalanceEvidenceStrict,
  listSubscriptionsStrict,
} from "./server/lib/disruption/aerodataboxLimiter_v3.ts";

const requiredBalance=1500;
const evidence=await getBalanceEvidenceStrict();
const subscriptions=await listSubscriptionsStrict();
const activeBillable=subscriptions.filter(
  x=>x.isActive && x.billingType!=="LifetimeBased"
);

const balance=evidence.balance.creditsRemaining;
console.log(JSON.stringify({
  schema:"p2g19.yssy.account-readonly.v1",
  observed_at_utc:evidence.quota.observedAtUtc,
  alert_balance:balance,
  api_units_limit:evidence.quota.apiUnitsLimit,
  api_units_remaining:evidence.quota.apiUnitsRemaining,
  api_units_reset_at_utc:evidence.quota.apiUnitsResetAtUtc,
  requests_limit:evidence.quota.requestsLimit,
  requests_remaining:evidence.quota.requestsRemaining,
  active_billable_subscriptions:activeBillable.length,
  required_stage1_admission_balance:requiredBalance,
  admission_balance_pass:balance>=requiredBalance,
  minimum_refill_if_below_floor:Math.max(0,requiredBalance-balance),
  recommendation:
    balance>=requiredBalance
      ? "NO_REFILL_NEEDED_FOR_ONE_STAGE1"
      : "REFILL_AUTHORIZATION_REQUIRED_BEFORE_STAGE1",
  provider_mutation:false,
  alert_credits_spent:0,
},null,2));

if(activeBillable.length!==0) process.exitCode=2;
NODE
    ;;

  readonly-preflight)
    require_repo_state
    verify_scope_freeze

    echo "expected_icao=$EXPECTED_ICAO"
    echo "provider_call=read_only_balance_and_subscription_list"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"

    bash scripts/v39_phase2g_preflight_current_v39.sh
    ;;

  runtime)
    require_repo_state
    verify_scope_freeze

    [[ ! -e "$RUNTIME" ]] || {
      echo "RUNTIME_ALREADY_EXISTS=$RUNTIME"
      sha256sum "$RUNTIME"
      exit 0
    }

    npx tsx scripts/v39_prepare_gate2_runtime_v39.ts       --preprobe "$PREPROBE"       --smoke "$SMOKE"       --smoke-runtime-file "$SMOKE_RUNTIME"       --smoke-runtime-sha "$SMOKE_RUNTIME_SHA"       --out "$RUNTIME"       --probe-budget-day-id "$BUDGET"       --min-stability-buckets 6       --stage1-reservation 450       --stage2-reservation 450       --stage1-amendment-file "$AMENDMENT"

    echo "FRIDAY_YSSY_RUNTIME_SHA=$(sha256sum "$RUNTIME" | awk '{print $1}')"
    echo "FRIDAY_YSSY_SCOPE_SHA=$(sha256sum "$AMENDMENT" | awk '{print $1}')"
    ;;

  auth-draft)
    require_repo_state
    verify_scope_freeze

    [[ -f "$RUNTIME" ]] || {
      echo "REFUSED:RUNTIME_MISSING"
      exit 2
    }

    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"

    [[ ! -e "$AUTH" ]] || {
      echo "AUTH_ALREADY_EXISTS=$AUTH"
      sha256sum "$AUTH"
      exit 0
    }

    npx tsx scripts/v39_prepare_phase2g_auth_v39.ts       --auth "$AUTH_ID"       --alert-ceiling 500       --start "$AUTH_START"       --expires "$AUTH_EXPIRES"       --cleanup-owner "scripts/v39_phase2g_github_actions_owner_v39.sh"       --out "$AUTH"       --runtime-file "$RUNTIME"       --runtime-sha "$runtime_sha"       --smoke "$SMOKE"       --smoke-runtime-file "$SMOKE_RUNTIME"       --smoke-runtime-sha "$SMOKE_RUNTIME_SHA"       --preprobe "$PREPROBE"

    echo "FRIDAY_YSSY_AUTH_SHA=$(sha256sum "$AUTH" | awk '{print $1}')"
    echo "DRAFT_ONLY_NOT_AUTHORIZED=true"
    ;;

  auth-approve)
    require_repo_state
    verify_scope_freeze

    [[ -f "$RUNTIME" && -f "$AUTH" ]] || {
      echo "REFUSED:RUNTIME_OR_AUTH_MISSING"
      exit 2
    }

    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    auth_sha="$(sha256sum "$AUTH" | awk '{print $1}')"

    [[ "${PHASE2G_CONFIRM_AUTH_SHA:-}" == "$auth_sha" ]] || {
      echo "REFUSED:AUTH_SHA_CONFIRMATION_REQUIRED"
      echo "actual_auth_sha=$auth_sha"
      exit 2
    }

    npx tsx scripts/v39_approve_phase2g_auth_v39.ts       --expected-sha "$auth_sha"       --auth-file "$AUTH"       --runtime-file "$RUNTIME"       --runtime-sha "$runtime_sha"       --smoke "$SMOKE"       --smoke-runtime-file "$SMOKE_RUNTIME"       --smoke-runtime-sha "$SMOKE_RUNTIME_SHA"       --preprobe "$PREPROBE"
    ;;

  zero-credit-binding)
    require_repo_state
    verify_scope_freeze

    [[ -n "${REPLIT_DEV_DOMAIN:-}" ]] || {
      echo "REFUSED:REPLIT_DEV_DOMAIN_MISSING"
      exit 2
    }

    echo "expected_icao=$EXPECTED_ICAO"
    echo "provider_call=false"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"

    gh workflow run phase2g-zero-credit-callback-binding.yml       --ref main       -f callback_base="https://${REPLIT_DEV_DOMAIN}"       -f expected_head="$(git rev-parse HEAD)"
    ;;

  *)
    cat <<'EOF'
Usage:
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh static
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh selector
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh account-readonly
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh readonly-preflight
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh runtime
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh auth-draft
  PHASE2G_CONFIRM_AUTH_SHA=<exact_sha> bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh auth-approve
  bash scripts/v39_phase2g_friday_yssy_v2_prepare_v39.sh zero-credit-binding

Friday YSSY target:
  - Expected candidate: YSSY.
  - Scientific contract: v39-physical-flight-instance-v2.
  - Prospective early-pilot scope: YSSY -> SKBO; LKPR deferred.
  - Stage-1 class: weekday, centered at 12:00 UTC (eligible +/-1h).
  - 2026-10-02 eligible start class: 11:00-13:00 UTC.
  - Preferred start: 11:00 UTC / 04:00 PDT.
  - Target duration: 120 minutes.
  - Stage-1 reservation: 450 Alert credits.
  - Unsettled margin: 50 Alert credits.
  - Protected residual balance floor: 1000 credits.
  - Required prelaunch balance: >=1500 credits.

Safety:
  - This helper contains NO paid-launch mode.
  - static/selector/runtime/auth-draft/auth-approve/zero-credit-binding spend 0 Alert credits.
  - account-readonly and readonly-preflight use provider LIST/GET reads only.
  - YSSY cannot be launched until the new amendment is merged, the exact main commit is deployed/restarted on the managed Replit runtime, callback binding passes, a fresh runtime and AUTH are approved, and the paid preflight returns PASS_READY_FOR_PAID_STAGE1.
  - No automatic retry is authorized for YSSY by the early-pilot scope amendment.
  - Do not reuse MMUN runtime, budget, or AUTH.
EOF
    ;;
esac
