# YSSY P25 — Last-mile 8 PM PDT operator handoff (READ ONLY)

**Scope:** intended Sun Oct 11 20:00–22:00 PDT = Mon Oct12 03:00–05:00 UTC and Mon 14:00–16:00 Australia/Sydney AEDT. The frozen UTC AND Sydney weekday/time class **passes**. **Calendar eligibility is not PAID AUTH.**

**Source at handoff:** release-candidate PR #29 based on main; `main` and the published Replit image are NOT this same release SHA. The independent [GitHub P18 GET check](https://github.com/HKcode22/ReplitTranvr/actions/runs/38178515634) returned HTTP 200 after 300ms on a warmed path and claimed older published SHA `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`. A GET does not establish a signed POST ACK/source custody or cold-start sender access.

## 1. Safe to paste in existing Replit Shell RIGHT NOW — read-only git and live published GET

```bash
cd ~/workspace
git fetch origin main phase2g-yssy-p25-minimal-release-20261011
echo "WORKSPACE_BRANCH=$(git branch --show-current)"
echo "WORKSPACE_HEAD=$(git rev-parse HEAD)"
echo "REMOTE_MAIN=$(git rev-parse origin/main)"
echo "RELEASE_CANDIDATE=$(git rev-parse origin/phase2g-yssy-p25-minimal-release-20261011)"
git status --short
curl --silent --show-error --fail --max-time 15 \
  https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime
```

Do **not** `git reset --hard`, switch and publish while dirty, merge 212-file PR #27, or infer production-image parity from the workspace `git rev-parse HEAD`. Only the PUBLIC published endpoint claim can initially establish which build Replit is serving. The public claimed `git_head` must match the exact final *reviewed/merged/released* commit before paid preflight.

## 2. Provider balance + billing inventory (read-only GET/LIST; may consume normal free/request API units, ZERO Alert credits)

```bash
cd ~/workspace
node --import tsx --input-type=module <<'NODE'
import {getBalanceEvidenceStrict,listSubscriptionsStrict} from "./server/lib/disruption/aerodataboxLimiter_v3.ts";
const e=await getBalanceEvidenceStrict();
const all=await listSubscriptionsStrict();
const active=all.filter(s=>s.isActive&&s.billingType!=="LifetimeBased");
const n=e.balance.creditsRemaining;
console.log(JSON.stringify({
 schema:"v39.yssy-p25.readonly-provider-account-gate.v1",
 checked_provider_at_utc:e.quota.observedAtUtc,
 alert_credits_remaining:n,
 stage1_minimum_1500_verified:Number.isSafeInteger(n)&&n>=1500,
 active_billable_subscription_count:active.length,
 zero_active_billable:active.length===0,
 api_units_remaining:e.quota.apiUnitsRemaining,
 provider_http_operations:"GET/LIST_ONLY",
 subscriptions_created:0,subscriptions_deleted:0,
 paid_alert_credits_spent:0,
 current_account_gate_pass:Number.isSafeInteger(n)&&n>=1500&&active.length===0
},null,2));
if(!Number.isSafeInteger(n)||n<1500||active.length!==0)
 process.exitCode=2;
NODE
```

Never copy the AeroDataBox key or active subscription IDs into chat; this gate deliberately prints **only counts**. If active subscriptions exist, halt and reconcile exact ownership rather than bulk-delete. A stale October 3 credit receipt cannot replace this real-time read.

## 3. Database schema and active-probe census (transaction READ ONLY; zero provider calls)

