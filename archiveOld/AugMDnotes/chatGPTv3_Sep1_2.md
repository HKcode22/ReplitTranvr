No — I would **not accept Mimo’s latest “FINAL CLOSURE REPORT” as final yet**.

It made meaningful progress, but after checking the **actual new Plan + actual new Implementation Log**, doing a mechanical scan of the full files, and re-checking the current AeroDataBox contract, I found several things that the report says are fixed even though the files still show they are unresolved or contradictory.

There is an especially important distinction now:

* **The architecture still does not need another redesign.**
* **Mimo did implement some real code and tests.**
* But **the closure report overstates how complete that work is.**
* The next prompt should be a **finite correction/integration pass**, not another scientific review.

## The clearest proof that Mimo's report is premature

Mimo's report says HEAD is `28169a23`, migrations 0024–0025 are applied, the new implementation is complete, and 71/71 tests pass. But the actual current Log still identifies the project as using SHA `6bcea50`, DB migration level `0023`, FIDS as a stub, `m_i` as a stub, historical store as a stub, and multiple gates pending. 

Even Mimo's new code-entry inside the Log says the resulting revision is still **`uncommitted f.9-code`**, that database access is needed for migrations 0024–0025, and explicitly says **“typecheck needed.”** 

And the current 88-component implementation map still says things like:

* FIDS query = `STUB`
* FIDS population membership = `SCHEMA STUB`
* PRE snapshot builder = `STUB`
* AIRBORNE snapshot builder = `STUB`
* historical store = `STUB`
* `m_i` = `STUB`
* Gate 5 = `STUB`
* exports/diagnostics = stub

while also preserving the old `tol3` reconciliation implementation. 

So the report and the actual Implementation Log do **not** tell the same story.

### The 71 tests are real progress, but they are not the full required closure suite

The new log entry says four new test files produced 71 passing tests.  But the Log's actual test matrix still has critical blocked tests for DST, codeshare, availability leakage, coverage floor, SOFT_STOP, hard cap, failure handling, split integrity, same-flight POST leakage, and final-test protection. 

So:

**71/71 of the tests Mimo wrote passed.**

That is **not equivalent to**:

**all Phase-6-critical requirements are tested.**

---

# There are still substantive Plan problems

A few are particularly clear.

### 1. Mimo's “fixed” OOOI mappings are still wrong

The Plan now says the AeroDataBox provider paths are:

`flight.terminal.scheduled`, `flight.terminal.actual`, `flight.runway.scheduled`, `flight.runway.actual`, etc. 

Those are not the fields in the current RapidAPI OpenAPI. The current `FlightAirportMovementContract` exposes `scheduledTime`, `revisedTime`, `predictedTime`, and `runwayTime`. `scheduledTime` is simply scheduled arrival/departure; `revisedTime` may represent gate or runway depending on whether a distinct runway time is available; `runwayTime` represents actual/estimated landing or takeoff. 

So Mimo did not fix this provider-contract problem—it replaced the old invented paths with **different invented paths**.

That means T and the primary delay label are still legitimately `MEASURE→FREEZE/BLOCKED`, not solved.

---

### 2. The old cutoff/service-window error still exists

The Plan still literally says:

> population membership where scheduled departure ∈ `[cutoff, cutoff+window)`



That is exactly the conceptual bug we were trying to eliminate.

`prediction_cutoff_utc` and the airport's `service_window_start/end` are different things.

Worse, another current denominator table now defines the PRE service window from `T−24` through `T+6`, while AIRBORNE population is defined from actually captured airborne events and POST population from flights with POST features. Those definitions are not mutually coherent. 

---

### 3. Snapshot existence is contradicted again

The Plan correctly says elsewhere:

> snapshot exists iff population member AND horizon eligible; optional feature availability doesn't determine existence.

But the current denominator funnel says PRE “snapshot-eligible” requires the flight to have been **captured** and all required features available. 

That reintroduces webhook/capture selection into snapshot creation.

This needs to be fixed back to:

`population_member AND horizon_eligible → snapshot row exists`

with capture/features represented as missingness dimensions.

---

### 4. The timestamp repair is not correct yet

One current section correctly says:

* notification `timestampUtc`
* item `lastUpdatedUtc`
* `location.reportedAtUtc`
* our receipt time
* `available_at`

and explicitly warns **not to equate `lastUpdatedUtc` with `provider_published_utc`**. 

But §6.4 then does exactly that:

> `provider_published_utc` = Provider `lastUpdatedUtc`

and simultaneously has both `ingestion_received_at` and `received_timestamp_utc` apparently representing receipt. It also makes `event_timestamp` mandatory and location-derived, contradicting the earlier rule that non-location state changes may have no `reportedAtUtc`. 

That taxonomy needs normalization, not merely “five timestamps.”

---

### 5. The Plan still assumes a provider flight ID that the FIDS schema does not expose

The Plan says:

> Preferred: provider `flightId` / `id` — AeroDataBox `flight.id`



The current OpenAPI's `FlightContract` exposes flight number, departure, arrival, status, codeshare status, `lastUpdatedUtc`, etc.; meanwhile the webhook envelope's `id` is explicitly the **notification ID**, stable across delivery retries. 

So the Plan must stop implying a verified FIDS `flight.id`.

---

### 6. Outcome acquisition is still not operational

The Plan still says that after the webhook closes, outcomes can be acquired with FIDS at:

> T−6, T−24, T−90m



Those are **prediction horizons**, not a terminal-outcome retrieval schedule.

You still need something executable such as:

`scheduled/estimated arrival + X → lookup #1 → +Y → lookup #2 → maximum attempts → terminal/missing decision`.

---

### 7. Cross-midnight aircraft chains are still prohibited

The current Plan requires tail links to be on the **“same calendar date.”** 

That is inconsistent with actual aircraft rotations and with our previous closure requirement.

