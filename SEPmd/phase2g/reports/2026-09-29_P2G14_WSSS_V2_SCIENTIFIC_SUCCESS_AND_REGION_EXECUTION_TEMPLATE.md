# P2G14 WSSS-v2 — Scientific Success, Final Closeout, and Reusable Region-Execution Template

**Project:** V3.9 Aviation Data Collection / Phase 2G / Gate 2 / Stage 1  
**Airport:** WSSS — Singapore Changi  
**Probe:** 11  
**Paid run:** GitHub Actions run `36413290291`  
**Scientific contract:** `v39-physical-flight-instance-v2`  
**Execution source HEAD:** `3e26399a4545cb243d246d6fc824dad8b88492e9`  
**Final closeout date:** 2026-09-29 UTC  
**Final adjudication:** **SCIENTIFICALLY VALID / ACCEPTED / FULLY PROTOCOL-CLOSED**  
**Rerun required:** **NO**

---

# 1. Purpose of this report

This report permanently records the first fully successful corrected-contract WSSS Stage-1 measurement after several weeks of Phase-2G hardening.

Its goals are:

1. preserve the exact WSSS-v2 scientific and operational evidence;
2. distinguish scientific success from provider safety and administrative cleanup;
3. document the failures and controls that had to be solved before WSSS could succeed;
4. identify which controls must remain unchanged for later regions;
5. provide a reusable execution/closeout template for OMAA, MMUN, and subsequent Stage-1 candidates;
6. prevent future operators from accidentally repeating earlier failure modes;
7. make clear that a green GitHub workflow alone is not sufficient scientific evidence.

This is not a new authorization to rerun WSSS. WSSS-v2 is complete.

---

# 2. Exact run identity

## 2.1 Source and authorization

- repository: `HKcode22/ReplitTranvr`
- branch at execution: `main`
- execution HEAD: `3e26399a4545cb243d246d6fc824dad8b88492e9`
- AUTH: `AUTH-20260928-P2G14`
- budget day: `P2G-S1-20260928-13`
- probe ID: `11`
- runtime session:
  `901ca702-8cdc-4ba0-bd20-2747f883ce86`
- metric contract:
  `v39-physical-flight-instance-v2`

## 2.2 Frozen artifacts

- runtime:
  `artifacts/phase2g-gate2-runtime-P2G-S1-20260928-13.json`
- runtime SHA-256:
  `18880fc0c9bc90545ebc3848938000b82ed474116c848110ce097eeafa6071ae`

- pre-probe freeze:
  `artifacts/preprobe-reference-freeze-record.json`
- pre-probe SHA-256:
  `b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870`

- identity-v2 recovery amendment SHA-256:
  `d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741`

- AUTH SHA-256:
  `ad19acc93ffcf5cc971912c5a47592d0c0ba97951b99d88105abcaa839cbdb70`

## 2.3 Paid window

Durable probe row:

```text
window_start = 2026-09-28T11:04:14.837Z
window_end   = 2026-09-28T13:04:14.948Z
duration_censored = false
stop_reason = null
```

The target exposure was 120 minutes and was reached.

---

# 3. Final scientific adjudication

WSSS-v2 is accepted as a scientifically valid Stage-1 measurement because all required scientific and accounting conditions were satisfied before the transient runtime state disappeared.

The final durable probe state after exact-session cleanup and finalization was:

```text
probe_id = 11
icao = WSSS
status = completed
metric_contract_version = v39-physical-flight-instance-v2
duration_censored = false
stop_reason = null
reconciliation_status = MATCH
runtime_cleanup_verified_at_utc = 2026-09-29T07:58:06.351Z
budget_state = CLOSED
budget_closed_at = 2026-09-29T07:58:57.667Z
open_incidents = 0
active_or_settling_probes = 0
```

There is no remaining scientific or protocol gate that requires another WSSS-v2 paid run.

---

# 4. Terminal scientific-health evidence

