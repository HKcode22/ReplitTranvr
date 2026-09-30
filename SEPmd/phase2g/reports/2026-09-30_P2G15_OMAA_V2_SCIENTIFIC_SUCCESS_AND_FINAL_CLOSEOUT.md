# P2G15 OMAA-v2 — Scientific Success and Final Closeout

**Project:** V3.9 Aviation Data Collection / Phase 2G / Gate 2 / Stage 1  
**Airport:** OMAA  
**Probe:** 12  
**Paid run:** GitHub Actions run `36559290299`  
**Scientific contract:** `v39-physical-flight-instance-v2`  
**Execution source HEAD:** `5f0ce321f9c46a5371b29bf4746b0b0080c4d150`  
**Authorization:** `AUTH-20260929-P2G15`  
**Budget day:** `P2G-S1-20260929-14`  
**Runtime session:** `533aeee7-ec5b-4999-af7a-6d48ab263816`  
**Final adjudication:** **SCIENTIFICALLY VALID / ACCEPTED / FULLY PROTOCOL-CLOSED**  
**Rerun required:** **NO**

---

## 1. Final adjudication

OMAA-v2 is accepted as a scientifically valid Stage-1 measurement under the corrected physical-flight identity contract.

The probe completed its intended measurement window without outcome-driven early stopping, satisfied the frozen complete-bucket requirement, finished with no hard scientific-health violations, reconciled external and internal provider spend exactly, removed the billable provider subscription, completed exact-session retained-content cleanup, closed the probe budget, and passed the settling finalizer.

Final protocol state:

```text
probe_id = 12
icao = OMAA
status = completed
metric_contract_version = v39-physical-flight-instance-v2
duration_censored = false
stop_reason = null
reconciliation_status = MATCH
runtime_cleanup_verified_at_utc = 2026-09-29T23:57:55.315Z
budget_state = CLOSED
budget_closed_at_utc = 2026-09-30T00:17:52.230Z
open_incidents = 0
active_billable_subscriptions = 0
```

There is no remaining scientific or protocol reason to repeat OMAA-v2.

---

## 2. Exact source and frozen evidence

```text
execution HEAD =
5f0ce321f9c46a5371b29bf4746b0b0080c4d150

AUTH =
AUTH-20260929-P2G15

AUTH SHA-256 =
fe38b0912af47ede0fa23b27c9aaab6c85b2e32a5909554e45391dffa9219635

runtime =
artifacts/phase2g-gate2-runtime-P2G-S1-20260929-14.json

runtime SHA-256 =
cd1f856951cf0d3f1fdd7af65c8416570e323f9d7172f14a821434141af922da

pre-probe SHA-256 =
b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870

identity-v2 recovery amendment SHA-256 =
d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741
```

The GitHub owner and watchdog both used the exact authorized execution HEAD.

---

## 3. Measurement window

```text
window_start = 2026-09-29T11:03:58.054Z
window_end   = 2026-09-29T13:03:58.139Z
duration_censored = false
stop_reason = null
outcome_metric_used_for_stop = false
```

The nominal 120-minute target was reached without outcome-driven early termination.

---

## 4. Terminal scientific health

```text
status = PASS_WITH_AMBIGUITY
hard_violations = []

totalItemRows = 148
resolvedRows = 140
quarantinedRows = 8
resolvedOperatorRows = 140
quarantinedOperatorRows = 8

resolvedPhysicalIds = 75
provisionalIdentityKeys = 77

exactLegEligibleRows = 140
exactLegGroups = 75
repeatedExactLegGroups = 41
lateAircraftEnrichmentPhysicalIds = 8
```

Hard physical-v2 failure signatures:

```text
resolvedRowsWithoutPhysicalId = 0
quarantinedRowsWithPhysicalId = 0
resolvedRowsNonOperator = 0
mixedResolutionExactLegGroups = 0
exactLegIdentitySplitGroups = 0
resolvedThenQuarantinedExactLegGroups = 0
exactLegProvisionalKeyDriftGroups = 0
```

