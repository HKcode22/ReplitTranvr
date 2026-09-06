Yes. I reassessed it again, and this pass was more exhaustive than the earlier ones because I compared the **entire 1,834-line V3.9 Plan + entire 3,025-line Implementation Log**, cross-referenced repeated rules, and checked the current AeroDataBox contract rather than trusting the provider assumptions already written in the documents.

I **did find additional real issues**. The most important difference now is that several are not theoretical/statistical opinions—they are objectively testable contradictions against the current provider API. That makes this a much better place to close the planning loop.

The architecture is still **not the problem**. I still do **not** recommend V3.10 or another redesign. What needs to happen now is one normalization/remediation pass that makes the specification match itself, the repository, and the provider.

### The biggest new findings from this final pass

The current Plan says FIDS is `GET /flights/schedule`, assumes a universal 12-hour maximum, describes `withLeg=false` incorrectly, assumes a truncation flag/~500-record behavior, and hardcodes several other FIDS semantics.  The official AeroDataBox OpenAPI was updated August 28, 2026 and is currently API version **1.15.3.0**. Its FIDS endpoint is `/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}`; the permitted time range is pricing-plan-dependent; `withLeg=true` means include the opposite movement; and `withCancelled=true` includes canceled, diverted, **and `CanceledUncertain`** flights. ([AeroDataBox][1])

More seriously, the Plan's proposed eight FAA/OOOI milestone mappings are not supported as written by the current AeroDataBox movement schema. The provider documents `scheduledTime` as generic scheduled arrival/departure, `revisedTime` as actual/estimated arrival/departure that can represent gate or runway depending on whether `runwayTime` exists, and `runwayTime` itself as actual/**estimated** runway landing/takeoff. There is no current `actualTime` field matching the Plan's mapping. ([AeroDataBox][2]) This means the agent must **stop inventing FAA aliases from provider fields** and establish which milestones are genuinely constructible before choosing `T` and the primary target.

I also found an important operational hole: the Plan says T−24/T−6/T−90 → experimental webhook window → **later outcomes**,  but the experiment stops each airport window by deleting the Flight Alert subscription.  Current Flight Alert subscriptions are permanent until explicitly deleted and charge per flight item sent. ([AeroDataBox][3]) The Plan therefore needs an explicit, budgeted mechanism for obtaining later landing/gate/terminal outcomes **after the collection window closes**. Otherwise arrival labels and some POST labels may simply never be observed.

There is also a real crossover feasibility contradiction. The Plan says every six-day block must use each UTC slot exactly once, while the crossover says paired periods must have the same `time_class` (±1h), and then the fixed runbook pairs consecutive days such as day 5→6 and day 13→14.    Slots are four hours apart, so two different days within the same six-day block cannot simultaneously use each slot exactly once **and** have the same time class. The agent must make the scheduler constraints mathematically satisfiable and test them.

The probe protocol has a budget contradiction too. Stage 1 requires exactly two hours and uses WSSS as a reference with roughly 331 rows/hour, while the same Plan caps probe spending at 500 credits/day.  At the stated reference rate, two hours is roughly 662 flight-item credits before considering bursts. Stage 2 at four hours is even larger. Yet the implementation log estimates Stage 1 at only 30–80 credits and Stage 2 at 60–120.  Those cannot all be true. The agent needs to reconcile measured yield, exact duration, and the safety cap before spending.

There are also additional cross-document issues: FIDS population cutoff vs future service-window semantics; POST-only REGIONAL airports versus a FIDS-derived POST denominator; the false mutual-exclusivity claim in the coverage taxonomy; `CanceledUncertain`; provider notification ID vs flight ID; state-update timestamp vs notification-generation timestamp; generic `P(delay>15)` despite milestone-specific labels; frozen-vs-deferred evaluation settings; incomplete historical-delay bootstrap; traffic-score saturation for HUB anchors; undefined normalizations such as `degree_norm`; a false mathematical “no starvation” guarantee; exact Stage-2 replacement/reranking rules; an undefined `event-regime`; undefined ATC/storm/MCD sources; the wrong description of LDM as reanalysis—Unidata defines LDM as data-distribution software; and several remaining implementation-log status contradictions. ([Unidata Documentation][4])

The current AviationWeather 30-day statement, however, is still correct: AviationWeather says the Data API currently permits access to up to the previous 30 days. ([Aviation Weather Center][5])

## How we make this the end of the planning loop

I would **not** use “ChatGPT didn't find another problem” as the stopping condition anymore. Instead, the prompt below forces the agent to construct a **Canonical Rule Registry** and mechanically demonstrate:

`CURRENT↔CURRENT contradictions = 0`
`Phase-6 unresolved B = 0`
`required pre-run C = 0`
`provider assumptions without evidence = 0`
`Phase-6-critical blocked tests = 0`
`all gates = PASS`
`manifest = FROZEN`

Once those are true, **stop theoretical auditing**. After that, only a failing test, changed provider contract, demonstrated leakage/accounting error, or impossible implementation is allowed to reopen the specification.

Use this prompt instead of the previous one. It supersedes the earlier remediation prompt.

# FINAL V3.9 CLOSURE AUDIT, SPECIFICATION NORMALIZATION, REPOSITORY IMPLEMENTATION, TESTING, AND PRE-FREEZE PROMPT

You are performing the **FINAL CLOSURE PASS** of an existing aviation flight-delay data collection experiment.

This is NOT another brainstorming session.

This is NOT permission to redesign the experiment.

This is NOT a request for V3.10.

The scientific architecture is considered LOCKED unless actual executable repository evidence or the current provider contract proves that one particular implementation assumption is impossible.

The purpose of this pass is to make V3.9:

1. internally contradiction-free;
2. compatible with the current AeroDataBox contract;
3. reproducible;
4. actually implemented rather than merely documented;
5. thoroughly tested;
6. honestly documented in `IMPLEMENTATION_LOG.md`;
7. safe to freeze and later run.

After the closure criteria at the end of this prompt are satisfied, STOP theoretical design auditing.

---

# 0. ABSOLUTE SAFETY RULE

Keep:

```text
ADB_AUTO_COLLECT=false
```

throughout this work.

DO NOT automatically:

* start Phase 6;
* start a real anchor probe;
* run the official canary;
* create uncontrolled Flight Alert subscriptions;
* refill a large credit balance;
* execute expensive FIDS sweeps;
* run Rescore/Simulate;
* activate automatic collection.

Prepare the code and commands, but live billable actions require explicit human authorization.

Never expose API keys, webhook secrets, database credentials, tokens, or other secrets in logs.

---

# 1. DO NOT CREATE A NEW ARCHITECTURE

Keep the following architectural decisions unless executable/provider evidence makes a specific item impossible:

* PRE-DEPARTURE and AIRBORNE/POST are separate modeling states.
* Webhook events are NOT the population denominator.
* Provider-observable population is a first-class layer.
* Raw provenance is immutable.
* Event history is preserved separately from current state.
* Airborne points are preserved as a time series.
* Snapshot features obey as-known-at-cutoff rules.
* Weather/history obey availability-time rules.
* No automatic flight-level `1/p` weighting.
* REGIONAL adaptation is an efficiency allocation, not a representation guarantee.
* XGBoost/persistence come before GNN.
* Month 1 is an early operational pilot, not seasonal validation.
* Engines A/B/C/D/E/R/P and POST remain conceptually separate.
* No outcome-driven changes to frozen collection rules.

Do NOT create V3.10.

If a normative correction is required, keep it inside the existing V3.9-f.* patch sequence.

---

# 2. SOURCE-OF-TRUTH HIERARCHY

When sources disagree, use this hierarchy:

```text
1. Current official provider contract / OpenAPI
2. Current live account and live payload evidence
3. Executable repository code + migrations + tests
4. Current binding V3.9 PART 1
5. Current IMPLEMENTATION_LOG status sections
6. Historical adjudication/change records
7. Archived/superseded documents
```

Historical files may explain why a decision was made.

They MUST NOT override current provider reality or current PART 1.

---

# 3. MATERIALS TO READ COMPLETELY

Before changing anything, read:

* `V3.9_DataCollectPlan.md` PART 1 §§1–22;
* entire `IMPLEMENTATION_LOG.md`;
* `A30_77_ADJUDICATION.md`;
* MUSE assessment files;
* all current `rl*.md` run reports;
* all migrations;
* entire executable repository;
* `package.json`;
* lockfile;
* environment/config declarations;
* current AeroDataBox RapidAPI OpenAPI;
* current AeroDataBox Flight Alert guide;
* current account/marketplace plan information when safely accessible;
* current AviationWeather Data API documentation.

Do not trust documentation claims such as “implemented” unless actual code exists.

---

# 4. FIRST DELIVERABLE: REPOSITORY TRUTH SNAPSHOT

Before editing, print:

```text
Git SHA:
branch:
working tree clean/dirty:
uncommitted files:
migration level:
Node version:
npm version:
TypeScript version:
database schema version:
plan version:
implementation-log revision:
manifest version:
manifest status:
ADB_AUTO_COLLECT:
live Alert balance if safely read:
marketplace/channel:
actual plan name:
monthly API-unit entitlement:
billing-cycle start:
billing-cycle end:
rate limit:
FIDS tier/unit cost:
Flight Alert refill cap:
Flight Alert total-balance cap:
data-retention/caching terms:
```

