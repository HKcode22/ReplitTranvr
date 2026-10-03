# P2G20 SKBO-v2 — Scientific Success and Final Closeout

**Project:** V3.9 Aviation Data Collection / Phase 2G / Gate 2 / Stage 1  
**Airport:** SKBO — Bogotá  
**Probe:** 15  
**Paid run:** GitHub Actions run `36998609342`  
**Scientific contract:** `v39-physical-flight-instance-v2`  
**Execution HEAD:** `00b1692811ce02ad05ddc3a8eaaa80c3fbf93d4a`  
**Authorization:** `AUTH-20261002-P2G20`  
**Budget day:** `P2G-S1-20261002-19`  
**Runtime session:** `b256d48e-8df3-4291-9172-1abc04f62316`  
**Final adjudication:** **SCIENTIFICALLY VALID / CAPACITY-PASSING / STABILITY-PASSING / FULLY PROTOCOL-CLOSED**  
**Rerun required:** **NO**

---

## 1. Final adjudication

SKBO-v2 is accepted as a scientifically valid Stage-1 measurement under the corrected physical-flight identity contract.

The probe completed the intended two-hour collection window without outcome-driven early stopping, exceeded the frozen capacity gate, passed the complete-bucket stability requirement, retained bounded identity ambiguity without any hard scientific-health violation, reconciled provider spend exactly, removed the billable provider subscription, completed exact-session retained-content cleanup, and passed the hardened settling finalizer.

Final durable state:

```text
probe_id = 15
icao = SKBO
status = completed
metric_contract_version = v39-physical-flight-instance-v2
duration_censored = false
stop_reason = null
reconciliation_status = MATCH
runtime_cleanup_verified_at_utc = 2026-10-03T02:35:52.777Z
budget_state = CLOSED
budget_closed_at_utc = 2026-10-03T02:37:43.747Z
open_incidents = 0
active_billable_subscriptions = 0
```

There is no scientific or protocol reason to repeat SKBO under the current Stage-1 experiment.

---

## 2. Exact frozen execution evidence

```text
execution HEAD =
00b1692811ce02ad05ddc3a8eaaa80c3fbf93d4a

runtime source HEAD =
5df3ece337a152f6fd1f8083210b248b53fadaa1

AUTH =
AUTH-20261002-P2G20

AUTH SHA-256 =
6622a0b93a122bf687bbf9a6a54f48170911f211032553c48982e6b737714d95

runtime =
artifacts/phase2g-gate2-runtime-P2G-S1-20261002-19.json

runtime SHA-256 =
d8e109897a0bde3d528c9b33bee7eee569128bb903987fa1d603707006cc85e2

runtime binding SHA-256 =
65db88fee72a9724930f55fc42df134944b230b577d7e807eebfa6fe59c721eb

pre-probe SHA-256 =
b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870

early-pilot scope / Stage-1 amendment SHA-256 =
3f9d4a55d5cc933726bb045c735935fa90cda85b9e972c745ca9c93feb39932b
```

The paid workflow gate, owner, and independent safety watchdog all executed on the exact authorized execution HEAD.

---

## 3. Measurement window and capacity

Durable probe window:

```text
window_start = 2026-10-02T11:01:55.735Z
window_end   = 2026-10-02T13:01:55.845Z
window_hours = 2.0000305555555555
duration_censored = false
stop_reason = null
```

Durable Stage-1 yield:

```text
rows_delivered = 301
rows_per_hour = 150.4977007295722
capacity_gate_rows_per_hour = 60
capacity = PASS
```

The nominal 120-minute target was reached and the capacity gate was exceeded without using the observed outcome to stop the run.

---

## 4. Terminal scientific health

Terminal GitHub owner evidence recorded:

```text
status = PASS_WITH_AMBIGUITY
hard_violations = []

totalItemRows = 301
resolvedRows = 271
quarantinedRows = 30
resolvedOperatorRows = 271
quarantinedOperatorRows = 26
marketingRows = 4

resolvedPhysicalIds = 149
provisionalIdentityKeys = 164
exactLegEligibleRows = 271
exactLegGroups = 149
repeatedExactLegGroups = 61
lateAircraftEnrichmentPhysicalIds = 3
```

Critical physical-v2 hard-failure signatures remained zero:

```text
resolvedRowsWithoutPhysicalId = 0
quarantinedRowsWithPhysicalId = 0
resolvedRowsNonOperator = 0
mixedResolutionExactLegGroups = 0
exactLegIdentitySplitGroups = 0
resolvedThenQuarantinedExactLegGroups = 0
exactLegProvisionalKeyDriftGroups = 0
```

Thus the MMUN-v1 physical-flight identity/parity failure signature did not recur.

---

## 5. Provider-field incompleteness and bounded ambiguity

