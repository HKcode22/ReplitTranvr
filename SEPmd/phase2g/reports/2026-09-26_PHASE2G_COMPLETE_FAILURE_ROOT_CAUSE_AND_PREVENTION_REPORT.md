# Phase 2G Complete Failure, Root-Cause, Scientific-Disposition, and Prevention Report

**Created:** 2026-09-26 06:42 PDT / 2026-09-26 13:42 UTC  
**Repository:** HKcode22/ReplitTranvr  
**Branch:** phase2g-mmun-identity-repair-20260925  
**Purpose:** one durable record of every known Phase-2G failure/refusal affecting WSSS, OMAA, MMUN and the transition toward LKPR, including what failed, whether the failure was infrastructure/accounting/scientific, what evidence remains valid, and what specific control prevents recurrence.

> This report does not rewrite history. A later fix never converts an old failed/censored probe into PASS. A successful historical provider run remains successful even when a later metric-contract change makes its old aggregate metrics non-comparable to current metrics.

---

## 1. Failure taxonomy

Every incident must be classified on separate axes.

### 1.1 Infrastructure/runtime failure
Examples:
- callback host unavailable;
- owner process dies;
- provider control plane returns 5xx;
- webhook secret mismatch;
- database/session state disappears.

Effect:
- may censor or invalidate the scientific exposure;
- does not imply the airport itself has poor scientific yield.

### 1.2 Accounting/reconciliation failure
Examples:
- provider charged 220 credits but only 219 were received/persisted.

Effect:
- received sample is not provably complete;
- current protocol excludes the probe from promotion.

### 1.3 Scientific-measurement implementation failure
Examples:
- code counts flight-number strings when the intended scientific unit is physical flight instances;
- exact repeated scheduled leg becomes quarantined after later callsign enrichment.

Effect:
- provider transport can be perfectly healthy while the derived scientific metrics are invalid.

### 1.4 Protocol/comparability failure
Examples:
- candidate numerator and WSSS/OMAA reference denominator use different metric definitions.

Effect:
- each individual run may be internally successful, but the cross-candidate score is not scientifically comparable.

### 1.5 Pre-launch refusal
No experiment occurred.
Examples:
- stale route-owner verifier blocks the launch before provider mutation.

Effect:
- zero paid scientific evidence; do not label the airport as failed.

---

## 2. Identifier map

- **probe_id** = durable row ID in clean.adb_anchor_probe.
- **AUTH** = exact authorization record for one bounded paid action.
- **budget day** = project accounting exposure container.
- **ICAO** = airport candidate.

Known durable attempts:

| Probe | ICAO | Operational label | Outcome |
|---:|---|---|---|
| 1 | WSSS | P2G02 | failed/censored/UNRESOLVED |
| 2 | OMAA | P2G03 | completed/uncensored/MATCH |
| 3 | MMUN | P2G04 | failed/censored/UNRESOLVED |
| — | LKPR | P2G05 | pre-launch refusal; no paid probe |
| 4 | WSSS | P2G06 | full-duration/MISMATCH |
| 5 | WSSS | P2G07 | failed/censored/UNRESOLVED |
| 6 | WSSS | P2G08 | failed/censored/MATCH |
| 7 | WSSS | P2G09 | failed/censored/UNRESOLVED |
| 8 | WSSS | P2G10 | failed/censored/UNRESOLVED |
| 9 | WSSS | P2G11 | completed/uncensored/MATCH |
| 10 | MMUN | P2G13 | full-duration/MATCH transport; v1 scientific identity metric invalid |

---

## 3. Pre-Gate WSSS canary / premature launch incident

### What happened
A pre-Gate canary path could insert is_randomized=NULL into a NOT NULL column. One paid SEND could occur without a valid persisted scientific item. WSSS was started before the required canary PASS.

### Failure class
- infrastructure / schema / gate-order failure.

### Scientific disposition
- not valid Stage-1 evidence.

### Fix
- unmanaged callback rows now default isRandomized=false;
- schema default/NOT NULL enforced;
- predecessor gates must be PASS before paid owner starts.

### General prevention lesson
A scientific protocol is not valid merely because the provider sent data. The full ingestion contract must already be proven.

---

## 4. WSSS probe 1 / P2G02 — runtime state loss

### What happened
The UNLOGGED prepaid runtime/session state disappeared/reset while an AeroDataBox subscription still existed. Owner/supervisor processes were no longer alive. Later callbacks failed closed because their bound runtime session no longer existed.

### Failure class
- infrastructure/runtime-state failure.

### Scientific effect
- exposure was censored;
- received sample could not represent the frozen full Stage-1 window;
- excluded.

### Fixes
- random runtime UUID durably bound to probe before provider creation;
- exact owned-session recovery;
- no bulk deletion;
- later lifecycle ownership moved out of Replit shell into GitHub Actions;
- independent watchdog.