The MMUN-v1 identity/parity failure signature did not recur.

---

## 5. Bounded ambiguity

The eight quarantined observations did not represent eight distinct candidate physical flights.

The durable scientific bounds were:

```text
confirmed_unique_lower = 75
confirmed_plus_ambiguous_upper = 77
```

Thus the conservative unresolved ambiguity contributed only two unique ambiguity tokens.

Incomplete observations were quarantined rather than force-resolved. Repeated ambiguous observations retained stable provisional identity keys.

---

## 6. Stability requirement

```text
complete_buckets = 7
min_stability_buckets = 6
stability = 0.4340437195001453
stability_status = PASS
```

The production implementation uses complete UTC-aligned 15-minute buckets and excludes partial edge buckets.

Complete usable buckets:

```text
11:15–11:30
11:30–11:45
11:45–12:00
12:00–12:15
12:15–12:30
12:30–12:45
12:45–13:00
```

Therefore the frozen sample-sufficiency condition was satisfied: `7 >= 6`.

The numerical stability value is reported as measured. `stability_status=PASS` establishes sample sufficiency; no separate qualitative label is inferred for the numerical value.

---

## 7. Scientific denominator consistency

```text
confirmed_unique_lower_per_credit =
0.5067567567567568

confirmed_plus_ambiguous_upper_per_credit =
0.5202702702702703
```

With the reconciled 148-credit denominator:

```text
75 / 148 = 0.5067567567567568
77 / 148 = 0.5202702702702703
```

The stored scientific rates therefore agree exactly with the durable lower/upper populations and reconciled denominator.

---

## 8. Provider and accounting reconciliation

```text
starting Flight Alert balance = 1950
terminal balance = 1802
external spend = 148

internal credits = 148
gap = 0

reconciliation_status = MATCH
active_billable_subscriptions = 0
```

The independent watchdog also observed zero callback failures and zero provider-read failures at terminal monitoring.

---

## 9. GitHub execution

GitHub Actions run:

```text
36559290299
```

Jobs:

```text
gate = success
owner = success
safety-watchdog = success
```

Owner terminal state:

```text
state = CHILD_PASS
child_exit_code = 0
callback_watchdog_triggered = false
recovery_attempted = false
```

Before local cleanup, the owner correctly returned:

```text
PASS_PROVIDER_SAFE_AWAITING_CLEANUP
```

The watchdog independently returned:

```text
PROVIDER_SAFE_AWAITING_REPLIT_CLEANUP
reconciliation_status = MATCH
active_billable_subscriptions = 0
```

---

## 10. Preserved GitHub evidence

Owner artifact:

```text
phase2g-owner-evidence-36559290299
sha256:8e8c2d83d4438eab4bba156822f000efd73bb59c22fd7c94f8a041be7155032b
```

Scientific-health artifact:

```text
phase2g-scientific-health-36559290299
sha256:1a1f6dc10102d300fb55111bab1369b2765a41f6f16e74fda0a320ba7f7980ec
```

Both were produced from the exact authorized execution HEAD.

---

## 11. Post-measurement transient-runtime anomaly

Before cleanup:

```text
runtime_sessions = 0
runtime_deliveries = 0
runtime_items = 0
live_blobs = 30
```

This was not the ideal deferred-cleanup ordering.

The cause is not proven and should not be asserted.

The condition did not invalidate OMAA because terminal scientific-health, durable probe metrics, durable reconciliation evidence, provider-safe state, independent GitHub artifacts, and all 30 expected retained provider-content blobs existed before cleanup.

This is recorded as a post-measurement closeout anomaly, not a scientific measurement failure.

---

## 12. Exact-session cleanup

Dry run:

```text
mode = DRY_RUN
expected_live_blobs = 30
observed_live_blobs = 30
transient sessions = 0
transient deliveries = 0
transient items = 0
active_billable_subscriptions = 0
provider_mutation = false
alert_credits_spent = 0
```