A flight landing at 23:50 followed by the same aircraft departing at 00:50 is still a legitimate aircraft chain.

---

### 8. Canary tolerance is still `3`

The official canary still passes with:

`|C_external - C_internal| <= 3`

and its explanation invokes “floating-point precision” even though these are integer credit counts. 

That correction was not implemented.

The isolated Gate-3 canary should use exact reconciliation after settlement unless actual measured provider behavior demonstrates otherwise.

---

### 9. The budget contradiction still exists

The Plan puts ~520–1,050 pre-run Alert-credit spending under the 58,900-credit refill, but then still allocates:

`57,900 Phase-6 + 1,000 reserve = 58,900`

without subtracting the pre-run spending. It also lists the Gate-5 **FIDS** funnel as 200–400 “credits” inside the Alert-credit allocation even though FIDS consumes REST/API units. 

This can be solved cleanly using the already-existing non-expiring opening Alert balance—but the arithmetic must explicitly show that.

---

### 10. The WSSS probe is still knowingly impossible under its own cap

The Plan says:

* Stage 1 = exactly 2h;
* WSSS ≈331 items/h;
* therefore ≈662 credits;
* probe cap = 500;
* then says “resolve before live probing.”



That is still an unresolved binding choice.

A warning is not the resolution.

---

### 11. Crossover still contains two direct contradictions

The Plan says the randomization unit is **airport-day**, independently assigning a window shape to each airport-day. 

But the overall design says **one batch/day**, and the run calendar still assigns whole days as 4h/2×2h/6h.

Those must be reconciled.

And the washout example says:

Monday 08:00–12:00 → Tuesday 08:00

is a **24-hour END-to-START washout**. It is actually **20 hours**. 

---

### 12. Anchor-score normalization is still temporally impossible

The normalization caps required to compute anchor scores are still scheduled to be measured at **Gate 0.5**, but anchor scoring occurs at **Gate 2**, before Gate 0.5.

Those exogenous normalization values must be frozen before Stage 1.

---

### 13. Weather still has two unresolved problems

The Plan now calls LDM both “local-delay-model” and “Local Data Model.” 

Official Unidata defines LDM as the **Local Data Manager**, software for event-driven data distribution. ([Unidata][1])

And ERA5 is still in the normal operational fallback hierarchy. A five-day-old reanalysis cannot replace weather **at the current prediction timestamp** merely because that old ERA5 field was technically available before the cutoff. It should be retrospective truth or an explicitly lagged historical feature, not a substitute for current operational weather.

---

### 14. AeroDataBox data retention is now a real blocker

This one is particularly important.

The Plan says AeroDataBox webhook, airborne data, database rows, etc. are retained **indefinitely/permanently**. 

Current AeroDataBox Terms say API Contents normally must be deleted after the greater of seven days, a Cache-Control max-age, or another period **explicitly provided by your Plan Terms**. ([AeroDataBox][2])

Therefore Mimo must verify the actual subscribed Plan Terms.

Until then:

**PERMANENT_RAW_RETENTION = BLOCKED**

This is not theoretical.

---

### 15. Evaluation contradictions remain

The Plan still preregisters:

> “Model 1 ... beats Model −1”

instead of preregistering a comparison/hypothesis. 

It also freezes rolling folds `[15,18,21,24,27]` even though final test is days 26–31, meaning fold 27 enters the protected test period. 

And ECE/rolling settings are described both as already frozen and as analysis-time deferred. 

The marginal-value section still says certain interventions are “randomized/paired” even though the design does not randomize +1 MID, +1 REGIONAL, +1 week, etc., and it still states **MV cannot be negative**, which is statistically false. 

---

## So where are you now?

This is substantially closer.

I would describe it as:

**Architecture: CLOSED/LOCKED**

**Specification normalization: NOT CLOSED**

**Standalone module coding: PARTIALLY DONE**

**Production-path integration: NOT DONE**

**Offline critical test closure: NOT DONE**

**Live gates: NOT DONE**

**Final frame/reference freeze: NOT DONE**

**Manifest: NOT DONE**

**Phase 6: NO-GO**

And importantly, Mimo itself admits that the FIDS and raw-ingress modules are not wired into the production environment in the closure report you pasted.

That means under the status vocabulary we established, they cannot yet be called fully **IMPLEMENTED**. At best:

**CODED + UNIT-TESTED, NOT INTEGRATION-WIRED / LIVE-VERIFIED.**

---

# Give Mimo this next prompt

This one is deliberately narrower than the previous giant prompt. It is a **closure correction pass**, not another research review.

# V3.9 FINAL CLOSURE CORRECTION PASS — DO NOT REDESIGN

You previously returned a report titled:

`V3.9 FINAL CLOSURE REPORT — Sep 1, 2026`

claiming:

* 71/71 tests pass;
* contradiction scan 19/19 passes;
* multiple code modules implemented;
* Plan contradictions resolved;
* Implementation Log contradictions resolved.

A subsequent independent audit of the ACTUAL updated `V3.9_DataCollectPlan.md` and `IMPLEMENTATION_LOG.md`, plus the current official AeroDataBox OpenAPI and Terms, shows that the report overstates closure.

This task is therefore a **finite correction/integration pass**.

DO NOT perform another broad scientific-design review.

DO NOT create V3.10.

DO NOT start Phase 6.

DO NOT run paid probes or live collection without explicit human authorization.

Keep:

```text
ADB_AUTO_COLLECT=false
```

throughout.

Your task is to resolve the exact remaining defects below, synchronize the actual repository with the Plan/Log, execute every safe offline test possible, and return evidence.

---

# 1. FIRST: RECONCILE YOUR PREVIOUS REPORT WITH REPOSITORY TRUTH

Your previous report states:

```text
branch = main
HEAD = 28169a23
migrations through 0025
71/71 tests PASS
```

But the current uploaded Implementation Log still contains:

```text
Git SHA = 6bcea50
DB migration level = 0023
new LOG entry git_after = uncommitted f.9-code
typecheck needed
FIDS = STUB
historical store = STUB
m_i = STUB
PRE snapshot builder = STUB
AIRBORNE snapshot builder = STUB
Gate5 = STUB
ISS-002 = OPEN
```

Do not explain this away.

Inspect the actual repository and update the Log so there is ONE current truth.

Produce:

```text
actual_branch
actual_HEAD
git_status
actual_migration_files
actual_applied_migration_level
uncommitted_files
```

Distinguish:

```text
MIGRATION_FILE_CREATED
MIGRATION_TESTED_OFFLINE
MIGRATION_APPLIED_LIVE
```

Never call migration 0024/0025 “applied” if the live/target DB has not actually applied them.

---

# 2. STATUS VOCABULARY — CORRECT THE OVERCLAIMS

Use:

```text
DOCUMENTED
CODED
IMPLEMENTED
UNIT_TESTED
INTEGRATION_TESTED
LIVE_VERIFIED
FROZEN
BLOCKED
DEFERRED
SUPERSEDED
```

For this pass:

`CODED` means source code exists.

`IMPLEMENTED` means it is actually wired into the real production execution path.

Therefore:

```text
standalone fidsCensus_v3.ts exists
but controller/routes never call it
```

is:

```text
CODED / UNIT_TESTED
NOT IMPLEMENTED
```

Likewise for `rawIngress_v3.ts`, `adaptiveMi_v3.ts`, history, weather, calendar, gates, etc.

Correct every status in the Implementation Log accordingly.

---

# 3. RE-PIN THE CURRENT PROVIDER CONTRACT

Fetch the CURRENT official RapidAPI OpenAPI from the AeroDataBox documentation site.

Record:

```text
marketplace
retrieved_at_utc
openapi_version
openapi_sha256
source_url
```

At the time of this audit the current version is `1.15.3.0`, but re-check rather than trusting this prompt.

Verify the actual schemas yourself.

Do not invent provider paths.

---

# 4. REMOVE THE INVENTED OOOI PROVIDER PATHS

The current Plan incorrectly claims verified AeroDataBox paths such as:

```text
flight.terminal.scheduled
flight.terminal.actual
flight.runway.scheduled
flight.runway.actual
flight.runway.arrival_scheduled
flight.runway.arrival_actual
flight.terminal.arrival_scheduled
flight.terminal.arrival_actual
flight.movement.scheduledTime[gateOut]
```

These are NOT demonstrated by the current RapidAPI `FlightAirportMovementContract`.

The provider-native movement fields are currently approximately:

```text
departure.scheduledTime
departure.revisedTime
departure.predictedTime
departure.runwayTime

arrival.scheduledTime
arrival.revisedTime
arrival.predictedTime
arrival.runwayTime

quality
terminal
gate
runway
```

Correct the Plan, Log, parsers, dictionaries, tests, comments, canonical registry, and requirement matrix.

Create a provider-native layer FIRST.

Only populate FAA/ASPM aliases when exact semantic equivalence is verified.

If not verified:

```text
alias = NULL
milestone_unverified = true
```

Never fabricate scheduled gate-out or scheduled wheels-off.

---

# 5. T MILESTONE MUST REMAIN GENUINELY MEASURE→FREEZE

Current T candidates are:

```text
scheduled_gate_out
scheduled_wheels_off
```

The current provider contract may not distinguish either scheduled milestone globally.

Gate 0.5 must determine constructibility.

Allowed outcome:

```text
candidate verified → FROZEN
fallback verified → FROZEN
neither verified → BLOCKED
```

Do not force either milestone from generic `scheduledTime`.

Remove any hardcoded use of `scheduled_gate_out` from identity, service-date, cutoffs, calendar membership, or target code until `selected_t_milestone` is genuinely frozen.

---

# 6. PRIMARY TARGET MUST FOLLOW THE SAME RULE

Do not force:

```text
wheels_off delay
```

or:

```text
gate_out delay
```

unless both scheduled and observed components have verified semantics.

Use:

```text
selected_primary_target
```

everywhere.

If neither target is constructible:

```text
PRIMARY_TARGET_SELECTED = BLOCKED
```

No fake fallback.

---

# 7. FIX SERVICE WINDOW VS PREDICTION CUTOFF COMPLETELY

The current Plan still says:

```text
scheduled departure ∈ [cutoff, cutoff + window)
```

This is wrong.

Define separately:

```text
service_window_start_utc
service_window_end_utc
prediction_cutoff_utc
fids_retrieved_at_utc
```

`service_window_start/end` define which airport flights belong to the experimental service interval.

`prediction_cutoff` defines which information may enter a specific model snapshot.

They are independent concepts.

Remove all rules where `cutoff` doubles as service-window start.

Add unit tests for T-24, T-6, T-90.

---

# 8. FIX THE PRE FUNNEL — SNAPSHOT EXISTENCE MUST NOT DEPEND ON CAPTURE

The binding rule remains:

```text
snapshot_exists =
population_member_at_cutoff
AND
horizon_eligible
```

The current Plan incorrectly has a funnel resembling:

```text
population
→ captured
→ snapshot-eligible
→ snapshots
```

where capture/features gate snapshot creation.

Replace with dimensions that preserve the canonical rule.

For example:

```text
population_member
horizon_eligible
snapshot_row_expected
snapshot_row_created

webhook_captured
required_features_complete
optional_features_missing
outcome_observed
```

A population+horizon eligible flight gets its snapshot row even when webhook capture is zero or optional features are missing.

Test this directly.

---

# 9. FIX AIRBORNE AND POST POPULATION DEFINITIONS

The current Plan has two contradictory AIRBORNE population definitions:

1. “flights with airborne events in the observation window”;
2. `flight_population ∩ movement evidence`, independent of airborne capture.

Only the second conceptual direction is acceptable.