If any account information cannot be verified automatically, mark:

```text
UNVERIFIED — HUMAN GATE-0 INPUT REQUIRED
```

Do not guess.

---

# 5. STATUS VOCABULARY

Use only:

```text
DOCUMENTED
IMPLEMENTED
UNIT-TESTED
INTEGRATION-TESTED
LIVE-VERIFIED
FROZEN
DEFERRED
BLOCKED
SUPERSEDED
```

Examples:

A TypeScript file containing `TODO` is NOT IMPLEMENTED.

A migration creating a table does NOT mean its ETL is implemented.

A code fix after a failed live run is:

```text
IMPLEMENTED
LIVE-VERIFICATION PENDING
```

not PASS.

A historical failed run remains failed forever.

---

# 6. BUILD A CANONICAL RULE REGISTRY BEFORE PATCHING

Create a machine-readable registry, e.g.:

```text
AugMDnotes/V39_CANONICAL_RULE_REGISTRY.yaml
```

or JSON.

Every current repeated rule must have ONE canonical entry.

At minimum register:

```text
plan_version
provider_openapi_version
provider_openapi_hash
marketplace
account_plan
billing_cycle

monthly_api_units
opening_alert_balance
phase6_credit_ceiling
protected_alert_floor
pre_run_alert_budget
rest_fids_budget
rate_limit
daily_alert_ceiling
soft_stop_rule
hard_stop_rule
reconciliation_rule

traffic_source
traffic_metric
traffic_period
hub_rule
mid_rule
traffic_score_formula

region_mapping
region_overrides

population_scope
pre_eligibility
post_eligibility
post_population_denominator

prediction_cutoff_definition
service_window_definition
FIDS protocol
FIDS query shape
FIDS cost model

selected_t_milestone
identity_scheduled_milestone
selected_primary_target
milestone_mapping

flight_instance_rule
codeshare_rule
retime_rule
retime_lineage_rule

timestamp_model
research_event_identity
snapshot_existence_rule

outcome_acquisition_rule
outcome_state_model
label_observability

grace_rule

weather_rule
history_readiness_rule
history_feature_sources

window_shape definitions
2x2h segment definition
UTC scheduling rule
crossover rule
crossover_randomization_unit
crossover_pairing rule

anchor eligibility
anchor formula
anchor normalization
probe protocol
probe budget

regional adaptation rule
zero-yield rule
coverage-floor rule

Engine-A split rule
primary claim
metric definitions
deferred-analysis settings
```

Every duplicate occurrence in Plan/Log/code must point to this canonical rule or match it exactly.

---

# 7. CURRENT PROVIDER CONTRACT MUST BE RE-PINNED

As of this closure audit, the official AeroDataBox specification was updated
2026-08-28 and the RapidAPI OpenAPI advertised API version `1.15.3.0`.

DO NOT blindly hard-code that forever.

Download the current specification again during this work.

Record:

```text
provider_docs_date
openapi_version
openapi_sha256
marketplace_server
retrieved_at
```

Fail the preflight if the OpenAPI hash changes after freeze without adjudication.

---

# 8. FIDS CONTRACT — REPLACE STALE ASSUMPTIONS

The current Plan contains stale assumptions.

Current official FIDS path is of the form:

```text
/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}
```

not:

```text
/flights/schedule
```

Audit every provider-specific FIDS statement.

In particular:

## 8.1 Endpoint

Use the actual current endpoint and query parameters.

## 8.2 Time bounds

`fromLocal` / `toLocal` are airport-local timestamps.

The maximum permitted interval is plan-dependent.

Do NOT hard-code 12 hours unless the actual account plan proves 12 hours.

Freeze:

```text
fids_max_range_for_actual_plan
```

from live/current plan evidence.

## 8.3 Direction

Current provider uses:

```text
direction=Arrival|Departure|Both
```

Do not invent separate:

```text
withDepartures
withArrivals
```

unless current provider supports them.

## 8.4 `withLeg`

Current provider semantics:

```text
withLeg=true
```

means include information from the opposite movement and return `departure` +
`arrival` rather than only `movement`.

It does NOT mean “leg-detail mode” vs “flight-leg mode.”

Correct Plan/Log/code/tests.

## 8.5 `withCancelled`

Current provider says this can include:

```text
Canceled
Diverted
CanceledUncertain
```

Preserve all three distinctions.

## 8.6 Codeshare

`CodeshareStatus` includes:

```text
Unknown
IsOperator
IsCodeshared
```

`Unknown` is genuinely ambiguous.

Do not claim perfect operating-leg dedup when provider says operator status may
be unknown.

Create:

```text
codeshare_resolution_status =
  resolved_operator
  resolved_marketing
  ambiguous_unknown
```

Ambiguous cases must remain auditable.

## 8.7 Cargo/private

Use explicit provider filters where supported.

Do not claim a private/cargo exclusion was performed downstream if the required
field does not exist.

## 8.8 Non-scheduled / charter scope

The FIDS contract itself may not expose `FlightType`.

Do not promise:

```text
charter / nonscheduled = always excluded
```

unless executable provider data can distinguish it.

Either:

* prove an available field/source;
* use another verified endpoint;
* or redefine the provider-observable core scope honestly.

Do not invent classification.

## 8.9 Edge inclusivity

The current OpenAPI does not guarantee the Plan's `[from,to)` assumption.

Do not call it frozen without proof.

Implement robust boundary handling:

```text
query provenance
returned scheduled timestamp
canonical dedup
adjacent-window overlap check
```

and live-verify edge behavior.

## 8.10 Truncation / 500-record assumption

Do not implement a phantom `result truncated` field unless current contract
actually exposes it.

The current response contract contains departures/arrivals arrays.

If a practical result limit is observed, characterize it through live evidence
and implement a generic recursive split strategy.

---

# 9. FIDS CUT-OFF VS SERVICE-WINDOW CONTRADICTION

Separate two different concepts:

```text
prediction_cutoff_utc
service_window_start_utc
service_window_end_utc
fids_retrieved_at_utc
```

For a T−24 prediction:

```text
prediction cutoff = approximately T minus 24h
```

while the flight's service/departure time is approximately 24 hours later.

Therefore DO NOT define population membership as:

```text
scheduled departure ∈ [cutoff, cutoff+window)
```

unless those happen to be the actual service-window coordinates.

Correct rule:

```text
A flight is a population member at cutoff C for service interval S iff:

1. the provider returned/represented that flight in a query observed at or
   legitimately available by cutoff C;

2. its selected service-time field falls in the frozen future service interval S;

3. it meets the frozen scope and horizon eligibility rules.
```

Persist:

```text
prediction_cutoff_utc
service_window_start_utc
service_window_end_utc
query_from_local
query_to_local
retrieved_at_utc
provider_response_hash
```

Unit-test T−24/T−6/T−90 independently.

---

# 10. FIDS PRIMARY POPULATION VS CONTEXT

If `direction=Both` is retained, distinguish:

```text
primary_prediction_population
context_only_fids_records
```

Example:

A departure from the selected airport may be a primary prediction member.

An arriving leg may be useful for:

```text
previous-leg context
aircraft chain
network state
```

without automatically becoming another departure prediction unit.

Do not double-count physical flights.

If the same operating flight is returned through multiple selected airports,
preserve all query/source provenance but create one canonical physical
population membership per applicable prediction unit.

Recommended separation:

```text
raw_fids_query
raw_fids_flight_observation
canonical_flight_instance
flight_population_membership
```

Do not overload one row for all four concepts.

---

# 11. FIDS BUDGET PROOF MUST BE EXECUTABLE

Retire the unsupported claim:

```text
31 × 4 × 3 × 1 call × 2 units = guaranteed worst case
```

until all request shapes are proven.

Count separately:

```text
base service-window queries
2x2h segment queries
plan-limit splits
DST-safe splits
response-size splits
validation calls
history/bootstrap calls
outcome-acquisition REST calls
diagnostic calls
retries
```

Implement a central API-unit ledger.

At minimum:

```text
FIDS_TOTAL_UNIT_BUDGET
FIDS_RETRY_UNIT_BUDGET
VALIDATION_UNIT_BUDGET
OUTCOME_REST_UNIT_BUDGET
HISTORY_BOOTSTRAP_UNIT_BUDGET
```

Before issuing a billable REST request:

```text
if projected_total_units > protected_rest_budget:
    REFUSE / DEFER
```

Never steal API units from the Phase-6 Alert-credit allocation silently.

---

# 12. PROVIDER RATE LIMIT

Freeze the actual account rate limit at Gate 0.

Implement central throttling.

Handle:

```text
429
Retry-After
network timeout
5xx
```

without unbounded retries.

Rate-limit retries must also respect API-unit budgets.

Do not assume the public plan applies if the user's marketplace subscription is
grandfathered.

Live account evidence wins.

---

# 13. DST AND LOCAL-TIME FIDS AMBIGUITY

