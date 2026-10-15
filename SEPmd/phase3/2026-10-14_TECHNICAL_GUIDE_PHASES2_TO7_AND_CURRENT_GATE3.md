# TECHNICAL GUIDE — Why we did Phase 2, what Phases 3–6 prove, and when ML starts
**Date:** 2026-10-14 PDT. **Owner-facing technical reference** for HKcode22/ReplitTranvr. **Source authority:** [V3.9 DataCollectPlan f.8](../V3.9_DataCollectPlan_f.8.md) and [Implementation Log](../V3.9_IMPLEMENTATION_LOG.md) §§A1.13–A1.18. The **separately documented, operator-approved qualified Phase2 exploratory exception** in draft [PR37](https://github.com/HKcode22/ReplitTranvr/pull/37) and **proposed** four-anchor amendment in draft [PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) do NOT retroactively convert original strict Gate2 into PASS. This guide describes the full project, not a new scientific protocol or spending authorization.

## 0. First understand our model and why we cannot just scrape flight rows
Our primary task is a **time-indexed departure-delay prediction** problem: at prediction cutoff `t0`, construct features which were truly knowable by `t0` and associate them with subsequently observed actual departure outcomes. In particular, a *later revised estimated departure time* is not an actual wheels-off milestone and must never be smuggled in as a pre-cutoff predictor. Join semantics distinguish a scheduled service, a provider webhook update, a flight-instance identity, codeshares, an actual terminal outcome, and a PRE snapshot.

We need a valid frame of which airport/time/flight services the provider *could* have captured, **including eligible non-observations**, not just callback rows we happened to receive. No model can learn correct missingness/selection/denominator properties merely from a table of received notifications. Weather, prior flight history, airport traffic, tails/routes and snapshot labels require source/provenance, licensed retention, correct UTC and availability at the cutoff.

**Six separate systems** have to agree: (i) airport sampling/calendar, (ii) AeroDataBox FIDS/schedule frame, (iii) billable provider Alert SEND, (iv) Replit hosted webhook and raw-before-success durable receipt, (v) SQL canonical physical flights/snapshots/labels, (vi) billing, source retention and eventual ML splits. The phases isolate the highest-cost uncertainties before committing ~31 batch-days.

## 1. Phase 2 — airport frame, real-world system and scientific pilot testing

### Original required steps, in order
- **P/security and retention:** check licensed raw/derived limits, callback secret and exact object ownership; don't assume permanent storage rights.
- **Gate1/reference:** lock traffic/region data, capacity/eligibility, source hashing and airport tier (HUB/MID/REGIONAL). `PRE` and `POST` have distinct eligibility: an airport might support one but not the other.
- **Pre-probe freeze:** lock rank formulas, 12 prospective original HUB candidates, replacement order, time classes, normalization caps and error budgets **before** observing paid results, to prevent choosing favorable airports retroactively.
- **Safety smoke:** tiny paid test of actual source ingress, callback and credit/owner cleanup. Not official Gate3.
- **Gate2 Stage1:** original f.8 described 12 × ~2h sequential HUB probe candidates under ceiling; measure real physical-v2 unique flight yield per hour and exact external/internal credit accounting. Capacity screen originally **≥60 scored distinct flight rows/hour**; do not substitute webhook envelopes or billing units for distinct-flight yield.
- **Gate2 Stage2:** originally confirm **five final eligible** hubs with ~4h each. The October 2 early-compact amendment reduced the early pilot to six sites and retired automatic Stage2 in this exploratory scope; October14 owner closed *qualified fieldwork*, not original five-site Stage2.

### Actual historical observations (not rewritten)
| Observed airport | Historical approximate scored/received-rate evidence | Reconciliation and use |
|---|---|---|
| WSSS Singapore | ~160.5 scored distinct flight identities/h | exact reconciled; strong primarily international HUB |
| OMAA Abu Dhabi | ~74 scored/h | exact reconciled; primarily international HUB |
| MMUN Cancún | ~23 scored/h | exact reconciled but **below original 60/h** capacity screen |
| SKBO Bogotá | ~150.5 scored/h | exact reconciled, useful domestic+international |
| YSSY Sydney | 7,203.639s observed, **58/58 received original webhook envelopes** each size+SHA verified; 229 received item/cost claims; 107 distinct resolved physical-v2 flight identities reported in later audit | **231 billed vs 229 internal received credits**, unexplained gap **2**, historical original Stage1 `failed/DELIVERY_GAP` and formal scored `rows_per_hour=NULL`. It is **qualified Tier-B research**, not original strict Gate2 PASS, and is included **prospectively** as fourth planned HUB in revised design |

**The gap of two billed units does NOT prove two physically missing flights, nor site-specific failure in Sydney**. A provider billable SEND that never arrived at the receiver, ambiguous sender retries, callback path interruption, credit attribution/account competition or other mechanisms are not distinguishable from the observed 229/231 alone. Previously observed WSSS and other receiver incidents mean we must investigate the common infrastructure, not blame the airport. 229/231 ≈0.99134 is a **credit-item accounting ratio**, not a sampled iid estimate of all webhook delivery success or of unbiased flight observation.

### Why WSSS, OMAA, SKBO, YSSY and why LKPR deferred
Research report `SEPmd/phase2g/reports/2026-10-02_PHASE2G_SCOPE_DOMESTIC_AND_REGIME_COVERAGE_REVIEW.md` (historical branch `phase2g-scope-review-20261002`) already proposed **four prospective HUBs**. WSSS and OMAA mainly international; SKBO and YSSY give much stronger domestic/rotation regimes. LKPR Prague was **deferred because of lower marginal domestic contrast** (its then-frozen mix ~97% international) when already having international-heavy WSSS/OMAA, **not** because it is scientifically useless. Europe can be reached through future MID/REGIONAL tier×region sampling. These are selected-site operating regimes, **not guarantees** of worldwide or AeroDataBox-observable route capture.

**Sampled per parent day:** 1 HUB *anchor* + **2 MID + 1 REGIONAL** airports from independently verified dual PRE/POST eligible frozen frame. An older September reference listed 427 MID and 587 REGIONAL dual-eligible airports across six regions; these are historical counts, not necessarily the final ICAO list. MID draw considers freshness, frozen region and exclusions; REGIONAL draw uses traffic-weighted allocation and coverage weights (may favor underobserved eligible airports, does not guarantee every airport). Four anchors therefore provide four possible HUB sites, **not four airports total**. Over 31 windows there are 124 airport-window slots, with repeats, not 124 unique airports and not all routes.

**Phase2 output:** real yield distributions, early route/region tradeoffs, collection failures and source-custody/credit evidence; research-qualified four-site direction. **Phase2 did not produce a full representative monthly training dataset**, verify all actual delay target fields, establish exact provider route coverage, or complete original strict five-anchor confirmation. The owner-approved prospective four-site approach has to be versioned/frozen separately before main paid run.

## 2. Phase 3 — three *different* GO tests, not another airport survey
The order is **Gate3 → Gate0.5 → Gate4**, even though 0.5 numerically looks earlier.

### Gate3: isolated operational credit-canary
**Question:** Under the real published prepaid callback path, can an owned short billable subscription be created, receive and durably acknowledge provider notifications, deleted, settled and reconciled **exactly**?

Inputs: named narrowly bounded fresh paid AUTH, one owned subscription, validated `/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId` URL, current balance/headroom and zero foreign competing billables, valid receiver storage and verified SQL.
Measure `C_external = B_before − B_stable`, after ≥3 consecutive equal authoritative provider balance readings and a callback/accounting drain. Compare `C_internal = SUM(cost of the actually received notification items)` on **that exact session**. Acceptance originally `C_external == C_internal > 0`, source byte/SHA readback, no callback failures/disagreement, verified owned subscription delete and no unrelated active billables. Positive external-minus-internal is a **diagnostic delivery gap**, not automatically acceptable to official Gate3 under frozen rule. An Alert SEND can be billed even if the notification was never durably delivered.

**Why this is not just redoing Phase2:** The early smoke/probes tested evolving operational flows at selected airports; Gate3 isolates the final *official* production owner+receiver+settlement path after selection and must be a stable precursor to much larger paid runs.

**Current code, exactly:**
- Historical production `scripts/credit_canary.ts` uses a **legacy route and `clean.adb_ingest_events`** ledger, incompatible with newer prepaid `/:secret/prepaid/:sessionId`; deliberate guard prevents paid invocation.
- `runPrepaidLiveWindowV39()` is reused by Phase2, but it always calls `armPrepaidProbeSessionV39` and creates a **fresh Phase2 session**. Calling it unchanged for a *prearmed* Gate3 session would create the wrong identity.
- Draft migration `V0065__phase3_gate3_prepaid_canary_owner_v39.sql`: isolated SQL `phase3_credit_canary` owner, LOGGED metadata-only receipt, prearmed session requires matching durable record, 1–100 credit draft ceiling. DB does **not** persist absolute provider balances/price deltas.
- `gate3PrepaidCanaryPreparation_v39.ts`: atomic LOGGED owner+UNLOGGED session reservation, fails closed on pending owner/ambiguous COMMIT; **authorization hash shape is not verified owner approval** and it cannot call provider.
- `gate3PreparedSessionReview_v39.ts`: SQL SELECT-only match between durable owner and transient session, refuses lost UNLOGGED data/expired/bound/mismatched owners. No real provider or signed AUTH verification.
- **NEW** `gate3OwnerAuthorizationPreflight_v39.ts`: compares the exact AUTH JSON artifact bytes to approved SHA in the evidence ledger and exact phase/window/credit/cleanup/scope, then queries the ready session *read only*. Still returns `paidCanaryAuthorized=false` and cannot prove deployed/host identity or provider balance. Existing ledger-hash approval **is not an asymmetric digital signature**; calling it "signed" conversationally must never replace independent permission.
- Actual versioned, reviewed runtime paid owner, hosted zero-provider parity and tiny separately authorized live canary remain **NOT IMPLEMENTED/PASSED**.
- **No separate Cloudflare system is required**; reusing correct Replit callback and PostgreSQL with observed P0 fixes is the chosen route.

### Gate0.5: actual provider field, chronology and prediction-target constructibility
**Question:** Does the subscribed AeroDataBox plan truly expose the fields, temporal resolution and eventual *actual* target needed for our specified prediction horizons? Measure—not invent—provider-native movement milestones, PRE-eligible FIDS schedule, actuality vs estimated status, timestamps, canonical flight identity/codeshares, new arrival/airborne cadence and grace/recovery rules. A flight that never obtains an actual terminal milestone may be labeled **unknown/censored**, not retrospectively assigned an invented departure delay.

Typical leakage invariant: `feature_available_at <= prediction_cutoff` for each feature; future event-time may be needed as a LABEL after cutoff but may not be a predictor. A short dedicated authorized sample with frozen minimal adequacy is required; writing Boolean `constructible:true` into a JSON owner is **not** evidence.

### Gate4: spending and stop/failure controller
**Question:** Can the actual controller prevent financially unsafe collection as provider SENDs/callbacks occur and as retries/crashes/balance readings fail? Scale the invariant to 100-credit cap/10-credit margin in disposable fault tests, including loss of a callback after a billed SEND, ambiguous provider account state, repeated start, stale balance and owned deletion. Follow with a **small separately authorized** live test; don't deliberately spend 1,850 Alert credits merely to test the full 1,900 parent-budget-day ceiling. Provider/Alert balance is account wide and foreign subscriptions contaminate subtraction.

**Phase3 output:** signed/evidence-verified real receiver and exact settlement + usable target/clock and proven auto-stop. When all pass, operational prediction prerequisites can be frozen.

## 3. Phase 4 — Gate5, the missing-denominator test
**Question:** Of all provider-observable flights eligible during each chosen airport/time window, how many had an expected snapshot, an actual snapshot, a delivered webhook and a genuinely observed outcome? This protects against selection bias and claims such as "99% delivery" with only received callbacks as denominator.

Build independently from FIDS/schedule service intervals rather than from webhook rows:
```text
provider-observable flight population N
 -> eligible at prediction horizon
 -> snapshots expected / snapshots created
 -> webhook identities captured in that population
 -> feature completeness
 -> actual departure outcomes observed
 + callbacks captured outside the defined population
```
Stratify by airport, HUB/MID/REGIONAL tier, region, domestic/international route, departure/arrival, UTC window, route/tail/carrier where support exists. Compute `capture_fraction = distinct_in_population_webhook_flights / eligible_provider_population` only with real independently matched denominator; if denominator zero, report undefined/NA with reason. **Callbacks outside population must be measured, not hardcoded as 0.** Snapshot existence is conceptually independent of webhook delivery.

These are observational quantities, not proof that the provider covers every flight operated worldwide. Gate5 does not demand every eligible flight be observed; it demands measurable data quality/observability, unsupported cells and plausible missingness limitations.

**Current code warning:** `scripts/v39_gate5_owner_v39.ts` historically hardcoded outside population 0 and must be replaced by a real joined measurement before official PASS. This is a finite testable blocker.

## 4. Phase 5 — versioned experiment FREEZE, not another pilot
**Question:** Are all inputs ready so 31 batch days can be executed consistently without adapting favorable dates/airports/metrics after seeing outcomes?

Freeze:
1. The prospective **four-anchor WSSS/OMAA/SKBO/YSSY** method, scope and limitations; preserve original strict five-anchor history, including YSSY Tier-B old gap and MMUN low yield.
2. Updated **newest available four complete quarters of traffic reference**. On Oct13 2026 the MrAirspace 2026Q3 source became available; the earlier frozen mid-2026 reference is now too old for the intended Oct2026 FREEZE. Validate provenance/license and rebuild tiers/frame/coverage from 2025Q4–2026Q3 as required by the amended Plan, without rewriting old Phase2 probe outcomes.
3. Exact dual-eligible MID and REGIONAL airport frame, region/time allocation, service-window roles, selected provider-native T/cutoff and actual-label rules, as-known weather/history retention.
4. The **versioned four-HUB calendar** plus 5 crossover pairs, 6 UTC classes, matching/≥24h washout and original window shapes `26×4h + 3×(2×2h) + 2×up-to-6h = 31 parent batch-days`. The original `solveV39Calendar` has a strict five-anchor condition; the separately versioned proposed four-anchor solver has passed synthetic tests but is NOT yet installed as final production owner/manifest.
5. Run total Alert max **57,900**, per-parent-day ceiling **1,900**, protected minimum floor and actual present balance/authorized budgets. **31×1,900 = 58,900 > 57,900**, so ceiling is NOT a daily required burn. Seven REST/API-unit categories and source retention constraints have separate ceilings.
6. Frozen chronological 20 TRAIN / 5 VALIDATION / 6 TEST batch-day split assignment rule, code/plan/schema/traffic-source and calendar SHA hashes, runnable signed manifest, incident safety and controller readiness. Do not inspect future TEST labels early.

A complete manifest is reproducible and exact. **A file named FREEZE or an inventory-only completeness check is not proof** of every above measurement. The freeze is not automatically paid AUTH.

## 5. Phase 6 — actual main paid collection, not preparing endlessly
**Question:** Can the controller execute the *already reviewed* calendar day by day and produce enough scientifically usable observations and audit receipts, without unauthorized overspend or silently rewriting missing outcomes?

For each of **31 parent batch-days**:
```text
validate correct frozen manifest and exact authorized start
 -> confirm previous day settled + no unrelated active billable subscriptions
 -> reserve parent-day Alert/API budgets with soft stop and hard cap
 -> choose one HUB + two MID + one REGIONAL per frozen sampler/time/region
 -> create/bind only owned approved provider subscriptions
 -> durably store received original bytes BEFORE HTTP 2xx
 -> build canonical flight/time/identity/snapshot records
 -> monitor paid SEND vs durable internal receipts and stop on source/cost risk
 -> verify exact owned provider deletion
 -> settle authoritative balance and evaluate missingness/censoring
 -> emit immutable per-day progress/coverage/cost/retention receipt
 -> authorize next day only if clean or explicit reviewed disposition
```
Nominal exposure max = `26×4 + 3×4 + 2×6 = 128 hours`; actual achieved hours may be lower if source, credit or time stops intervene. Calendar is **six-on/one-off** by design; 31 parent days span at least ~36 elapsed calendar days. Paid collection can begin only after a real all-gates and final FREEZE go plus separately bounded user AUTH. It is NOT true that 1,900 credits equals 1,900 flight rows.

**Output:** collection/source/cost/capture denominators and corresponding time-correct flight/snapshot/label tables, with incomplete or censored observations explicitly tracked rather than invented.

## 6. Phase 7 — ML on actual collected data, separate later plan
Only after enough meaningful Phase6 collection and according to the frozen split/evaluation rule: materialize allowed train/validation/test flight-instance data; train a simple persistence baseline and Model1 XGBoost on TRAIN; tune using VALIDATION; evaluate once against protected TEST after model selection, plus genuinely held-out future-time/unseen-airport/route/tail analyses where feasible. Report RMSE/MAE and uncertainty against the matched test cohort, coverage/selection/missingness and information-per-credit. Advanced GNN/Engine E and unrelated features remain deferred unless justified.

**No need to train ML in Phase3**, consistent with owner's goal. Phase6 is the last DATA ACQUISITION phase; Phase7 is the named final EVALUATION phase.

## 7. Snapshot of exactly where we are (October 14, 2026)
| Item | TRUE status | No false PASS from |
|---|---|---|
| Phase2 real pilots and qualified closeout | DONE with qualification, original 5-anchor Gate2 NOT_PASSED | owner exception ≠ retroactive gate |
| Four prospective anchors | owner-chosen and draft solver 4/4 offline-tested | not yet final Phase5 approved/published calendar |
| Gate3 additive SQL and atomic prearm | draft offline/disposable PG tests PASS on earlier SHA `ba54a387...` | not live provider credits |
| Gate3 prepared session SELECT review | draft 4/4 CI PASS SHA `a91fab82...` | not independent AUTH |
| Gate3 owner AUTH+session preflight | NEW `gate3OwnerAuthorizationPreflight_v39.ts`, negative tests; exact source+test SHA `694809ae12dd01a1602465c9e36c5ff7ba80ef15`: **4/4 GitHub no-provider CI PASSED**, full #38662225605, focused #38662225553, real PG #38662225555, read-only receiver #38662225629. **Only source/evidence consistency**, not paid-live acceptance | not live provider/deployed |
| Gate3 official billable canary | **NOT RUN / HOLD** | historic YSSY/P2 smoke cannot stand in |
| Gate0.5, Gate4 | **NOT PASSED** | source JSON/old synthetic tests |
| Gate5 | **NOT PASSED** | hardcoded outside 0 |
| Phase5 full LIVE FREEZE | **NOT SIGNED** | draft four-anchor synthetic SAT |
| Phase6 main 31 batch days | **NOT STARTED** | dates/credit cap not AUTH |
| Phase7 protected ML | **NOT STARTED** | do later |

The operator's clean local Replit release branch `release/p25-reviewed-publish-20261012` HEAD `bb44fc1d122868e20664b2c149406f99bb10cb86` has not been found as identical GitHub SHA in this session; do not force-reset or claim published parity. PR36 source and PR37 qualified Phase2 docs are both draft/unmerged. Provider secrets must never appear in GitHub or this chat.

## 8. The SHORT critical path, next action and evidence policy
- **Next one engineering action:** finish actual Gate3 prepaid owner integrated with the already prearmed session, where the exact approved AUTH, server route, account, balance/foreign subscriptions and cleanup identity are all independently checked before *any* provider CREATE/GET that costs credits. Existing generic `runPrepaidLiveWindowV39` creates a new Phase2 session; do not call unchanged with a prepared Gate3 ID. Reuse its safe source/delivery/settlement functions only after a distinct path is reviewed and negative tested.
- Do a **short zero-provider published receiver+SQL/source readback test**, not a blanket hosted two-hour soak, only with approved staging/publish parity. Obtain a **fresh exact bounded operator AUTH** for a very small live Gate3 canary, then reconcile provider balance three times, callback credits and owner deletion. Do not silently lower Gate3 tolerance to make it PASS.
- Proceed to Gate0.5 real provider T/label/sample, Gate4 controller, Gate5 true FIDS denominator, Phase5 four-anchor FREEZE and Phase6 collection. Reforecast only a reproducible P0 blocker, not hypothetical perfection.
- **Retained source TTL:** earlier P2G24 originals start expiring Oct15 PDT, YSSY 58 originals Oct19 PDT; lawful derived-work proof and post-expiry tombstones/incident31 clearance are separate operator-reviewed custody tasks, not a YSSY rerun or deletion of its already lawful research conclusions.

**Working rule:** no provider API calls, refills, live SQL changes, merge/deploy, raw-source deletion, retention exception, historical P25 rewriting, or paid canary from this documentation or tests. Each engineering session must update the stable [START_HERE](START_HERE.md), the dated plain-English report, a verified-SHA technical checkpoint and [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).