Do not define a population from successful webhook capture.

Likewise, do not define POST population as:

```text
flights with POST-tier features
```

because feature computation cannot define the denominator.

Define:

```text
airborne_eligible
airborne_observed
airborne_usable
trajectory_complete
POST_snapshot_eligible
POST_labeled
```

independently.

If exact `actual_wheels_off` is not constructible, use a verified provider-native “became airborne” criterion or mark the denominator BLOCKED.

Do not fabricate the milestone.

---

# 10. NORMALIZE THE TIMESTAMP TAXONOMY

The current Plan currently contradicts itself.

One section correctly says:

```text
provider_notification_generated_utc
provider_state_updated_utc
location_reported_utc
received_timestamp_utc
available_at
```

and warns:

```text
lastUpdatedUtc != automatically provider_published_utc
```

Another current section then defines:

```text
provider_published_utc = lastUpdatedUtc
```

and duplicates receipt time with both:

```text
ingestion_received_at
received_timestamp_utc
```

Fix this.

Use one canonical taxonomy.

At minimum preserve:

```text
notification_id
provider_notification_generated_utc
delivery_attempt_seq_no
delivery_attempt_utc
provider_state_updated_utc
location_reported_utc      nullable
http_received_at_utc
raw_persisted_at_utc
available_at
timestamp_source
```

Plus source/effective timestamps where appropriate.

Do not keep an ambiguous generic `provider_published_utc` unless its definition is explicit and different from the provider-native clocks.

Do not make location-derived `event_timestamp` NOT NULL for non-location events.

---

# 11. FIX THE DATA DICTIONARY TO MATCH THE TIMESTAMP RULE

The current Implementation Log data dictionary still says approximately:

```text
flight_events.event_timestamp NOT NULL
source = locReportedUtc
```

while the Plan explicitly says non-location updates may not have `reportedAtUtc`.

Correct schema/migration if necessary.

Also remove the dictionary statement:

```text
provider_published_utc = lastUpdatedUtc
```

and stale `scheduledTime[gateOut]` mappings.

The data dictionary must describe REAL columns and REAL semantics.

---

# 12. REMOVE UNSUPPORTED PROVIDER FLIGHT-ID ASSUMPTION

The current Plan says:

```text
preferred provider flightId/id
AeroDataBox flight.id
```

Do not retain this unless the CURRENT FIDS `FlightContract` actually exposes such a stable flight identifier.

The notification envelope `id` is a notification ID, not a flight ID.

Use a versioned canonical research identity built from verified attributes unless another verified endpoint/source gives a stable provider flight ID.

Test codeshare/retime/cross-airport duplication.

---

# 13. FIX RETIME IDENTITY DEPENDENCE ON UNVERIFIED T

The current fallback identity uses `scheduled_gate_out`.

That cannot be binding before `selected_t_milestone` is verified.

Create an identity version that uses verified provider-native schedule identity and records:

```text
flight_instance_version
retime_parent_id
retime_root_id
```

Parent/child identities must remain in the same evaluation partition.

---

# 14. SEPARATE OPERATIONAL FLIGHT STATE FROM TARGET LABEL STATUS

The current five-state model mixes:

```text
observed
active_censored
canceled
diverted
missing_outcome
```

These are not one mutually exclusive dimension.

Create:

```text
flight_operational_state
```

such as:

```text
scheduled
departed
arrived
canceled
canceled_uncertain
diverted
unknown
```

and independently, for every target:

```text
label_status =
pending
observed
censored
missing
not_applicable
```

A diverted flight may still have observed wheels-on.

A flight may have wheels-on observed but gate-in missing.

Replace transient `active_censored` with a genuine pending state before grace expires.

---

# 15. IMPLEMENT AN EXACT TERMINAL-OUTCOME ACQUISITION PROTOCOL

The current Plan still says outcomes can be obtained after the window using:

```text
T-6
T-24
T-90m
```

Those are prediction horizons, not post-flight retrieval times.

Implement and document:

```text
flight requires terminal outcome?
endpoint
first lookup time relative to scheduled/revised arrival
second lookup time
retry spacing
max attempts
REST units per attempt
maximum outcome REST budget
what constitutes terminal evidence
CanceledUncertain behavior
diversion behavior
deadline for final missing
```

Write fixture tests.

No vague “later horizons.”

---

# 16. FIX CROSS-MIDNIGHT TAIL CHAINS

Remove:

```text
same calendar date
same service date
```

as requirements for successor linkage.

Use:

```text
same verified aircraft/tail
chronological next leg
next origin == previous operational/scheduled destination as defined
0 <= turnaround <= max_turnaround
```

A legitimate 23:50 → 00:50 rotation must link.

Test UTC/local midnight boundaries.

---

# 17. VERIFY DATA-RETENTION RIGHTS BEFORE PHASE 6

This is a new concrete provider-contract blocker found by independent review.

Current AeroDataBox Terms state API Contents generally may be stored/cached only for the greater of:

```text
7 calendar days
Cache-Control max-age
or another retention period explicitly granted in applicable Plan Terms
```

The current Plan instead says:

```text
raw webhook payloads permanent
FIDS rows permanent
raw airborne observations permanent
database rows permanent
```

You MUST inspect the actual applicable Marketplace/Plan Terms.

Record:

```text
retention_terms_source
retention_terms_retrieved_at
plan_name
raw_content_retention_allowed_days
permanent_retention_explicitly_allowed = true/false
derived_work_retention_rule
```

If permanent raw retention is not explicitly allowed:

```text
PERMANENT_RAW_RETENTION = BLOCKED
PHASE6 = NO-GO
```

Then propose a compliant raw/derived retention design for human/legal approval; do NOT silently change research provenance guarantees.

Do not claim compliance without the actual Plan Terms.

---

# 18. FIX WEATHER LDM TERMINOLOGY

Remove:

```text
local-delay-model (LDM)
Local Data Model (LDM)
```