The terminal GitHub owner/watchdog scientific-health record reached:

```text
status = PASS_WITH_AMBIGUITY
hard_violations = []
```

Terminal counts included:

```text
totalItemRows = 321
resolvedRows = 308
quarantinedRows = 13
resolvedPhysicalIds = 141
exactLegGroups = 141
repeatedExactLegGroups = 69
lateAircraftEnrichmentPhysicalIds = 12
```

Critical physical-identity-v2 failure signatures all remained zero:

```text
mixedResolutionExactLegGroups = 0
exactLegIdentitySplitGroups = 0
resolvedThenQuarantinedExactLegGroups = 0
exactLegProvisionalKeyDriftGroups = 0
resolvedRowsWithoutPhysicalId = 0
quarantinedRowsWithPhysicalId = 0
resolvedRowsNonOperator = 0
```

This directly exercises the class of mutable-enrichment identity behavior that invalidated MMUN-v1.

---

# 5. Why the identity-v2 result is scientifically meaningful

The success is not merely that software returned the string `PASS_WITH_AMBIGUITY`.

The corrected contract was challenged by real live cases:

- 69 exact scheduled-leg groups were observed more than once;
- 12 physical flight identities received late aircraft enrichment;
- provider flight IDs were unavailable for the collected rows, forcing the exact-schedule/physical-identity fallback path to do real work.

Despite that stress:

- no repeated exact leg split into multiple physical identities;
- no previously resolved exact leg later regressed to quarantine;
- no provisional identity key drift occurred;
- no physical identity was retained in an impossible state;
- no non-operator observation leaked into the resolved operator population.

This is exactly the evidence required to show that the MMUN-v1 parity defect did not recur during WSSS-v2.

---

# 6. Stability requirement

The frozen runtime required:

```text
minStabilityBuckets = 6
```

The production implementation uses complete UTC-aligned 15-minute buckets.

For the WSSS window:

```text
11:04:14.837Z → 13:04:14.948Z
```

the complete usable buckets are:

```text
11:15–11:30
11:30–11:45
11:45–12:00
12:00–12:15
12:15–12:30
12:30–12:45
12:45–13:00
```

Therefore:

```text
complete buckets = 7
minimum required = 6
```

The run satisfies the frozen minimum complete-bucket requirement.

Important historical correction: a simple 120/15 calculation would suggest eight intervals, but the actual implementation intentionally discards partial edge buckets. The authoritative implementation therefore yields seven complete buckets for this exact start/end alignment.

---

# 7. Accounting and delivery reconciliation

Durable reconciliation evidence:

```text
evidence_status = MATCH
external_spend_credits = 321
internal_received_credits = 321
delivery_gap_credits = 0
delivery_completeness = 1.0
delivery_count = 67
notification_items_received = 321
cost_item_disagreement_count = 0
callback_requests_seen = 67
callback_success_2xx = 67
callback_failures = 0
settlement_reads = 3
duration_censored = false
stop_reason = null
```

Thus:

[
321_{external}=321_{internal}
]

and:

[
delivery completeness=1.
]

The historical P2G06 external/internal mismatch did not recur.

---

# 8. Scientific denominator consistency

The durable probe row contains:

```text
confirmed_unique_lower_per_credit =
0.4392523364485981

confirmed_plus_ambiguous_upper_per_credit =
0.45482866043613707
```

These agree with the terminal population and the reconciled 321-credit denominator:

[
141/321=0.4392523364485981
]

and the durable upper-bound population is likewise consistent with the recorded upper rate.

This is an additional cross-check that the durable summary metrics correspond to the terminal reconciled experiment rather than a stale or unrelated denominator.

---

# 9. No outcome-driven early stop

The experiment reached its full target rather than being stopped because the scientific yield appeared favorable or unfavorable.

Evidence:

```text
duration_censored = false
stop_reason = null
outcome_metric_used_for_stop = false
```

