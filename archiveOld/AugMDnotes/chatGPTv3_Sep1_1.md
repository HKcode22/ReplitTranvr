I did a deeper full-file pass again rather than relying on my earlier shorter list. The answer is **no: the latest Plan/Log are not yet a completed implementation of the large closure prompt**. They contain many of its corrections, but they still contain current-current contradictions, stale implementation descriptions, blocked tests, stubs, and values that have not been measured/frozen. The Log explicitly records the A31 update as documentation-only with no code/test/migration diff, so a documentation change cannot be counted as implementation. 

I also do **not** want to tell you “100% nothing else can possibly exist,” because only executing and testing the actual repository can reveal implementation-specific bugs that two Markdown documents cannot expose. But within the scope we can close objectively—the **entire current PART 1, the entire current non-archived Implementation Log, the fixed requirements from my previous closure prompt, your new canonical registry, and the current official AeroDataBox contract**—the prompt below is my complete finite remediation checklist. It is specifically written so Mimo cannot simply update documentation and say “done.”

Copy the entire prompt below to Mimo.

# FINAL V3.9 REPOSITORY CLOSURE, IMPLEMENTATION, TESTING, CONSISTENCY, AND PRE-PHASE-6 PROMPT

## 0. YOUR ROLE

You are performing the **FINAL IMPLEMENTATION CLOSURE** of an existing aviation research data-collection system named **V3.9**.

This is NOT another architecture review.

This is NOT a request for V3.10.

This is NOT a request to brainstorm alternative experimental designs.

Your job is to:

1. inspect the actual repository;
2. inspect the actual database schema/migrations;
3. inspect the complete current `V3.9_DataCollectPlan.md` PART 1;
4. inspect the complete current `IMPLEMENTATION_LOG.md`, excluding explicitly archived/superseded history when determining current truth;
5. inspect the current canonical-rule registry;
6. verify current official provider contracts;
7. identify every remaining mismatch against the finite requirements in this prompt;
8. correct the specification where it is internally inconsistent;
9. implement every Phase-6-critical missing code path that can be implemented without paid live execution;
10. add/update migrations where genuinely required;
11. implement all required tests;
12. run all safe/offline tests;
13. update the Implementation Log with **actual evidence**, not aspirational prose;
14. produce the corrected canonical registry;
15. produce a full Requirement → Code → Test → Evidence matrix;
16. produce a contradiction matrix;
17. leave anything requiring live provider/account evidence explicitly `BLOCKED` or `MEASURE→FREEZE`;
18. NEVER fabricate PASS evidence;
19. keep collection disabled;
20. stop once the objective closure criteria at the end of this prompt are satisfied.

The stable V3.9 architecture is **LOCKED**.

Do not redesign it unless you find:

* an implementation impossibility;
* a current provider contract that makes an existing binding requirement impossible;
* a demonstrated information-leakage bug;
* a demonstrated quota/accounting impossibility;
* a legal/provider-retention restriction;
* a failing executable test proving the rule cannot work.

If one of those occurs, document it as a blocker. Do NOT silently invent a new architecture.

---

# 1. ABSOLUTE SAFETY RULES

These rules override convenience.

## 1.1 Collection safety

Keep:

```text
ADB_AUTO_COLLECT=false
```

throughout this task.

Do NOT start Phase 6.

Do NOT enable automatic collection.

Do NOT initiate the 31-day run.

Do NOT run paid Stage-1 or Stage-2 probes merely to test code.

Do NOT perform large Alert-credit expenditure.

Do NOT refill balances except under explicit human authorization.

Do NOT run a live Gate-4 test that intentionally spends approximately 1,850 credits.

Safe offline/unit/integration tests are expected.

A small live action may only occur when the human explicitly authorizes that exact live action.

---

## 1.2 Repository safety

Before changing anything, record:

```bash
git status
git branch --show-current
git rev-parse HEAD
git log --oneline -10
```

Also inventory:

* migrations;
* package scripts;
* config files;
* test files;
* database schemas;
* collection controllers;
* FIDS clients;
* webhook handlers;
* snapshot builders;
* history/weather code;
* evaluation code;
* manifest code.

Do not delete history.

Do not rewrite unrelated code.

Do not silently fix unrelated baseline type/lint failures.

Do not push or merge unless the human explicitly requests it.

---

# 2. SOURCE-OF-TRUTH HIERARCHY

Use this hierarchy.

## 2.1 Provider facts

For AeroDataBox API semantics:

1. current official AeroDataBox OpenAPI for the user's actual marketplace;
2. current official AeroDataBox Flight Alert documentation;
3. live account/API evidence where required;
4. then Plan prose.

If the current provider contract contradicts the Plan, the provider contract wins for factual API behavior and the Plan must be corrected.

As of the audit that generated this prompt, the RapidAPI OpenAPI was:

```text
AeroDataBox API version: 1.15.3.0
```

Re-download it yourself during this task and calculate:

```text
openapi_sha256
openapi_retrieved_at_utc
openapi_version
marketplace
```

Do not assume version 1.15.3.0 if the provider has changed since this prompt.

---

## 2.2 Scientific/project rules

For the research design:

1. corrected canonical registry after this task;
2. `V3.9_DataCollectPlan.md` PART 1;
3. current non-archived `IMPLEMENTATION_LOG.md`;
4. old history/adjudication files only as historical evidence.

PART 2/PART 3 and archived Log sections cannot silently override current PART 1.

---

## 2.3 Actual implementation truth

For implementation status:

```text
actual repository code
+ migrations
+ schema
+ executable tests
+ command output
+ live evidence where applicable
```

wins over documentation claims.

A sentence saying “implemented” is not proof.

---

# 3. STATUS VOCABULARY — USE EXACTLY

Use these statuses consistently:

```text
DOCUMENTED
IMPLEMENTED
UNIT-TESTED
INTEGRATION-TESTED
LIVE-VERIFIED
FROZEN
BLOCKED
DEFERRED
SUPERSEDED
```

Meanings:

### DOCUMENTED

Rule exists in the current normative specification.

### IMPLEMENTED

Executable code exists and is wired into the real production path.

A stub does NOT count.

### UNIT-TESTED

Relevant isolated test passes.

### INTEGRATION-TESTED

Relevant multi-component test passes.

### LIVE-VERIFIED

Real provider/DB/account behavior was observed.

### FROZEN

The relevant pre-run value is written into the frozen manifest/canonical registry and no longer changes based on Phase-6 outcomes.

### BLOCKED

Required dependency/evidence is unavailable or failing.

### DEFERRED

Explicitly permitted downstream task with a defined deadline.

### SUPERSEDED

Historical rule retained only for provenance.

Never equate:

```text
DOCUMENTED = IMPLEMENTED
IMPLEMENTED = TESTED
TESTED = LIVE-VERIFIED
LIVE-VERIFIED = FROZEN
```

They are separate states.

---

# 4. CURRENT HIGH-LEVEL PROJECT STATE

Treat these as hypotheses to verify against the repository:

* architecture: LOCKED;
* Phase 6: NOT STARTED;
* `ADB_AUTO_COLLECT=false`;
* final frame: not frozen;
* traffic reference: not frozen;
* region mapping: not frozen in manifest;
* FIDS fetcher: currently reported as STUB;
* historical store: currently reported as STUB;
* weather store: partial/stub;
* `m_i`: currently reported as STUB;
* `available_at`: partially wired/pending;
* canonical flight identity: partial implementation/wiring pending;
* manifest: not written/frozen;
* many tests: BLOCKED;
* Gates 0/1/2/3/0.5/4/5: not all final PASS;
* Phase 6: NO-GO.

Verify every statement.

Do not trust the summary if repo evidence differs.

---

# 5. FIRST TASK — COMPLETE REPOSITORY TRUTH AUDIT

Before modifying anything, create a repository-truth table.

For EVERY Phase-6-critical component record:

```text
requirement_id
component
file_path
function/class/module
schema/table/column
migration
config variables
current implementation status
test file
test status
live-verification status
current blocker
evidence
```

At minimum inventory:

* collection controller;
* sampling-frame builder;
* region mapper;
* traffic-tier builder;
* AeroDataBox REST/FIDS client;
* FIDS census/population builder;
* webhook HTTP ingress;
* raw envelope persistence;
* raw-item persistence;
* semantic event extractor;
* current flight state;
* airborne event store;
* trajectory builder;
* snapshot builder;
* historical-feature store;
* weather ingestion/store;
* flight-instance canonicalizer;
* codeshare resolution;
* retime logic;
* route/tail chain logic;
* outcome finalization;
* balance/reconciliation;
* daily-cap watchdog;
* anchor probe;
* adaptive REGIONAL selection;
* crossover/calendar generator;
* Gate 0;
* Gate 1;
* Gate 2;
* Gate 3;
* Gate 0.5;
* Gate 4;
* Gate 5;
* manifest writer;
* split-rule generator;
* evaluation code;
* consistency/preflight scanner.

Do not use approximate statements such as:

```text
probably implemented
mostly implemented
seems fixed
```

Inspect the code.

---

# 6. FIX THE CANONICAL RULE REGISTRY

The currently supplied canonical registry is NOT yet closure-ready.

## 6.1 Version fields

Do NOT use:

```text
version: V3.9-f.8-log
```