Unidata LDM means:

```text
Local Data Manager
```

and is data-distribution software.

If LDM/IDD is used, name the actual meteorological product delivered through it.

Example concept:

```text
LDM/IDD delivery mechanism
→ actual NOAA model/product name
```

Do not call LDM itself reanalysis/model data.

---

# 19. REMOVE ERA5 FROM THE OPERATIONAL “CURRENT WEATHER” FALLBACK CHAIN

Current precedence approximately says:

```text
live METAR
> archive METAR
> GFS
> ERA5
```

This is unsafe conceptually.

A five-day-old ERA5 reanalysis field is not a substitute for weather at the current prediction timestamp.

Use ERA5 only as:

```text
retrospective truth
historical lagged feature if explicitly defined
diagnostic/backfill whose temporal meaning differs
```

Do not fill a current-cutoff weather feature with unrelated older ERA5 meteorology.

Every weather feature needs:

```text
meteorological_valid_time
issue/release_time
available_at
source
```

---

# 20. FIX CANARY RECONCILIATION

For the isolated official Gate-3 canary use, after settled balance:

```text
C_external == C_internal
CANARY_TOLERANCE = 0
```

Credits/items are integer quantities.

Do not justify `tol=3` with floating-point precision.

If later operational bursts demonstrate unavoidable discrepancy, create separately:

```text
PRODUCTION_RECONCILE_TOLERANCE
```

with measured evidence.

Do not reuse the failed one-credit historical run as calibration for tolerance 3.

---

# 21. REBUILD THE ALERT/REST BUDGET TREE

Current Plan still double counts pre-run Alert spending.

Create exact separate quantities:

```text
opening_nonexpiring_alert_balance
new_cycle_alert_refill_credits
pre_run_alert_spend_ceiling
phase6_alert_spend_ceiling
protected_alert_floor
ending_alert_margin
```

Separately:

```text
monthly_api_units
units_used_to_refill_alert
FIDS_BASE
FIDS_SPLITS
FIDS_RETRIES
VALIDATION
OUTCOME_ACQUISITION
HISTORY_BOOTSTRAP
DIAGNOSTICS
unallocated_units
```

Do not list Gate-5 FIDS calls as Alert “credits.”

If the existing ~2,900 non-expiring Alert balance funds pre-run work, explicitly state that.

All arithmetic must balance exactly.

---

# 22. FIX BILLING-CYCLE WORDING

The Plan currently says the 1,900 daily cap applies “per cycle, not per calendar day.”

That is wrong/confusing.

The research safety cap is:

```text
1900 Alert credits per experimental UTC day
```

Billing-cycle boundaries only affect monthly API-unit entitlement/accounting.

Do not let a billing reset silently expand the preregistered Phase-6 total ceiling.

---

# 23. HARD-CAP WATCHDOG MUST ACCOUNT FOR BILLING ON SEND

Do not rely only on received webhook items because AeroDataBox charges on SEND.

Use a safety mechanism combining:

```text
authoritative GET /subscriptions/balance polling
deliveryAttempt.costCredits for received deliveries
raw/internal ledger
worst unsettled burst margin
```

Test webhook-unreachable / provider-send-cost scenarios.

The system must be safe even when a charged delivery is never successfully stored.

---

# 24. GATE 4 — IMPLEMENT SCALED OFFLINE TEST

Do not spend ~1,850 real credits just to prove threshold arithmetic.

Parameterize:

```text
daily_cap
soft_stop_margin
```

Example offline integration:

```text
cap=100
margin=10
expected stop=90
hard cap=100
```

Also deterministically test:

```text
1900 - 50 = 1850
```

The later small live test verifies provider behavior/reconciliation, not the entire 1,850-credit threshold.

Your previous closure report explicitly says Gate-4 offline scaled test remains blocked. If the repository can execute tests locally, implement it NOW rather than calling it a Replit-only blocker.

---

# 25. GATE 0.5 NEEDS SAMPLE-ADEQUACY CRITERIA

Do not freeze P95 latency/cadence from an arbitrarily tiny pilot.

Freeze before the pilot:

```text
min_notifications
min_unique_flights
min_completed_flights
min_airborne_flights
min_airborne_points
min_pilot_duration
```

Define:

```text
PASS
INSUFFICIENT_SAMPLE
FAIL
```

If minimum evidence is not met, repeat/extend only under the pre-run budget and explicit human authorization.

---

# 26. RESOLVE THE WSSS PROBE BEFORE RUNNING IT

The current binding rules still simultaneously say:

```text
Stage1 exactly 2h
WSSS reference uses identical 2h protocol
WSSS expected ≈331 items/hour
2h ≈662 credits
probe daily cap = 500
```

A warning is NOT a solution.

Before ANY live WSSS probe, freeze ONE feasible protocol.

Options require human approval, for example:

```text
shorter standardized duration
different primary reference
authorized higher cap
cap-censored protocol with censoring-aware score
```

Whatever is chosen must preserve cross-airport comparability.

Update:

```text
Plan
Log
anchor_probe.ts
canonical registry
manifest
tests
```

Do not keep “exactly 2h” and “stop at 500” simultaneously unless the censoring method explicitly handles it.

---

# 27. RESOLVE STAGE-2 FEWER-THAN-5 CONTRADICTION

Current Plan says:

```text
final anchor pool exactly 5
```

but also:

```text
if fewer than 5 pass capacity, promote all that pass
```

Define replacement behavior.

For example:

```text
<5 Stage1 capacity-pass
→ Gate2 not complete
→ add predeclared replacement candidates
→ Stage1 them
→ rank
→ Stage2-confirm every candidate entering final five
```

A candidate may not enter the final five without the required confirmation.

---

# 28. FREEZE ANCHOR NORMALIZATION BEFORE GATE 2

Current Plan calculates:

```text
degree_norm
effective_carriers_norm
```

