# YSSY Phase 2G 8 PM California — exact zero-credit operator handoff

**Recorded:** Sun Oct 11, 2026 PDT. **Target:** Sun Oct11 20:00–22:00 PDT = Mon Oct12 03:00–05:00 UTC = Mon Oct12 14:00–16:00 Sydney AEDT. The *frozen UTC AND Sydney weekday and slot-04 rule passes* (see Oct 3 YSSY local-hours freeze and automated Oct12 calendar test). **This is time eligibility, not paid permission.**

**Current conclusion: PREPARE, NOT YET AN EXECUTABLE PAID AUTH.** PR #27 is isolated and unmerged. Published Replit exact callback build not attested equal to this branch. The consumed P2G22/P2G23 extra-attempt approval does not permit automatically retrying after P2G24. The P2G25 scientific exception is DRAFT only, not machine-connected. 6+6 is code-tested but explicitly **unavailable as a paid runtime switch** without independently authenticated source-attempt + credit witness; current signed owner still uses 3 consecutive callback-health failures. No requirement to re-run WSSS/OMAA/SKBO merely because safer code exists; their own matched v2 results are historical.

## A. Operator can run NOW in existing Replit Shell — read-only source/calendar/deployed claims

These actions do not create, delete, refill, modify or subscribe anything. `git fetch` updates **local remote-tracking Git refs only**. Runtime GET does not contain a provider secret or call AeroDataBox.

```bash
cd ~/workspace
git fetch origin main phase2g-p2g24-github-observer-20261009
printf 'LOCAL_BRANCH='; git branch --show-current
printf 'LOCAL_HEAD='; git rev-parse HEAD
printf 'REMOTE_MAIN='; git rev-parse origin/main
printf 'REVIEW_HEAD='; git rev-parse origin/phase2g-p2g24-github-observer-20261009
printf 'CHANGES='; git status --short
sha256sum artifacts/phase2g-yssy-local-operating-hours-protocol-freeze-20261003.json

node --import tsx --input-type=module <<'NODE'
import {loadYssyOperatingHoursProtocolV39,yssyStage1TimeClassStatusV39} from "./server/lib/disruption/yssyOperatingHours_v39.ts";
const hash="ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991";
const p=loadYssyOperatingHoursProtocolV39({expectedSha256:hash}).protocol;
const when=new Date("2026-10-12T03:00:00.000Z");
const s=yssyStage1TimeClassStatusV39(when,p);
console.log(JSON.stringify({
  target:"YSSY",start_utc:when.toISOString(),
  utc_weekday:s.utcWeekdayClass,sydney_weekday:s.localWeekdayClass,
  utc_slot_eligible:s.utcSlotEligible,curfew_safe:s.targetWindowOutsideCurfew,
  frozen_time_class_eligible:s.eligible,
  execution_authorized:p.execution_authorized
},null,2));
if(!s.eligible)process.exitCode=2;
NODE

curl --silent --show-error --max-time 15 --fail-with-body \
  https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime
```

**Interpretation:** even a 200/PASS GET is NOT a successful original signed POST / ACK test. Compare published `git_head` to the exact **subsequent reviewed, merged release commit**. Current draft branch SHA cannot be assumed deployed.

## Release-code review before any republish (read-only, narrow)

PR #27 currently targets old callback base commit `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`, has **212 changed files / ~701 commits**, and is **DRAFT**. Current `main` is a separately diverged commit, and the public deployed source still claims the old callback base. **DO NOT merge the full PR into main by convenience.** Review an appropriately scoped runtime-only patch and its dependency closure; source changes in the review branch do NOT publish themselves.

```bash
cd ~/workspace
git fetch origin main phase2g-p2g24-github-observer-20261009
printf 'MAIN='; git rev-parse origin/main
printf 'REVIEW='; git rev-parse origin/phase2g-p2g24-github-observer-20261009
printf 'COMMON_ANCESTOR='; git merge-base origin/main origin/phase2g-p2g24-github-observer-20261009
git diff --stat origin/main origin/phase2g-p2g24-github-observer-20261009 -- \
  server/routes_v3.ts \
  server/lib/disruption/prepaidProbeRuntime_v39.ts \
  server/lib/disruption/prepaidSourceIntent_v39.ts \
  scripts/v39_phase2g_stage1_logged_supervisor_v39.ts \
  scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts \
  scripts/v39_phase2g_stage1_recover_after_exit_v39.ts \
  scripts/v39_phase2g_subscription_exact_owner_match_v39.ts \
  migrations/current/V0064__phase2g_prepaid_source_pending_intent_v39.sql
```

