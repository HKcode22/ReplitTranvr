# Phase 2G Current-State Handoff — 2026-09-26 06:50 PDT

**Repository:** HKcode22/ReplitTranvr  
**Canonical branch for visible continuity:** main  
**Active repair branch:** phase2g-v2-recovery-rebased-20260926  
**Active draft PR:** #10  
**Superseded repair branch/PR:** phase2g-mmun-identity-repair-20260925 / PR #9 (closed, do not merge)  
**Purpose:** this file is the single recovery point if chat context is lost. It records exactly where Phase 2G stands, what has happened, what has been fixed, what is still pending, and the next authorized scientific sequence.

---

## 1. Current project location

The project is still in **Phase 2G — Gate 2 Stage 1**.

Stage-1 compact-six candidate order:

~~~text
WSSS -> OMAA -> MMUN -> LKPR -> SKBO -> YSSY
~~~

Historical accepted/excluded state is not the same as the upcoming corrected-contract sequence.

The project has been delayed in Stage 1 by multiple real infrastructure, reconciliation and scientific-implementation failures. The goal of the current hardening work is to stop repeating those failure classes.

---

## 2. Historical candidate state

### WSSS

Many earlier WSSS attempts failed for real documented reasons:
- runtime/session loss;
- delivery accounting mismatch;
- provider-control-plane 502;
- censored run incorrectly flowing toward completion;
- Replit process/workspace loss;
- GitHub/Replit webhook-secret mismatch.

The latest historical WSSS provider run, **P2G11 / durable probe 9**, completed successfully:
- full intended two-hour exposure;
- duration_censored=false;
- stop_reason=null;
- reconciliation=MATCH;
- GitHub gate/owner/watchdog all passed;
- provider subscription deleted;
- exact-session cleanup completed;
- budget closed.

However, that run used the **legacy metric implementation** whose aggregate scientific metrics were based mainly on flight-number/runtime-key proxies.

Therefore:
- historical provider execution = SUCCESS;
- historical execution must remain preserved;
- historical metric values are not contract-compatible with physical-v2 metrics used for the common Stage-1 ranking/reference calculation.

### OMAA

Historical OMAA P2G03 / durable probe 2:
- completed;
- uncensored;
- stop_reason=null;
- reconciliation=MATCH;
- successful historical Stage-1 provider execution.

Like WSSS, it predates the explicit physical-flight metric contract and therefore has legacy proxy metrics.

### MMUN

Earlier MMUN P2G04 / probe 3:
- runtime/infrastructure interrupted;
- failed/censored/UNRESOLVED;
- excluded.

P2G13 / durable probe 10:
- full two-hour provider exposure;
- duration_censored=false;
- stop_reason=null;
- 52 external credits = 52 internal credits;
- 39/39 callbacks successful;
- zero callback failures;
- reconciliation=MATCH;
- provider subscription deleted;
- 39/39 retained blobs deleted;
- finalizer PASS_COMPLETED_AND_BUDGET_CLOSED;
- budget closed;
- zero active billable subscriptions.

But P2G13 exposed a scientific identity bug in the new physical-flight-v1 prepaid resolver:
- all audited items lacked provider_flight_id;
- repeated exact scheduled legs could resolve first and later be quarantined when callsign/aircraft enrichment appeared;
- VB2102 and AM501 showed this pattern;
- provisional ambiguity identity also changed with mutable callsign.

Therefore:
- provider execution = PASS;
- accounting = MATCH;
- scientific identity-derived metric = INVALID;
- promotion/scoring evidence = EXCLUDED.

### LKPR

P2G05 was a **pre-launch refusal**, not a paid LKPR scientific run.

LKPR remains unmeasured.

### SKBO
Not yet run.

### YSSY
Not yet run.

---

## 3. Why WSSS and OMAA are being measured again

This is not because their latest successful provider runs secretly failed.

It is because the common Stage-1 ranking/reference formula now uses a corrected physical-flight metric contract.

Legacy WSSS/OMAA metrics were calculated with proxy logic including:

~~~sql
COUNT(DISTINCT flight_number)
~~~

The corrected contract uses physical flight-instance identity.

A public flight-number label is not guaranteed to equal one physical scheduled leg.

The current V3.9 §9.2 ranking/reference design normalizes candidate yield against:
- WSSS primary reference;
- OMAA fallback.

If future MMUN/LKPR/SKBO/YSSY use physical-v2 metrics while WSSS/OMAA remain legacy, the score would mix different measurement definitions.

The old detailed raw WSSS/OMAA callback rows were purpose-deleted according to the retention protocol, so current physical-v2 metrics cannot be recomputed from the exact old observations.