The FIDS path accepts local timestamps without explicit UTC offset.

Therefore a fall-back DST repeated local hour can be ambiguous.

Do not write a unit test pretending:

```text
01:30 first occurrence
01:30 second occurrence
```

can be expressed as two distinct path strings unless provider behavior proves it.

For DST transitions:

* test actual provider behavior;
* if ambiguous, avoid/query a wider unambiguous range and canonicalize returned
  UTC times;
* or declare transition intervals unsupported/refused until verified.

Mandatory tests:

```text
US spring-forward
US fall-back
southern hemisphere
UTC interval crossing local midnight
```

---

# 14. T−24 OPERATIONAL SCHEDULING

The full experiment calendar and selected airport/window template must be frozen
early enough for actual T−24 acquisition.

Persist:

```text
run_start_date
experiment_day
assignment_frozen_at
template_hash
airport_set_hash
service_window
window_shape
t24_due_at
t6_due_at
t90_due_at
```

The scheduler must refuse a late assignment unless it is explicitly marked:

```text
t24_unavailable=true
```

according to the frozen exclusion rule.

Do not reconstruct T−24 retrospectively.

---

# 15. PROVIDER MOVEMENT-TIME MAPPING — MAJOR CORRECTION

Do not invent eight FAA/ASPM milestones from provider fields.

Current provider movement contract exposes:

```text
scheduledTime
revisedTime
predictedTime
runwayTime
gate
runway
quality
```

Important current semantics:

```text
scheduledTime:
generic scheduled arrival/departure

revisedTime:
actual OR estimated arrival/departure;
if runwayTime exists and differs, revisedTime represents gate time;
otherwise it may be gate OR runway

runwayTime:
actual OR estimated runway takeoff/landing
```

There is no current `movement.actualTime` field matching the old Plan mapping.

Therefore:

## 15.1 Preserve provider-native fields first

Store:

```text
provider_scheduled_time
provider_revised_time
provider_runway_time
provider_predicted_time
provider_movement_quality
provider_flight_status
```

unaltered.

## 15.2 FAA semantic aliases are conditional

Only populate:

```text
scheduled_gate_out
actual_gate_out
scheduled_wheels_off
actual_wheels_off
scheduled_wheels_on
actual_wheels_on
scheduled_gate_in
actual_gate_in
```

when the provider/external source gives enough evidence for that exact semantic
meaning.

Otherwise:

```text
NULL
milestone_unverified=true
```

## 15.3 Actual vs estimated

Never call `runwayTime` or `revisedTime` “actual” solely because a timestamp
exists.

Define a verification rule using:

```text
flight status
movement quality
temporal relation
live payload evidence
provider documentation
```

If no reliable actual/estimated discriminator exists, the milestone is
unverified for that row.

---

# 16. SELECTED T MAY NEED TO CHANGE

The current candidate/fallback:

```text
scheduled_gate_out
scheduled_wheels_off
```

may both be unconstructible globally from the current provider.

Do not force one.

At Gate 0.5 determine which prediction-time anchor is actually supported.

Permitted resolution must be chosen BEFORE outcome/model inspection.

Examples:

```text
verified provider-native scheduled departure time
verified FAA-equivalent milestone
external-source milestone on an explicitly restricted population
```

Record:

```text
selected_t_milestone
selected_t_semantics
selected_t_provider_path
selected_t_population_scope
selected_t_verification_evidence
```

If no scientifically defensible T exists:

```text
BLOCKED
```

Do not fabricate one.

---

# 17. PRIMARY TARGET MUST ALSO BE CONSTRUCTIBLE

The current:

```text
wheels_off_delay
fallback gate_out_delay
```

cannot remain merely because it was predeclared if the provider cannot
construct those milestones.

Freeze a target only after provider-field verification.

All primary machinery must reference:

```text
selected_primary_target
```

including:

```text
primary endpoint
MAE computation
P(delay > threshold)
decision rule
report title
manifest
split metadata
```

Never retain stale hard-coded `wheels_off` after a fallback.

---

# 18. GENERIC DELAY NAMES ARE FORBIDDEN

Replace ambiguous:

```text
expected_delay
P(delay>15)
P(delay>60)
P(delay>120)
```

with milestone-specific names such as:

```text
expected_selected_primary_delay
P(selected_primary_target > 15)
P(selected_primary_target > 60)
```

or explicit:

```text
P(wheels_off_delay > 15)
P(gate_in_delay > 60)
```

Do this throughout Plan, Log, schemas, model outputs and reports.

---

# 19. FLIGHT IDENTITY

Do not assume:

```text
flight.id
flightId
```

exists in current FIDS/Flight Notification flight-item contracts unless actual
payload evidence proves one.

The notification envelope `id` is a notification ID, not a flight ID.

Keep it as:

```text
provider_notification_id
```

Canonical physical flight identity must therefore be derived from verifiable
stable fields.

Audit and freeze:

```text
operating/owning flight number
origin
destination
service date
selected verified schedule-time anchor
callsign
aircraft registration when available
provider codeshare status
```

Use a collision-safe versioned key.

---

# 20. CODESHARE UNCERTAINTY

When:

```text
CodeshareStatus = Unknown
```

do not silently collapse records as if operator identity were known.

Preserve:

```text
codeshare_status_raw
codeshare_resolution_status
canonicalization_confidence
candidate_group_id
```

Create tests for:

```text
IsOperator + IsCodeshared obvious pair
Unknown + duplicate-looking records
same number, different physical leg
same leg, multiple marketing numbers
```

---

# 21. RETIME SEMANTICS

Keep deterministic identity rules only if their required time field is verified.

Then explicitly define the analytical meaning of:

```text
retime_parent_id
```

For a ≥2h retime specify:

* what happens to parent population membership;
* what happens to parent PRE snapshots;
* whether the child inherits earlier prediction lineage;
* which instance receives final labels;
* whether both count in population N;
* how parent/child are grouped for train/test;
* how cancellations vs replacements differ;
* how service-date changes behave.

No parent/child pair may leak across evaluation partitions if they represent one
service lineage.

---

# 22. OUTCOME MODEL MUST BE NORMALIZED

The existing single five-state model mixes two different concepts.

Separate:

## Operational flight state

For example:

```text
scheduled
active
departed
arrived
canceled
diverted
canceled_uncertain
terminal_unknown
```

## Per-target label state

For each target:

```text
observed
pending
censored
unavailable
unverified
```

A diverted flight can still have an observed landing.

A flight can have:

```text
wheels_on observed
gate_in missing
```

Do not force these into one mutually exclusive five-state label.

---

# 23. `CanceledUncertain`

Current provider has explicit:

```text
CanceledUncertain
```

Do not coerce it immediately to canceled.

Persist the raw state.

Define transition rules:

```text
CanceledUncertain -> Canceled
CanceledUncertain -> active/other final state
CanceledUncertain -> unresolved after grace
```

Label cancellation only when frozen evidence criteria are met.

---

# 24. OUTCOME ACQUISITION AFTER THE ALERT WINDOW — CRITICAL

The Plan currently assumes:

```text
experimental webhook window
→ later outcomes
```

but airport subscriptions are deleted to stop a window.

Define exactly how terminal outcomes are acquired after deletion.

Possible mechanisms must be evaluated for correctness/cost:

```text
A. continue airport subscription
B. create flight-specific subscriptions for selected physical flights
C. scheduled REST flight-status/FIDS outcome retrieval
D. validated destination-side observations
E. a justified combination
```

Do NOT pick based on convenience.

For the selected mechanism freeze:

```text
outcome_acquisition_method
eligible flights
start time
stop time
cost model
API/Alert budget
retry policy
terminal evidence
missing behavior
provenance
```

Outcome collection occurs after the prediction cutoff, which is acceptable for
labels, but must never feed earlier features.

If arrival/terminal labels cannot be acquired under the available budget:

```text
BLOCKED / REDUCE TARGET SCOPE
```

rather than pretending labels will appear.

---

# 25. POST-ONLY REGIONAL VS POST POPULATION CONTRADICTION

Current design allows:

```text
post_eligible=true
pre_eligible=false
```

for some REGIONAL airports.

But the POST denominator was also defined using the PRE/FIDS population layer.

Resolve this before collection.

Choose exactly one predeclared policy:

```text
A. primary POST analysis requires independent FIDS/population eligibility;

B. implement a distinct provider-observable POST denominator;

C. collect POST-only REGIONAL data as auxiliary/exploratory and exclude it from
   primary denominator-based POST claims.
```

Document the choice and test it.

---

# 26. SNAPSHOT EXISTENCE RULE

Canonical rule:

```text
snapshot_exists =
    population_member_at_cutoff
    AND horizon_eligible
```

Optional feature availability does NOT determine whether the row exists.

Feature rule:

```text
feature usable iff
information_available_timestamp <= prediction_cutoff
```

Unavailable optional feature:

```text
NULL
missing flag = true
```

A separately declared required-history condition can classify a row as
`history_incomplete`, but do not conflate that with population existence.

Unit tests required.

---

# 27. TIMESTAMP MODEL — CORRECT PROVIDER CLOCKS