The live provider payloads did not supply native provider flight IDs:

```text
providerFlightIdMissingRows = 301
callsignMissingRows = 176
aircraftRegPresentRows = 117
```

This forced the frozen exact schedule/operating-flight fallback identity logic to perform real work.

Despite the missing provider-native IDs, the terminal evidence retained 149 resolved physical identities with zero identity splits, zero exact-leg key drift, zero resolved rows lacking a physical ID, and zero resolved/non-operator violations.

Durable identity bounds:

```text
confirmed_unique_lower = 149
confirmed_plus_ambiguous_upper = 163
```

The conservative unresolved unique-identity interval is therefore 149–163. Ambiguous observations were quarantined instead of being silently force-resolved.

---

## 6. Stability

```text
complete_buckets = 7
min_stability_buckets = 6
stability = 0.7368555250596168
stability_status = PASS
```

The frozen complete-bucket sufficiency requirement was satisfied: `7 >= 6`.

The numerical stability value is reported as measured; `stability_status=PASS` establishes sample sufficiency.

---

## 7. Yield denominators and tail-chain component

```text
unique_flights = 149
tail_chain_links = 0
unique_flights_per_credit = 0.4950166112956811
tail_chain_links_per_credit = 0
confirmed_unique_lower_per_credit = 0.4950166112956811
confirmed_plus_ambiguous_upper_per_credit = 0.5415282392026578
```

With the reconciled 301-credit denominator:

```text
149 / 301 = 0.4950166112956811
163 / 301 = 0.5415282392026578
```

The durable identity-bound rates therefore agree with the durable populations and reconciled denominator.

A zero tail-chain yield does not invalidate an ordinary Stage-1 candidate under the frozen promotion code; it contributes zero to that yield component. The positive tail-chain requirement applies to selecting the WSSS/OMAA reference, not to SKBO itself.

---

## 8. Provider/accounting reconciliation

The run began from a verified Flight Alert balance of 2000 and ended at 1699.

```text
external provider spend = 301
internal reconciled spend = 301
gap = 0
reconciliation_status = MATCH
active_billable_subscriptions = 0
```

During live monitoring, temporary provider-balance read lag repeatedly converged back to exact internal accounting rather than diverging. No callback failures, provider-read failures, or no-callback-spend watchdog condition occurred.

---

## 9. GitHub execution

GitHub Actions run:

```text
36998609342
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
callback_consecutive_failures_at_exit = 0
recovery_attempted = false
```

Before local content cleanup, the owner correctly returned:

```text
PASS_PROVIDER_SAFE_AWAITING_CLEANUP
```

The independent watchdog ended provider-safe with reconciliation `MATCH`, zero active billable subscriptions, and cleanup still pending.

---

## 10. Preserved GitHub Actions evidence

Owner artifact:

```text
name = phase2g-owner-evidence-36998609342
artifact_id = 11228145113
zip_sha256 = e031760642ffc6966d0ea4e155344b6c6e55eabee60dcc6148639238510abab9
```

The owner heartbeat, log, and status files are copied into the repository under `artifacts/` with their original bytes.

Scientific-health artifact:

```text
name = phase2g-scientific-health-36998609342
artifact_id = 11227601762
zip_sha256 = 4d005afb9794da5440a40a8930ebfd4300f38ae49519c6ac5c273acac1b3519e

contained JSONL =
phase2g-scientific-health-P2G-S1-20261002-19-36998609342.jsonl

contained JSONL SHA-256 =
2f8391bcfc44fcbfd59558d4ba2ffd7aa983ca88b4a52904d6613b18656435b8
```

The full JSONL remains available in the Actions artifact; its terminal scientific-health record is also preserved verbatim in the repository owner log.

Permanent hash manifest:

`artifacts/phase2g-p2g20-github-artifact-manifest-36998609342.json`

---

## 11. Delayed closeout anomaly

At GitHub owner completion, the provider subscription had already been removed and exact reconciliation had already been durably persisted, but exact-session Replit retained-content cleanup was intentionally deferred.

Hours later, closeout inspection found:

```text
probe.status = settling
runtime_cleanup_verified_at_utc = null
budget.state = OPEN

runtime sessions = 0
runtime deliveries = 0
runtime items = 0

provider blob refs = 47
live provider blobs = 47
```

The three prepaid runtime tables are PostgreSQL `UNLOGGED`; `provider_content_blob_ref` is permanent. A later forensic observation confirmed that the PostgreSQL postmaster start timestamp had changed after the SKBO run, demonstrating a mechanism capable of clearing the transient UNLOGGED tables while preserving the permanent blob-reference rows.