Therefore, while keeping the current §9.2 score design, the project needs one **bounded corrected 2-hour physical-v2 measurement** for WSSS and OMAA.

This is **contract-correction remeasurement**, not ordinary infrastructure retry.

---

## 4. Corrected v2 recovery sequence

Current frozen recovery order:

~~~text
WSSS v2
  ↓
OMAA v2
  ↓
MMUN v2
  ↓
resume untouched candidates:
LKPR
  ↓
SKBO
  ↓
YSSY
~~~

Rules:
- one v2 correction attempt maximum per WSSS/OMAA/MMUN under the current freeze;
- no automatic second v2 attempt;
- any further retry requires explicit non-outcome adjudication;
- do not rerun because a score is undesirable.

No paid Stage-1 run is to be executed on the weekend.

The first corrected paid target is therefore **WSSS on the next eligible matched weekday window, subject to all gates passing**.

---

## 5. What physical-v2 fixes

The scientific concept was already required by the Plan: one actual physical operating leg must count as one flight, and repeated updates must not create extra flights.

The problem was implementation parity.

### Normal production resolver

File:
server/lib/disruption/flightInstanceCanonical_v3.ts

It checks exact schedule identity before fuzzy/callsign matching.

### P2G13 prepaid v1 resolver

File:
server/lib/disruption/prepaidProbeRuntime_v39.ts

For no-provider-ID observations, it lacked the same exact schedule lookup before fuzzy/callsign matching.

### Live P2G13 failure pattern

First VB2102 callback:
- MMUN -> MMVR;
- scheduled 11:00 UTC;
- callsign null;
- aircraft null;
- resolved to one physical flight instance.

Later callback:
- same carrier/flight/route;
- same scheduled 11:00 UTC leg;
- callsign VIV2102;
- aircraft XA-VXY;
- old v1 prepaid logic quarantined it instead of reusing the existing physical identity.

### v2 repair

PR #9 adds:
- exact no-provider scheduled-leg reuse before fuzzy matching;
- stable ambiguity key across later callsign enrichment;
- v2 metric contract;
- migration 0061;
- live-pattern regression tests;
- shared preflight/owner recovery selector;
- bounded v2 correction sequence.

---

## 6. P2G13 is fully operationally closed

Exact-session cleanup:
- expected blobs: 39;
- deleted blobs: 39;
- final runtime sessions/deliveries/items/live blobs = 0;
- provider mutation=false;
- subscription mutation=false;
- cleanup credit spend=0.

Cleanup receipt:
artifacts/phase2g-exact-session-purpose-cleanup-P2G13-MMUN-1790425520168.json

Cleanup SHA-256:
7b2721320868760b2d305b31905d0a7744028ce799d1573c1b6cb2aeea9a78b5

Finalizer:
- PASS_COMPLETED_AND_BUDGET_CLOSED;
- reconciliation=MATCH;
- active billable subscriptions=0;
- provider mutation=false;
- credits spent by finalizer=0.

Finalizer receipt:
artifacts/phase2g-settling-finalizer-probe10-1790427593769.json

Finalizer receipt SHA-256:
796240f07af575384b63b65c11b7264daeee8d40226daa0756320feddfb57593

---

## 7. Monday/next-weekday WSSS v2 readiness conditions

Do not create a provider subscription until all of the following are true on one exact source state:

1. PR #9 repair code reviewed.
2. Exact repair HEAD fully green.
3. migration 0061 fresh apply passes.
4. migration replay/idempotence passes.
5. TypeScript passes.
6. targeted prepaid identity tests pass.
7. targeted physical metric tests pass.
8. VB2102 enrichment regression passes.
9. AM501 enrichment regression passes.
10. tail-enrichment/chain regression passes.
11. full V3.9 offline tests pass.
12. lint passes.
13. registry/traceability checks pass.
14. contradiction scanner passes.
15. production build passes.
16. source state merged/frozen deliberately.
17. Replit callback runtime synced to exact approved HEAD.
18. managed runtime health reports exact HEAD/route/retention.
19. fresh zero-credit callback proof passes.
20. GitHub/Replit DB binding passes.
21. GitHub/Replit webhook-secret binding passes.
22. zero active billable subscriptions.
23. zero open incidents.
24. provider balance/read stability passes.
25. fresh WSSS-v2 budget day.
26. fresh WSSS-v2 runtime/Gate-2 artifact.
27. fresh WSSS-v2 AUTH bound to exact hashes.
28. paid preflight names WSSS as exact next target.
29. GitHub owner is the only paid lifecycle owner.
30. independent GitHub watchdog is active.
31. run is in the frozen eligible weekday/time class.
32. no automatic paid retry if any gate refuses or the run later fails.

---