```bash
cd ~/workspace
node --import tsx --input-type=module <<'NODE'
import {v39Pool as pool} from "./server/lib/disruption/db_v39.ts";
const c=await pool.connect();
try{
 await c.query("BEGIN TRANSACTION READ ONLY");
 const q=await c.query(`
 SELECT to_regclass('clean.phase2g_prepaid_source_intent_v39') IS NOT NULL AS has_v0064_source_intent,
        to_regclass('clean.provider_content_blob_ref') IS NOT NULL AS has_logged_blobs,
        to_regclass('clean.prepaid_probe_session_runtime') IS NOT NULL AS has_session_runtime,
        to_regclass('clean.adb_anchor_probe') IS NOT NULL AS has_probe_registry
 `);
 const hasProbe=q.rows[0]?.has_probe_registry===true;
 const active=hasProbe?await c.query(
  "SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')"
 ):null;
 const schemaGatePass=q.rows[0]?.has_v0064_source_intent===true&&
   q.rows[0]?.has_logged_blobs===true&&
   q.rows[0]?.has_session_runtime===true&&hasProbe&&
   active?.rows[0]?.n===0;
 console.log(JSON.stringify({
  schema:"v39.yssy-p25.readonly-schema-and-probe-gate.v1",
  ...q.rows[0],
  active_or_settling_probes:active?.rows[0]?.n??null,
  current_schema_gate_pass:schemaGatePass,
  provider_calls:0,db_mutations:0,paid_alert_credits_spent:0
 },null,2));
 await c.query("ROLLBACK");
 if(!schemaGatePass)process.exitCode=2;
}catch(e){
 await c.query("ROLLBACK").catch(()=>undefined);
 console.error("READ_ONLY_SCHEMA_CHECK_FAILED",String(e instanceof Error?e.message:e).slice(0,200));
 process.exitCode=2;
}finally{c.release();await pool.end().catch(()=>undefined);}
NODE
```

This check NEVER applies V0064. It prints `current_schema_gate_pass=false` and exits nonzero if V0064 or any other required schema/probe condition fails; a zero exit status is still only a diagnostic and **not paid GO**. If `has_v0064_source_intent=false`, enable no PENDING-source feature flags; freeze exact reviewed migrations and preflight first. If it is present, that still does not mean the published older receiver includes the P06 code.

## 4. The actual existing signed synthetic POST after a reviewed release — NOT safe to run until parity and schema confirmed

The repository already has the exact zero-provider synthetic, raw-blob, 8s-ACK, cleanup verifier: `scripts/v39_phase2g_verify_live_callback_v39.ts`. It **does create and delete an isolated disposable database session + test blob**, though it makes **NO AeroDataBox API calls or paid subscription**. Do not mislabel it read-only.

Only after merged and published release source parity (and reviewed schema inventory), the reviewer/operator can invoke with the exact newly deployed Git HEAD:

```bash
set -euo pipefail
cd ~/workspace
EXPECTED_PUBLISHED_RELEASE_HEAD="$(git rev-parse HEAD)"
# Fail closed before touching a disposable DB session: unlike the prior
# shell paste, the Bash process MUST stop when a 'test' command fails.
test "$(git branch --show-current)" = main
test "$EXPECTED_PUBLISHED_RELEASE_HEAD" = "$(git rev-parse origin/main)"
npx tsx scripts/v39_phase2g_verify_live_callback_v39.ts \
  --callback-base "https://replit-tranvr--hk84164.replit.app" \
  --callback-mode published --expected-head "$EXPECTED_PUBLISHED_RELEASE_HEAD"
```

The returned receipt must verify HTTP 2xx, signed nonempty original canonical bytes / SHA readback, physical delivery, exact disposable cleanup and `callback_end_to_end_latency_ms<8000`; absence of `PASS` is HOLD. A warmed synthetic success does not guarantee all original provider sender attempts during an Autoscale cold-start.

## 5. Historical data, 6+6, P25 and PAID release policy

- WSSS/OMAA/MMUN/SKBO previously matched V2 cohorts remain historical measurements. A **prospective** safety patch alone doesn't retroactively invalidate them.
- YSSY probes **16,17,18** remain failed/censored and are excluded from scored completeness. No reclassification by P25 proposal.
- The committed `artifacts/phase2g-early-pilot-yssy-p25-draft-20261011.json` and separate project-lead decision receipt are intentionally **DRAFT_NOT_AUTHORIZED**. The one-shot selector is implemented and tested; a NEW owner-reviewed, SHA-frozen, approved P25 amendment + exact runtime/AUTH is mandatory. Old P2G23 permission cannot be reused.
- **6+6 ACTIVE IN UNMERGED PR #29 CODE, NOT YET LIVE IN PUBLISHED REPLIT:** the actual paid supervisor now enforces six primary plus six contingency 15-second health checks (12 maximum), two outage episodes maximum, 180 seconds maximum cumulative health-outage exposure for the *whole run*, and an independent monotonic 180-second stop timer even if HTTP polling stalls. It rejects the old `legacy-three` ENV override. This is NOT provider delivery retry (AeroDataBox retries remain 0), NOT proof that webhook notifications reached the host during cold starts, and NOT an automatic science pass. Recoveries are auditable and external billable-vs-internal original-source reconciliation is still mandatory. The proposed P25 separate amendment binds these caps prospectively and remains **unapproved**. Do not call 6+6 live until exact reviewed source is deployed and verified.
- Account minimum and cap: **>=1500** available credits before 500 exposure, **450 reserved + 50 margin**, protected residual floor **1000**, provider retries **0**, exact owned-subscription deletion and independent watchdog. No autonomous repeat.
- No numeric percent readiness/guaranteed scientific future PASS can be inferred from CI. The **only GO** is actual main/host source parity + same-route post/ACK + source migration/flags validated + zero active subscriptions/live balance + genuinely approved new exact AUTH + final preflight `PASS_READY_FOR_PAID_STAGE1`. Afterwards exact external billed-vs-internal credits, complete two hours/15-minute bins, original receipt quality and physical-v2 identity decide whether YSSY scientific run passed.

