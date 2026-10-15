# YSSY P25 — October 11 8 PM PDT release handoff (NO paid authorization)

**Source branch:** `phase2g-yssy-p25-minimal-release-20261011`, draft PR [#29](https://github.com/HKcode22/ReplitTranvr/pull/29) targeting main `185a62e2f9ac52d55250ff2e8649349882c4306a`. The user’s current clean Replit workspace remains on `phase2g-p2g24-manual-receiver-repair-20261009` at `d5db303d25694f355289587e97cb4972a975b87e`; **do not reset or switch destructively without review**.

**Target scientific interval:** Sun Oct11 20:00–22:00 PDT = Mon Oct12 03:00–05:00 UTC = Mon Oct12 14:00–16:00 Sydney. The frozen YSSY UTC+Sydney weekday, 04:00 UTC ±1h class is **eligible**. Prior completed WSSS/OMAA/MMUN/SKBO physical-v2 results remain valid under their actual measured contracts; no automatic remeasurement of them.

## Tested changes and actual boundaries

- P04/P06 production receiver source custody, V0064 LOGGED pending, fail-closed byte-readback and HTTP ACK, ambiguous SQL COMMIT account recording; four opt-in flags still default OFF, no production schema migration has been performed.
- P15 six-primary/six-emergency bounded policy, rearm/cumulative outage budget safety tests. **Not operationally activated**: paid supervisor refuses 6+6 without authenticated independent sender-source witness. Effective default is THREE-strike. This alone is not a reason to rerun previously valid airports; it is an explicit limit of currently available protection.
- P16 exact owned subscription URL+airport+CreditBased before provider DELETE; refuses foreign and residual billable subscriptions; bounds cleanup process.
- P25 machine selector requires prospectively reviewed amendment, exact immutable failed YSSY probes 16/17/18, a different approved project-lead decision SHA and a new fresh AUTH; permits a **single** additional attempt, never infinite repeat. The committed P25 decision/amendment artifacts are **DRAFT and explicitly NOT authorized**.
- Full offline V3.9 safety [run #38177026728](https://github.com/HKcode22/ReplitTranvr/actions/runs/38177026728) PASS **1041 tests** (+13 skipped); focused [run #38177143410](https://github.com/HKcode22/ReplitTranvr/actions/runs/38177143410) PASS **105/105**; actual disposable PG16 with real SIGKILL (see workflow `phase2g-yssy-p25-release-postgres-ci.yml`) PASS **5/5** and LOGGED/UNLOGGED=`1|0`.

## Operator zero-provider commands to run NOW in Replit Shell

These only update local remote-tracking Git refs, inspect history, SHA and the external GET endpoint. Nothing here publishes Replit or creates a paid subscription.

```bash
cd ~/workspace
git fetch origin main phase2g-yssy-p25-minimal-release-20261011
echo "LOCAL_BRANCH=$(git branch --show-current)"
echo "LOCAL_HEAD=$(git rev-parse HEAD)"
echo "MAIN=$(git rev-parse origin/main)"
echo "RELEASE=$(git rev-parse origin/phase2g-yssy-p25-minimal-release-20261011)"
git status --short
git diff --stat origin/main origin/phase2g-yssy-p25-minimal-release-20261011 -- server scripts migrations/current tests
curl --silent --show-error --fail-with-body --max-time 15 \
  https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime
```

**Expected current issue:** real published GET on Oct11 claimed `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`; it is not current main or tested release. It must be republished from the **exact reviewed merged HEAD** and verified from an external runner, with an actual independently observed **signed nonempty synthetic POST → immutable raw readback → HTTP ACK** to a disposable source. GET 200 alone does not qualify.

## One optional provider read-only account check (NO Alert credits spent)

Run from existing trusted Replit workspace where normal provider API key is configured. The *GET/LIST requests may consume normal REST quota*; this never refills, creates, deletes, or changes a subscription.

```bash
cd ~/workspace
node --import tsx --input-type=module <<'NODE'
import {getBalanceEvidenceStrict,listSubscriptionsStrict} from "./server/lib/disruption/aerodataboxLimiter_v3.ts";
const x=await getBalanceEvidenceStrict();
const a=await listSubscriptionsStrict();
const b=x.balance.creditsRemaining;
const active=a.filter(s=>s.isActive&&s.billingType!=="LifetimeBased");
console.log(JSON.stringify({
  observed_at_utc:x.quota.observedAtUtc,
  balance_credits_remaining:b,
  stage1_admission_floor_1500_pass:Number.isSafeInteger(b)&&b>=1500,
  active_billable_count:active.length,
  subscription_isolation_pass:active.length===0,
  api_units_remaining:x.quota.apiUnitsRemaining,
  provider_mutations:0,alert_credits_spent:0
},null,2));
if(!Number.isSafeInteger(b)||b<1500||active.length)process.exitCode=2;
NODE
```

## Why a paid AUTH cannot be issued yet

Prior P2G22 recovery authority has already been consumed by P2G23/P2G24. The new [P25 amendment draft](../../../artifacts/phase2g-early-pilot-yssy-p25-draft-20261011.json) contains `authorized:false`, `approval_status:DRAFT_NOT_AUTHORIZED`, a verified P2G23 parent SHA, exact failed probe18 fingerprint, and a **zero** placeholder for the separate [project-lead decision](../../../artifacts/phase2g-p25-yssy-prospective-project-lead-approval-20261011.json) SHA. The latter also says `DRAFT_NOT_APPROVED` and `provider_mutation_authorized_now:false`. These are intentional safety guards — do **not** change a boolean by hand, reuse old AUTH IDs, or invoke old P2G23 shell helper. The additive frozen contract loader refuses the draft.

The remaining release actions are *specific*, not a demand for perfect code: review PR #29's bounded source changes and record a signed new one-shot scientific decision; merge a **tested** release to main and publish the identical code in Replit; migrate V0064 only after actual schema/durability review and approve four flags if appropriate; verify sender-observed test POST/ACK, fresh account balance and exact cleanup owner; create a fresh signed runtime/budget and human-approved Stage1 AUTH with `--start 2026-10-12T03:00:00Z` and `--expires` after the collection/cleanup window; pass the existing `PASS_READY_FOR_PAID_STAGE1` preflight before the **GitHub Actions-only** paid owner is invoked.

**A scientifically valid YSSY result is an after-run outcome, not a prelaunch promise:** full physical-flight-v2 120m and frozen 15m buckets, 60+ rows/hour, verified original SHA/readback, complete outside/provider spend-vs-internal credits exact match and zero delivery gap, verified cancellation and cleanup. Missing or unavailable provider-original sending evidence must not be silently imputed; failed attempts stay censored rather than marked matched. If no signed final candidate exists, remain HOLD rather than spend credits on the old receiver.

No Replit deployment or paid provider changes were made in this handoff.