## 8. Failure classes that must not recur

Future preflight must explicitly protect against all prior classes:

- schema/default/placeholder errors;
- missing runtime session;
- wrong callback route;
- wrong callback secret;
- wrong database;
- stale deployment/runtime HEAD;
- Replit-owned long-running supervisor;
- provider balance/control-plane instability;
- active orphan provider subscription;
- delivery accounting mismatch;
- censored result accepted as completed;
- missing durable reconciliation evidence before cleanup;
- scientific metric contract mismatch;
- exact repeated flight update becoming new/quarantined identity;
- mutable callsign changing ambiguity identity;
- legacy/current metric definitions mixed in one score;
- accidental automatic rerun.

---

## 9. GitHub architecture truth

Moving lifecycle ownership to GitHub Actions removes the historical single point where a Replit shell/workspace reset kills the entire two-hour owner.

It does **not** make all infrastructure failure impossible.

Residual risks include:
- Replit callback host outage;
- AeroDataBox 5xx/control-plane outage;
- network/TLS/DNS failure;
- PostgreSQL/database failure;
- GitHub Actions interruption;
- configuration/secret drift;
- provider deletion failure.

The architecture's purpose is to separate failure domains, detect problems quickly, recover exact owned resources, and fail closed rather than make cloud infrastructure infallible.

---

## 10. Permanent documentation map

Current visible files on main:

- SEPmd/phase2g/reports/2026-09-26_PHASE2G_COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md
- SEPmd/phase2g/reports/2026-09-26_PHASE2G_SCIENTIFIC_PROVENANCE_AND_DESIGN_BASIS.md
- SEPmd/phase2g/reports/2026-09-26_PHASE2G_TIMESTAMPED_TECHNICAL_QA_AND_DECISION_LOG.md
- SEPmd/phase2g/SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md
- SEPmd/phase2g/reports/2026-09-26_MMUN_IDENTITY_DEFECT_TECHNICAL_POSTMORTEM_AND_CONTINUITY.md

Binding project sources:
- SEPmd/V3.9_DataCollectPlan_f.8.md
- SEPmd/V3.9_IMPLEMENTATION_LOG.md
- SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md
- SEPmd/phase2g/FAILURE_REGISTER_AND_PREVENTION_MATRIX.md

Repair work:
- active branch phase2g-v2-recovery-rebased-20260926
- active draft PR #10
- current repair candidate HEAD at 2026-09-26 20:07 PDT: b6ce99e6b626b4a56010a9e87af4b67b2b8ed28f
- PR #10 was rebuilt from current main to avoid documentation conflicts; it is 0 commits behind main at creation
- PR #9 is superseded/closed and must not be merged

---

## 11. Recovery instruction for a future chat

If conversation context is lost:

1. read this file first;
2. read SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md;
3. read COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md;
4. read MMUN identity postmortem;
5. inspect current main and PR #9 exact heads;
6. do not infer paid readiness from an old SHA;
7. do not perform a paid action until fresh zero-credit/runtime/provider-read gates pass.

---

## 12. Current one-sentence state

**P2G13 MMUN is fully operationally closed but scientifically excluded; the repository is being repaired to physical-v2, and the next paid recovery sequence is one bounded corrected 2h WSSS-v2 measurement, then OMAA-v2, then MMUN-v2, followed by LKPR/SKBO/YSSY, with no weekend paid execution and no automatic retries.**


---

## 13. Update — 2026-09-26 20:07 PDT

A clean repair branch was rebuilt from the then-current documented main state because the original PR #9 had diverged after permanent reports were added directly to main.

Active repair path:
- branch: `phase2g-v2-recovery-rebased-20260926`
- draft PR: `#10`
- repair candidate HEAD: `b6ce99e6b626b4a56010a9e87af4b67b2b8ed28f`
- branch relationship at PR creation: ahead 18, behind 0;
- intended diff: exactly 18 Plan/Log/amendment/migration/runtime/test files;
- PR #9: closed as superseded.

Current CI state at this update:
- PR #10 `offline-safety`: IN PROGRESS.
- No paid authorization should be frozen until the exact final repair HEAD is green and merged/frozen deliberately.

Next paid scientific target remains:
```text
WSSS physical-v2 corrected 2h measurement
```

Only after valid WSSS-v2:
```text
OMAA-v2 -> MMUN-v2 -> LKPR -> SKBO -> YSSY
```

No automatic retry is authorized for any v2 correction run.


---

## 14. Update — 2026-09-26 22:20 PDT — physical-v2 merged and Monday WSSS preparation active

The clean physical-v2 repair PR #10 was marked ready and merged successfully.

Merge commit:
`5da68315151513275c62d72306e6e39894fe9e47`