Do not collapse current provider clocks.

Preserve separately:

```text
provider_notification_generated_utc
    = notification envelope timestampUtc

provider_state_updated_utc
    = item lastUpdatedUtc

location_reported_utc
    = location.reportedAtUtc when present

received_timestamp_utc
    = our HTTP receipt

available_at
    = when our durable ingestion made information usable
```

Do NOT automatically call `lastUpdatedUtc`:

```text
provider_published_utc
```

without defining what “published” means.

If retaining a generic field, derive it explicitly from the appropriate source
clock and preserve originals.

---

# 28. RAW EVENT TIMESTAMP NULLABILITY

Non-location state updates may not have `reportedAtUtc`.

Therefore do not make a single location-style `event_timestamp` semantically
mandatory for every event type.

Define event-type-specific source timestamps and/or permit NULL where the
provider supplies no real occurrence time.

Never replace unknown occurrence time with receipt time without a source flag.

---

# 29. RAW IMMUTABLE INGEST MUST BE ACTUALLY RAW

Current documentation calls `adb_ingest_events` immutable while also placing
post-processing outputs such as:

```text
stored
inserted
updated
skipped
delivery_failure
error
```

inside the same logical record.

Normalize the ingest pipeline.

Preferred pattern:

```text
raw_webhook_delivery
    immutable envelope persisted FIRST

raw_webhook_item
    immutable item-level record

ingest_processing_attempt
    append-only parser/store result

flight_events
    semantic research observations

flight_state
    mutable operational projection
```

The raw payload must be durably persisted before complex parsing/state updates.

---

# 30. WEBHOOK FAILURE WINDOW

Current provider requires a timely successful HTTP response.

Because retries are disabled to protect credits, a processing failure after
receipt can cause permanent research-data loss.

Implement a fast durable-ingress design:

```text
receive
validate authentication/basic shape
durably persist raw envelope
ack 2xx
asynchronously/transactionally process downstream
```

If durable persistence itself fails, define an explicit failure policy.

Test:

```text
DB unavailable
parser throws
downstream state upsert throws
duplicate notification retry
multiple flight items
```

Raw data must not disappear silently.

---

# 31. RAW ITEM IDENTITY VS SEMANTIC OBSERVATION IDENTITY

Preserve every delivery item using a delivery identity such as:

```text
provider_notification_id
delivery_attempt
item_index
subscription_id
ingest_event_id
```

Separately compute semantic observation identity.

Do not rely only on:

```text
flight + carrier + locReportedUtc
```

for immutable raw preservation because:

* location timestamp can be NULL;
* two state changes can share it;
* non-location events may not have it.

Test simultaneous same-carrier flights at identical timestamps.

---

# 32. PROVIDER NOTIFICATION BALANCE IS NOT FINAL ACCOUNTING

Current notification `balance` is described by the provider as an expected
pre-send value and may differ from final account balance.

Never use it as authoritative final spend.

Authoritative post-settlement source:

```text
GET /subscriptions/balance
```

plus documented before/after timestamps.

Notification balance may be retained as diagnostic only.

---

# 33. CREDIT RECONCILIATION RULE

Current Plan contradicts itself:

```text
Gate 3: C_external = C_internal
```

versus:

```text
|C_external - C_internal| <= 3
```

For the tiny isolated canary, use:

```text
tolerance = 0
```

unless provider settlement evidence proves otherwise.

A tolerance of 3 on a one-credit canary could allow total loss to pass.

If a nonzero production tolerance is needed later:

```text
operational_reconciliation_tolerance
```

must be separately justified from measured settlement/burst behavior.

---

# 34. HARD-CAP SAFETY MUST USE AN AUTHORITATIVE SIGNAL

Flight Alert credits are charged on SEND, even when the webhook is down.

Therefore internal received-item count alone cannot guarantee a 1,900 hard
billing ceiling.

Implement/verify a safety mechanism using authoritative balance reads and a
worst-unsettled-burst margin.

For example:

```text
periodic free GET /subscriptions/balance
+
internal ledger
+
conservative pending-send margin
+
immediate subscription deletion at soft threshold
```

Do not claim HARD_CAP is physically enforced if it is only detected after
overspend.

Distinguish:

```text
preventive_soft_stop
billing ceiling objective
post-hoc overshoot detection
```

---

# 35. GATE 0.5 MUST NOT BE A ONE-ITEM CANARY STATISTIC

A tiny Gate-3 canary proves wiring/accounting.

It cannot reliably estimate:

```text
P95 notification latency
P95 airborne gap
trajectory completeness
grace interval
max burst distribution
```

Create a distinct, budgeted Gate-0.5 pilot.

Predeclare minimum evidence requirements:

```text
minimum notifications
minimum unique flights
minimum completed/arrived flights
minimum airborne flights
minimum duration
```

If sample requirements are not reached:

```text
Gate0.5 = BLOCKED/INSUFFICIENT SAMPLE
```

Do not freeze a P95 from one or two flights.

---

# 36. GATE 4 LIVE COST

Do not spend ~1,850 Alert credits merely to prove the production SOFT_STOP if
the same path can be verified safely.

Use:

```text
parameterized scaled integration test
```

that exercises the exact same stop code at a tiny test cap.

Then verify production constants separately.

A large live Gate-4 test requires explicit human authorization and a declared
pre-run Alert budget.

---

# 37. PRE-RUN ALERT-CREDIT BUDGET

Anchor probes and canaries spend Flight Alert credits.

They are NOT REST/FIDS API-unit calls.

Create an explicit pre-run Alert-credit line.

Track separately:

```text
opening persistent Alert balance
credits originating in prior billing cycles
new monthly units converted to Alert credits
smoke-canary spend
Gate-3 spend
Gate-0.5 spend
Stage-1 spend
Stage-2 spend
outcome-validation spend
other pre-run spend
protected floor
Phase-6 spend
```

Do not double-count pre-existing non-expiring Alert credits as new monthly units.

---

# 38. BILLING-CYCLE ALIGNMENT

The API-unit entitlement resets on a marketplace billing cycle.

Flight Alert credits do not expire.

Freeze:

```text
quota_cycle_start
quota_cycle_end
units_remaining_before_refill
opening_alert_balance
credits_refilled_this_cycle
rest_units_reserved_this_cycle
```

The 31-day experimental run may cross a billing-cycle boundary.

The ledger must make it clear whether the scientific budget is:

```text
one specific 60k entitlement
```

or an absolute credit ceiling independent of calendar reset.

Do not silently gain a second month's quota halfway through the experiment.

---

# 39. DATA RETENTION / CACHING TERMS

The research design expects long-term raw/provenance storage.

Verify that the actual marketplace plan permits the intended retention.

Record:

```text
provider_data_retention_terms
provider_cache_limit
verified_date
plan/channel
```

If the actual plan legally prevents the required research retention:

```text
BLOCKED
```

until resolved.

Do not collect data you are not permitted to retain as designed.

---

# 40. PROBE PROTOCOL BUDGET CONTRADICTION

The Plan says:

```text
WSSS ~331 rows/hour
Stage 1 = 2 hours exactly
probe daily cap = 500 credits
```

At the stated rate:

```text
331 × 2 ≈ 662 flight items
```

which exceeds the cap before burst uncertainty.

The implementation log's 30–80-credit estimate is inconsistent.

Recalculate from actual billing:

```text
1 credit per flight item sent
```

and measured reference rates.

Resolve one way BEFORE live probing:

```text
increase authorized probe cap;
shorten duration;
choose a different reference;
use a stop-at-cap protocol and treat duration as censored;
or redesign the probe budget while preserving scientific comparability.
```

Do not call a cap-truncated probe “2.0h exact.”

---

# 41. STAGE-1 REFERENCE COUNT

Specify whether WSSS and OMAA are:

```text
members of the exact 12 Stage-1 candidates
```

or additional reference probes.

If additional, Stage 1 is not 12 probes and budget arithmetic must include them.

Freeze the literal ICAO shortlist and hash it.

---

# 42. STAGE-2 RULE

Define:

* whether Stage-2 measurements rerank the five;
* whether Stage-2 is confirmation only;
* how Stage-1 and Stage-2 metrics combine;
* what happens if one of the five fails capacity/reliability in Stage 2;
* whether candidate #6 replaces it;
* whether replacement receives its own 4h confirmation;
* what happens if fewer than five Stage-1 candidates pass capacity.

No discretionary post-measurement choice.

---

# 43. ANCHOR CANDIDATE TIER

Because the anchor consumes the HUB slot, freeze:

```text
anchor_candidate must be HUB
```

if that is truly intended.

If non-HUB candidates are permitted, stop saying an anchor necessarily consumes
a HUB observation without explaining the tier accounting.

---

# 44. ANCHOR TRAFFIC SCORE SATURATION

Current formula:

```text
traffic_score = min(1, scheduled_departures / hub_cut)
```

can equal exactly 1 for every HUB above the HUB threshold.

If anchor candidates are all HUBs, the 40% traffic component could become
constant and contribute no ranking information.

Before probing, compute its variance across the actual shortlist.

