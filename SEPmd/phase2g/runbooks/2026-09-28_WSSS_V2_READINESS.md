# Monday 2026-09-28 — WSSS Physical-v2 Stage-1 Readiness Runbook

**Prepared:** 2026-09-26 PDT  
**Scientific target:** WSSS corrected-contract Stage-1 remeasurement  
**Metric contract:** `v39-physical-flight-instance-v2`  
**Paid target duration:** 120 minutes  
**Eligible start class:** weekday, 12:00 UTC ±1 hour  
**Monday window:** 11:00–13:00 UTC = 04:00–06:00 PDT  
**Preferred start:** 11:00 UTC / 04:00 PDT  
**Maximum Alert-credit ceiling:** 500  
**Automatic retry:** prohibited

> This document is preparation only. It does not authorize a provider subscription.

---

## 1. Why WSSS is next

The physical-v2 recovery order was frozen before any v2 outcome:

~~~text
WSSS -> OMAA -> MMUN
~~~

Historical WSSS probe 9 remains a successful completed provider execution, but its legacy aggregate metric contract is NULL and used flight-number/runtime-key proxies. Under retained V3.9 §9.2 normalization, the WSSS reference must be measured under the same corrected physical-flight construct as later candidates.

The selector is regression-tested to:
1. require exact historical WSSS/OMAA/MMUN evidence;
2. choose WSSS first;
3. allow at most one v2 correction attempt for WSSS;
4. choose OMAA next after any terminal WSSS-v2 attempt;
5. refuse out-of-order v2 evidence.

---

## 2. Binding machine-readable recovery freeze

File:

`artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json`

Content SHA-256:

`d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741`

The Monday runtime must contain this exact value as `stage1AmendmentSha256`.

The helper refuses to proceed if the local freeze file hash differs.

---

## 3. Fresh Monday identifiers

Proposed fresh identifiers:

~~~text
runtime/budget:
P2G-S1-20260928-13

runtime file:
artifacts/phase2g-gate2-runtime-P2G-S1-20260928-13.json

AUTH ID:
AUTH-20260928-P2G14

AUTH file:
SEPmd/V3.9_PHASE2G_AUTH_20260928_P2G14.json

AUTH start:
2026-09-28T11:00:00Z

AUTH expiry:
2026-09-28T15:10:00Z
~~~

No P2G11/P2G13 runtime, budget, callback receipt, preflight receipt, or AUTH may be reused.

---

## 4. Dedicated zero-paid-action helper

Use:

`scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh`

Available modes:

~~~text
static
readonly-preflight
runtime
auth-draft
auth-approve
zero-credit-binding
~~~

There is intentionally **no paid-launch mode**.

---

## 5. Weekend step A — sync exact repository state

In Replit:

~~~bash
cd ~/workspace

git status --short
git fetch origin
git checkout main
git pull --ff-only origin main

echo "HEAD=$(git rev-parse HEAD)"
git status --short
~~~

Do not proceed with a dirty protected source tree.

Do not restart/kill the managed Replit workflow merely to sync Git unless the runtime evidence later proves a restart is required.

---

## 6. Weekend step B — static scientific + infrastructure regression suite

Run:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh static
~~~

This checks the exact v2 freeze hash and runs the targeted regression surface including:

- same-app callback contingency;
- persistent GitHub owner path;
- Stage-1 bounded rerun/recovery policy;
- compact-six reconciliation;
- zero-credit callback binding;
- historical failure regressions;
- prepaid identity adapter;
- prepaid identity persistence;
- prepaid identity resolution;
- physical-flight metrics;
- anchor promotion;
- TypeScript type checking.

Required terminal line:

~~~text
MONDAY_WSSS_V2_STATIC=PASS
~~~

Any failure blocks Monday preparation until diagnosed.

---

## 7. Weekend step C — read-only live preflight

Run:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh readonly-preflight
~~~

This may perform provider balance/subscription-list reads.

It must perform:
- no provider mutation;
- no provider subscription creation;
- no Alert-credit spend;
- no deployment.