as if Plan and Log share one revision.

Use separate metadata:

```yaml
binding_plan_version: "V3.9-f.8"
implementation_log_revision: "f.9-log"
registry_version: "<new registry revision>"
created_at_utc: "<timestamp>"
```

---

## 6.2 Registry completeness

The registry currently says rules absent from it are nonbinding.

That is unsafe until the registry contains ALL binding Phase-6 rules.

Therefore either:

### Option A — preferred

Expand the registry so every binding Phase-6 rule has an entry.

OR:

### temporary transition only

change the meta wording to:

```text
The registry is authoritative only for rules represented here.
Until completeness validation passes, PART 1 remains authoritative
for binding rules not yet represented.
```

Then once completeness = 100%, the registry may become the sole machine-readable binding reference.

Do not silently make important PART-1 rules nonbinding by omission.

---

## 6.3 Every registry entry must contain

```yaml
id:
plan_section:
status:
value:
source:
freeze_deadline:
implementation_requirement:
test_requirement:
manifest_field:
notes:
```

Add when useful:

```yaml
provider_contract_ref:
depends_on:
supersedes:
```

---

## 6.4 Correct registry execution order

The current registry incorrectly mixes two different freezes.

Create separate concepts:

```text
REFERENCE_FREEZE
```

for exogenous traffic/region/normalization data before frame/probe construction.

and:

```text
FINAL_MANIFEST_FREEZE
```

after Gates and measurements.

The intended sequence is approximately:

```text
repository truth
→ provider-contract correction
→ spec normalization
→ implement missing critical code
→ offline tests
→ freeze external/reference choices
→ rebuild frame
→ Gate 0
→ Gate 1
→ resolve probe feasibility
→ Gate 2 Stage 1/Stage 2
→ official Gate 3
→ dedicated Gate 0.5
→ Gate 4
→ Gate 5
→ history/weather readiness
→ materialize/freeze full 31-day calendar
→ freeze split-assignment rule
→ final manifest
→ contradiction/preflight scan
→ explicit human authorization
→ Phase 6
```

Never place Stage-1 probes after Gate-2 PASS.

Stage-1/Stage-2 create the Gate-2 evidence.

---

## 6.5 Coverage-floor contradiction

Current PART 1 already contains approximately:

```text
unseen >=20 days
coverage_floor_boost = 1.5x for one draw
```

while the supplied registry labels the threshold `MEASURE→FREEZE`.

Choose one current rule.

If the 20-day/1.5× rule is binding, put that exact rule in the registry as frozen project configuration.

If it genuinely requires measurement, remove the conflicting fixed values from normative Plan prose.

There must be exactly one current value.

---

# 7. PROVIDER-CONTRACT CORRECTIONS — MUST BE PROPAGATED INTO CODE, PLAN, LOG, TESTS

Re-pin the current official AeroDataBox contract first.

## 7.1 FIDS endpoint

Current expected contract at time of this prompt:

```text
GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}
```

The current Log repository map still describes:

```text
GET /flights/schedule
Both
12h
```

That is stale.

Correct:

* implementation;
* repository map;
* requirement matrix;
* comments;
* tests;
* Plan/Log references.

Do not merely edit the Log while leaving the code stub stale.

---

## 7.2 Direction

Use provider's actual parameter:

```text
direction = Arrival | Departure | Both
```

Do not invent:

```text
withDepartures
withArrivals
```

---

## 7.3 `withLeg`

Current provider semantics:

```text
withLeg=true
```

includes movement information for the opposite airport and replaces the single movement representation with departure+arrival movement information.

It is NOT a generic “leg-detail mode.”

Implement and test this.

Also distinguish:

```text
primary movement at requested airport
```

from:

```text
context-only opposite movement
```

The opposite-movement context must NOT automatically create another provider-population member.

Add something like:

```text
population_role =
    requested_airport_primary
    opposite_movement_context
```

or an equivalent explicit representation.

---

## 7.4 Cancellations/statuses

Preserve distinctly:

```text
Canceled
Diverted
CanceledUncertain
```

Never immediately coerce:

```text
CanceledUncertain → Canceled
```

---

## 7.5 Codeshare handling

Provider may return:

```text
Unknown
IsOperator
IsCodeshared
```

Unknown can genuinely remain ambiguous.

Implement:

```text
codeshare_resolution_status =
    resolved_operator
    resolved_marketing
    ambiguous_unknown
```

Do not claim perfect internal operating-leg dedup when status is genuinely unknown.

Record ambiguity rates.

---

## 7.6 Cargo/private/charter scope

Do not claim a population exclusion unless a current provider field/filter or external reference proves it.

Verify support for:

```text
withCargo
withPrivate
```

For charter/non-scheduled:

if the Airport FIDS contract cannot reliably identify it, do not silently claim it is excluded.

Either:

* obtain a verified source/field;
* explicitly mark scope as partially unobservable;
* or exclude those rows only where classification is known.

Document denominator consequences.

---

# 8. REMOVE STALE/INVENTED PROVIDER MILESTONE FIELDS

This is critical.

The current Plan still contains stale examples such as:

```text
movement.actualTime
departure.actualTime
arrival.actualTime
movement.scheduledTime[gateOut]
phase=gateOut
```

Do not use those unless the live/current contract genuinely supplies them.

At the time of this prompt, current movement fields include:

```text
scheduledTime
revisedTime
predictedTime
runwayTime
quality
```

Current provider semantics approximately are:

```text
scheduledTime:
  scheduled arrival or departure

revisedTime:
  actual/estimated arrival or departure;
  if runwayTime exists and differs, revisedTime stands for gate;
  otherwise it may be gate OR runway

runwayTime:
  actual/estimated landing or takeoff runway time
```

Therefore:

* do not pretend generic `scheduledTime` uniquely means scheduled gate-out;
* do not pretend generic `scheduledTime` uniquely means scheduled wheels-off;
* do not infer FAA OOOI semantics without evidence;
* do not classify a timestamp as actual solely because the field exists.

---

## 8.1 Provider-native layer

Create/preserve a provider-native movement representation first:

```text
departure.scheduledTime
departure.revisedTime
departure.predictedTime
departure.runwayTime
departure.quality

arrival.scheduledTime
arrival.revisedTime
arrival.predictedTime
arrival.runwayTime
arrival.quality
```

along with source/provenance.

---

## 8.2 FAA/ASPM alias layer

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

when exact semantic mapping is demonstrated.

Otherwise:

```text
NULL
milestone_unverified=true
milestone_verification_reason=...
```

No approximation from runway to gate.

No approximation from generic scheduled departure to scheduled wheels-off unless evidence proves that semantic.

---

## 8.3 T milestone constructibility

Current proposal contains:

```text
candidate = scheduled_gate_out
fallback = scheduled_wheels_off
```

Both may be unconstructible from current FIDS globally.

Therefore Gate 0.5 must test constructibility.

Do NOT force a fake fallback.

Allowed outcomes:

```text
candidate verified → select it
fallback verified → select it
neither verified → BLOCKED
```

If neither is constructible, stop and report the blocker.

Do not silently invent a third T without human/scientific approval.

---

## 8.4 Primary target constructibility

Same rule for:

```text
wheels_off delay
gate_out delay
```

Do not force a selected primary target unless both the scheduled baseline and observed/actual endpoint are semantically verified.

Every downstream metric name must use:

```text
selected_primary_target
```

not a stale hardcoded milestone.

---

# 9. REMOVE UNSUPPORTED PROVIDER FLIGHT-ID ASSUMPTIONS

Inspect the current FIDS response schema.

Do not assume FIDS gives a stable:

```text
flightId
flight_id
id
```

unless the current contract proves one exists for the flight item.

The notification envelope's:

```text
id
```

is a notification identifier, not a flight identifier.

Correct all logic/comments/docs that confuse these.

Canonical flight identity should be based on verified flight attributes and versioned logic.

---

# 10. FIX PREDICTION CUTOFF VS SERVICE WINDOW

The current Plan still contains stale logic equivalent to:

```text
scheduled departure ∈ [cutoff, cutoff + window)
```

This confuses two different concepts.

Store separately:

```text
prediction_cutoff_utc
service_window_start_utc
service_window_end_utc
fids_retrieved_at_utc
```

For example:

* service interval says which flights belong to the airport-window population;
* prediction cutoff says what information the model is allowed to know.

Population membership must NOT use prediction cutoff as if it were the service-window start.

Add tests proving this distinction.

---

# 11. T−24 / T−6 / T−90 ACQUISITION

T−24 must not be reconstructed retrospectively from a final schedule observed later.

Implement one permitted as-known-at-time method.

Preferred:

```text
future assignment is frozen early enough
→ actual FIDS retrieval at/near T−24
→ immutable raw response
→ population/snapshot built with information available by cutoff
```

For T−24 ensure scheduler assignments exist sufficiently early, including operational margin.

Test:

```text
assignment_created_at <= earliest_T24 - required_margin
```

If historical provider snapshots are used instead, prove they are genuinely versioned **as known at that historic moment**, not just current/final records for an old flight.

---

# 12. FIDS TIMEZONE / DST / INTERVAL BEHAVIOR

Implement robust IANA timezone conversion.

Tests must cover:

### spring-forward

nonexistent local clock times;

### fall-back

ambiguous repeated local hour;