This is only the **core patch review**, not a complete dependency list; tests, exact migration ordering, feature approvals, `phase2gCallbackOnly` published build entrypoint and all imports also require verification. Git diff inspection never changes main or deployment.

## B. Optional operator account inventory read — zero Alert credits, provider GET/LIST API requests

Run once if relevant credentials already exist in the normal Replit Shell. This is not a purchase and must not expose credentials in chat or commits. It may consume ordinary API request quota.

```bash
cd ~/workspace
node --import tsx --input-type=module <<'NODE'
import {getBalanceEvidenceStrict,listSubscriptionsStrict} from "./server/lib/disruption/aerodataboxLimiter_v3.ts";
const e=await getBalanceEvidenceStrict();
const all=await listSubscriptionsStrict();
const active=all.filter(x=>x.isActive&&x.billingType!=="LifetimeBased");
const balance=e.balance.creditsRemaining;
console.log(JSON.stringify({
  observed_at_utc:e.quota.observedAtUtc,
  alert_credits_remaining:balance,
  stage1_minimum_admission_balance:1500,
  stage1_balance_threshold_met:Number.isSafeInteger(balance)&&balance>=1500,
  active_billable_subscriptions:active.length,
  no_active_billable_subscriptions:active.length===0,
  api_units_remaining:e.quota.apiUnitsRemaining,
  provider_mutation:false,alert_credits_spent:0
},null,2));
if(active.length!==0||!Number.isSafeInteger(balance)||balance<1500)process.exitCode=2;
NODE
```

Do **not** refill by default; if balance is below 1500, any refill requires its own specific authorized billing action. Do NOT delete an active foreign subscription by account-wide ID sweep.

## C. Verified zero-provider artifact and how to refresh it

On the isolated review branch, GitHub Actions `phase2g-p2g24-offline-fault-injection.yml` now records the real source SHA and frozen calendar in a **draft** JSON receipt and publishes it as a download named `yssy-oct12-zero-credit-prep`. The workflow also attempts a **public GET-only** published image claim snapshot, never a paid/signed POST. The artifact and CI logs are accessible on that Actions run.

Once this script has been reviewed and incorporated into the **actual operator release**, a Replit Shell can create a local file *without touching paid systems*:

```bash
cd ~/workspace
test -f scripts/v39_phase2g_yssy_20261012_zero_credit_prep_v39.ts || {
  echo 'REVIEW_BRANCH_PREP_SCRIPT_NOT_IN_CURRENT_CHECKOUT'; exit 2;
}
OUT="artifacts/phase2g-yssy-zero-credit-prep-$(date -u +%Y%m%dT%H%M%SZ).json"
node --import tsx scripts/v39_phase2g_yssy_20261012_zero_credit_prep_v39.ts --out "$OUT"
sha256sum "$OUT"
```

A receipt is intentionally **not an authorization**. It records missing live gates as false rather than inventing them.

## D. The small REAL paid GO/no-GO set — no twenty-item waterfall

1. **Scientific retry authority:** new prospective *bounded YSSY infrastructure-invalid attempt* amendment approved in its own hash-bound artifact, with previous probes 16,17,18 preserved as failed; selector supports that exact amendment and refuses automatic repeat. No old P2G23/P2G24 AUTH/runtime/budget reused.
2. **Deploy parity:** reviewed, minimal release merged to appropriate `main`, published Replit receiver exact immutable HEAD matches paid GitHub owner HEAD and chosen preflight. V0064 migration + four source-custody flags only when reviewed/applied; no blind publish, no Cloudflare/paid-hosting change. Isolated signed nonempty POST into disposable target must be persisted and HTTP 2xx acknowledged within sender budget; GET alone does not count.
3. **Financial/owner:** fresh provider balance >=1500, account/provider inventory zero active billable subscriptions, no open prior incident/probe, freeze 450+50 max500 and residual floor1000, exact-ID deletion and no orphan subscriptions, owner heartbeat/independent watchdog. Provider delivery retries remain ZERO.
4. **Fresh launch permission:** create and approve a NEW versioned runtime and AUTH with exact YSSY 03–05 UTC, metric v39-physical-flight-instance-v2, GitHub source SHA, frozen amendment SHA, callback deployment, budget ID, stop/cleanup owner, retention rules. The auth artifact and SHA must be appended by the actual approval helper to the evidence ledger and checked by the normal paid preflight (`PASS_READY_FOR_PAID_STAGE1`), not typed by an assistant.
5. **Scientific post-run PASS is conditional:** all 120m exposure, measured 15m bins, correct rows/hour/identity and actual external-vs-internal exact billable credits, zero cost/item disagreement, zero delivery gap and verified retained original receipts. An otherwise good health trace is not proof of a valid YSSY result. If any failed, preserve honest received-only evidence and classify as censored/invalid where required; don't mislabel Phase2G complete.