If degenerate, freeze a monotone exogenous normalization that preserves
within-HUB differences, such as a documented percentile/log/min-max transform.

Do NOT change normalization after observing probe yield.

---

# 45. UNDEFINED ANCHOR NORMALIZATIONS

Current formulas reference:

```text
degree_norm
effective_carriers_norm
```

without a complete normalization procedure.

Freeze:

```text
reference population
winsorization if any
min/max or percentile definition
missing behavior
ties
zero denominator behavior
version/hash
```

Also define division-by-zero behavior when the WSSS/OMAA yield-reference
component is zero.

---

# 46. REGION MAPPING

One airport must have exactly one executable macro-region.

Use:

```text
ISO country code -> region
+
explicit versioned overrides
```

Remove conflicting prose such as Greenland appearing in Europe while an
override maps it to North America.

Do not mix a country lookup with informal latitude rules unless latitude is part
of the executable algorithm.

Test:

```text
US
Canada
Mexico
Central America
South America
Greenland
Turkey
Australia
New Zealand
Pacific islands
Russia west of threshold
Russia east of threshold
unknown
```

---

# 47. TRAFFIC TIER

Select exactly one:

```text
source
metric
reference period
threshold/cut algorithm
missing policy
```

before rebuilding the frame.

Do not leave:

```text
OAG OR Cirium OR FAA/BTS
top ~7% OR >=25k
```

inside something described as frozen.

If the globally appropriate source is unavailable:

```text
BLOCKED
```

rather than inventing numbers.

---

# 48. REFERENCE VARIABLES MUST BE EXOGENOUS

Do not derive the supposedly exogenous pre-probe 80% anchor/reference features
from Phase-6 sampled `flight_population`.

Prove a fixed PRE-FREEZE reference source for:

```text
traffic
network degree
carrier diversity
international share
region rarity
```

Record source/version/period/hash.

If a separate global schedule snapshot is collected for this purpose, treat it
as its own reference dataset with explicit acquisition cost and provenance.

---

# 49. COVERAGE TAXONOMY IS NOT ONE MUTUALLY EXCLUSIVE STATE

Current terms overlap:

```text
supported
eligible
directly_subscribed
recently_observed
edge_discovered
zero_yield_*
coverage_failed
stale
```

An airport can simultaneously be:

```text
supported
eligible
directly_subscribed
recently_observed
```

Normalize into orthogonal dimensions, e.g.:

```text
support_status
eligibility_status
subscription_status
observation_recency_status
yield_state
failure_state
```

Never claim “exactly one state” across overlapping concepts.

---

# 50. EXACT `2×2h` TREATMENT

Freeze:

```text
segment_1_start
segment_1_end
gap
segment_2_start
segment_2_end
same airport set?
same parent experiment day?
subscription lifecycle
FIDS service intervals
population membership
cost accounting
```

For noncontiguous windows, do not include gap flights in the exposed/captured
denominator unless explicitly classified.

---

# 51. ONE-BATCH-PER-DAY VS `2×2h`

The current one-batch/day guard conflicts with two separated subscription
segments.

Implement a parent/child model:

```text
experiment_day / parent_batch
    child_segment_1
    child_segment_2
```

or another equivalent scheme.

The one-experimental-treatment-per-day rule applies to the parent.

Both segments share the frozen treatment/template identity.

---

# 52. CROSSOVER SCHEDULER FEASIBILITY — CRITICAL

Current constraints conflict:

```text
each 6-day block uses each UTC slot exactly once

paired crossover periods use same time_class ±1h

hardcoded pair day5 -> day6
hardcoded pair day13 -> day14
...
```

With UTC slots spaced by four hours, those requirements may be impossible.

Additionally verify:

```text
weekday/weekend matching
24h washout
T−24 assignment lead time
window-shape randomization
```

Do not manually patch one pair.

Implement a constraint solver/enumerator that materializes the entire 31-day
calendar BEFORE Phase 6.

Test:

```text
all hard constraints satisfiable
all pair constraints satisfied
all T24 assignments schedulable
seed replay identical
```

If no schedule exists:

```text
BLOCKED — CONTRADICTORY CONSTRAINT SET
```

Then adjudicate which requirement is soft vs hard BEFORE collection.

---

# 53. CROSSOVER RANDOMIZATION VS HARDCODED DAY SHAPES

Current Plan simultaneously says:

```text
randomize window_shape within crossover blocks
```

and hardcodes:

```text
Day 6 = 2×2h
Day 11 = 6h
...
```

Choose one coherent interpretation.

Preferred:

```text
before any observations,
use frozen seed to randomize treatment assignments subject to the prespecified
counts/pairing constraints;
materialize the complete calendar;
hash it.
```

Then the runbook reports the generated schedule rather than pretending the
shape was both random and fixed.

---

# 54. CROSSOVER RANDOMIZED UNIT

If every airport in one batch receives the same `window_shape`, the treatment
was randomized at:

```text
batch-day
```

not independently at:

```text
airport-day
```

Set the statistical experimental/randomization unit accordingly and cluster
analysis at that unit.

Alternatively randomize separately by airport only if the actual subscription
architecture permits it and this is frozen beforehand.

Do not pseudo-replicate four airports as four independent randomized
treatments when one batch-level treatment was assigned.

---

# 55. WASHOUT DEFINITION

Clarify:

```text
24 hours between starts
```

versus:

```text
24 hours from end of period 1 to start of period 2
```

They are not the same.

Make the scheduler enforce the literal frozen rule.

---

# 56. `m_i` MUST BE FULLY DETERMINISTIC

Remove vague phrases:

```text
window ~4 most recent observations
cold start <=3 observations
candidate for down-weight
```

Define exact recurrence.

For example, explicitly freeze:

```text
EMA initialization
alpha
observation ordering
zero-yield update timing
median comparison set
NULL handling
penalty application
coverage-floor interaction
clamping order
state versioning
```

Persist adaptive state in an append/replayable history, not just an opaque
mutable current value.

---

# 57. ZERO-YIELD FSM

Implement exact transitions and tests.

One empty observation may not cause an adaptive penalty.

Define whether and when repeated-zero `×0.75` applies relative to the ordinary
EMA-derived `m_i`.

Define recovery after a successful observation.

Only proven coverage failure may remove the airport under the current design.

---

# 58. “NO STARVATION” CLAIM IS MATHEMATICALLY FALSE AS WRITTEN

```text
p_i > 0
```

does NOT guarantee every airport will be selected in a finite 31-day experiment.

With thousands of REGIONAL airports and roughly 31 REGIONAL slots, most cannot
be observed.

Rename the property accurately, for example:

```text
positive-probability floor
```

If a real finite-horizon coverage guarantee is desired, define a forced queue
for a realistically bounded subset.

Do not claim probabilistic nonzero chance = guaranteed observation.

---

# 59. PHASE-6 ADAPTIVE INITIAL STATE

Decide whether pre-run:

```text
probe observations
old testing rows
rl8/rl9 data
historical last_direct_observation_at
m_i states
zero-yield states
```

carry into Phase 6.

Freeze:

```text
adaptive_state_initialization_policy
adaptive_state_snapshot
adaptive_state_hash
coverage_age_initialization
```

before the first experimental draw.

No accidental contamination from development runs.

---

# 60. WEATHER

Keep the strict cutoff rule.

Current AviationWeather API permits up to the previous 30 days, but reverify at
freeze.

Separate:

```text
operational_as_known_feature_source
retrospective_truth/reference_source
```

ERA5 is retrospective reanalysis and must not masquerade as an operational
forecast available at a historical decision time unless a valid availability
argument exists.

Also correct:

```text
NOAA LDM reanalysis
```

LDM is distribution software, not a meteorological reanalysis product.

Name the actual data product delivered through LDM/IDD if one is used.

---

# 61. HISTORICAL FEATURE STORE

Implement it for real.

For every feature produce a source matrix:

```text
feature
source
actual/scheduled values required
historical depth
cost
retrieval method
source timestamp
available_at
valid/effective time
missing policy
```

Do not assume FIDS schedule history automatically provides actual historical
delay.

The current provider does advertise historical/statistical products; evaluate
their exact coverage/cost if useful, but do not silently substitute them.

---

# 62. HISTORY READINESS VS ROW COMPLETENESS

Separate:

```text
history_store_ready_at
```

from:

```text
history_complete_for_snapshot
```

`history_store_ready_at` means infrastructure/source coverage is mature enough
to evaluate the specified lookback without future leakage.

`history_complete_for_snapshot` means this specific airport/tail/route actually
has enough prior observations.

A low-volume airport must not prevent the entire global store from becoming
ready.

---

# 63. APPEND-ONLY HISTORY VS `valid_to`

If history rows are immutable, do not update old rows' `valid_to` when a new
version arrives unless that mutation is explicitly allowed.

Use one reproducible design:

```text
derive valid_to using LEAD()
```

or:

```text
append closure/version records
```

or another immutable interval scheme.

Also normalize:

```text
information_available_timestamp
available_at
valid_from
valid_to
source_timestamp
```

so each has exactly one meaning.

---

# 64. CHAIN COMPLETENESS

Separate:

```text
scheduled successor
observable successor
observed successor
linked successor
known absent
unknown
collection boundary
```

Do not count an unobservable future leg as a chain-capture failure.

Report if useful:

```text
scheduled_chain_completeness
observable_chain_completeness
```

---

# 65. MIDNIGHT ROTATIONS

Do not automatically break a valid aircraft rotation merely because calendar
date changed.

Use the actual aviation relationship:

```text
same tail
next origin = previous destination
0 < turnaround <= max_turnaround
```

subject to explicitly defined observation/service boundaries.

Freeze whether “same service date” matters and why.

Test:

```text
landing 23:40
next departure 01:05
```

---

# 66. AIRBORNE PROVIDER FIELD INVENTORY

Compare every claimed raw field with the current OpenAPI.

Current location contract supports fields such as:

```text
lat
lon
altitude
pressureAltitude
pressure
groundSpeed
trueTrack
vsiFpm
reportedAtUtc
```

Do not label derived/nonexistent fields as provider-native.

For fields such as:

```text
on_ground
flight_phase
distance_to_destination
fraction_of_route_completed
eta_model_reference
```

record:

```text
source = derived
derivation
builder version
available_at
```

---

# 67. OUTCOME/PRE/POST DENOMINATOR FUNNELS

For Gate 5 do NOT merely assert:

```text
population >= captured
```

for raw captured total.

Define:

```text
captured_in_population
captured_outside_population
population_not_captured
```

because the webhook may contain:

* flights outside the service interval;
* late-added flights;
* context arrivals;
* scope mismatches.

The valid invariant is on aligned populations, not every raw webhook item.

---

# 68. GATE 5 REFERENCE VALIDATION

FAA/BTS is useful for applicable U.S. subsets.

Do not imply FAA/BTS validates worldwide provider completeness.

Report:

```text
provider-population validation on reference-covered subset
```

and keep global claims regime-qualified.

---

# 69. DISRUPTION EVENT DEFINITION

Engine A/E use `event_id` / `disruption_event_id`, but the current definition is
insufficiently frozen.

Before split-rule hashing define:

```text
disruption event source
event start
event end
geography
event merge/split rule
event ID generation
available_at
```

Do not build event groups after seeing model errors.

---

# 70. ATC / STORM / MCD CONTEXT

The Plan promises these fields in batch context but does not fully define their
sources.

For each:

```text
ATC delay-program flag
storm-track context
MCD / cancellation-disruption signal
```

either define:

```text
source
endpoint/feed
availability time
schema
retention
version
cost
```

or mark it:

```text
DEFERRED / OPTIONAL
```

Do not promise “every batch records it” if no implementation/source exists.

---

# 71. `event-regime` IS UNDEFINED

Current evaluation says:

```text
train-standard -> test-event-regime
```

without a canonical event-regime collection rule.

Either define the regime and how rows receive it, or move this analysis to
DEFERRED.

---

# 72. ENGINE-A BOUNDARY POLICY

Freeze:

```text
days 1–20 train
days 21–25 validation
days 26–31 test
```

only together with deterministic handling of groups that cross boundaries.

Example:

```text
disruption_event spans day25 -> day26
```

Choose before collection:

```text
assign whole event to later partition
assign whole event to earlier partition
exclude cross-boundary group from primary
```

No outcome-dependent choice.

---

# 73. ROLLING-ORIGIN VS FINAL TEST

The current frozen rolling fold at day 27 can touch the protected day26–31 test
period.

Primary model tuning must never use those rows.

Either:

```text
restrict tuning folds to pre-test data
```

or:

```text
perform any fold touching the protected test only AFTER primary model lock as
a secondary descriptive analysis.
```

Document the distinction.

---

# 74. FROZEN VS DEFERRED ANALYSIS SETTINGS

Current documents call some values both frozen and deferred:

```text
1000 bootstrap replicates
95% CI
rolling folds
ECE bins
staleness buckets
```

For each choose exactly one status:

```text
FROZEN NOW
```

or:

```text
DEFERRED UNTIL PREDECLARED DEADLINE
```

Do not use both labels.

---

# 75. CONFORMAL CONTRADICTION

Month 1 says conformal is deferred.

Therefore do not also say:

```text
the Month-1 product outputs a conformal interval
```

Month 1 can output the frozen quantile interval.

Later Model 7 may output conformal after the method is frozen.

---

# 76. PRIMARY RESULT MUST BE AN HONEST TEST

Do not make a Month-1 deliverable:

```text
XGBoost that beats persistence
```

because the experiment may scientifically fail.

Correct deliverable:

```text
Leakage-safe comparison determining whether Model 1 beats Model −1 under the
predeclared primary criterion.
```

A negative result is a valid successful research outcome.

---

# 77. MARGINAL-VALUE CLAIMS

Do not call:

```text
+1 MID
+1 REGIONAL
+1 week
```

randomized interventions unless the collection design genuinely randomizes
those quantities.

Only treatments actually randomized/paired may support the corresponding
randomized causal language.

Other info-per-credit analyses can be:

```text
descriptive
associational
exploratory
```

or deferred to a future intervention experiment.

---

# 78. LEARNING-CURVE N

Define sample size separately by model family.

Do not mix:

```text
PRE snapshots
unique physical flights
AIRBORNE points
credits
```

under one vague “flight-observations” N.

Each learning curve must carry at least:

```text
training rows
unique flights
unique days
cumulative Alert credits
cumulative REST units
```

---

# 79. RUN START DATE

Before T−24 scheduling starts, freeze the actual Phase-6 start date.

Materialize:

```text
calendar date
experiment day number
UTC slot
service window(s)
window shape
crossover pair
airport template
T24/T6/T90 due times
```

Hash the full calendar.

A relative “Day 1–31” plan is not enough for weekday matching, DST handling, or
T−24 scheduling.

---

# 80. PHASE-6 CREDIT NUMBER IS A CEILING, NOT A TARGET

Replace:

```text
Objective: Spend 57,900 credits
```

with:

```text
Maximum permitted Phase-6 experimental Alert spend = 57,900 credits.
Actual realized spend may be lower.
```

Likewise do not promise ~58k observations because:

```text
1 credit = one sent flight item
```

not necessarily one unique usable research observation.

---

# 81. OPENING CREDIT BALANCE

Current account already contains Alert credits from previous work.

Do not blindly refill:

```text
58,900
```

on top of an existing balance.

The budget controller must track:

```text
opening_balance
pre_run_spend
new_refill_units
protected_floor
phase6_start_balance
phase6_external_spend
```

and enforce Phase-6 maximum independently of total balance.

---

# 82. MANIFEST AND BILLING-CYCLE RULE

If the run crosses a monthly quota reset, do not silently use fresh units to
expand the scientific budget.

The experiment's resource ceiling remains the predeclared ceiling.

Any later-cycle units may only be used under an explicitly frozen maintenance/
REST policy that does not expand treatment exposure.

---

# 83. IMPLEMENTATION LOG VERSIONING

Resolve current f.8/f.9 ambiguity.

If f.9 modified only the Log:

```text
binding_plan_version = f.8
log_revision = f.9-log
```

If a normative new patch is now applied to PART 1, advance only the V3.9-f.*
patch suffix according to repository history.

Do not create `V3.10`.

All current status fields must agree.

---

# 84. FALSE CANARY PASS

Historical truth remains:

```text
rl9
C_external = 1
C_internal = 0
delivery_failures = 1
stored = 0
FAIL
```

Correct TEST-001 and every current table that implies it passed.

A code fix does not retroactively change the run.

The new live canary, when authorized, receives a new RUN/GATE ID.

---

# 85. STATUS OVERCLAIMS

Search current Plan + Log for:

```text
all implemented
all verified
DONE
PASS
LIVE
FROZEN
complete
```

Validate each one against code/test/run evidence.

Correct statements such as:

```text
All of these are implemented
```

when FIDS/history/weather/adaptation/snapshots remain stubs.

---

# 86. OFFICIAL EXECUTION ORDER

Create ONE authoritative order.

Use:

```text
1. closure audit + repository truth
2. provider-contract corrections
3. specification normalization
4. implement missing Phase-6-critical B code
5. unit/integration tests
6. freeze traffic/reference sources
7. freeze region mapping
8. rebuild final frame
9. Gate 0
10. Gate 1 on FINAL frame
11. pre-probe smoke canary if required/authorized
12. Gate 2 Stage 1
13. Gate 2 Stage 2 + anchor lock
14. official Gate 3 canary
15. dedicated Gate 0.5 pilot
16. Gate 4 safety verification
17. Gate 5 population validation
18. history/weather readiness
19. freeze complete calendar
20. freeze split-assignment rule
21. write final manifest
22. lexical/contradiction preflight
23. explicit human Phase-6 authorization
24. Phase 6
```

Do not run a real probe using the provisional old frame.

---

# 87. SMOKE CANARY VS OFFICIAL GATE 3

Use distinct terminology:

```text
PRE-PROBE SMOKE CANARY
```

= small safety check before paid probes.

```text
GATE-3 OFFICIAL CANARY
```

= official reconciliation gate after Gate 2 under the final configuration.