This matters because stopping an experiment based on observed scientific yield can induce selection/sequential bias.

The safety/watchdog logic was allowed to stop only for pre-specified safety, contract, provider, callback, accounting, or infrastructure failure conditions.

---

# 10. Provider-safety result

By terminal settlement:

- active billable subscriptions = 0;
- external/internal reconciliation = MATCH;
- no unresolved incident remained;
- no provider subscription was left orphaned;
- final provider balance after WSSS was approximately 1469;
- no automatic retry was executed.

The GitHub owner/watchdog correctly distinguished:

```text
scientific/provider measurement complete
```

from:

```text
exact-session provider-content cleanup still pending
```

and ended in provider-safe cleanup-pending state rather than falsely claiming final project closure.

---

# 11. Exact-session cleanup

The retained provider-content cleanup dry-run first verified:

```text
mode = DRY_RUN
expected_live_blobs = 67
observed_live_blobs = 67
transient sessions = 0
transient deliveries = 0
transient items = 0
active_billable_subscriptions = 0
provider_mutation = false
alert_credits_spent = 0
```

The subsequent exact-session APPLY produced:

```text
mode = APPLY
session_id = 901ca702-8cdc-4ba0-bd20-2747f883ce86
expected_live_blobs = 67
deleted_blobs = 67
deleted_runtime_rows = 0
final.sessions = 0
final.deliveries = 0
final.items = 0
final.live_blobs = 0
active_billable_subscriptions = 0
provider_mutation = false
subscription_mutation = false
alert_credits_spent = 0
verified_at_utc = 2026-09-29T07:58:06.351Z
```

Cleanup receipt:

`artifacts/phase2g-exact-session-purpose-cleanup-P2G14-WSSS-v2-1790668686413.json`

SHA-256:

`5f14d3c6c0df97eacc5742005fb4c3dd8414ad8dd0244864ad5b2d2656744c23`

---

# 12. Finalizer

The settling-probe finalizer returned:

```text
status = PASS_COMPLETED_AND_BUDGET_CLOSED
probe_id = 11
session_id = 901ca702-8cdc-4ba0-bd20-2747f883ce86
probe_budget_day_id = P2G-S1-20260928-13
reconciliation_status = MATCH
active_billable_subscriptions = 0
provider_mutation = false
alert_credits_spent_by_finalizer = 0
cleanup_verified_at_utc = 2026-09-29T07:58:06.351Z
budget_closed_at_utc = 2026-09-29T07:58:57.667Z
finalized_at_utc = 2026-09-29T07:58:58.688Z
```

Finalizer receipt:

`artifacts/phase2g-settling-finalizer-probe11-1790668738688.json`

SHA-256:

`33fd4071a6c5695e79aef244f8b47d6413a1789c5f3118a97c02b5f3110acaf3`

---

# 13. The unusual UNLOGGED-row state and why it did not invalidate WSSS

Before cleanup, the exact session showed:

```text
sessions = 0
deliveries = 0
items = 0
live_blobs = 67
```

This is not the intended normal deferred-cleanup ordering. The normal cleanup function deletes/tombstones provider blobs before deleting transient normalized rows.

However, the transient probe/session tables are deliberately PostgreSQL UNLOGGED working tables and are not the durable scientific record.

Crucially, before the transient rows disappeared:

1. terminal scientific-health had already been computed;
2. the GitHub run had preserved owner evidence;
3. the GitHub run had preserved scientific-health evidence;
4. durable probe summary metrics had already been written;
5. durable reconciliation evidence had already been written;
6. the 67 raw provider-content blobs still existed and exactly matched the expected delivery count.

Therefore this became a post-measurement closeout anomaly, not a loss of the scientific result.

Future region rule:

> A transient-runtime reset after durable scientific/reconciliation evidence exists does not automatically invalidate a probe, but it must be audited before cleanup. Never assume it is harmless without checking durable evidence, exact blob count, provider subscription state, reconciliation, and preserved scientific-health evidence.