The exact first event that removed the runtime rows was not independently timestamped, so the report does not assert an unproven precise causal restart. This is treated as a post-measurement closeout anomaly, not a scientific measurement failure, because the terminal scientific-health evidence, durable summary metrics, durable reconciliation, and all 47 retained provider blobs existed independently.

---

## 12. Exact-session cleanup

Read-only cleanup dry-run verified:

```text
expected_live_blobs = 47
observed_live_blobs = 47
transient sessions = 0
transient deliveries = 0
transient items = 0
active_billable_subscriptions = 0
provider_mutation = false
alert_credits_spent = 0
```

Cleanup APPLY produced:

```text
deleted_blobs = 47
deleted_runtime_rows = 0

final.sessions = 0
final.deliveries = 0
final.items = 0
final.live_blobs = 0

active_billable_subscriptions = 0
provider_mutation = false
subscription_mutation = false
alert_credits_spent = 0

verified_at_utc = 2026-10-03T02:35:52.777Z
```

Receipt:

`artifacts/phase2g-exact-session-purpose-cleanup-p2g20-skbo-final-1790994952836.json`

SHA-256:

`acdbc3d09c9fcfd3324f74e40ea330269f0177354ebf8a871f999d1e2b0031fc`

---

## 13. Hardened settling finalizer

The existing fail-closed finalizer accepted the exact cleanup receipt and exact runtime binding and returned:

```text
status = PASS_COMPLETED_AND_BUDGET_CLOSED
probe_id = 15
session_id = b256d48e-8df3-4291-9172-1abc04f62316
probe_budget_day_id = P2G-S1-20261002-19

cleanup_verified_at_utc = 2026-10-03T02:35:52.777Z
budget_closed_at_utc = 2026-10-03T02:37:43.747Z
finalized_at_utc = 2026-10-03T02:37:44.509Z

active_billable_subscriptions = 0
reconciliation_status = MATCH
provider_mutation = false
alert_credits_spent_by_finalizer = 0
```

Receipt:

`artifacts/phase2g-settling-finalizer-probe15-1790995064509.json`

SHA-256:

`84a96b7c28e97a419987262d5d32771c9c29fb99b3931e1bdd7d8f765b32380d`

Independent post-finalizer verification returned:

```text
probe.status = completed
runtime_cleanup_verified_at_utc != null
budget.state = CLOSED
live_blobs = 0
sessions = 0
deliveries = 0
items = 0
open_incidents = 0
SKBO_FINAL_CLOSURE = PASS
```

---

## 14. Final declaration

SKBO-v2 satisfies the relevant early-pilot Stage-1 acceptance conditions:

```text
correct physical-flight-v2 contract       PASS
target duration                            PASS
duration uncensored                        PASS
stop reason                                null
outcome-driven stopping                    absent
capacity >= 60 rows/hour                   PASS (150.4977)
complete-bucket minimum                    PASS (7 >= 6)
stability status                           PASS
hard scientific violations                 0
identity splits                            0
resolved->quarantined regressions          0
provisional-key drift                      0
bounded identity ambiguity                 PASS (149–163)
external/internal reconciliation           MATCH (301 = 301)
active billable subscriptions              0
open incidents                             0
exact-session cleanup                      PASS
budget closure                             PASS
settling finalizer                         PASS
```

> **FINAL ADJUDICATION: SKBO-v2 is SCIENTIFICALLY VALID, ACCEPTED, CAPACITY-PASSING, STABILITY-PASSING, and FULLY PROTOCOL-CLOSED.**

> **RERUN REQUIRED: NO.**

---

## 15. Next frozen program step

The superseding early-pilot scope orders the new targets:

```text
SKBO -> YSSY
```

SKBO is now complete.

However, the same frozen scope explicitly sets:

```text
target_execution_authorized.SKBO = true
target_execution_authorized.YSSY = false
yssy_local_time_protocol_required = true
```

The reason is that the old matched 11:00–13:00 UTC Stage-1 window maps to 21:00–23:00 local Sydney time for the reviewed date and terminates at the curfew boundary, creating a structural local-time/yield confound.

Therefore the next scientific task is **not** an immediate paid YSSY launch and is **not** automatic Stage-2 confirmation.

The next task is:

1. design a prospective local-operating-hours-aware YSSY Stage-1 protocol;
2. freeze that protocol before observing any YSSY paid outcome;
3. bind it into a new scope/runtime/AUTH chain;
4. re-run offline safety and callback/runtime checks;
5. launch exactly one YSSY Stage-1 attempt only after the new protocol and a fresh paid authorization explicitly permit it.

Until that separate protocol is frozen, YSSY paid execution remains blocked.

LKPR remains deferred under the current early-pilot scope.

The early-pilot amendment also retires the original automatic Stage-2 requirement for this reduced scope; conditional confirmation is not the immediate next operation.