### local → UTC normalization;

### adjacent windows;

### boundaries;

### service-window dedup.

Do not assume FIDS local-time strings can uniquely encode a repeated fall-back hour.

If necessary:

* widen the local query;
* convert returned movement times to UTC;
* deduplicate/filter using canonical UTC service interval.

Live-verify exact edge inclusivity at Gate 0.5.

Do not claim `[from,to)` provider behavior unless evidence proves it.

---

# 13. FIDS RESULT SIZE / SPLITTING

Do NOT assume:

```text
hard 500-result limit
resultTruncated flag
fixed 12-hour max
```

unless current/live account evidence proves them.

Implement a generic split strategy based on:

* account-verified max interval;
* observed provider rejection/limit;
* configurable range.

Every split call must be included in REST budget accounting.

---

# 14. TIMESTAMP TAXONOMY — NORMALIZE THE ENTIRE PLAN/LOG/CODE

There is a current contradiction.

One Plan section correctly says to preserve provider clocks separately while other sections continue using the old generic “four timestamps.”

Create ONE canonical model.

At minimum preserve:

```text
notification_id
provider_notification_generated_utc
delivery_attempt_seq_no
delivery_attempt_utc
provider_state_updated_utc
location_reported_utc        nullable
received_timestamp_utc
raw_persisted_at_utc
available_at                 or information_available_timestamp
timestamp_source
```

Where applicable also preserve:

```text
source_effective_time
fids_retrieved_at_utc
```

---

## 14.1 Definitions

### `provider_notification_generated_utc`

Provider notification envelope `timestampUtc`.

### `delivery_attempt_utc`

Provider delivery-attempt `timestampUtc`.

### `provider_state_updated_utc`

Flight item `lastUpdatedUtc`.

### `location_reported_utc`

Location `reportedAtUtc`.

Nullable for non-location events.

### `received_timestamp_utc`

When our HTTP endpoint received the request.

### `raw_persisted_at_utc`

When durable immutable persistence completed.

### `available_at`

Earliest time our research pipeline could actually use the information, according to the frozen availability rule.

---

## 14.2 Never do this

Do not automatically define:

```text
lastUpdatedUtc == provider_published_utc
```

while another section says that interpretation is invalid.

Either remove generic `provider_published_utc` or define it unambiguously.

---

## 14.3 Non-location events

A non-location state change can legitimately lack:

```text
location_reported_utc
```

Therefore a location-style occurrence timestamp cannot be NOT NULL for every event.

Do NOT replace an unknown provider occurrence time with receipt time without:

```text
timestamp_source='received'
```

or equivalent.

---

## 14.4 Leakage rule

Snapshot feature eligibility uses:

```text
information_available_timestamp <= prediction_cutoff
```

not merely source occurrence time.

A provider report that claims an event occurred before cutoff but did not become available until after cutoff cannot enter the snapshot.

Implement direct tests.

---

# 15. RAW INGRESS / IMMUTABILITY — NORMALIZE THE DATA MODEL

Current docs conflate immutable delivery records with processing outcomes.

Use distinct layers.

Recommended conceptual structure:

## 15.1 `raw_delivery`

Immutable:

```text
notification_id
subscription_id
delivery_attempt_seq_no
delivery_attempt_timestamp
provider_notification_timestamp
raw_payload
raw_payload_sha256
received_timestamp
raw_persisted_at
provider_attempt_cost_credits
```

No semantic parsing required before this succeeds.

---

## 15.2 `raw_delivery_item`

Immutable one row per flight item:

```text
raw_delivery_id
item_index
raw_item_json
raw_item_sha256
```

Identity approximately:

```text
(notification_id, delivery_attempt_seq_no, item_index, subscription_id)
```

or equivalent stable key.

---

## 15.3 `processing_attempt`

Append-only:

```text
raw_delivery_id
processor_version
started_at
finished_at
status
rows_inserted
rows_updated
rows_skipped
error
```

These values must NOT be retroactively inserted into an allegedly immutable raw-delivery record if the processing had not happened yet.

---

## 15.4 `flight_events`

Append-only semantic observations.

---

## 15.5 `flight_state`

Mutable operational current state.

---

# 16. DURABLE RAW PERSISTENCE BEFORE ACKNOWLEDGEMENT

Inspect current HTTP path.

The Log currently says effectively:

```text
2xx always
```

That is not sufficient.

Required behavior:

```text
receive HTTP request
→ minimal validation/security
→ durably persist immutable raw envelope
→ only then return successful 2xx
→ parse/process asynchronously or afterward
```

If raw persistence fails, do not falsely acknowledge successful durable receipt.

Keep response within provider timing requirements.

Heavy transformations must not block the webhook unnecessarily.

Implement failure-injection tests:

1. raw DB unavailable;
2. raw insert fails;
3. parser throws;
4. semantic-event insert fails;
5. state update fails.

Expected:

* raw persistence failure → no false success;
* parser/state failure after durable raw → raw remains recoverable and processing attempt records failure.

---

# 17. EVENT IDENTITIES

Do not use only:

```text
flight + carrier + locReportedUtc
```

as the universal research event key.

That fails for:

* non-location updates;
* two updates sharing a timestamp;
* schedule changes;
* status changes;
* retries.

Separate:

```text
raw delivery identity
raw item identity
semantic observation identity
canonical flight-instance identity
```

Test each.

---

# 18. PROVIDER NOTIFICATION BALANCE / COST FIELDS

Preserve:

```text
deliveryAttempt.seqNo
deliveryAttempt.costCredits
deliveryAttempt.timestampUtc
```

The notification envelope's balance field can represent expected/pre-send values.

Do not use it as final authoritative balance reconciliation.

Final authoritative balance evidence comes from:

```text
GET /subscriptions/balance
```

after settlement.

---

# 19. FLIGHT INSTANCE / CODESHARE / RETIME

Implement and test canonical identity.

The canonical key cannot hardcode:

```text
scheduled_gate_out
```

if selected T is not yet verified.

Use the frozen/selected identity milestone or provider-native identity rule.

---

## 19.1 Codeshares

Same physical operating leg must not become multiple core population rows merely because multiple marketing flight numbers are returned.

But ambiguous provider status must remain:

```text
ambiguous_unknown
```

rather than falsely forced.

---

## 19.2 Cross-airport duplicate appearance

If both origin and destination airports happen to be selected/queried, the same physical flight may appear multiple times.

Implement dedup/linking while preserving observation provenance.

---

## 19.3 Retimes

Define exact behavior for a substantial schedule retime:

```text
retime_parent_id
retime_root_id
retime_version
```

or equivalent.

Freeze:

* when retime remains same research flight;
* when it creates a child/new service instance;
* which population denominator each belongs to;
* how evaluation groups parent/child.

Parent and child must not leak across train/test partitions.

---

# 20. POPULATION / SNAPSHOT RULE

The canonical rule must remain:

```text
snapshot_exists
=
population_member_at_cutoff
AND
horizon_eligible
```

Feature availability does NOT determine whether the row exists.

Optional missing features become:

```text
NULL
feature_missing=true
```

They do not delete the snapshot.

No post-cutoff event may determine whether a PRE snapshot exists.

Post-cutoff events may supply labels/outcomes only.

Implement unit/integration tests.

---

# 21. PRE VS AIRBORNE

Maintain two distinct prediction states.

Do not collapse them into one row.

### PRE

Cutoff-based snapshot.

### AIRBORNE/POST

Observation-time snapshot.

An event itself is not the same as a prediction-state snapshot.

Raw events should not carry derived `prediction_state` as if it were provider data.

---

# 22. POST DENOMINATOR

Define primary POST denominator explicitly.

POST-only REGIONAL data may remain auxiliary if it lacks provider-population FIDS eligibility.

Do not make denominator-based population claims using those rows.

If AIRBORNE eligibility currently requires:

```text
actual_wheels_off <= t < actual_wheels_on
```

but exact actual milestones are unavailable from provider semantics, replace this with a verified provider-native airborne-evidence rule or leave it BLOCKED.

Do not invent actual wheels-off.

---

# 23. OUTCOME STATE MODEL — SEPARATE TWO DIMENSIONS

Current five-state description mixes operational status and target observability.

Separate:

## 23.1 Flight operational state

Examples:

```text
expected
departed
arrived
canceled
canceled_uncertain
diverted
unknown
```

---

## 23.2 Per-target label status

For each target:

```text
pending
observed
censored
missing
not_applicable
```

A diverted flight can still have an observed landing time.

A flight can have:

```text
wheels_on observed
gate_in missing
```

Those are not mutually exclusive.

---

## 23.3 Replace ambiguous `active_censored`

Do not use the same term for:

* still waiting before grace expires;
* final post-grace censoring.

Use a clear transient state such as:

```text
pending_outcome
```

and a separate final censoring/missing state.

---

# 24. TERMINAL OUTCOME ACQUISITION AFTER ALERT WINDOW

This is a major operational requirement.

Deleting/stopping a subscription may occur before:

* landing;
* gate-in;
* final diversion status.

Therefore define a real, budgeted terminal-outcome protocol.

Do NOT refer vaguely to PRE horizons T−24/T−6/T−90 as if they are a post-flight outcome schedule.

Specify:

```text
which flights require terminal retrieval
which endpoint
first lookup offset
second lookup offset
maximum attempts
REST cost per attempt
maximum total outcome API units
what fields count as terminal evidence
how revisedTime/runwayTime semantics are interpreted
when outcome becomes final missing
what happens for cancellation/diversion
```

Prefer batched airport-window retrieval when that reduces REST cost without changing scientific meaning.

Add tests using provider fixtures.

---

# 25. TAIL / AIRCRAFT CHAIN

Do not require “same calendar date.”

Aircraft rotations can cross UTC/local midnight.

Define chain in terms of:

```text
same verified aircraft/tail
sequential leg order
arrival/departure chronology
turnaround interval
observable interval
```

Use deterministic service-instance logic.

Track:

```text
scheduled_successor_exists
observed_successor_exists
linked_successor
known_absent
unknown
```

Do not treat lack of a webhook successor as evidence no successor existed.

Define the scheduled-successor source.

---

# 26. HISTORY STORE — REAL BITEMPORAL/AS-OF LOGIC

Implement the historical store.

Do not leave it STUB.

Each feature version needs conceptually:

```text
entity
feature_name
source/effective timestamp
information_available_timestamp
value
source_version
ingested_at
```

---

## 26.1 Append-only requirement

If the history store is called append-only, do not silently mutate an old row's:

```text
valid_to
```

Choose:

* derive interval end using `LEAD()`;
* or append closure/version records;
* or another genuinely append-only pattern.

---

## 26.2 As-of query

A correct query may need BOTH:

```text
effective/source time appropriate for cutoff
AND
available_at <= prediction_cutoff
```

Do not just select:

```text
MAX(valid_from)
WHERE available_at <= cutoff
```

if the value was not semantically effective at that cutoff.

---

## 26.3 Readiness

Separate:

```text
history_store_ready_at
```

meaning infrastructure/reference history became operational,

from:

```text
history_complete_for_snapshot
```

meaning this specific row has sufficient history.

Do not exclude a snapshot from existence because history is incomplete.

Define primary evaluation population versus history-complete subset explicitly.

---

## 26.4 Actual delay history

Do not claim “recent actual delay” features until the actual target source and milestone semantics are verified.

Create a source matrix:

```text
feature
provider/source
native field
semantic meaning
source time
available_at
coverage
missing policy
```

---

# 27. WEATHER

Normalize operational versus retrospective weather.

## 27.1 Operational predictive features

Use sources available as-known-at-cutoff:

* METAR observations available by cutoff;
* TAF issued by cutoff;
* approved operational NWP products available by cutoff.

---

## 27.2 ERA5

Do NOT use retrospective ERA5 as a same-time operational fallback merely because the modeled meteorological timestamp is older than the prediction cutoff.

Publication/availability matters.

ERA5 may be used for:

* retrospective truth;
* historical context where publication-time conditions are satisfied;
* evaluation diagnostics;

but not masquerade as an operational forecast/observation available to the model when it was not.

---

## 27.3 LDM

Do not call:

```text
LDM
```

a reanalysis dataset.

LDM/IDD is distribution software/infrastructure.

If used, name the actual meteorological product being distributed.

Correct every occurrence.

---

# 28. FRAME — TRAFFIC SOURCE MUST BECOME REAL

Before final frame rebuild:

freeze exactly one usable external reference.

Record:

```text
traffic_source_name
traffic_source_version
retrieval_date
reference_period
metric
tier_cut_rule
raw/reference hash
coverage percentage
missing-reference count
```

Do NOT claim access to OAG/Cirium unless it actually exists.

If unavailable, choose a defensible accessible source permitted by Plan rules and document limitations.

No fabricated values.

---

# 29. TRAFFIC-TIER RULE

Eliminate open OR choices before frame rebuild.

Current prose contains choices like:

```text
annual departures OR operations OR passengers
top ~7% OR >=25,000
```

Those may exist while pre-freeze, but they must not remain unresolved at actual frame freeze.

Select one deterministic:

```text
metric
source
period
threshold/cut algorithm
tie policy
missing policy
```

and hash the resulting:

```text
ICAO → tier
```

mapping.

---

# 30. REGION MAPPING

Use one executable:

```text
country_code → macro_region
```

mapping plus explicit overrides.

Correct current Greenland contradiction.

Do not simultaneously state:

```text
Greenland in Europe
```

and:

```text
BG/Greenland → North America
```

Pick one binding mapping.

Likewise resolve Russia and Turkey using one reproducible executable rule.

Version/hash:

```text
region_mapping
region_overrides
```

Every in-frame airport must have exactly one region or explicitly be `UNMAPPED` and excluded until resolved.

---

# 31. FRAME BALANCING REFERENCE VARIABLES

Network degree, carrier diversity, international share, etc. must come from a real exogenous/reference snapshot.

Never recursively derive them from Phase-6 sampled outcomes.

Record exact:

```text
source
period
formula
normalization
coverage
missing policy
hash
```

No data → `NULL + unverified flag`.

---

# 32. ANCHOR NORMALIZATION MUST EXIST BEFORE GATE 2

Current logic creates an order contradiction.

Gate 2 needs anchor scores.

But some normalization caps are proposed to be measured/frozen at Gate 0.5, which occurs after Gate 2.

That is impossible.

Any exogenous score quantity required to score Stage-1/Stage-2 candidates must be frozen **before** Stage 1.

That includes:

```text
degree_cap
effective_carriers_cap
traffic-score transform
score formula
weighting constants
normalization reference frame
```

Do not use Gate-2 outcome yield to choose exogenous normalization.

---

# 33. TRAFFIC SCORE SATURATION

Current Plan contains both:

```text
linear clipped traffic score
```

and an open suggestion to switch to log scaling after Gate 0.5.

That decision cannot remain open if it affects Gate-2 ranking.

Freeze the transform before Stage 1.

Document why.

---

# 34. PROBE CAP — CURRENT WSSS PROTOCOL IS INFEASIBLE AS WRITTEN

The current documents acknowledge approximately:

```text
WSSS ≈331 flight items/hour
2h ≈662 items
```

while:

```text
PROBE_CAP_DAILY = 500
```

The Log still contains instructions suggesting a 2-hour WSSS probe.

Do NOT execute this protocol until reconciled.

Choose one human-approved design before paid execution:

* shorter duration;
* different reference airport;
* higher authorized cap;
* hard stop at cap with explicit censored-probe treatment;
* another scientifically valid solution.

Update Plan, Log, code, and tests consistently.

---

# 35. STAGE-1 / STAGE-2 PROBE PROTOCOL

Freeze before paid execution:

```text
exact 12 Stage-1 candidates
whether WSSS/OMAA are included in those 12
Stage-1 duration
Stage-2 duration
cap handling
yield-count unit
stability statistic
capacity threshold
ranking rule
tie rule
Stage-2 candidate rule
replacement rule
failure rule
```

---

## 35.1 Fewer than five pass capacity

Do not say both:

```text
confirm exact top 5
```

and:

```text
if fewer pass, promote all
```

if the final pool requires 5.

If fewer than five valid candidates remain, define:

```text
Gate 2 FAIL
→ replacement protocol
→ additional Stage-1 candidate(s)
→ confirmation
```

or another explicit predeclared rule.

Never manufacture a five-airport pool from invalid candidates.

---

## 35.2 Stage-2 failure

Define whether candidate #6 replaces a failed top-five candidate and whether #6 must receive Stage-2 confirmation before entering the locked pool.

---

## 35.3 Stability count

Replace wording equivalent to:

```text
whatever implementation counts — rows/events
```

with exactly one definition.

Example choices might be:

```text
unique flight items
semantic update events
unique flight instances
```

Choose one and apply everywhere.

---

# 36. ADAPTIVE REGIONAL `m_i`

Implement it fully.

Do not leave a stub.

Freeze recurrence/settings, not Phase-6 outcomes.

---

## 36.1 Starting state versus adaptation

Correct contradiction:

The **initial state and update rule** are frozen before Phase 6.

But during Phase 6:

```text
EMA updates
→ derived m_i updates deterministically
```

Otherwise there is no adaptation.

Do not say:

```text
m_i does not adapt
only EMA adapts
```

if `m_i` is defined from EMA.

---

## 36.2 Exact EMA

Define:

```text
alpha
first observation behavior
cold-start behavior
missing observation behavior
zero-yield behavior
```

If:

```text
alpha = 0.5
```

then “approximately four observations” may be explanatory prose but cannot substitute for an exact recurrence.

---

## 36.3 Median/reference pool

Define exactly which airports enter:

```text
median_ema_yield_frame
```

Examples of decisions that must be explicit:

* only REGIONAL?
* only currently eligible?
* only those with non-null EMA?
* include zero-yield persistent?
* include failed/provider-error observations?

No ambiguity.

---

## 36.4 Zero-yield state machine

Implement exact states and transition rules:

```text
normal
zero_yield_once
zero_yield_repeated
zero_yield_persistent
```

or the currently accepted names.

Separate:

```text
true zero-yield observation
```

from:

```text
provider failure
subscription failure
coverage failure
```

A provider error is not a zero-yield airport observation.

---

## 36.5 Initial Phase-6 state

Freeze:

```text
m_i_initial_source
ema_initial_source
zero_yield_initial_state
coverage_floor_initial_state
```