Do not record the smoke test as Gate 3.

---

# 88. IMPLEMENT THE CURRENTLY STUBBED COMPONENTS

Repository audit must verify and implement where still missing:

```text
FIDS client/population ingestion
FIDS cost ledger
FIDS DST handling
canonical physical flight identity
codeshare uncertainty
raw ingest provenance
four/five timestamp wiring
payload SHA
flight outcome acquisition
target-specific labels
snapshot builder
historical feature store
history bootstrap/readiness
weather observation store
weather forecast store
REGIONAL m_i
zero-yield FSM
positive-probability/coverage mechanism
adaptive state history
T24 scheduler
calendar materializer
split-rule generator
preflight scanner
```

Do not mark any of them IMPLEMENTED based on a stub file.

---

# 89. TEST SUITE — MINIMUM REQUIRED

Create/execute at least:

```text
PROVIDER CONTRACT
TEST-OPENAPI-PIN
TEST-FIDS-ENDPOINT
TEST-FIDS-PARAMS
TEST-FIDS-WITHLEG
TEST-FIDS-CANCELLED-UNCERTAIN
TEST-FIDS-CODESHARE-UNKNOWN
TEST-FIDS-PLAN-MAX-RANGE

TIME / FIDS
TEST-FIDS-DST-SPRING
TEST-FIDS-DST-FALL
TEST-FIDS-DST-SOUTHERN
TEST-FIDS-LOCAL-MIDNIGHT
TEST-FIDS-SERVICE-WINDOW-VS-CUTOFF
TEST-FIDS-BOUNDARY-DEDUPE
TEST-FIDS-BUDGET
TEST-FIDS-RATE-LIMIT
TEST-FIDS-429
TEST-FIDS-RETRY-BUDGET

IDENTITY
TEST-FLIGHT-ID-NO-PROVIDER-ID
TEST-CODESHARE-RESOLVED
TEST-CODESHARE-UNKNOWN
TEST-RETIME-UNDER-2H
TEST-RETIME-OVER-2H
TEST-RETIME-PARENT-CHILD
TEST-DIVERSION-ID
TEST-NOTIFICATION-ID-NOT-FLIGHT-ID

PROVENANCE
TEST-RAW-FIRST
TEST-RAW-SURVIVES-PARSER-FAIL
TEST-MULTI-ITEM-NOTIFICATION
TEST-NOTIFICATION-RETRY-ID
TEST-RESEARCH-KEY-COLLISION
TEST-AVAILABLE-AT-CUTOFF
TEST-STATE-UPDATED-VS-NOTIFICATION-TIME
TEST-LOCATION-REPORTED-TIME
TEST-PAYLOAD-SHA

SNAPSHOTS / TARGETS
TEST-SNAPSHOT-MISSING-OPTIONAL-FEATURE
TEST-SNAPSHOT-NO-WEBHOOK
TEST-SNAPSHOT-HORIZON-INELIGIBLE
TEST-MILESTONE-UNVERIFIED
TEST-ACTUAL-VS-ESTIMATED-TIME
TEST-T-SELECTION
TEST-PRIMARY-TARGET-SELECTION
TEST-TARGET-SPECIFIC-LABELS

OUTCOMES
TEST-CANCELED-UNCERTAIN
TEST-DIVERTED-WITH-LANDING-LABEL
TEST-WHEELSON-SEEN-GATEIN-MISSING
TEST-OUTCOME-AFTER-WINDOW
TEST-OUTCOME-ACQUISITION-COST
TEST-GRACE-NOT-EARLY

HISTORY / WEATHER
TEST-HISTORY-ASOF
TEST-HISTORY-STORE-READY
TEST-HISTORY-ROW-INCOMPLETE
TEST-HISTORY-IMMUTABLE-VERSION
TEST-WEATHER-TAF-AMENDMENT
TEST-ERA5-NOT-OPERATIONAL-LEAK

SAMPLING
TEST-REGION-ONE-MAPPING
TEST-ANCHOR-HUB-ELIGIBILITY
TEST-TRAFFIC-SCORE-NONDEGENERATE
TEST-ANCHOR-NORMALIZATION
TEST-PROBE-CAP-VS-DURATION
TEST-STAGE2-FAILURE-REPLACEMENT
TEST-MI-EMA
TEST-ZERO-YIELD-FSM
TEST-POSITIVE-PROBABILITY-FLOOR
TEST-ADAPTIVE-INITIAL-STATE
TEST-DETERMINISTIC-REPLAY

CROSSOVER / CALENDAR
TEST-2X2-SEGMENTS
TEST-PARENT-CHILD-BATCH
TEST-CALENDAR-CONSTRAINT-SAT
TEST-UTC-6DAY-CONSTRAINT
TEST-CROSSOVER-TIMECLASS
TEST-CROSSOVER-WEEKDAY
TEST-CROSSOVER-WASHOUT
TEST-CROSSOVER-RANDOMIZATION-UNIT
TEST-T24-LEAD-TIME
TEST-CALENDAR-HASH-REPLAY

CREDITS
TEST-CANARY-EXACT
TEST-SOFT-STOP-SCALED
TEST-BALANCE-POLLING
TEST-DELIVERY-FAILURE-PAUSE
TEST-OPENING-BALANCE-ACCOUNTING
TEST-PRE-RUN-BUDGET
TEST-PHASE6-RUN-TOTAL-CEILING

EVALUATION
TEST-SPLIT-RULE-HASH
TEST-CROSS-BOUNDARY-EVENT
TEST-FINAL-TEST-PROTECTION
TEST-ROLLING-FOLD-NO-TUNING-TEST-LEAK
TEST-POST-SAME-FLIGHT-PARTITION
TEST-RETIME-LINEAGE-PARTITION

MIGRATIONS
TEST-FRESH-DB
TEST-EXISTING-DB
TEST-RERUN-IDEMPOTENCY
```

Every test record must include:

```text
test ID
requirement
file/function
fixture
expected
observed
exit code
Git SHA
status
artifact
```

A TODO test counts as BLOCKED, never PASS.

---

# 90. IMPLEMENTATION_LOG MUST BECOME A REAL EXECUTION MANUAL

Do not merely describe what should someday be logged.

For every modification made during this closure pass create a real:

```text
LOG-YYYYMMDD-###
```

entry.

Each important requirement should show:

```text
requirement
reason
Plan section
old behavior
new behavior
file path
function
schema/table
migration
configuration
API endpoint
inputs
outputs
timestamps
randomness
cost
failure behavior
recovery
tests
test result
live verification
Git SHA
status
next dependency
```

---

# 91. INLINE CURRENT CONFIG REGISTRY

Do not delegate the current registry to an old file.

For every active variable:

```text
name
purpose
type
default
safe default
required?
secret?
producer
consumer
phase
gate
failure behavior
```

Never print secret values.

---

# 92. COMPLETE DATA DICTIONARY

Verify all current tables and columns against actual migrations.

Especially audit:

```text
raw webhook tables
flight_events
flight_state
flight_population
population provenance
flight_snapshots
flight_outcomes
raw_airborne_events
clean_airborne_points
flight_trajectory
flight_airborne_snapshots
historical_feature_store
weather_observation
weather_forecast
sampling frame
adaptive state/history
manifest
split metadata
```

Never document a column as existing because the Plan wishes it existed.

---

# 93. DATA LINEAGE

Document every hop:

```text
provider coverage
→ external reference data
→ final frame
→ materialized calendar/template
→ T24/T6/T90 FIDS observations
→ raw FIDS query records
→ canonical population membership
→ Flight Alert raw delivery
→ raw item
→ semantic flight event
→ current state
→ airborne points
→ trajectory
→ historical/weather joins
→ PRE snapshot
→ AIRBORNE snapshot
→ outcome acquisition
→ target labels
→ split assignment
→ model datasets
→ models
→ evaluation
```

For every arrow record:

```text
producer
consumer
join key
source timestamp
available_at
provenance/hash
failure behavior
```

---

# 94. REQUIREMENT → CODE → TEST → EVIDENCE MATRIX

For every Phase-6-critical requirement require:

```text
SPEC
CODE
TEST
EVIDENCE
```

Example:

```text
FIDS provider population
SPEC       PASS
CODE       PASS
TEST       PASS
LIVE       PENDING
=> overall BLOCKED
```

Nothing becomes GO from documentation alone.

---

# 95. MACHINE-GENERATED CONTRADICTION SCAN

Create a script, e.g.:

```text
scripts/v39_preflight_consistency.ts
```

that checks the canonical registry against current docs/config where feasible.

Also lexical-scan current normative sections for:

```text
TBD
TODO
proposal
candidate
preferred
~
or
may
scheduled_gate_out
wheels_off
60m
919
899
4053
r_i
f.7
f.8
f.9
all implemented
all verified
materialize test rows
true census
same calendar date
conformal interval
P(delay
```

Do not blindly fail every match.

Classify every result:

```text
VALID FINAL
MEASURE→FREEZE
DEFERRED
HISTORICAL/SUPERSEDED
CURRENT CONTRADICTION
```