### Can this exact failure happen again?
The old **owner died because the Replit shell/process died** failure mode is materially removed by GitHub ownership. But the callback host or database can still fail, so infrastructure failure in general is not impossible.

---

## 5. OMAA probe 2 / P2G03 — successful run

### Pre-launch issue
The first preflight was blocked because the callback was unreachable.

### What happened afterward
The problem was corrected before paid execution. The accepted OMAA attempt:
- completed;
- uncensored;
- stop_reason=null;
- reconciliation=MATCH.

### Failure class
- no terminal paid-run failure.

### Scientific disposition
- successful historical Stage-1 execution.

### Later limitation discovered
OMAA's old aggregate scientific metrics were generated by the legacy prepaid metric implementation, primarily using flight-number/runtime-key proxies instead of the later physical flight_instance_id contract.

This does **not** mean the provider run failed.

It does mean its old yield components are not mathematically interchangeable with corrected physical-v2 components for the common ranking.

### Current correction
Under retained V3.9 §9.2 normalization, one bounded corrected 2h v2 OMAA measurement is required for common-contract reference comparability.

---

## 6. MMUN probe 3 / P2G04 — runtime interruption

### What happened
Replit/runtime interruption occurred during the paid window. Durable evidence records failed/censored/UNRESOLVED. Exact subscription cleanup was verified.

### Failure class
- infrastructure/runtime failure.

### Scientific disposition
- invalid/censored; excluded.

### Fixes
- durable-session binding;
- exact recovery;
- GitHub-owned lifecycle;
- independent callback/runtime health monitoring.

---

## 7. LKPR P2G05 — pre-launch refusal, not a scientific failure

### What happened
A stale callback verifier expected route_owner=server/routes_v3.ts while the managed runtime correctly reported server/index.ts+server/routes_v3.ts.

### Failure class
- zero-credit verification/config drift.

### Scientific disposition
- **no LKPR paid probe occurred**;
- LKPR remained unmeasured.

### Fix
One managed-runtime contract is shared by callback verifier, preflight, paid owner and binding workflow.

---

## 8. WSSS probe 4 / P2G06 — full-duration reconciliation mismatch

### What happened
- intended two-hour exposure completed;
- 36 received webhook payloads;
- 219 internal received credits/items;
- provider settled external spend = 220.

Therefore:

~~~text
C_external = 220
C_internal = 219
delivery_gap = 1
delivery_completeness = 219/220
~~~

### Failure class
- accounting/delivery-completeness failure.

### Why scientifically invalid
The project cannot prove that the one provider-billed-but-unreceived item was irrelevant. A missing flight observation can change unique-flight, tail-chain or stability metrics.

### Fixes
- external settled provider spend is authoritative denominator;
- durable reconciliation evidence written before cleanup;
- positive delivery gap is terminal/non-scoreable;
- only exact MATCH currently promotion-valid;
- callback counters and settlement-read diagnostics preserved.

### Source basis
AeroDataBox documents that credit-based Flight Alert billing is tied to notification SEND and retries, not successful application persistence. Provider docs explain how billed-but-unreceived gaps can occur; they do not justify accepting incomplete science.

---

## 9. WSSS probe 5 / P2G07 — AeroDataBox control-plane 502

### What happened
Provider control-plane endpoint returned HTTP 502 during balance/delete handling. Subscription remained active until exact-ID recovery.

### Failure class
- provider infrastructure/control-plane failure.

### Scientific disposition
- censored/UNRESOLVED; excluded.

### Fixes
- bounded provider-read retries;
- exact subscription delete verification;
- recovery can clean the exact owned subscription after a failed probe;
- ambiguous ownership refuses.

### Residual risk
No repository code can guarantee AeroDataBox never returns 5xx again.

---

## 10. WSSS probe 6 / P2G08 — balance 502 + false-completion path

### What happened
Repeated balance-control-plane failures censored the run. Reconciliation eventually became MATCH, but pre-fix code allowed a censored result to flow toward a false completion state.

### Failure classes
- provider infrastructure;
- state-machine/scientific-validity guard failure.

### Why MATCH was not enough
A censored run is not a full standardized exposure. Exact accounting cannot convert a short/censored measurement into a valid 2h Stage-1 probe.

### Fixes
- balance polling decoupled from local watchdog;
- bounded retries + threshold;
- duration_censored propagated truthfully;
- completed path refuses any censored run;
- prelaunch balance-stability canary.

---

## 11. WSSS probe 7 / P2G09 — Replit process/workspace replacement

### What happened
Replit development workspace/process replacement killed supervisor and child while callback application recovered; provider subscription remained active.

### Failure class
- lifecycle-owner infrastructure failure.