Explicitly state whether probe results seed Phase-6 adaptive state.

No hidden initialization.

---

# 37. COVERAGE / “NO STARVATION”

Use precise language.

```text
p_i > 0
```

means positive probability.

It does NOT mathematically guarantee selection within a finite 31-day experiment.

A temporary 1.5× boost likewise does not guarantee eventual selection.

Do not use “guarantee” unless implementing an actual deterministic forced queue.

Report:

```text
positive-probability floor
coverage boost
realized selection frequency
coverage age
```

separately.

---

# 38. COVERAGE TAXONOMY

Do not force multiple independent dimensions into one mutually exclusive status.

Represent independently where appropriate:

```text
in_frame
pre_eligible
post_eligible
subscription_started
delivery_received
provider_failure
zero_yield
captured_in_population
captured_outside_population
snapshot_created
outcome_observed
```

Then derive summary statuses.

---

# 39. 2×2-HOUR WINDOWS — IMPLEMENT PARENT/CHILD STRUCTURE

A noncontiguous:

```text
2h + gap + 2h
```

day cannot be treated naively as one continuous subscription interval.

Store:

```text
experiment_day_id
parent_batch_id
segment_id
segment_start
segment_end
gap_start
gap_end
window_shape
```

Clarify:

* same airport set or not;
* FIDS population interval per segment;
* Alert subscription lifecycle;
* gap-flight classification;
* cost accounting;
* outcome collection.

Gap flights must not silently enter the treatment denominator.

---

# 40. CROSSOVER / 31-DAY CALENDAR — BUILD A REAL CONSTRAINT SOLVER

Do not depend on hand-written dates.

Generate the complete calendar before Phase 6.

Hard constraints include whichever are currently binding, including:

```text
31 experiment days
window-shape totals
six UTC slots
each 6-day block slot balance
weekday/weekend matching
time-class matching
washout
crossover pairing
anchor rules
tier-slot rules
treatment randomization
billing/run dates
```

---

## 40.1 SAT test

The calendar generator must either produce a valid schedule or return:

```text
UNSAT
```

with explanation.

Never silently relax a hard constraint.

---

## 40.2 Washout arithmetic

Current example equivalent to:

```text
Monday 08:00-12:00
→ Tuesday 08:00
```

is only 20 hours end-to-start.

If binding washout is:

```text
>=24 hours END → START
```

then earliest following start is Tuesday 12:00.

Correct prose, tests, and generator.

---

## 40.3 Randomization unit

Resolve current contradiction between:

```text
airport-day independently gets window shape
```

and:

```text
Day 6 is 2×2h
Day 11 is 6h
...
```

Choose the actual experimental unit.

Likely choices:

```text
batch-day
```

or a fully implemented parent-day / airport-child design.

Record:

```text
randomization_unit
treatment_assignment_unit
analysis_unit
cluster_unit
```

Do not pretend 4 airports sharing one treatment are 4 independent randomized units.

---

## 40.4 Randomization independence

Treatment assignment may depend only on the frozen template/design.

Never use post-freeze yield, weather, disruption, or outcome information to choose the treatment.

---

# 41. FIDS/API-UNIT BUDGET — RECOMPUTE FROM THE ACTUAL MATERIALIZED CALENDAR

Current simple budget arithmetic is insufficient.

Compute calls from:

```text
all Phase-6 experiment days
× airports queried
× PRE horizons
× number of 2×2 segments
× long-window splits
× account-specific max FIDS range
+ retries
+ validation
+ outcome acquisition
+ history bootstrap
+ diagnostics
```

Do not assume:

```text
one call per horizon per day
```

if a day has two segments or a 6h range requires multiple calls.

Generate a machine-checkable budget report.

---

## 41.1 Budget categories

Track separately:

```text
FIDS_BASE_UNITS
FIDS_SPLIT_UNITS
FIDS_RETRY_UNIT_BUDGET
VALIDATION_UNIT_BUDGET
OUTCOME_REST_UNIT_BUDGET
HISTORY_BOOTSTRAP_UNIT_BUDGET
DIAGNOSTIC_UNIT_BUDGET
REST_TOTAL_UNIT_BUDGET
```

No hidden calls.

---

# 42. ALERT-CREDIT VS REST/API-UNIT ACCOUNTING

Separate completely:

## Alert credits

Webhook Flight Alert sends.

## API units

REST calls and Alert-credit refills.

Do not label FIDS calls as Alert credits.

Do not label an Alert anchor probe as REST spend unless a separate FIDS REST call is being counted.

---

# 43. PRE-RUN ALERT BUDGET DOUBLE-COUNTING

Current arithmetic may reserve:

```text
57,900 Phase-6 spendable
+ 1,000 protected floor
```

from a 58,900-credit refill while also spending pre-run credits from the same refill.

That is inconsistent unless a separate opening balance funds pre-run work.

Create an explicit balance tree:

```text
opening_nonexpiring_alert_balance
new_cycle_refill_credits
pre_run_alert_spend_ceiling
phase6_alert_spend_ceiling
protected_alert_floor
remaining_unallocated_alert_balance
```

And separately:

```text
monthly_api_unit_entitlement
units_spent_refilling_alert_balance
rest_fids_units
rest_other_units
remaining_api_units
```

Require identities to sum exactly.

No double counting.

---

# 44. BILLING CYCLE

Record:

```text
billing_cycle_start
billing_cycle_end
monthly_entitlement
opening_usage
```

A 31-day experiment may cross a billing-cycle boundary.

Do not silently let a new monthly allocation increase the predeclared scientific run budget.

The 1,900 limit remains a **per experimental UTC day** limit.

Billing-cycle reset changes entitlement accounting, not the definition of a day.

---

# 45. 57,900 IS A CEILING, NOT A SPENDING OBJECTIVE

Do not write:

```text
Objective: spend 57,900
```

The project may realize less because:

* soft stops;
* low traffic;
* failures;
* shortened final window;
* safety pauses.

Use:

```text
maximum Phase-6 experimental Alert-credit ceiling
```

---

# 46. RATE LIMITING

Verify actual account rate limit.

Implement central:

```text
rate limiter
retry/backoff
retry budget
429 handling
```

REST retries must count toward budget.

Do not let multiple scripts independently bypass the limiter.

---

# 47. PROVIDER DATA-RETENTION/CACHING RIGHTS

The system intends to retain immutable provider data for scientific reproducibility.

Verify current provider/marketplace terms allow the intended storage/caching duration and use.

Record:

```text
retention_terms_verified_at
source
restriction_summary
```

If permanent storage is prohibited or limited, mark it a blocking legal/provider-contract issue.

Do not fabricate compliance.

---

# 48. RECONCILIATION / HARD CAP — ACCOUNT FOR BILLING ON SEND

Provider billing can occur even if our webhook does not successfully store the delivery.

Therefore an internal received-item count is not sufficient as the sole hard-cap mechanism.

Use:

```text
authoritative provider balance polling
+
provider deliveryAttempt.costCredits where received
+
internal raw ledger
+
worst-unsettled-burst margin
```

to create a safe watchdog.

---

## 48.1 Official canary tolerance

Current:

```text
tol=3
```

is not sufficiently justified by “floating point precision” because credits are integer-valued.

For the isolated official canary:

prefer:

```text
C_external == C_internal
tolerance = 0
```

after balance settlement.

If live evidence proves unavoidable settlement discrepancy, create a separate measured production tolerance with evidence.

Do not use one failed/single-credit example to “calibrate” tolerance 3.

---

# 49. GATE 4 — DO NOT SPEND 1,850 JUST TO TEST THE THRESHOLD

Current documents both:

* require proving soft stop at 1,850;
* budget only approximately 150–320 live credits.

Those cannot directly demonstrate the actual 1,850 threshold.

Implement:

## offline/integration scaled threshold test

Parameterize:

```text
daily_cap
soft_margin
```

and prove exact stop behavior at a small synthetic threshold.

Example:

```text
cap=100
margin=10
→ stop at 90
```

also test 1900/50 arithmetic deterministically without spending.

## small live reliability test

Only under human authorization.

The live test validates:

* provider/account behavior;
* start/stop;
* balance reconciliation;
* second-start protection;
* delivery failure.

It does not need to burn 1,850 credits.

---

## 49.1 Hard-cap overshoot

An overshoot is a failure/pause condition.

A next-day deduction may be retained for accounting, but do not describe it as making an exceeded hard cap acceptable.

---

# 50. GATE 0.5 — DEDICATED PILOT NEEDS SAMPLE-ADEQUACY CRITERIA

Current Plan says to estimate P95 latency/cadence/completeness but lacks minimum adequate sample size.

Before live pilot, freeze minimum evidence such as:

```text
min_notifications
min_unique_flights
min_completed_flights
min_airborne_flights
min_airborne_points
min_pilot_duration
```

Do not invent scientifically arbitrary values without documenting rationale.

If the first pilot does not achieve sufficient data:

```text
Gate 0.5 = INSUFFICIENT_SAMPLE
```

and repeat/extend only within an explicit pre-run budget and human authorization.

Do not freeze unstable P95 from 2 observations.

---

## 50.1 Gate 0.5 measures

At minimum:

```text
payload field inventory
provider timestamp semantics
T constructibility
primary-target constructibility
FIDS max range
FIDS boundary behavior
withLeg behavior
codeshare ambiguity
observation cadence
trajectory completeness
arrival-notification latency
censoring grace
rate limit
unsettled Alert-credit burst
```

Record sample sizes and distributions.

---

# 51. GATE 5 FUNNEL

Replace unsafe:

```text
population >= captured
```

with role-aware funnel.

At minimum:

```text
population_total
captured_in_population
captured_outside_population
snapshot_created
snapshot_missing_features
outcome_observed
outcome_missing
```

Require:

```text
captured_in_population <= population_total
```

while separately investigating:

```text
captured_outside_population
```

which can occur because of:

* context flights;
* late additions;
* service-window mismatch;
* dedup mismatch;
* provider changes.

Never silently force outside-population captures into the denominator.

External FAA/BTS comparison is a US subset validation only.

Do not call it global independent validation.

---

# 52. HISTORY/WEATHER READINESS GATE

Before final FREEZE, require machine-readable readiness:

```text
history_infrastructure_ready
historical_feature_sources_verified
weather_operational_sources_verified
weather_as_known_at_cutoff_test_pass
retention_terms_verified
```

If required features cannot be constructed safely:

* keep them NULL;
* mark missingness;
* adjust primary analysis population according to the predeclared rule.

Do not backfill future-known information.

---

# 53. EVALUATION — REMOVE OUTCOME-BIASED LANGUAGE

Do not preregister:

```text
XGBoost beats persistence
```

as an expected result.

Preregister:

```text
compare Model 1 against Model -1
```

and report whether it beats the threshold.

The scientific result may be:

* better;
* equal;
* worse.

All are valid outcomes.

---

# 54. ΔMAE SIGN / DECISION RULE

Define once.

For example:

```text
delta_MAE = MAE_persistence - MAE_model
```

Then:

```text
delta_MAE > 0
```

means model improvement.

If practical threshold is 2 minutes, freeze exactly what must be true:

Example:

```text
point estimate >= 2 minutes
AND 95% CI lower bound > 0
```

OR another chosen rule.

Do not leave ambiguous whether the CI lower bound must exceed 0 or 2.

---

# 55. TARGET-SPECIFIC PROBABILITIES

Do not use generic:

```text
P(delay > 15)
P(delay > 60)
P(delay > 120)
```

without specifying the delay milestone.

Use names tied to:

```text
selected_primary_target
```

Example concept:

```text
P(selected_primary_delay > 15 min)
```

Normalize which thresholds are actually primary metrics.

If endpoint table includes >120 but metric freeze only includes >15 and >60, choose one consistent hierarchy.

---

# 56. ROLLING-ORIGIN FOLDS / FINAL TEST PROTECTION

Current folds include:

```text
[15,18,21,24,27]
```

while final test may cover approximately days 26–31.

A development fold touching protected final-test days cannot be used for model tuning.

Fix:

* all development/validation folds stay outside protected final-test period;
* any fold involving final test is descriptive/post-lock only.

Test that tuning code cannot read final-test rows.

---

# 57. FROZEN VS DEFERRED METRIC SETTINGS

Normalize current contradictions around:

* bootstrap repetitions;
* ECE bins;
* rolling folds;
* conformal settings.

Each must be exactly one of:

```text
FROZEN before Phase 6
FROZEN before first model fit
DEFERRED to explicit downstream deadline
```

not simultaneously frozen and deferred.

---

# 58. CONFORMAL

If conformal prediction is not a Month-1 primary deliverable, keep it explicitly deferred.

Do not simultaneously claim a primary conformal endpoint elsewhere.

---

# 59. DISRUPTION ENGINE

Define disruption event identity.

Do not conflate:

```text
one flight severely delayed
```

with:

```text
a multi-flight disruption event
```

Freeze:

```text
event source
event start rule
event end rule
merge rule
split rule
event_id
ATC program source
storm context source
MCD context
```

If unavailable for Month 1, mark the engine appropriately and do not fabricate event clusters.

---

# 60. MARGINAL VALUE PER CREDIT

Only call an intervention randomized when it is actually randomized by the collection design.

The current design randomizes window shape.

It does NOT necessarily randomize:

```text
+1 MID airport
+1 REGIONAL airport
+1 week of collection
```

Therefore those comparisons must be:

```text
observational
exploratory
future randomized intervention
```

unless an actual randomized intervention is implemented.

---

## 60.1 Marginal effect may be negative

Remove claims equivalent to:

```text
marginal value cannot be negative because adding data never hurts
```

Observed out-of-sample marginal value can be negative because added data can change model fitting/generalization.

Allow:

```text
MV < 0
```

in analysis.

---

# 61. LEARNING-CURVE SAMPLE SIZE

Do not use one ambiguous `N`.

Report separately:

```text
N_unique_flights
N_PRE_snapshots
N_POST_snapshots
N_airborne_points
Alert_credits
REST_API_units
```

A learning curve for PRE snapshot rows is not automatically a learning curve for POST trajectory points.

---

# 62. MONTH-1 CLAIMS

Call Month 1:

```text
early operational / methodological pilot
```

not seasonal validation.

A 31-day period cannot establish annual/seasonal representativeness.

---

# 63. ENGINE-A SPLIT

Preserve correct chronology:

Before Phase 6:

```text
freeze split-assignment algorithm/rule
split_rule_version
split_rule_hash
```

After Phase-6 data exist but BEFORE model tuning:

```text
apply frozen rule
materialize actual row IDs
test_row_hash
make test membership read-only
```

Do not materialize nonexistent row IDs before collection.

Do not change the split based on model results.

---

# 64. IMPLEMENTATION LOG — CORRECT CURRENT STALE CLAIMS

The Log currently contains stale or incomplete implementation truth.

Correct at least:

## 64.1 FIDS map

Remove stale:

```text
GET /flights/schedule
Both 12h
```

unless actual code still uses it—in which case fix the code first.

---

## 64.2 WSSS instructions

Remove commands telling the human to run an infeasible 2h WSSS probe under a 500-credit cap.

---

## 64.3 Event key

Update repository map after raw/semantic key normalization.

---

## 64.4 Timestamp dictionary

Replace old generic four-timestamp model with the final taxonomy.

---

## 64.5 Webhook `2xx always`

Correct after durable-ingress implementation.

---

## 64.6 Status claims

Do not say:

```text
code/docs/schema consistent
```

while current Plan says one endpoint and the Log map/code says another.

Only claim consistency after the machine contradiction scan passes.

---

# 65. CONFIGURATION REGISTRY — MAKE IT COMPLETE

Current configuration registry is not enough.

Include every active Phase-6 setting, at minimum:

```text
DATABASE_URL
AERODATABOX_API_KEY
ADB_AUTO_COLLECT
ADB_BATCH_BUDGET
ADB_DAILY_SOFT_STOP_MARGIN
ADB_RESERVE_CREDITS

actual account plan
monthly API units
billing cycle start/end
opening Alert balance

FIDS endpoint version
FIDS max live range
FIDS rate limit
FIDS retry limit
FIDS retry unit budget
validation unit budget
outcome REST unit budget
history bootstrap unit budget
diagnostic unit budget

selected T milestone
selected primary target

traffic source/version/period
tier thresholds/hash
region mapping version/hash

anchor pool
anchor formula version
normalization caps
capacity gate
probe cap
probe durations
stability unit/rule

m_i alpha
m_i bounds
m_i initial source
coverage floor rule
zero-yield thresholds

time-window seed
crossover seed
randomization unit
washout
calendar hash

reconcile tolerance canary
production reconcile tolerance if separate
balance polling interval
unsettled burst margin

Gate-0.5 sample minima
censoring grace

weather source versions
history source versions
history readiness

split rule version/hash
```

For each record:

```text
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

---

# 66. DATA DICTIONARY

Bring the data dictionary into exact alignment with the real schema.

At minimum document every first-class table involved in:

```text
raw deliveries
raw items
processing attempts
semantic flight events
current state
sampling frame
flight population
PRE snapshots
airborne events
clean airborne points
trajectories
outcomes
historical feature versions
weather observations
weather forecasts
collection batches
anchor probes
manifest/meta
```

For each column:

```text
name
type
nullable
PK/FK
semantic meaning
producer
consumer
immutability
timestamp semantics
source
```

Do not document a table/column that does not exist as `IMPLEMENTED`.

---

# 67. DATA LINEAGE

Provide per-arrow lineage, not only:

```text
A → B → C
```

For every transformation record:

```text
source table
destination table
function/job
join key
filter
dedup rule
timestamp rule
failure behavior
version
test
```

This must explicitly show:

```text
provider
→ raw delivery
→ raw item
→ semantic event
→ current state
→ population
→ snapshots
→ outcomes
```

and AIRBORNE/history/weather branches.

---

# 68. REQUIREMENT → CODE → TEST → EVIDENCE MATRIX

This is mandatory.

Do not provide a four-row summary.

Create one row for EVERY Phase-6-critical binding requirement.

Columns:

```text
REQ_ID
rule_id
Plan section
requirement
status
code file
function
schema/table
migration
config
unit test
integration test
live test
test result
evidence
blocker
freeze deadline
manifest field
```

No requirement may be considered closed with:

```text
SPEC only
```

if it requires code.

---

# 69. REVERSE CODE → REQUIREMENT MAP

For each Phase-6-critical file/function, identify which requirement(s) justify it.

This catches orphaned/stale code.

---

# 70. TEST SUITE — IMPLEMENT THE FULL CRITICAL SET

Do not stop with the current 16 representative tests.

At minimum implement/test the following families.

## 70.1 Provider/FIDS

* correct FIDS endpoint;
* correct direction;
* `withLeg`;
* requested-airport vs context role;
* canceled/diverted/CanceledUncertain;
* codeshare Unknown;
* no unsupported stable flightId assumption;
* scheduled/revised/runway field parsing;
* no `actualTime` assumption;
* service window vs cutoff;
* FIDS max-range config;
* generic split logic;
* split calls included in budget.

## 70.2 DST/time

* spring-forward;
* fall-back;
* ambiguous repeated local hour;
* local→UTC;
* boundary overlap;
* dedup;
* T−24 future assignment margin.

## 70.3 Raw ingestion

* raw payload immutable;
* hash stable;
* raw persistence before successful acknowledgement;
* DB failure injection;
* parser failure recovery;
* state update failure recovery;
* retry/delivery raw identity;
* raw item identity;
* semantic event identity.

## 70.4 Timestamps/leakage

* all timestamp fields preserved;
* non-location location timestamp nullable;
* provider state timestamp distinct from location timestamp;
* `available_at <= cutoff`;
* source occurrence before cutoff but availability after cutoff excluded;
* optional missing feature does not delete snapshot.

## 70.5 Identity

* operating codeshare dedup;
* ambiguous codeshare;
* cross-airport duplicate;
* retime parent/root;
* service-date/midnight;
* selected T not hardcoded.

## 70.6 Outcomes

* pending vs final missing/censored;
* diverted + observed landing coexist;
* wheels-on observed while gate-in missing;
* CanceledUncertain distinct;
* outcome REST acquisition schedule;
* outcome API-budget enforcement.

## 70.7 Budget

* Alert vs REST ledgers separate;
* pre-run balance identity;
* no double counting;
* materialized-calendar FIDS budget;
* API retries counted;
* rate limiter;
* billing-cycle accounting;
* Phase6 total ceiling.

## 70.8 Alert safety

* canary exact reconciliation;
* provider attempt cost captured;
* authoritative balance poll;
* webhook outage/send-cost simulation;
* unsettled burst;
* scaled SOFT_STOP;
* hard cap;
* delivery-failure pause;
* second-start guard;
* reserve floor.

## 70.9 Probe

* probe cap;
* high-yield WSSS feasibility;
* cap-censored probe behavior;
* exact Stage1 candidate set;
* Stage2 failure/replacement;
* stability exact count;
* capacity failure;
* deterministic ranking;
* tie handling.

## 70.10 Frame

* traffic mapping deterministic;
* missing traffic;
* region Greenland;
* Russia boundary;
* Turkey;
* exactly one region;
* 18-cell frame;
* eligibility filters;
* anchor consumes HUB;
* normalization exists before probe.

## 70.11 Adaptation

* EMA first update;
* alpha recurrence;
* m_i clamp;
* exact median set;
* zero-yield state transitions;
* provider failure not zero-yield;
* 20-day boost if retained;
* positive p_i;
* deterministic replay;
* initial-state freeze;
* probe-state seeding rule.

## 70.12 Calendar

* 31 days;
* window-shape counts;
* six-slot rule;
* weekday matching;
* washout;
* crossover;
* randomization unit;
* treatment independence;
* parent/child 2×2;
* SAT validator;
* UNSAT fail-fast;
* calendar hash.

## 70.13 Weather

* METAR availability;
* TAF issue time;
* future weather exclusion;
* ERA5 operational misuse prohibited;
* actual product names for LDM/IDD;
* weather source/version.

## 70.14 History

* append-only behavior;
* as-of effective time;
* available_at;
* history readiness;
* row-specific completeness;
* no post-cutoff feature.

## 70.15 Chain

* same-tail sequencing;
* cross-midnight;
* known absent;
* unknown successor;
* webhook absence not absence evidence.

## 70.16 Gate5

* captured_in_population <= population;
* captured_outside_population separately reported;
* stage funnel;
* US external validation labeled US subset.

## 70.17 Evaluation

* group same flight instance into same partition;
* retime root grouping;
* no POST same-flight leak;
* no final-test development read;
* rolling fold does not overlap protected test;
* target-specific endpoint names;
* ΔMAE sign;
* negative MV allowed;
* randomized-language assertion only for actual randomized treatment.

## 70.18 Registry/manifest

* registry schema validation;
* every binding requirement represented;
* no duplicate rule IDs;
* no conflicting current values;
* manifest required fields;
* hashes deterministic;
* preflight contradiction count.

## 70.19 Migrations

Test:

* fresh DB;
* upgrade DB;
* repeated startup/idempotence where expected;
* no duplicate-column failures;
* indexes/constraints;
* nullable/nonnullable timestamp changes.

## 70.20 Type/lint/build

Run existing:

```text
typecheck
lint
build
tests
```

Record baseline errors.

Do not introduce new errors.

---

# 71. MACHINE CONTRADICTION SCAN

Create a tool/script such as:

```text
scripts/v39_preflight_consistency.*
```

It must check current normative Plan + current Log + canonical registry + config/constants for duplicated binding rules.

For every repeated rule output:

```text
rule_id
location_1
value_1
location_2
value_2
classification
```

Classification:

```text
MATCH
SUPERSEDED_HISTORY
EXPLANATORY_ONLY
CONTRADICTION
```

Final requirement:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0
```

Do not count archived history as a current contradiction.

But do not hide current Log/code contradictions by calling them historical without evidence.

---

# 72. LEXICAL/PREFREEZE SCAN

Search current normative text for unresolved words/patterns such as:

```text
TBD
candidate
alternative
OR
approximately
~
preferred
fallback
if needed
whatever implementation counts
proposal
maybe
consider
```

Do NOT blindly treat every occurrence as a defect.

Classify each occurrence:

```text
historical
explanatory
nonbinding approximation
valid MEASURE→FREEZE
invalid unresolved binding choice
```

For every binding pre-run choice:

* freeze it;
* or mark explicit `MEASURE→FREEZE` with exact gate and manifest field.

---

# 73. CANONICAL REGISTRY COMPLETENESS TEST

Create a completeness mechanism.

Every current Phase-6 binding requirement in PART 1 must map to:

```text
canonical rule ID
```

Output:

```text
binding_requirements_total
registry_mapped_total
registry_unmapped_total
```

Before calling the registry sole authority:

```text
registry_unmapped_total = 0
```

---

# 74. MANIFEST

Before Phase6 the manifest must include, as applicable:

```text
binding_plan_version
log_revision
registry_version

git_sha
migration_level
schema_version

provider_marketplace
provider_openapi_version
openapi_sha256
provider_docs_retrieved_at

account_plan
billing_cycle_start
billing_cycle_end
monthly_entitlement

opening_alert_balance
new_refill_credits
pre_run_alert_budget
phase6_alert_ceiling
protected_floor
REST budgets

traffic_source
traffic_version
traffic_period
traffic_hash
tier_rule
tier_hash

region_mapping_version
region_mapping_hash

frame_version
frame_hash
frame_counts

anchor candidates
anchor formula version
normalization caps
anchor pool
anchor pool hash

selected_t_milestone
T provider evidence
selected_primary_target
target provider evidence

FIDS protocol
FIDS max range
FIDS rate limit

timestamp schema version
identity version
codeshare rule
retime rule

censoring grace
Gate0.5 measurements + sample sizes

m_i version
alpha
bounds
initial-state source
coverage-floor rule

window calendar
calendar seed
calendar hash
randomization unit
washout
crossover rule

weather sources
history sources
history readiness

split_rule_version
split_rule_hash

all gate results
all required software/test versions
```

Do not write a fake manifest value as frozen if it has not been measured.

---

# 75. OFFICIAL EXECUTION ORDER AFTER CODE CLOSURE

The authoritative order for this task is:

## Stage A — no paid collection

1. repository truth snapshot;
2. current provider contract pin/hash;
3. specification contradiction normalization;
4. canonical registry rebuild;
5. implement missing Phase-6-critical code;
6. migrations;
7. full offline/unit/integration test suite;
8. full Requirement→Code→Test→Evidence matrix;
9. choose/freeze real traffic/reference source;
10. choose/freeze region mapping;
11. freeze anchor exogenous normalization;
12. rebuild final sampling frame.

## Stage B — gates, only with appropriate human authorization

13. Gate 0 — live account/budget verification;
14. Gate 1 — final-frame coverage;
15. optional tiny webhook smoke check if authorized;
16. resolve probe-cap feasibility;
17. Gate 2 Stage-1;
18. Gate 2 Stage-2;
19. Gate 2 PASS / anchor lock;
20. official Gate 3 isolated canary;
21. dedicated Gate 0.5 adequately sampled pilot;
22. Gate 4 scaled/integration safety proof + approved small live reliability check;
23. Gate 5 population funnel;
24. history/weather readiness.

## Stage C — pre-Phase6 freeze

25. materialize entire 31-day SAT-valid calendar;
26. freeze calendar/hash;
27. freeze split-assignment rule/hash;
28. write final manifest;
29. run complete contradiction/lexical/preflight scan;
30. produce final GO/NO-GO report;
31. obtain explicit human Phase-6 authorization.