**Owner stop state when any gate unknown: HOLD_NO_PAID_ACTION.** No action in sections 1–3 starts subscriptions, refills balance, migrates SQL, changes Replit hosting or issues AUTH.


## 2026-10-11 15:41 PDT onward: exact incident #30 + source-custody audit

**Authenticated operator read-only SQL:** one open `clean.adb_incident_stop` ID **30** with cause `reconciliation` and timestamp `2026-10-09T04:59:04.866Z`. Cross-check [the historical GitHub paid owner run #37881617397](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397): the supervisor on YSSY probe 18 reported `RECOVERY_COMPLETED_FAIL_CLOSED` at 04:59:04.911Z with `provider_delete_verified=true`, `runtime_cleanup_verified=false`, `cleanup_deferred_to_replit_workspace=true`, `incident_opened=true`. A subsequent cleanup rejected `REFUSED:AUTO_DISCOVERY_REQUIRES_ONE_EXACT_SETTLING_MATCH`. This is the exact known P2G24 failure, not a new synthetic test error.

**Previously verified historical original storage:** Oct 9 operator [read-only P2G24 original audit](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-p2g24-github-observer-20261009/SEPmd/phase2g/reports/2026-10-09_P2G22_P2G24_OPERATOR_READONLY_AUDIT.md) downloaded **30/30 referenced objects**, with **30/30 SHA-256 and byte lengths matched**, 0 missing objects at *that time*. Earliest reference expiry **2026-10-16T04:02:22.780Z**. No evidence proves those are *all AeroDataBox sender attempts*, scientific completeness, or current October 11 object availability. Do NOT delete these historical sources or mutate probe 18 to PASS.

**New production readiness guard:** live public `/__v39/workspace-runtime` now advertises ONLY a Boolean `prepaid_source_custody_ready`. It is true iff the running published receiver actually has `V39_CALLBACK_ONLY_RUNTIME=1`, `V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED=1`, `V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED=1`, `V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED=1`. No values/secrets are returned. Paid preflight, continuous paid supervisor and signed published disposable POST tester all refuse false/missing Boolean in published mode. Separate SQL V0064 presence is checked in paid preflight. **Do not enable these flags before reviewing and applying the migration and validating the new published release**. This closes the important “right Git SHA, old feature behavior” false-ready path; published and source parity are still pending.

**Effective 6+6 half-open recovery:** requires TWO consecutive fully green health polls before closing an outage/re-arming check #1; one green is provisional, subject to unchanged 180s per-episode and whole-run cutoff. Any recovered episode remains *scientifically unverified* until exact source/credits and 8x15m bucket reconciliation. Provider retries stay 0.

### SAFE read-only exact incident and historical-custody SQL

Run in the current Replit Shell using the existing `v39Pool`. Do **NOT** run any historical cleanup command, migration apply or incident-resolution UPDATE before reviewing the result:

```bash
cd ~/workspace
node --import tsx --input-type=module <<'NODE'
import {v39Pool as pool} from "./server/lib/disruption/db_v39.ts";
const c=await pool.connect();
try{
  await c.query("BEGIN TRANSACTION READ ONLY");
  const incident=await c.query(`
    SELECT id,cause,occurred_at_utc,resolved,
           detail->>'kind' AS kind,detail->>'reason' AS reason,
           detail->>'owner' AS recovery_owner,
           detail->>'probeId' AS probe_id,
           detail->>'budgetDayId' AS budget,
           detail->>'providerDeleteVerified' AS provider_delete_verified,
           detail->>'runtimeCleanupVerified' AS runtime_cleanup_verified,
           detail->>'runtimeSessionPresent' AS runtime_session_present
    FROM clean.adb_incident_stop WHERE id=30
  `);
  const probe=await c.query(`
    SELECT probe_id,icao,status,duration_censored,
           reconciliation_status,stop_reason,
           runtime_cleanup_verified_at_utc,
           (runtime_session_id IS NOT NULL) AS durable_session_identity_present
    FROM clean.adb_anchor_probe WHERE probe_id=18
  `);
  const historicalSession="6267293e-75a0-42a7-b977-89543f200ebc";
  // UNLOGGED rows can disappear after database restart. Missing rows are
  // NOT proof that cleanup ran; preserve this distinction.
  const runtime=await c.query(`
    SELECT state,expires_at_utc,
           (provider_subscription_id IS NOT NULL) AS bound_provider_present,
           callback_requests_seen,callback_success_2xx,callback_failures
    FROM clean.prepaid_probe_session_runtime
    WHERE session_id=$1::uuid
  `,[historicalSession]);
  const journalExist=await c.query(`
    SELECT to_regclass('clean.phase2g_cleanup_journal_v39') IS NOT NULL AS present
  `);
  const cleanupJournal=journalExist.rows[0]?.present===true
    ?await c.query(`
      SELECT probe_id,state,expected_live_blobs
      FROM clean.phase2g_cleanup_journal_v39
      WHERE session_id=$1::uuid
    `,[historicalSession])
    :null;
  const blobs=await c.query(`
    SELECT count(*)::int AS referenced_objects,
           count(*) FILTER(WHERE deletion_verified_at_utc IS NULL)::int AS untombstoned,
           min(expires_at_utc) AS earliest_expiry
    FROM clean.provider_content_blob_ref
    WHERE source_kind='webhook'
      AND source_record_id LIKE 'prepaid:6267293e-75a0-42a7-b977-89543f200ebc:%'
  `);
  console.log(JSON.stringify({
    schema:"v39.p25.incident30.recovery-custody-readonly.v1",
    incident:incident.rows,historical_probe:probe.rows,
    runtime_session_rows:runtime.rows,
    runtime_missing_is_not_cleanup_proof:runtime.rowCount===0,
    cleanup_journal_table_present:journalExist.rows[0]?.present===true,
    cleanup_journal_rows:cleanupJournal?.rows??null,
    referenced_blob_metadata:blobs.rows,
    incident30_administrative_clearance_authorized:false,
    historical_blob_early_deletion_authorized:false,
    paid_yssy_go_authorized:false,
    provider_calls:0,provider_mutations:0,database_mutations:0,
    blob_downloads:0,blob_deletes:0
  },null,2));
  await c.query("ROLLBACK");
}catch(e){
  await c.query("ROLLBACK").catch(()=>{});
  console.error("READONLY_AUDIT_FAILED",String(e instanceof Error?e.message:e).slice(0,160));
  process.exitCode=2;
}finally{c.release();await pool.end().catch(()=>{});}
NODE
```

**Early-delete warning:** `cleanupPrepaidProbeSessionLocalV39` can call `deleteProviderBlobAtExpiryV39(... allowEarlyDelete:true)` on this exact historical session, so DO NOT invoke the generic purpose-cleanup merely to turn incident #30 green. Preserve and separately hash-readback original bytes before expiry, and independently reconcile any runtime/session state with provider-zero-billable evidence. A missing UNLOGGED session row after restart **is not cleanup proof**. The expanded read-only command above prints runtime and cleanup-journal presence without source bytes, provider credentials, object names, or mutations. Its `paid_yssy_go_authorized:false` is intentional.

**Decision:** This audit alone NEVER resolves incident #30. If `provider_delete_verified=true`, zero active billables remains verified, and cleanup/reference preservation is separately reviewed, a narrowly scoped future *operator-approved* administrative closure could be considered without altering probe 18's FAILED/UNRESOLVED/CENSORED science status. The existing generic `REFUSED:OPEN_INCIDENTS` guard must not be bypassed. If referenced original objects are still needed for audit, never purpose-cleanup/delete merely to clear an incident.

**Tonight's GO is still HOLD** pending incident adjudication, reviewed merge + V0064 apply and receiver flags, exact published source parity + signed real published disposable POST, P25 separately frozen/approved one-shot amendment, fresh paid runtime/AUTH, and final paid preflight. Beyond operational availability, an independent first-hop capture and complete sender-attempt evidence, as frozen P09–P20 research gates require, have **NOT** been established; a 6+6 GET watchdog does not replace them.