### Scientific disposition
- failed/censored/UNRESOLVED.

### Major architectural fix
The 120-minute paid owner moved to GitHub Actions. An independent GitHub watchdog was added.

### What GitHub makes better
The paid owner no longer shares the same process lifetime as the Replit callback host.

### What GitHub does NOT guarantee
Residual risks remain:
- Replit callback outage;
- provider 5xx;
- network/TLS/DNS;
- DB outage;
- GitHub Actions outage;
- secret/config drift;
- subscription cleanup failure.

---

## 12. Incident 24 — stale published deployment

### What happened
Published travnr.com backend was a stale snapshot; synthetic prepaid callback hit missing/currently inconsistent route/retention configuration.

### Failure class
- zero-credit deployment/runtime mismatch.

### Fix
Explicit same-app development callback contingency with exact runtime HEAD, route, owner and retention checks.

---

## 13. Incident 25 — prepaid SQL placeholder/type defect

### What happened
Prepaid INSERT placeholder ordering caused UUID/integer PostgreSQL failure during zero-credit synthetic callback.

### Failure class
- implementation/schema-interface bug.

### Scientific effect
Caught before paid collection.

### Fix
Correct SQL placeholder contract + regression test.

---

## 14. WSSS probe 8 / P2G10 — GitHub/Replit webhook-secret mismatch

### What happened
GitHub environment secret differed by one character from Replit's. Provider callbacks reached the correct host/session but Replit rejected them with 404 before callback accounting.

### Failure class
- cross-environment configuration/infrastructure failure.

### Scientific disposition
- failed/censored/UNRESOLVED.

### Fixes
- zero-credit GitHub→Replit secret-binding endpoint/workflow;
- paid gate repeats binding;
- owner repeats binding immediately before provider ownership;
- exact runtime DB binding;
- URL-encoded secret path;
- no-callback-spend watchdog.

---

## 15. WSSS probe 9 / P2G11 — successful historical execution

### Outcome
- full two-hour window;
- duration_censored=false;
- stop_reason=null;
- reconciliation=MATCH;
- gate/owner/watchdog SUCCESS;
- provider subscription removed;
- all 67 retained blobs deleted;
- zero runtime rows;
- zero active billable subscriptions;
- finalizer PASS_COMPLETED_AND_BUDGET_CLOSED.

### Scientific disposition at execution time
- successful Stage-1 execution.

### Later measurement-contract issue
P2G11 predates the explicit physical-flight metric contract. Its durable metric_contract_version is NULL.

Its legacy implementation used flight-number/runtime-key proxies such as:

~~~sql
COUNT(DISTINCT flight_number)
~~~

rather than the later canonical physical flight_instance_id for all relevant yield components.

### Does this retroactively make P2G11 a failed experiment?
No.

### Does it make its legacy yield values directly comparable to physical-v2 values?
No.

### Current solution
Under retained §9.2 common reference normalization, one prospectively bounded corrected 2h WSSS v2 measurement is required for reference comparability.

This is **contract-correction remeasurement**, not another infrastructure retry.

---

## 16. MMUN probe 10 / P2G13 — provider success, scientific identity failure

### Operational result
- full 2h;
- duration_censored=false;
- stop_reason=null;
- 52 external = 52 internal credits;
- 39/39 callback 2xx;
- zero callback failures;
- reconciliation=MATCH;
- provider subscription removed;
- 39/39 blobs later deleted;
- finalizer PASS_COMPLETED_AND_BUDGET_CLOSED.

### Scientific defect
The new prepaid physical-flight v1 implementation did not fully mirror the normal production resolver.

For no-provider-ID observations, it lacked an exact retained schedule-leg lookup before fuzzy/callsign matching.

Observed live pattern:
- VB2102 first callback: exact leg resolved, callsign/aircraft absent;
- later same scheduled leg: callsign VIV2102 and aircraft XA-VXY appear;
- later row incorrectly quarantined instead of reusing the existing flight_instance_id.

AM501 exhibited the same resolved→quarantined pattern.

### Second defect
Provisional ambiguity identity included mutable callsign, allowing later enrichment to change the ambiguity token for the same scheduled leg.

### Scientific effects
- ambiguity upper bound can widen falsely;
- late tail enrichment can detach from confirmed leg;
- confirmed tail-chain yield can be understated;
- ranking metric can change.

### Fixes in PR #9
- exact scheduled-leg lookup before fuzzy matching;
- callsign removed from stable scheduled-leg ambiguity token when flight number exists;
- v2 metric contract;
- regression tests based on live VB2102/AM501 behavior;
- bounded common-contract remeasurement.

---

## 17. Why the old physical-flight mismatch was missed before P2G13

There are two separate reasons.