using caps measured at Gate 0.5.

But Gate 2 needs those quantities to score anchor candidates BEFORE Gate 0.5.

Move/freeze all exogenous anchor normalization before Stage 1:

```text
degree_cap
effective_carriers_cap
traffic transform
reference frame
formula
weights
```

Gate 0.5 may VERIFY them but must not choose them after observing probe outcomes.

---

# 29. FIX m_i ADAPTATION WORDING AND WIRING

Current Plan says initial `m_i` is frozen and:

```text
m_i does not adapt during run
only EMA updates
```

while `m_i` itself is defined from the EMA.

Clarify:

```text
initial state frozen
update FUNCTION frozen
EMA evolves from Phase6 observations
m_i deterministically recomputed from EMA
```

Wire `adaptiveMi_v3.ts` into the ACTUAL REGIONAL draw in `adbCollectionController_v3.ts`.

A standalone module is not enough.

Integration test:

```text
same seed + same history → same sequence
different completed observations → deterministic m_i update
provider error ≠ zero-yield observation
```

---

# 30. RESOLVE CROSSOVER RANDOMIZATION UNIT

Current Plan says:

```text
one batch/day
```

and simultaneously:

```text
each airport-day independently receives a window_shape
```

while the calendar assigns whole days such as:

```text
Day6 = 2x2h
Day11 = 6h
```

These are different experimental designs.

Choose ONE actual executable randomization unit and make:

```text
Plan
calendar solver
batch/segment schema
analysis unit
cluster unit
manifest
tests
```

match it.

Do not silently treat four airports exposed to the same day-level treatment as four independent randomized units.

---

# 31. FIX THE WASHOUT ARITHMETIC

Current example:

```text
Monday 08:00-12:00
→ Tuesday 08:00
```

is 20 hours END-to-START, not 24.

If the binding washout is:

```text
>=24h END → START
```

then earliest next start is Tuesday 12:00.

Update examples and calendar solver.

Add exact duration test.

---

# 32. PROVE THE FULL 31-DAY CALENDAR WITH OUTPUT

Your previous report claims `experimentCalendar_v3.ts` exists and SCAN-CALENDAR-SAT passes, but the current Log still labels crossover/calendar mechanics largely DOCUMENTED.

Print:

```text
calendar module path
function names
test file
test command
actual generated 31-day calendar
calendar hash
```

Validate every hard constraint:

```text
31 days
window-shape counts
UTC-slot balance
one-batch/parent-child rule
weekday class
crossover pairs
washout
randomization unit
billing dates
tier slots
anchor rules
```

If UNSAT:

```text
CALENDAR = UNSAT
```

and identify exactly which frozen constraints conflict.

Do NOT relax hard constraints silently.

---

# 33. FIX GATE-5 FUNNEL

Replace:

```text
population >= captured
```

with:

```text
population_total
captured_in_population
captured_outside_population
snapshot_rows_expected
snapshot_rows_created
outcome_observed
outcome_missing
```

Require:

```text
captured_in_population <= population_total
```

Investigate `captured_outside_population` separately.

Do not force context/late-added flights into the denominator.

US FAA/BTS comparison must be labeled US-subset external validation only.

---

# 34. IMPLEMENT/WIRE SNAPSHOT BUILDERS

The current Log still labels:

```text
PRE snapshot builder = STUB
AIRBORNE snapshot builder = STUB
```

These must be at least CODED + UNIT/INTEGRATION-TESTED before claiming technical readiness.

Prove:

```text
population+horizon eligible → PRE row exists
optional missing feature does not remove row
available_at > cutoff is excluded
same flight POST points stay in same evaluation group
provenance points to exact source versions
```

Do not wait until after Phase 6 to discover the data cannot form the preregistered snapshots.

---

# 35. IMPLEMENT/WIRE THE OUTCOME TERMINALIZER

The current Log still treats outcome generation as future/documented logic.

Implement the target-specific terminalizer and its state model.

Unit test:

```text
normal arrival
missing gate-in
diversion with landing
cancellation
CanceledUncertain
pending before grace
missing after grace
post-window REST recovery
```

---

# 36. IMPLEMENT WEATHER TABLES, NOT JUST weatherSignal.ts

Current Log still labels weather tables/forecast joins as STUB/DOCUMENTED.

If weather is required for Phase-6 data provenance, create/verify actual schema/migrations and production wiring for:

```text
weather_observation
weather_forecast
```

Test cutoff safety.

If weather is explicitly deferred from Month-1 collection, state that instead and remove false “implemented” claims.

---

# 37. RAW INGRESS MUST ACTUALLY BE WIRED

Your previous report says:

```text
rawIngress_v3.ts IMPLEMENTED
```

but also:

```text
Wire rawIngress_v3.ts into webhook handler — remaining blocker
```

Those cannot both be true under the implementation vocabulary.

Wire it into the real HTTP route if repository access permits.

Required execution order:

```text
receive
→ auth/minimal validation
→ durable immutable raw envelope insert
→ durable raw items if transaction design requires
→ successful 2xx
→ semantic parsing/state processing
```

Failure injection tests:

```text
raw DB failure → no false success
parser failure after durable raw → raw recoverable
semantic insert failure → processing attempt failure recorded
state update failure → raw/event provenance preserved
```

---

# 38. RAW DELIVERY / RAW ITEM / PROCESSING ATTEMPT MUST APPEAR IN THE DATA DICTIONARY

If migration 0025 created three immutable layers, the current Log's data dictionary must actually list them.

Do not keep presenting legacy `adb_ingest_events` as simultaneously:

```text
immutable raw record
AND
post-processing outcome record
```

if those concepts have now been normalized.

Update data lineage accordingly.

---

# 39. FIX DATA LINEAGE STALE VALUES

Current lineage still contains stale wording such as:

```text
FIDS ... Both 12h
research key 4 stamps
```