---

# 14. GitHub evidence preservation

GitHub Actions preserved independent terminal artifacts for run `36413290291`.

Owner evidence artifact digest:

```text
8b3609f026cf37503326c34913783fbdebaac84232155225798593d80b0d40a9
```

Scientific-health artifact digest:

```text
849b299c446e5fa3934912478d6f5110553946daa88982ba291cd9acd2a988ea
```

These artifacts are important because the GitHub runner and database working tables have different failure domains.

Future region rule:

> Preserve terminal scientific-health evidence independently from transient runtime tables.

---

# 15. What had to be fixed before WSSS could finally succeed

WSSS success depended on solving a sequence of real failure classes.

## 15.1 Schema/default failure

Early pre-Gate experimentation exposed a database default/not-null mismatch around randomized state.

Lesson:

- migrations and production bindings must be tested before paid execution.

## 15.2 Runtime ownership loss

An early WSSS run used transient runtime state in a way that could lose ownership while a provider subscription still existed.

Lesson:

- random runtime session IDs must be durably bound before provider subscription creation.

## 15.3 Process/host resets

Replit process/workspace replacements killed supervisors during earlier attempts.

Lesson:

- the two-hour paid owner cannot depend on an interactive Replit shell staying alive;
- GitHub Actions became the long-lived owner;
- Replit remained the same callback application.

## 15.4 Provider control-plane failures

AeroDataBox balance and subscription-delete operations returned control-plane failures in earlier attempts.

Lesson:

- provider reads require bounded retry;
- deletion must be verified;
- provider-safe recovery must exist independently of the main owner.

## 15.5 External/internal accounting mismatch

One WSSS attempt had an exact one-credit mismatch.

Lesson:

- account-level external reconciliation cannot be replaced by local callback counts;
- settlement must complete before final adjudication.

## 15.6 Callback deployment/secret mismatch

An earlier paid run used a GitHub/Replit webhook-secret mismatch, allowing provider spend while callbacks returned 404.

Lesson:

- zero-credit cross-environment webhook-secret binding must be checked before paid launch;
- runtime DB binding must also be verified;
- the owner must continuously monitor callback/runtime health.

## 15.7 Published-development callback ambiguity

The project discovered that the exact current same-app development callback had to be explicitly bound rather than casually assuming a stale published deployment represented current code.

Lesson:

- callback origin and mode are part of the frozen execution evidence;
- GitHub and Replit must prove they are operating against the same code/runtime/database/secret before provider mutation.

## 15.8 Scientific identity-contract defect

MMUN-v1 demonstrated that infrastructure/provider/accounting success can still produce scientifically invalid data.

The defect involved:
- exact physical leg initially observed with incomplete mutable fields;
- later enrichment adding callsign/aircraft data;
- v1 failing to reunify the enriched observation with the original exact leg;
- mixed resolved/quarantined states and identity drift.

Lesson:

- scientific validity must have its own independent live hard guards;
- provider success is not equivalent to scientific validity.

## 15.9 Corrected physical-flight identity v2

The successful WSSS-v2 run used the corrected contract:

`v39-physical-flight-instance-v2`

Key repair:
- exact schedule-aware retained-leg lookup first;
- reuse exactly one matched physical flight instance despite later mutable enrichment;
- fail closed if multiple exact physical IDs exist;
- only use fuzzy/callsign fallback when no exact retained leg exists;
- stable provisional identity behavior across enrichment.

WSSS-v2 validated this under 69 repeated exact-leg groups and 12 late-aircraft-enrichment physical IDs with zero hard identity signatures.

---

# 16. The reusable success chain for later regions

Later Stage-1 regions should follow this chain.

## Step 1 — Previous probe must be fully closed

Require:

```text
previous probe status = completed
previous runtime_cleanup_verified_at_utc != null
previous reconciliation = MATCH
previous budget = CLOSED
open incidents = 0
active/settling probes = 0
active billable subscriptions = 0
```