### 17.1 Legacy WSSS/OMAA path used a different metric implementation
Those runs did not exercise the new v1 prepaid physical identity path. They used older flight-number/runtime-key proxy metrics.

Therefore they could not expose the exact v1 schedule/callsign parity bug.

### 17.2 Test coverage missed the live enrichment pattern
The new v1 tests covered:
- provider-ID reuse;
- route conflict;
- callsign-linked retime;
- ambiguous nearby schedules;
- codeshare ambiguity.

They did **not** cover:
- no provider ID;
- same exact carrier/flight/route/service date/scheduled time;
- first callback callsign NULL;
- later callback gains callsign/aircraft.

P2G13 produced exactly that missing case.

### Prevention lesson
Tests must be constructed from real observed failure patterns, and normal/prepaid resolver parity must be tested for scientific semantics rather than only similar field mappings.

---

## 18. Why WSSS/OMAA now require bounded v2 remeasurement

The historical provider runs succeeded.

The issue is common-score measurement compatibility.

Current §9.2 defines:
- WSSS as primary yield reference;
- OMAA as fallback;
- candidate yield components standardized against the reference;
- identical target-2h protocol.

Legacy WSSS/OMAA components were calculated with the older proxy metric.

Future MMUN/LKPR/SKBO/YSSY use physical-v2 metrics.

A ratio of different constructs is not scientifically clean.

Therefore, under the retained score:

~~~text
WSSS v2 -> OMAA v2 -> MMUN v2
~~~

is required before normal sequence resumes.

This is bounded:
- one v2 contract-correction attempt per candidate;
- no automatic second v2 attempt;
- a further attempt requires explicit new adjudication.

---

## 19. Why Stage 2 cannot silently solve this

The original design described 4h Stage-2 confirmation.

The later compact-six amendment superseded this with **conditional Stage 2**.

Current rules:
- Stage 2 is not automatically run for all six;
- Stage-2 trigger must be present;
- WSSS/OMAA §9.2 reference is explicitly the matched 2h Stage-1 exposure.

Therefore a future 4h measurement cannot silently replace the required common 2h reference without a prospective protocol amendment.

---

## 20. Residual infrastructure risks after GitHub ownership

GitHub architecture removes the old “Replit shell owns the entire paid lifecycle” single point of failure.

Still possible:
1. AeroDataBox 5xx/control-plane outage.
2. Replit callback host outage/replacement.
3. DB connectivity/storage failure.
4. Internet/DNS/TLS failure.
5. GitHub Actions interruption/outage.
6. cross-environment secret/config drift.
7. provider deletion failure.
8. malformed provider payload/schema drift.

Controls reduce probability and contain consequences; they do not make infrastructure failure impossible.

---

## 21. One-place pre-paid recurrence prevention checklist

Before any v2 paid run:

1. exact code HEAD frozen;
2. exact metric-contract version frozen;
3. normal/prepaid identity parity tests green;
4. live-failure regression tests green;
5. migration fresh/replay green;
6. typecheck/lint/build green;
7. full V3.9 test suite green;
8. traceability/contradiction scanner green;
9. no unresolved P0/P1 scientific issue;
10. previous probe operational closure complete;
11. exact runtime synced to approved HEAD;
12. callback route/retention/secret/DB binding green;
13. zero active foreign/billable subscriptions;
14. provider read stability green;
15. fresh budget day;
16. fresh AUTH;
17. exact candidate selected by shared preflight/owner selector;
18. weekday/time class valid;
19. GitHub owner + watchdog live;
20. no outcome-driven retry authorization.

---

## 22. Canonical prevention sources in repository

- SEPmd/V3.9_DataCollectPlan_f.8.md
- SEPmd/V3.9_IMPLEMENTATION_LOG.md
- SEPmd/phase2g/FAILURE_REGISTER_AND_PREVENTION_MATRIX.md
- SEPmd/phase2g/SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md
- SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_METRIC_CORRECTION.md
- SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_V2_RECOVERY.md
- migrations/0058_phase2g_reconciliation_evidence.sql
- migrations/0060_phase2g_physical_flight_metrics.sql
- migrations/0061_phase2g_physical_flight_metrics_v2.sql
- tests/prepaid_identity_persistence_v39.test.ts
- tests/prepaid_identity_adapter_v39.test.ts
- tests/prepaid_physical_metrics_v39.test.ts
- tests/phase2g_stage1_rerun_policy_v39.test.ts

---

## 23. Final interpretation rule

Never summarize a failure with one word if multiple layers differ.

Use this form:

~~~text
Infrastructure execution:
Accounting/reconciliation:
Scientific measurement:
Protocol comparability:
Cleanup/evidence:
Promotion eligibility:
~~~

That prevents a provider-success/science-failure case like P2G13 from being mislabeled as either a complete success or a complete infrastructure failure.