The final required value is:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0
```

---

# 96. FINAL MANIFEST

Only after required gates/evidence exist, write and hash the manifest.

Include at minimum:

```text
plan version
log revision
Git SHA
migration hash
OpenAPI version/hash
provider docs date
marketplace
plan
billing cycle
rate limit
data-retention terms

opening Alert balance
pre-run Alert spend
Phase6 credit ceiling
protected floor
REST/FIDS ceiling

traffic source/metric/period/hash
tier cuts
region map/hash
reference-data hash
frame hash

calendar start date
calendar hash
UTC schedule seed
window-shape assignments
2x2h definition
crossover randomization unit
crossover seed

anchor shortlist
anchor score version
normalization version
probe protocol
anchor pool/hash

FIDS protocol/hash
FIDS plan max range
FIDS unit model
outcome acquisition protocol

selected T
T semantics
milestone mapping version
selected primary target

flight identity version
codeshare policy
retime policy
retime-lineage policy

timestamp schema
raw-ingest version
snapshot builder version

grace
Gate0.5 sample evidence
airborne cadence thresholds

adaptive version/state hash
zero-yield version
coverage mechanism

history store version
history_store_ready_at
historical feature sources
weather version

primary claim
metric definition
split-rule version/hash
cross-boundary rule
deferred-analysis deadlines
```

---

# 97. FINAL PHASE-6 GO CHECKLIST

Do NOT declare Phase 6 GO unless ALL are true:

```text
[ ] repository inspected at current Git SHA
[ ] current provider OpenAPI pinned
[ ] provider-contract mismatches corrected
[ ] current-current contradictions = 0
[ ] versioning normalized

[ ] exact account plan verified
[ ] billing cycle verified
[ ] opening Alert balance accounted
[ ] pre-run Alert budget accounted
[ ] REST/FIDS budget protected
[ ] provider rate limit implemented
[ ] data-retention rights verified

[ ] traffic source/metric/period frozen
[ ] region mapping frozen
[ ] external reference dataset frozen
[ ] frame rebuilt
[ ] frame hash recorded

[ ] FIDS client implemented
[ ] cutoff vs service-window distinction implemented
[ ] FIDS actual plan range verified
[ ] DST behavior verified
[ ] boundary/dedup behavior verified
[ ] population/context distinction implemented

[ ] provider-native movement fields preserved
[ ] no invented actualTime mapping remains
[ ] selected T scientifically constructible
[ ] selected primary target scientifically constructible

[ ] physical flight identity implemented/tested
[ ] codeshare Unknown handled
[ ] retime lineage fully defined

[ ] CanceledUncertain handled
[ ] operational state separated from label state
[ ] outcome acquisition after alert-window deletion implemented
[ ] outcome acquisition cost protected

[ ] raw envelope persisted first
[ ] raw item identity implemented
[ ] timestamps separated correctly
[ ] available_at wired
[ ] payload hashes wired

[ ] snapshot existence rule correct
[ ] historical store implemented
[ ] historical actual-delay sources proven
[ ] history readiness achieved
[ ] weather store implemented
[ ] retrospective reanalysis cannot leak

[ ] chain denominator corrected
[ ] midnight rotation tested

[ ] m_i exact recurrence implemented
[ ] zero-yield FSM implemented
[ ] positive-probability claim named correctly
[ ] adaptive initial state frozen

[ ] probe cost protocol feasible
[ ] Stage1/Stage2 rules frozen
[ ] anchor traffic score nondegenerate
[ ] all anchor normalizations defined

[ ] exact 2x2h treatment frozen
[ ] parent/child window representation implemented
[ ] crossover constraints satisfiable
[ ] crossover randomized unit correct
[ ] full 31-day calendar materialized/hash frozen
[ ] T24 lead times satisfiable

[ ] primary target names milestone-specific
[ ] conformal contradiction removed
[ ] frozen/deferred analysis statuses consistent
[ ] protected final test cannot influence tuning
[ ] boundary-spanning event rule frozen
[ ] marginal-value claims match actual randomized treatments

[ ] historical rl9 remains FAIL
[ ] new smoke canary PASS if required
[ ] Gate0 PASS
[ ] Gate1 PASS on FINAL frame
[ ] Gate2 PASS
[ ] official Gate3 PASS
[ ] Gate0.5 PASS on adequate sample
[ ] Gate4 PASS
[ ] Gate5 PASS

[ ] unresolved Phase6-critical B = 0
[ ] required pre-run C = 0
[ ] Phase6-critical blocked tests = 0
[ ] unverified provider assumptions affecting Phase6 = 0
[ ] manifest written + hashed
[ ] preflight consistency PASS

[ ] ADB_AUTO_COLLECT remains false until explicit human authorization
```

If ANY required item is false:

```text
PHASE 6 = NO-GO
```

---

# 98. CLOSURE RULE — THIS ENDS THE DESIGN-AUDIT LOOP

When all of the following equal zero/pass:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0

UNRESOLVED_PHASE6_B = 0

UNFROZEN_REQUIRED_PRE_RUN_C = 0

PHASE6_CRITICAL_BLOCKED_TESTS = 0

UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = 0

GATES_0_1_2_3_0.5_4_5 = PASS

MANIFEST = FROZEN
```

the architecture/specification is CLOSED.

After that, DO NOT perform another broad theoretical redesign.

A specification may be reopened ONLY because of new concrete evidence:

```text
1. executable test failure;
2. provider-contract/API change;
3. demonstrated information leakage;
4. demonstrated accounting/budget violation;
5. implementation impossibility;
6. actual data showing a required operational assumption cannot function;
7. legal/provider-retention restriction.
```

The following are NOT reopening criteria:

```text
another model has a different preference;
another reviewer would choose another weight;
a reviewer thinks another architecture might be nicer;
a new optional analysis idea appears.
```

Those become future-version research ideas, not changes to frozen V3.9.

---

# 99. REQUIRED FINAL RESPONSE FROM THE AGENT

Return these sections:

## A. Executive closure verdict

```text
Architecture:
Provider-contract compatibility:
Specification consistency:
Repository implementation:
Unit tests:
Integration tests:
Live verification:
Budget safety:
Frame:
Calendar:
Outcome acquisition:
Manifest:
Gates:
Phase 6:
```

## B. Complete defect register

For every issue addressed:

```text
ID
original contradiction/defect
confirmed?
evidence
resolution
Plan change
Log change
code change
migration
test
status
```

## C. Canonical Rule Registry summary

Print every canonical rule and hash.

## D. Provider contract audit

Show:

```text
OpenAPI version/hash
provider field
old assumption
current documented behavior
code/spec resolution
verification status
```

## E. Repository implementation table

```text
requirement
file:function
before
after
tests
status
```

## F. Remaining blockers

Explicitly print:

```text
CURRENT_CURRENT_CONTRADICTIONS =
UNRESOLVED_PHASE6_B =
UNFROZEN_REQUIRED_PRE_RUN_C =
PHASE6_CRITICAL_BLOCKED_TESTS =
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 =
MANIFEST_MISSING_FIELDS =
```

## G. Evidence

Include:

```text
Git SHA
git diff summary
migration output
test commands
test exit codes
PASS/FAIL counts
provider OpenAPI hash
frame counts/hash
calendar hash
budget proof
manifest hash if frozen
```

## H. Exact next permitted human action

Give ONE next action based on achieved state.

Do not tell the human to run probes if prerequisites are not complete.

Do not tell the human to start Phase 6 unless every GO condition is satisfied.

---

# FINAL INSTRUCTION

Do not optimize for making the project look complete.

Optimize for making every statement TRUE.

Examples:

```text
BLOCKED — provider cannot distinguish this milestone
```

is a valid and preferable outcome.

```text
IMPLEMENTED — live verification pending
```

is preferable to an unsupported PASS.

```text
NO-GO — crossover constraints are unsatisfiable
```

is preferable to silently violating randomization.

Do not invent provider fields.

Do not invent traffic/reference data.

Do not rewrite historical failures.

Do not use future information.

Do not exceed the declared resource budget.

Do not start Phase 6.

Finish the finite closure work, prove zero current contradictions, and then stop redesigning V3.9.

This is the prompt I would use now. It includes the earlier findings **and** the additional contradictions uncovered by the full cross-reference/provider-contract pass.

The key change is that after this, I would **not ask another AI “please review my plan and see if you can find something.”** That question has no natural endpoint. Instead, have the agent execute this prompt and produce the canonical registry, diff, tests, provider audit, and zero-contradiction report. Then bring **that evidence** back and the next review should be binary: *did it satisfy this closed requirement set or not?* That is how you finally move from weeks of planning into implementation without letting another reviewer casually create a new design cycle.

[1]: https://aerodatabox.com/api-spec "https://aerodatabox.com/api-spec"
[2]: https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json "https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json"
[3]: https://aerodatabox.com/flight-alert-api-2026/ "https://aerodatabox.com/flight-alert-api-2026/"
[4]: https://docs.unidata.ucar.edu/ldm/current/ "https://docs.unidata.ucar.edu/ldm/current/"
[5]: https://aviationweather.gov/data/api/ "https://aviationweather.gov/data/api/"