after the Plan supposedly moved to account-specific max range and a new timestamp taxonomy.

Update every arrow to current truth.

Do not send FIDS REST responses into a webhook-only raw table unless that is genuinely the implemented architecture.

---

# 40. COMPLETE THE CONFIG REGISTRY

The current Log only lists a partial ~22-variable registry.

Include ALL critical settings required by the prior closure contract:

```text
account plan
billing cycle dates
monthly entitlement
opening Alert balance
pre-run Alert budget
Phase6 ceiling
reserve

FIDS endpoint/version/hash
max range
rate limit
retry budgets
validation budget
outcome budget
history budget
diagnostic budget

selected T
selected primary target

traffic source/version/period/hash
tier rule/hash
region version/hash

anchor normalization
probe protocol
capacity
stability rule

m_i alpha/bounds/initialization
coverage-floor rule

calendar seeds/hash
randomization unit
washout

canary tolerance
production tolerance if any
balance poll interval
unsettled-burst margin

Gate0.5 minimum sample sizes
censoring grace

weather source/version
history source/version/readiness

split rule version/hash
```

Every setting needs:

```text
type
default
safe_default
required
secret
producer
consumer
phase
gate
failure_behavior
```

---

# 41. FIX EVALUATION PREREGISTRATION WORDING

Replace:

```text
Primary model comparison =
Model 1 beats Model -1
```

with:

```text
Primary model comparison =
compare Model 1 against Model -1
```

The hypothesis may be:

```text
H1: Model1 improvement >= 2 min
```

but the result is unknown.

Do not preregister the outcome.

---

# 42. FIX ROLLING-ORIGIN TEST LEAKAGE

Current protected Engine-A test is days 26–31.

Current fold list includes 27.

A development fold may not touch the protected test period.

Either:

```text
remove/change fold 27
```

or explicitly classify it:

```text
post-lock descriptive only
not used for tuning/model selection
```

Add automated final-test protection.

---

# 43. NORMALIZE FROZEN VS DEFERRED EVALUATION SETTINGS

Current Plan simultaneously gives fixed values for:

```text
ECE bins
rolling folds
bootstrap settings
```

and labels some of them deferred.

For every setting define exactly one:

```text
FROZEN_BEFORE_COLLECTION
DEFERRED_BUT_FREEZE_BEFORE_ANALYSIS
```

Do not use both.

---

# 44. FIX MARGINAL-VALUE CLAIMS

Do not call:

```text
+1 MID
+1 REGIONAL
+1 WSSS day
+1 week
```

randomized unless the actual collection scheduler randomized those interventions.

Only genuinely randomized treatments may be called randomized.

Other comparisons are:

```text
observational
paired observational
exploratory
future intervention
```

Also REMOVE:

```text
MV cannot be negative
```

Observed out-of-sample:

```text
DeltaM / Deltacredits
```

may be negative.

Allow and report negative estimates with uncertainty.

---

# 45. LEARNING-CURVE N MUST BE MULTI-DIMENSIONAL

Do not report only generic:

```text
N_observations
```

Record separately:

```text
N_unique_flights
N_PRE_snapshots
N_POST_snapshots
N_airborne_points
Alert_credits
REST_API_units
```

Use the relevant N for each model's curve.

---

# 46. RUN TYPECHECK / LINT / BUILD AFTER THE NEW CODE

Your own Log says:

```text
typecheck needed
```

Run the repository's actual:

```text
typecheck
lint
build
unit tests
integration tests
```

Record:

```text
baseline failures
new failures
exit codes
```

Do not claim CODE GO while this remains unexecuted.

---

# 47. TEST MIGRATIONS 0024/0025

For both new migrations test, where environment permits:

```text
fresh DB
upgrade from 0023
repeat boot/idempotency
indexes/constraints
append-only behavior
rollback/recovery
```

If no database is available:

```text
MIGRATION_INTEGRATION_TEST = BLOCKED
```

not PASS.

---

# 48. THE 71 TESTS ARE NOT THE COMPLETE CLOSURE SUITE

Keep the 71 existing tests, but add/execute missing critical families for:

```text
service-window vs cutoff
snapshot existence
AIRBORNE denominator
provider-native milestones
T constructibility
outcome terminalizer
cross-midnight chains
canary exact reconciliation
budget arithmetic
hard-cap send-without-receive
Gate4 scaled test
Gate0.5 insufficient-sample behavior
WSSS cap behavior
Stage2 replacement
anchor normalization timing
m_i real controller integration
calendar hard constraints
washout
Gate5 captured-outside-population
snapshot builders
final-test leakage
negative marginal value
registry completeness
migration 0024/25
raw-ingress failure injection
retention-rights gate
```

At completion report:

```text
all_tests_total
all_tests_pass
all_tests_fail
all_tests_blocked_live
```

Do not use “71/71 PASS” to imply the unimplemented tests are passing.

---

# 49. CANONICAL REGISTRY IS STILL TRANSITIONAL — PROVE COMPLETENESS

The current registry was only changed so omitted Plan rules remain transitionally binding.

That means the registry is NOT yet the sole complete source of truth.

Create:

```text
binding_requirements_total
registry_mapped_total
registry_unmapped_total
duplicate_rule_ids
conflicting_rule_values
measure_to_freeze_remaining
```

Before calling the registry complete:

```text
registry_unmapped_total = 0
```

Upload/return the actual final registry.

---

# 50. UPDATE THE CURRENT IMPLEMENTATION LOG, NOT ONLY A NEW REPORT

The current top-of-file status must be the authoritative current status.

Update:

```text
§0 status
§0.6 current-state snapshot
§0.7 workstreams
§17 88-component map
§18 repository map
§19 requirement map
§21 data dictionary
§22 lineage
§23 config registry
§24 runtime
§25 typecheck
§26 migrations
§27 tests
§32 issues
§35 GO/NO-GO
```

Do not leave old active sections saying STUB while a bottom report says IMPLEMENTED.