## Stage D

32. only then may Phase 6 start.

Do not reorder paid actions merely because an old Log section lists a stale sequence.

---

# 76. DO NOT PERFORM ANOTHER BROAD SCIENTIFIC REDESIGN

Do not:

* propose V3.10;
* replace PRE/AIRBORNE architecture;
* introduce automatic flight-level `1/p` weighting;
* switch to a GNN-first design;
* invent another airport-tier philosophy;
* replace the entire evaluation suite;
* add arbitrary new treatments;
* redesign just because you personally prefer another method.

You may flag an implementation/scientific impossibility if concrete evidence requires it.

---

# 77. UPDATE THE IMPLEMENTATION LOG AS AN ACTUAL MANUAL

Every change must get a real `LOG-YYYYMMDD-###` entry.

Record actual:

```text
timestamp
git SHA before
git SHA after
requirement IDs
files inspected
files changed
functions changed
schema changed
migration IDs
config changed
provider contracts used
implementation behavior before
implementation behavior after
tests added
test commands
test outputs
live evidence
blockers
rollback
review status
```

Do not write:

```text
implemented
```

without code evidence.

Do not write:

```text
verified
```

without test/live evidence.

---

# 78. DO NOT ALTER HISTORICAL TRUTH

Preserve rl8/rl9 and other failed runs accurately.

The historical Gate-3 canary remains historically:

```text
C_external=1
C_internal=0
delivery_failures=1
FAIL
```

A later fixed PASS does not rewrite the old failure.

Historical probes interrupted/out-of-order remain historical failures/invalid runs.

---

# 79. CURRENT DOCUMENT VERSIONING

Keep:

```text
Binding scientific Plan:
V3.9-f.8
```

unless only a documentation-normalization suffix is needed under the existing V3.9 lineage.

Do NOT create V3.10.

The Implementation Log may increment its documentation/log revision separately.

Record:

```text
binding_plan_version
implementation_log_revision
canonical_registry_version
```

separately.

---

# 80. REQUIRED FINAL REPORT FROM YOU

When you finish this task, return EXACTLY these major sections.

## A. EXECUTIVE VERDICT

State:

```text
architecture status
code readiness
test readiness
gate readiness
Phase6 GO/NO-GO
```

No vague language.

---

## B. REPOSITORY TRUTH SNAPSHOT

Show:

```text
git branch
starting SHA
ending SHA
dirty/clean status
migration level
runtime versions
package manager
database
```

---

## C. PROVIDER CONTRACT PIN

Show:

```text
marketplace
OpenAPI URL/source
version
retrieved_at
SHA256
important verified fields/endpoints
provider assumptions still requiring live verification
```

---

## D. CURRENT-CURRENT CONTRADICTION MATRIX

For each contradiction:

```text
ID
rule
location A
location B
before
after
status
```

Then print:

```text
CURRENT_CURRENT_CONTRADICTIONS = <integer>
```

---

## E. COMPLETE REQUIREMENT MATRIX

Every Phase-6-critical requirement.

No summary-only version.

---

## F. FILES MODIFIED

For each:

```text
path
why
functions
requirements
```

---

## G. SCHEMA/MIGRATIONS

For each migration:

```text
ID
DDL
why
rollback
fresh-DB result
upgrade result
```

---

## H. IMPLEMENTATION RESULTS BY WORKSTREAM

Use:

```text
A Repository truth
B Specification consistency
C Sampling frame
D Population/FIDS/time
E Identity/provenance/outcomes
F Sampling execution
G Weather/history/AIRBORNE/chains
H Evaluation/freeze
I Gates/readiness
```

---

## I. TEST RESULTS

Give counts:

```text
tests_total
tests_pass
tests_fail
tests_blocked_live
tests_skipped
```

Then list every Phase-6-critical failure/block.

---

## J. LIVE GATE STATUS

Show:

```text
Gate 0
Gate 1
Gate 2
Gate 3
Gate 0.5
Gate 4
Gate 5
```

Each:

```text
PASS
FAIL
BLOCKED
NOT RUN
```

with evidence.

Do not invent a PASS.

---

## K. CANONICAL REGISTRY STATUS

Show:

```text
binding requirements total
rules total
unmapped binding requirements
duplicate IDs
conflicting current rules
MEASURE→FREEZE remaining
FROZEN rules
```

---

## L. MANIFEST STATUS

Show:

```text
NOT WRITTEN
DRAFT
PARTIAL
FROZEN
```

with missing fields.

---

## M. BUDGET PROOF

Show exact arithmetic for:

```text
Alert opening balance
new refill
pre-run spend
Phase6 ceiling
reserve

API-unit entitlement
Alert refill units
FIDS units
validation units
outcome units
history units
retries
remainder
```

Use materialized-calendar call counts.

---

## N. EXACT REMAINING BLOCKERS

Every remaining blocker gets:

```text
blocker_id
requirement
why blocked
human/provider dependency
exact next action
```

No grouped phrase such as:

```text
~12 blocker families
```

without individual machine-readable IDs.

---

## O. CLOSURE COUNTERS

Print exactly:

```text
CURRENT_CURRENT_CONTRADICTIONS = ?
UNRESOLVED_PHASE6_B = ?
UNFROZEN_REQUIRED_PRE_RUN_C = ?
PHASE6_CRITICAL_BLOCKED_TESTS = ?
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = ?
GATES_0_1_2_3_0.5_4_5 = ?
MANIFEST = ?
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = ?
```

---

## P. EXACT NEXT HUMAN ACTION

One finite next action.

Example:

```text
Authorize Gate 0 account read-only verification.
```

or:

```text
Provide access to the required external traffic reference.
```

Do not provide a new design review.

---

## Q. ARCHITECTURE STATEMENT

End with:

```text
No new V3.9 architecture changes are proposed.
Remaining work is implementation, verification, measurement/freeze,
or an explicitly evidenced blocker.
```

unless you have proven an actual architecture-level impossibility.

---

# 81. DEFINITION OF DONE FOR THIS AGENT SESSION

Your repository/remediation work is complete only when every item that does NOT require paid/live evidence has been:

```text
implemented
tested
documented
mapped to requirement
mapped to evidence
```

If live evidence is unavailable, the code/test harness must still be ready and status must be:

```text
BLOCKED: LIVE VERIFICATION REQUIRED
```

not:

```text
DONE
```

---

# 82. FINAL V3.9 PHASE-6 CLOSURE CONDITION

V3.9 may be declared ready for Phase 6 only if:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0

UNRESOLVED_PHASE6_B = 0

UNFROZEN_REQUIRED_PRE_RUN_C = 0

PHASE6_CRITICAL_BLOCKED_TESTS = 0

UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = 0

CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = 0

Gate 0 = PASS
Gate 1 = PASS
Gate 2 = PASS
Gate 3 = PASS
Gate 0.5 = PASS
Gate 4 = PASS
Gate 5 = PASS

MANIFEST = FROZEN

ADB_AUTO_COLLECT = false
```

Then and only then:

```text
PHASE6_TECHNICAL_READINESS = GO
```

Phase 6 still requires explicit human authorization.

---

# 83. STOPPING RULE

Once all closure criteria above are satisfied:

STOP BROAD THEORETICAL REVIEW.

Do not reopen V3.9 because:

* another AI has a stylistic preference;
* another sampling method exists;
* a different model architecture might be interesting;
* someone thinks another weighting scheme is elegant;
* a new optional feature is possible.

Reopen only when new concrete evidence shows:

1. a failing executable test;
2. provider contract changed;
3. accounting/hard-cap violation;
4. information leakage;
5. implementation impossibility;
6. required data cannot actually be obtained;
7. legal/provider-retention restriction;
8. live Phase-6 data demonstrate a preregistered operational assumption cannot function.

Otherwise V3.9 remains closed and the project proceeds.

---

# 84. MOST IMPORTANT INSTRUCTION

Do not repeat the previous mistake of changing the Markdown files and then declaring the requirement implemented.

For EVERY required item ask:

```text
Where is the executable code?
Where is it wired into the real path?
What schema supports it?
What test proves it?
What command was run?
What evidence was observed?
Does the Implementation Log accurately reflect that evidence?
```

If any answer is missing, the item is NOT fully closed.

Start with the repository truth audit now.

This is the prompt I would use instead of sending Mimo another “review the design” prompt. It forces it to return evidence rather than prose.

The key reason I’m comfortable calling this the **finite closure set** is that the newest files themselves explicitly acknowledge unresolved blockers and blocked tests, while the provider contract gives us concrete schema facts rather than design opinions. The OpenAPI specifically identifies notification IDs as notification IDs, separates notification generation from delivery-attempt timestamps/costs, and says the notification balance can be an expected pre-send value—exactly why those provenance/accounting corrections are in the prompt. ([AeroDataBox][1])

After Mimo runs this, send me **its complete output plus the updated Plan, updated Implementation Log, canonical registry, and ideally the git diff/test output**. At that point I would not conduct another free-form 100-section design audit. I would perform a **closure verification against the checklist above**: requirement-by-requirement, PASS/FAIL, with no new theoretical requirements unless actual repository/provider evidence forces one.

[1]: https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json "https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json"