The previously missing machine-readable v2 recovery freeze was then discovered during Monday-readiness inspection and added prospectively before any v2 paid run:

`artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json`

Truthful freeze time inside the artifact:
`2026-09-27T05:14:08.000Z`

Artifact content SHA-256:
`d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741`

The freeze binds:
- WSSS historical probe 9 = completed / uncensored / MATCH / legacy NULL metric contract;
- OMAA historical probe 2 = completed / uncensored / MATCH / legacy NULL metric contract;
- MMUN probe 10 = completed / uncensored / MATCH / v39-physical-flight-instance-v1;
- corrected contract = v39-physical-flight-instance-v2;
- recovery order = WSSS -> OMAA -> MMUN;
- maximum additional v2 attempts per candidate = 1;
- fresh runtime / budget / AUTH required;
- observed outcome metrics may not authorize the remeasurement.

Monday preparation helper:
`scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh`

Fresh proposed Monday identifiers:
- budget/runtime ID: `P2G-S1-20260928-13`;
- AUTH ID: `AUTH-20260928-P2G14`;
- AUTH file: `SEPmd/V3.9_PHASE2G_AUTH_20260928_P2G14.json`;
- runtime file: `artifacts/phase2g-gate2-runtime-P2G-S1-20260928-13.json`;
- eligible Stage-1 start class: Monday 2026-09-28, 11:00–13:00 UTC = 04:00–06:00 PDT;
- preferred start: 11:00 UTC / 04:00 PDT;
- target duration: 120 minutes;
- protected Alert-credit ceiling: 500.

The helper intentionally has NO paid-launch mode. It only supports:
- static regression/type checking;
- read-only provider/DB/runtime preflight;
- fresh runtime generation;
- AUTH draft;
- explicit hash-confirmed AUTH approval;
- zero-credit GitHub/Replit binding.

Do not create or dispatch a paid WSSS subscription until:
1. final current-main offline-safety is green;
2. Replit is synced to the exact final main HEAD;
3. migration 0061 is applied/replayed successfully;
4. Monday helper static checks pass on Replit;
5. read-only preflight has zero blockers;
6. fresh runtime is created and its v2 amendment hash is exactly the value above;
7. fresh zero-credit callback verification passes;
8. GitHub/Replit webhook-secret and runtime-DB binding passes;
9. AUTH is reviewed/approved by exact SHA;
10. the fresh paid preflight says `PASS_READY_FOR_PAID_STAGE1`, blockers=[], next candidate exactly WSSS;
11. no active billable subscriptions/open incidents/active probes exist.

PR #9 remains closed/superseded. PR #10 is merged and is no longer the active execution pointer; main is authoritative.


---

## 15. Update — 2026-09-27 — live scientific-health monitoring

Sunday readiness identified two additional hardening needs before Monday:
1. migration 0061 had to be wired into the production boot list;
2. the live watchdog needed scientific measurement observability, not only infrastructure/accounting telemetry.

The 0061 production boot-wiring defect was caught before paid execution and fixed through PR #11.

A prospective scientific-observability amendment is now being reviewed on:
- branch: `phase2g-scientific-observability-20260927`.

The new watchdog design:
- polls aggregate scientific identity state every ~30 seconds;
- never logs raw provider-identifying row content;
- never stops because of low/undesirable yield;
- fails closed only for explicit measurement-contract violations;
- preserves `scientific_contract_violation:<code>` as the durable stop reason;
- uploads scientific-health JSONL plus owner evidence artifacts.

Before Monday runtime/AUTH creation, this observability branch must be green, merged, synced to Replit, and the live v2 schema must be verified.


---

## 16. Update — 2026-09-28 — provenance of live migration 0061

Migration 0061 is already live in the Replit V3.9 database.

It was not applied by the read-only audit and was not manually launched by the user.

Evidence shows:
- the managed `tsx --watch server/index.ts` supervisor was already running;
- the Git fast-forward changed watched/imported server files;
- the watcher restarted the server child at approximately 06:15:17 UTC;
- boot migrations logged 0060 at 06:15:33.110Z and 0061 at 06:15:33.172Z;
- Express began serving at 06:15:36.238Z.

Live post-state:
- metric contract constraint accepts NULL, v1 and v2;
- probe 2 OMAA metric contract remains NULL;
- probe 9 WSSS metric contract remains NULL;
- probe 10 MMUN remains v1;
- v2 probe rows = 0;
- active/settling probes = 0;
- open incidents = 0;
- open budget days = 0;
- prepaid runtime rows = 0.

New procedure rule:
source sync on Replit may induce database mutation through watch-mode application restart. Future schema before/after audits must capture the before-state prior to changing watched server source.