Do not overlap paid probes.

## Step 2 — Exact source state

Require:

- expected branch;
- exact committed HEAD;
- no protected source drift;
- runtime and AUTH created only after source HEAD is frozen;
- tests/typecheck PASS.

## Step 3 — Frozen candidate selector

Do not manually choose a candidate because it appears convenient.

The preflight and owner must independently resolve the same next frozen candidate.

For current physical-v2 recovery:

```text
WSSS → OMAA → MMUN
```

## Step 4 — Fresh budget/runtime/AUTH

Each paid region requires:

- fresh probe-budget-day ID;
- fresh runtime artifact;
- runtime SHA;
- fresh AUTH;
- AUTH SHA;
- explicit human approval of that SHA;
- exact source HEAD binding.

Never reuse a prior airport's runtime or AUTH.

## Step 5 — Zero-credit callback binding

Before paid launch verify:

- callback origin;
- exact runtime HEAD;
- DB binding;
- webhook secret;
- route health;
- callback verification artifact SHA.

## Step 6 — Account safety

Verify:

- zero foreign billable subscriptions;
- provider balance sufficient for frozen floor + reservation + margin;
- no open incident;
- no previous open budget day.

For the current design:

[
1000+450+50=1500
]

minimum starting balance for one Stage-1 run.

## Step 7 — Read-only paid preflight

The final preflight must independently verify:

- AUTH;
- runtime;
- hashes;
- source HEAD;
- next candidate;
- time class;
- weekday class;
- callback evidence;
- provider balance;
- subscription inventory;
- database state;
- no overlap;
- no open budget days;
- correct physical-v2 amendment.

Only `PASS_READY_FOR_PAID_STAGE1` permits launch.

## Step 8 — Single GitHub owner + independent watchdog

Use:

- one foreground GitHub Actions paid owner;
- one independent GitHub safety watchdog;
- global workflow concurrency lock;
- no local interactive paid owner;
- no auto retry.

## Step 9 — During live run

Monitor independently:

- callback requests;
- callback failures;
- internal credits;
- provider balance;
- active subscription;
- scientific health;
- identity-split signatures;
- resolved→quarantined regressions;
- provisional-key drift;
- late enrichment behavior;
- hard scientific violations.

Never stop based on favorable/unfavorable scientific yield.

## Step 10 — Settlement

At target completion:

- delete exact owned provider subscription;
- verify no active billable subscriptions;
- allow send accounting and local persistence to settle;
- require accepted terminal reconciliation.

A transient external-vs-internal lag is not automatically a mismatch. Terminal settled evidence is authoritative.

## Step 11 — Scientific terminal evidence

Require:

- correct metric contract;
- no hard scientific violations;
- adequate complete buckets;
- full target unless legitimately censored;
- no outcome-driven stop.

Preserve independent scientific-health artifact.

## Step 12 — Deferred exact-session cleanup

Only after provider safety and durable evidence:

- count exact live provider-content blobs;
- dry-run cleanup;
- verify exact expected count;
- APPLY exact-session cleanup;
- verify sessions/deliveries/items/live blobs all zero;
- preserve cleanup receipt and SHA.

## Step 13 — Finalizer

Finalize only with the exact cleanup receipt + SHA and exact runtime + SHA.

Require:

```text
PASS_COMPLETED_AND_BUDGET_CLOSED
```

Then independently verify:

```text
probe = completed
cleanup timestamp != null
reconciliation = MATCH
budget = CLOSED
open incidents = 0
active/settling probes = 0
```

---

# 17. What later regions should NOT copy blindly from WSSS

The reusable process is the control structure, not every literal identifier.

Do not copy:

- WSSS ICAO;
- WSSS AUTH ID;
- WSSS budget ID;
- WSSS runtime filename;
- WSSS session UUID;
- WSSS provider balance baseline;
- WSSS callback verification filename;
- WSSS exact blob count;
- WSSS observed yield.

