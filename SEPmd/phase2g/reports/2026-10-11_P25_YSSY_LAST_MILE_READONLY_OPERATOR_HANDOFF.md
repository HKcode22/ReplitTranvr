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
 console.log(JSON.stringify({
  schema:"v39.yssy-p25.readonly-schema-and-probe-gate.v1",
  ...q.rows[0],
  active_or_settling_probes:active?.rows[0]?.n??null,
  provider_calls:0,db_mutations:0,paid_alert_credits_spent:0
 },null,2));
 await c.query("ROLLBACK");
 if(!q.rows[0]?.has_logged_blobs||!q.rows[0]?.has_session_runtime||
    !hasProbe||active?.rows[0]?.n!==0)process.exitCode=2;
}catch(e){
 await c.query("ROLLBACK").catch(()=>undefined);
 console.error("READ_ONLY_SCHEMA_CHECK_FAILED",String(e instanceof Error?e.message:e).slice(0,200));
 process.exitCode=2;
}finally{c.release();await pool.end().catch(()=>undefined);}
NODE
```

This check NEVER applies V0064. If `has_v0064_source_intent=false`, enable no PENDING-source feature flags; freeze exact reviewed migrations and preflight first. If it is present, that still does not mean the published older receiver includes the P06 code.

## 4. The actual existing signed synthetic POST after a reviewed release — NOT safe to run until parity and schema confirmed

The repository already has the exact zero-provider synthetic, raw-blob, 8s-ACK, cleanup verifier: `scripts/v39_phase2g_verify_live_callback_v39.ts`. It **does create and delete an isolated disposable database session + test blob**, though it makes **NO AeroDataBox API calls or paid subscription**. Do not mislabel it read-only.

Only after merged and published release source parity (and reviewed schema inventory), the reviewer/operator can invoke with the exact newly deployed Git HEAD:

```bash
cd ~/workspace
EXPECTED_PUBLISHED_RELEASE_HEAD="$(git rev-parse HEAD)"
# ONLY if current working tree is the exact reviewed, merged and published release
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
- **6+6 is present as a guarded candidate but NOT LIVE:** the paid supervisor intentionally refuses it without independent provider/source witness. Effective live policy is legacy three strikes. Do not claim 180s covered or toggle unsigned env flags.
- Account minimum and cap: **>=1500** available credits before 500 exposure, **450 reserved + 50 margin**, protected residual floor **1000**, provider retries **0**, exact owned-subscription deletion and independent watchdog. No autonomous repeat.
- No numeric percent readiness/guaranteed scientific future PASS can be inferred from CI. The **only GO** is actual main/host source parity + same-route post/ACK + source migration/flags validated + zero active subscriptions/live balance + genuinely approved new exact AUTH + final preflight `PASS_READY_FOR_PAID_STAGE1`. Afterwards exact external billed-vs-internal credits, complete two hours/15-minute bins, original receipt quality and physical-v2 identity decide whether YSSY scientific run passed.

**Owner stop state when any gate unknown: HOLD_NO_PAID_ACTION.** No action in sections 1–3 starts subscriptions, refills balance, migrates SQL, changes Replit hosting or issues AUTH.