Review:
- open incidents = 0;
- active probes = 0;
- open probe budget days = 0;
- active billable subscriptions = 0;
- provider balance read succeeds;
- callback reachable;
- callback protected source compatible with current HEAD;
- corrected provider blob bucket structurally available.

Weekend time-class eligibility may correctly be false. That is informational and is not permission to run early.

---

## 8. Weekend step D — create fresh Monday runtime

Only after A–C pass:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh runtime
~~~

The output must show:
- a fresh runtime path;
- a fresh runtime SHA-256;
- `MONDAY_V2_AMENDMENT_SHA=d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741`.

Inspect the runtime before continuing.

It must bind:
- `P2G-S1-20260928-13`;
- Stage-1 reservation 450 credits;
- unsettled margin inherited from the frozen smoke/runtime contract;
- minimum stability buckets 6;
- exact preprobe hash;
- exact physical-v2 recovery amendment hash.

---

## 9. Weekend step E — draft Monday AUTH

After runtime review:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh auth-draft
~~~

Expected status from the AUTH preparer:

~~~text
DRAFT_ONLY_NOT_AUTHORIZED
~~~

Record:
- runtime SHA;
- AUTH SHA;
- exact scope string;
- budget-day ID;
- protected exposure.

The AUTH must cover only the Monday Stage-1 scope and the 500-credit ceiling.

---

## 10. AUTH approval is explicit

Do not approve by guessing the SHA.

After human review of the exact AUTH JSON:

~~~bash
cd ~/workspace

PHASE2G_CONFIRM_AUTH_SHA="<exact AUTH SHA printed by auth-draft>"   bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh auth-approve
~~~

Approval still creates no provider subscription.

---

## 11. Source freeze after runtime/AUTH evidence is committed

Runtime/AUTH evidence required by the GitHub paid workflow must be committed deliberately.

After those files are finalized:
1. commit only the intended runtime/AUTH/evidence files;
2. push `main`;
3. wait for `offline-safety` on that exact final HEAD;
4. do not change protected source afterward;
5. Replit and GitHub must both report the same exact final HEAD.

The final Monday paid execution must not bind to an earlier code SHA.

---

## 12. Fresh callback verification after final source freeze

Run the existing live callback verification on the final source state.

Requirements:
- provider calls = 0;
- provider mutation = 0;
- Alert credits = 0;
- wrong secret rejected;
- correct secret accepted;
- persistence verified;
- synthetic cleanup verified;
- runtime HEAD exact;
- managed Replit owner contract truthful.

Do not reuse Friday's MMUN callback receipt.

---

## 13. Fresh GitHub/Replit binding

Run:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh zero-credit-binding
~~~

The GitHub workflow must prove:
- exact callback origin;
- exact expected Git HEAD;
- GitHub webhook secret accepted by live Replit;
- GitHub and Replit bind to the same runtime database;
- no provider call/mutation;
- zero Alert credits.

---

## 14. Monday final paid-preflight window

The paid preflight is fresh and time-sensitive.

Do not use a weekend paid-preflight receipt.

Near the Monday window, the paid gate must report exactly:

~~~text
PASS_READY_FOR_PAID_STAGE1
blockers = []
next candidate = WSSS
metric contract = v39-physical-flight-instance-v2
active billable subscriptions = 0
open incidents = 0
active probes = 0
same budget rows = 0
callback/runtime/DB/secret bindings = PASS
provider read stability = PASS
~~~

Any mismatch means **do not dispatch**.

---

## 15. Monday paid ownership

Only after all prior gates pass:

- GitHub Actions is the 2-hour lifecycle owner;
- the independent GitHub watchdog runs separately;
- Replit remains callback receiver/runtime only;
- no local/detached paid owner is permitted;
- no second dispatch is permitted;
- no automatic retry is permitted.

The existing global paid-workflow concurrency remains authoritative.

---

## 16. Known historical failure classes that must be blocked before launch

Before dispatch, verify controls exist for every known class:

1. schema/default persistence failure;
2. missing transient runtime session;
3. incorrect callback route;
4. wrong callback secret;
5. wrong runtime database;
6. stale Git/runtime source;
7. Replit-owned long-running paid supervisor;
8. provider balance/control-plane instability;
9. orphan active billable subscription;
10. external/internal credit mismatch;
11. censored run treated as completed;
12. missing reconciliation evidence before cleanup;
13. SQL placeholder/type mismatch;
14. exact repeated physical leg split by later enrichment;
15. callsign mutation changing ambiguity identity;
16. old/new metric contract mixing;
17. out-of-order v2 recovery;
18. second automatic v2 attempt.

A green infrastructure check alone is not enough; the scientific contract must also be green.

---

## 17. During WSSS-v2

Monitor:
- probe/session remains active;
- callback requests increase;
- callback failures remain 0;
- live blob count tracks accepted deliveries;
- provider/internal spend does not show a persistent positive delivery gap;
- runtime binding remains exact;
- no foreign subscription appears;
- credit ceiling not approached unexpectedly.

Do not modify source during the run.

Do not restart/kill the managed Replit workflow unless a frozen recovery path explicitly requires it.

---

## 18. Valid terminal WSSS-v2 requirements

Do not call WSSS-v2 promotion-valid until all are true:

~~~text
full target exposure achieved
duration_censored = false
stop_reason = null
reconciliation_status = MATCH
external settled credits = internal received credits
metric_contract_version = v39-physical-flight-instance-v2
physical identity bounds persisted
tail-chain metric uses confirmed physical/tail identities
subscription deleted / zero active billable subscriptions
durable reconciliation evidence written
exact-session cleanup verified
budget closed
owner success
watchdog success
~~~

If any scientific/infrastructure/accounting validity condition fails, preserve the attempt truthfully. The bounded v2 policy does not authorize an automatic second WSSS-v2 attempt.

---

## 19. After a valid WSSS-v2

The v2 recovery selector moves to:

~~~text
OMAA-v2
~~~

Only after terminal OMAA-v2 does it move to:

~~~text
MMUN-v2
~~~

After the bounded recovery set is terminal, ordinary compact-six sequencing resumes:

~~~text
LKPR -> SKBO -> YSSY
~~~

---

## 20. Permanent continuity sources

Read together:
- `SEPmd/phase2g/CURRENT_STATE_HANDOFF_2026-09-26.md`
- `SEPmd/phase2g/SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md`
- `SEPmd/phase2g/reports/2026-09-26_PHASE2G_COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md`
- `SEPmd/phase2g/V3.9_EXPERIMENTAL_DESIGN_DEFENSIBILITY_AND_SOURCE_TRACEABILITY.md`
- `SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_V2_RECOVERY.md`
- binding `SEPmd/V3.9_DataCollectPlan_f.8.md`
- binding `SEPmd/V3.9_IMPLEMENTATION_LOG.md`

This runbook may not override those binding sources.


---

## 21. Live scientific-health observability

Before WSSS-v2 is authorized, the scientific-observability hardening must be merged and green.

During the paid run, the independent GitHub watchdog will emit a line similar to:

~~~text
SCIENTIFIC_HEALTH status=PASS_WITH_AMBIGUITY items=40 resolved=31 quarantined=9 physical_ids=28 exact_groups=29 repeated_exact_groups=7 identity_splits=0 resolved_then_quarantined=0 key_drift=0 late_tail_enrichment=3 violations=none
~~~

Required live hard-invariant values:
- `identity_splits=0`;
- `resolved_then_quarantined=0`;
- `key_drift=0`;
- no hard violation code;
- metric contract = physical-v2.

Ambiguity or low yield alone is not a failure and must not stop the run.

The operator may independently inspect aggregate scientific health without provider calls:

~~~bash
cd ~/workspace
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh scientific-health
~~~

This command is database-read-only and provider-free.

After the GitHub workflow ends, preserve/review:
- owner log/status/heartbeat artifact;
- scientific-health JSONL artifact;
- provider/accounting reconciliation evidence.

These artifacts are part of the WSSS-v2 scientific acceptance review.