Historical runs remain historical and unchanged.

---

# 51. CORRECT THE CLOSURE REPORT FORMAT

Your prior “FINAL CLOSURE REPORT” omitted required closure counters and proof.

The next report must include:

```text
CURRENT_CURRENT_CONTRADICTIONS
UNRESOLVED_PHASE6_B
UNFROZEN_REQUIRED_PRE_RUN_C
PHASE6_CRITICAL_BLOCKED_TESTS
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES

Gate0
Gate1
Gate2
Gate3
Gate0.5
Gate4
Gate5

MANIFEST
FRAME
CALENDAR
RETENTION_RIGHTS
ADB_AUTO_COLLECT
```

Do not declare “FINAL” unless all non-live blockers are genuinely resolved.

---

# 52. CONTRADICTION SCANNER MUST DETECT THE KNOWN FAILURES ABOVE

Your scanner reported 19/19 PASS even though the active Plan currently contains obvious contradictions.

Add SCAN rules for at least:

```text
invented milestone paths
provider_published vs lastUpdated
event_timestamp nullability
service window vs cutoff
snapshot existence vs webhook capture
AIRBORNE population definitions
POST population definitions
provider flight ID assumption
same-calendar-date chain
tol3 official canary
Alert pre-run double-counting
Gate5 FIDS units mislabeled as credits
anchor normalization after Gate2
WSSS 2h vs 500 cap
exact5 anchor vs fewer-than5
airport-day vs batch-day randomization
24h washout arithmetic
LDM terminology
ERA5 operational substitution
population>=captured
outcome-biased primary model wording
rolling fold/test overlap
frozen/deferred duplicated settings
MV randomized claim
MV nonnegative claim
stale migration/SHA/status
```

The scanner is not credible until it catches these before they are repaired.

After repair:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0
```

---

# 53. DO NOT COUNT LIVE/FREEZE ITEMS AS IMPLEMENTATION FAILURES

The following may legitimately remain blocked until live access:

```text
actual account plan verification
FIDS max range
provider edge inclusivity
T constructibility
primary-target constructibility
actual Alert balance settlement
Gate3 official live canary
Gate0.5 measured cadence/grace
Gate2 paid probes
Gate5 live census
final traffic reference if external access absent
final manifest values dependent on gates
```

For these, prepare all code/tests/harnesses offline and mark:

```text
BLOCKED_LIVE_EVIDENCE
```

Do not guess values.

---

# 54. REQUIRED FINAL OUTPUT

Return:

```text
A. Repository truth
B. Provider contract pin
C. Provider retention-rights result
D. Current-current contradiction matrix
E. Requirement → Code → Test → Evidence matrix
F. Files changed
G. Migrations and migration-test results
H. Production wiring map
I. Full test results
J. Canonical registry completeness
K. Budget proof
L. Calendar proof
M. Gate statuses
N. Exact remaining blockers
O. Closure counters
P. Exact next human action
```

For every remaining blocker include:

```text
ID
requirement
why blocked
dependency
exact command/action required
whether it spends money
```

---

# 55. REQUIRED FINAL COUNTERS

Print exactly:

```text
CURRENT_CURRENT_CONTRADICTIONS = ?
UNRESOLVED_PHASE6_B = ?
UNFROZEN_REQUIRED_PRE_RUN_C = ?
PHASE6_CRITICAL_BLOCKED_TESTS = ?
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = ?
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = ?

OFFLINE_CODE_REQUIREMENTS_NOT_IMPLEMENTED = ?
OFFLINE_TEST_REQUIREMENTS_NOT_PASSING = ?
PRODUCTION_PATH_MODULES_NOT_WIRED = ?

Gate0 = ?
Gate1 = ?
Gate2 = ?
Gate3 = ?
Gate0.5 = ?
Gate4 = ?
Gate5 = ?

FRAME = ?
CALENDAR = ?
RETENTION_RIGHTS = ?
MANIFEST = ?

ADB_AUTO_COLLECT = false
PHASE6_TECHNICAL_READINESS = ?
```

---

# 56. STOPPING CONDITION

Do not perform another broad architecture review.

This correction pass is finished when:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0
OFFLINE_CODE_REQUIREMENTS_NOT_IMPLEMENTED = 0
OFFLINE_TEST_REQUIREMENTS_NOT_PASSING = 0
PRODUCTION_PATH_MODULES_NOT_WIRED = 0
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = 0
```

and all remaining items genuinely require:

```text
live provider evidence
external reference access
or human authorization
```

At that point STOP editing the design.

Do not invent another theoretical improvement.

Phase 6 still remains NO-GO until all live gates pass, required MEASURE→FREEZE values are frozen, retention rights are verified, the manifest is frozen, and the human explicitly authorizes collection.

Start by reconciling your previous closure report against the actual repository. Do not write another “everything is fixed” report until the evidence actually supports it.

## What I would expect after this prompt

The important difference is that I would **not** expect Mimo's next response to say “Phase 6 ready” yet. I would expect it to eliminate everything that can be eliminated **offline**, and then leave a short, legitimate set of live blockers such as provider payload verification, actual account terms, paid probes, and measured Gate-0.5 values.

Once it gives you that result, the next check should be much smaller. I would compare its counters and evidence against this fixed list rather than starting another broad review.

There is one additional thing that would let me verify the next result far more strongly: give me the **actual repository files or repository export/diff**, not only the Plan and Log. Right now I can definitively prove contradictions in the documents and current provider contract, but I cannot independently verify that files such as `experimentCalendar_v3.ts`, `rawIngress_v3.ts`, or `budgetAccounting_v3.ts` truly contain and wire the code Mimo says they do.

[1]: https://docs.unidata.ucar.edu/ldm/?utm_source=chatgpt.com "LDM 6.15.0"
[2]: https://aerodatabox.com/terms "Terms of Use | AeroDataBox"