Cleanup APPLY:

```text
expected_live_blobs = 30
deleted_blobs = 30
deleted_runtime_rows = 0

final.sessions = 0
final.deliveries = 0
final.items = 0
final.live_blobs = 0

active_billable_subscriptions = 0
provider_mutation = false
subscription_mutation = false
alert_credits_spent = 0

verified_at_utc = 2026-09-29T23:57:55.315Z
```

Receipt:

```text
artifacts/phase2g-exact-session-purpose-cleanup-P2G15-OMAA-v2-1790726275375.json
```

SHA-256:

```text
485136bfcdf00d98244857ae5f295e0ff86813ce4aba1e94d3f2575231c90519
```

---

## 13. Settling finalizer

Finalizer result:

```text
status = PASS_COMPLETED_AND_BUDGET_CLOSED
probe_id = 12
session_id = 533aeee7-ec5b-4999-af7a-6d48ab263816
probe_budget_day_id = P2G-S1-20260929-14

cleanup_verified_at_utc = 2026-09-29T23:57:55.315Z
budget_closed_at_utc = 2026-09-30T00:17:52.230Z
finalized_at_utc = 2026-09-30T00:17:53.098Z

active_billable_subscriptions = 0
reconciliation_status = MATCH
provider_mutation = false
alert_credits_spent_by_finalizer = 0
```

Receipt:

```text
artifacts/phase2g-settling-finalizer-probe12-1790727473098.json
```

SHA-256:

```text
1cadec1881520324daa6a320255add48367489f5711291b611f94f9e7be28c36
```

The finalizer contract requires and post-verifies completed probe state, cleanup verification, closed budget, zero open incidents, zero active billable subscriptions, `MATCH` reconciliation, uncensored duration, and null stop reason.

---

## 14. Final declaration

OMAA-v2 satisfies all required acceptance conditions:

```text
correct v2 metric contract          PASS
target duration                     PASS
duration uncensored                 PASS
stop reason                         null
outcome-driven stopping             absent
complete-bucket minimum             PASS (7 >= 6)
hard scientific violations          0
identity splits                     0
resolved->quarantined regressions   0
provisional-key drift               0
invalid resolved identities         0
bounded ambiguity                   PASS
external/internal reconciliation    MATCH (148 = 148)
active billable subscriptions       0
open incidents                      0
exact-session cleanup               PASS
budget closure                      PASS
settling finalizer                  PASS
```

> **FINAL ADJUDICATION: OMAA-v2 is SCIENTIFICALLY VALID, ACCEPTED, and FULLY PROTOCOL-CLOSED.**

> **RERUN REQUIRED: NO.**

---

## 15. Next frozen recovery target

The prospectively frozen corrected-contract recovery order is:

```text
WSSS -> OMAA -> MMUN
```

WSSS-v2 is fully closed.

OMAA-v2 is now fully closed.

Therefore the next recovery candidate is:

```text
MMUN
```

Legacy MMUN-v1 remains excluded from v2 scientific scoring/comparison.

MMUN must be a fresh prospective v2 Stage-1 attempt.

Before any MMUN paid mutation:

1. preserve/commit this OMAA report and both OMAA closeout receipts;
2. verify the intended clean repository source state;
3. independently confirm the frozen next-candidate selector returns `MMUN`;
4. create a fresh MMUN budget-day ID;
5. create a fresh MMUN runtime artifact bound to the then-current exact source HEAD;
6. create a fresh MMUN authorization and SHA;
7. do not reuse OMAA AUTH/runtime artifacts;
8. verify zero active/settling probes, zero open incidents, and zero active billable subscriptions;
9. verify the OMAA budget is closed;
10. verify provider balance against the frozen Stage-1 admission floor;
11. refresh callback/runtime binding evidence if required by the protocol;
12. run the read-only paid preflight;
13. launch exactly one MMUN-v2 Stage-1 attempt only if every gate passes.

The recovery remains sequential. No other paid probe should overlap MMUN.