## E. Authorization and paid command status

The old `scripts/v39_phase2g_monday_yssy_local_time_prepare_v39.sh` hardcodes **P2G23 October 8** and the consumed P2G22 recovery artifact. **Never run its `runtime`, `auth-draft`, `auth-approve` or paid-launch sequence for a new YSSY attempt.**

After the NEW machine-supported prospective amendment is approved and deployed against an exact reviewed source, use the repository's already-existing dedicated tools (in order), **with fresh file paths and identifiers issued for that approved run**, not guessed by this document:

`scripts/v39_prepare_gate2_runtime_v39.ts` → `scripts/v39_prepare_phase2g_auth_v39.ts` (**draft only**) → human-reviewed SHA → `scripts/v39_approve_phase2g_auth_v39.ts` → GitHub Actions dedicated signed callback/source/cleanup and actual paid preflight → **only if** `PASS_READY_FOR_PAID_STAGE1`, use the existing `phase2g-paid-stage1.yml` exact AUTH-bound GitHub Actions workflow.

**Prospective runtime + AUTH draft commands (NOT CURRENTLY EXECUTABLE):** these are provided to avoid recycling the October 8/P2G23 script. They intentionally demand a NEW **separately approved and machine-supported** prospective YSSY retry artifact. Today the artifact does **not** exist, so the first `test` fails instead of creating a misleading AUTH. `P2G25` is only a candidate identifier, not an authorized probe.

```bash
cd ~/workspace
set -euo pipefail

# Must be the reviewed release/main, already published as the same exact SHA.
git fetch origin main
test "$(git branch --show-current)" = "main"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain -- server scripts migrations tests .github/workflows)"

# DO NOT point this at the consumed P2G22/P2G23 files or the DRAFT markdown.
# This future JSON must have been scientifically approved, frozen, hash-bound,
# and actually recognized by the current scope loader/Stage1 selector.
NEW_AMENDMENT="artifacts/phase2g-yssy-p2g25-approved-technical-retry-freeze-20261011.json"
test -f "$NEW_AMENDMENT" || {
  echo "HOLD:NO_NEW_APPROVED_P2G25_RETRY_AMENDMENT"; exit 2;
}
sha256sum "$NEW_AMENDMENT"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20261012-25.json"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20261012_P2G25.json"
AUTH_ID="AUTH-20261012-P2G25"
BUDGET="P2G-S1-20261012-25"

# Create new runtime file only (NO provider mutation).
test ! -e "$RUNTIME"
npx tsx scripts/v39_prepare_gate2_runtime_v39.ts \
  --preprobe "$PREPROBE" --smoke "$SMOKE" \
  --smoke-runtime-file "$SMOKE_RUNTIME" --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
  --out "$RUNTIME" --probe-budget-day-id "$BUDGET" \
  --min-stability-buckets 6 --stage1-reservation 450 --stage2-reservation 450 \
  --stage1-amendment-file "$NEW_AMENDMENT"

RUNTIME_SHA="$(sha256sum "$RUNTIME" | awk '{print $1}')"
echo "DRAFT_RUNTIME_SHA=$RUNTIME_SHA"

# Create unapproved hash-locked AUTH JSON draft; NEVER an approval.
test ! -e "$AUTH"
npx tsx scripts/v39_prepare_phase2g_auth_v39.ts \
  --auth "$AUTH_ID" --alert-ceiling 500 \
  --start "2026-10-12T03:00:00Z" \
  --expires "2026-10-12T07:10:00Z" \
  --cleanup-owner "scripts/v39_phase2g_github_actions_owner_v39.sh" \
  --out "$AUTH" --runtime-file "$RUNTIME" --runtime-sha "$RUNTIME_SHA" \
  --smoke "$SMOKE" --smoke-runtime-file "$SMOKE_RUNTIME" \
  --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" --preprobe "$PREPROBE"
sha256sum "$AUTH"
echo "DRAFT_ONLY_NO_STAGE1_PAID_AUTHORIZATION"
```

Only after the operator approves the **exact reviewed AUTH SHA**, and the release preflight independently passes, should the separate approval helper and **GitHub Actions** paid workflow be considered. Do not run `auth-approve` or any subscription-create command from a generic assistant-generated receipt.

Do not start AeroDataBox through local Replit Shell/nohup: the GitHub owner/safety watchdog remains sole permitted billable subscription owner.

**No step here issues paid authorization or spends Alert credits.**