Every region must receive fresh identities and must be selected by the frozen selector.

---

# 18. WSSS-specific values that are historical evidence only

These are immutable WSSS evidence, not defaults for OMAA/MMUN:

```text
probe_id = 11
session = 901ca702-8cdc-4ba0-bd20-2747f883ce86
budget = P2G-S1-20260928-13
AUTH = AUTH-20260928-P2G14
external/internal credits = 321/321
deliveries = 67
items = 321
resolved physical IDs = 141
repeated exact groups = 69
late enrichment IDs = 12
cleanup blobs = 67
```

---

# 19. Failure policy for later regions

The WSSS experience demonstrates three categories that must remain separate.

## 19.1 Scientific invalidity

Examples:

- wrong metric contract;
- identity split;
- key drift;
- impossible resolved/quarantined state;
- insufficient complete buckets;
- wrong candidate/time class;
- outcome-driven adaptive stopping.

These can invalidate scientific use even if provider/accounting execution was operationally successful.

## 19.2 Provider/accounting invalidity

Examples:

- unresolved external/internal mismatch;
- orphan subscription;
- provider charged sends with no durable attribution;
- wrong/foreign subscription;
- failed exact settlement.

These can invalidate the denominator or exposure evidence.

## 19.3 Administrative closeout pending

Example:

- provider measurement is complete and scientifically valid, but raw provider blobs still need exact-session purpose cleanup.

This does **not** automatically require recollection.

Operators must not confuse “cleanup pending” with “scientific failure.”

---

# 20. No automatic rerun rule

The project must never turn failures into an unlimited retry loop.

The physical-v2 recovery is prospectively bounded.

A candidate's failed authorized recovery attempt is not automatically permission to try it repeatedly until a desirable result appears.

Any additional recovery would require a new scientifically justified, prospectively frozen amendment independent of the observed outcome metric.

This anti-bias rule must remain intact for OMAA and MMUN.

---

# 21. Why WSSS is now permanently done

The final condition is:

```text
scientific contract: PASS
scientific hard violations: 0
stability minimum: PASS
full target exposure: PASS
duration censored: false
outcome-driven stop: false
reconciliation: MATCH
delivery completeness: 1.0
provider subscription cleanup: PASS
exact-session content cleanup: PASS
runtime cleanup verification: PASS
budget close: PASS
final probe status: completed
open incidents: 0
active/settling probes: 0
```

Therefore:

> **WSSS-v2 is a valid completed Stage-1 recovery measurement and must not be scheduled again under the current recovery amendment.**

The next physical-v2 recovery candidate is OMAA.

---

# 22. Immediate successor guidance: OMAA-v2

OMAA should inherit the WSSS **control procedure**, not WSSS's literal runtime identities.

OMAA requires:

- current audited Git HEAD;
- explicit `expected_icao=OMAA`;
- fresh runtime;
- fresh budget;
- fresh AUTH;
- explicit AUTH SHA approval;
- adequate provider balance;
- zero active/settling probes;
- zero foreign billable subscriptions;
- zero open incidents;
- correct Tuesday weekday/UTC slot class;
- zero-credit callback/runtime binding;
- final paid preflight `PASS_READY_FOR_PAID_STAGE1`;
- one GitHub owner and one independent watchdog.

The paid workflow must not default to WSSS. The candidate must be explicit.

---

# 23. Canonical final WSSS status

```text
P2G14 WSSS-v2
==============================
scientific validity       PASS
physical identity v2      PASS
stability sample          PASS
external reconciliation   MATCH
delivery completeness     PASS
callback persistence      PASS
provider safety           PASS
subscription cleanup      PASS
raw-content cleanup       PASS
finalizer                 PASS
budget                    CLOSED
probe status              COMPLETED
rerun                     NO
next recovery candidate   OMAA
==============================
```

This status should be treated as the permanent WSSS Phase-2G recovery record.
