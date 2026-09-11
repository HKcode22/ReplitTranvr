I rechecked the repository before writing this. There has not been another push since the audit: `main` is still `f2d401bb…`, with the substantive Phase-0 code at `37b570d…`. The binding Plan explicitly says V3.9-f.8 is locked and that code/tests must be corrected to the Plan rather than redesigning the methodology, while the Log says Phase 0 closes only when **all 0A–0Q are evidence-backed on one current commit/schema/config**.

The prompt below is intentionally much broader than the last one. It includes the problems from my latest audit **plus additional gaps I found while doing this full pass**, especially FIDS date fabrication, stale weather/history behavior, pre-Phase-6 watchdog mutations, PRE milestone resolution, AIRBORNE cutoff leakage, durable SEND accounting, adaptation, probe promotion, calendar constraints, manifest completeness, and anti-bypass requirements.

You are working in the GitHub/Replit repository:

`HKcode22/ReplitTranvr`

Your task is a **FINAL, COMPLETE V3.9 PHASE-0 CONFORMANCE REPAIR AND CLOSURE**, not a redesign.

The purpose of this work is to make Phase 0 truly complete, production-wired, internally consistent, fail-closed, scientifically faithful to the binding V3.9-f.8 Plan, and safe to hand back for independent review before Phase 1 / Gate 0.

Do not merely fix enough code to make the existing tests pass.

Do not trust existing PASS claims.

Do not assume a helper, test, migration, comment, or Run Report means production wiring is correct.

Do not stop after fixing only the findings explicitly listed below. After fixing them, perform a complete requirement-by-requirement 0A–0Q conformance audit against the Plan and Log so that any additional contradiction you discover is also corrected before claiming Phase 0 complete.

# 1. BINDING AUTHORITY — DO NOT CHANGE THIS ORDER

The authority order is:

1. `SEPmd/V3.9_DataCollectPlan_f.8.md`

   * ONLY normative §§0–21.
   * V3.9-f.8 is locked.
   * Material after its NON-NORMATIVE/archive boundary cannot override §§0–21.

2. `SEPmd/V3.9_IMPLEMENTATION_LOG.md`

   * active §§0–35.
   * implementation/runbook authority derived from the Plan.
   * cannot weaken or override the Plan.

3. `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md`

   * evidence ledger only.
   * cannot create or modify scientific requirements.

4. Current repository code/tests/migrations.

   * implementation evidence.
   * code must conform to Plan/Log, never the reverse.

5. `gptP0analyze4.md`, old reports, `AugMDnotes/`, `MDplan/`, historical docs, old comments:

   * audit/history/reference only.
   * NEVER normative.

If Plan and active Log genuinely disagree:

* create/report `DOC_CONFLICT`;
* stop the affected execution path;
* reconcile the Log to the Plan;
* do NOT invent a third interpretation.

DO NOT create V3.10.

DO NOT modify V3.9 methodology merely to preserve old code or tests.

# 2. CURRENT BASELINE TO RECONCILE FIRST

At the independent audit immediately before this prompt:

```text
repository = HKcode22/ReplitTranvr
branch = main

current report HEAD =
f2d401bb2fa4aba317fa29c40dd879f45bf0d9a2

current substantive Phase-0 code SHA =
37b570d793bd2f9a1e00df3e3ae42f2b816d8ed8

RUN-20260908-009 claimed =
0A–0Q PASS
415/415 tests
26 files
preflight 12/12
schema through migration 0033
ADB_AUTO_COLLECT=0
```

At the beginning of your work run:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
```

If HEAD has changed, inspect the new diff first and apply this audit to the new state instead of blindly assuming `f2d401bb`.

Do not discard unrelated user work.

# 3. SAFETY BOUNDARY FOR THIS TASK

This is Phase 0.

**NO paid/provider experiment execution is authorized.**

Keep:

```bash
ADB_AUTO_COLLECT=0
```

Do NOT perform:

* paid Flight Alert subscription creation;
* paid Stage-1 probe;
* paid Stage-2 probe;
* safety smoke that spends Alert credits;
* Gate-3 canary;
* paid Gate-0.5 pilot;
* paid Gate-4 live test;
* Phase-6 subscription creation;
* Alert refill;
* paid FIDS experimentation;
* arbitrary provider mutation;
* actual destructive retention deletion.

Free/read-only provider-contract or health inspection is allowed only if already authorized by the project rules and cannot incur paid usage, but it is not required merely to complete this code repair.

Use fake/spied providers for offline tests.

Database/schema verification is allowed, but destructive verification must use controlled transactions/test DBs/rollback-safe procedures.

Never expose API keys, database credentials, webhook secrets, tokens, AUTH records containing secrets, or private provider account data in reports/logs.

# 4. IMPORTANT PHASE-0 STANDARD

The Implementation Log says a component is not complete merely because a file exists.

Each applicable requirement must reach:

```text
DOCUMENTED
→ CODED_STANDALONE
→ UNIT_TESTED
→ PRODUCTION_WIRED
→ OFFLINE_INTEGRATION_TESTED
```

and `LIVE_VERIFIED` only where Phase 0 actually requires live evidence.

Phase 0 has **no numbered live Gate**.

Do not falsely move Gate-0 / Gate-1 / Gate-2 / Gate-3 / Gate-0.5 / Gate-4 / Gate-5 evidence into Phase 0.

Terms/legal-right verification remains prerequisite-P/later-gate work where the Plan says so.

Phase 0 must, however, have all of the machinery to fail closed until those later values/evidence exist.

# 5. DO NOT TRUST RUN-009'S CURRENT PASS CLAIM

RUN-009 is historical evidence and must remain immutable.

It claimed Phase 0 was complete, but independent source-level re-audit found remaining production contradictions.

The existing 415/415 green suite is insufficient because several tests currently encode stale behavior.

Correct the implementation **and the tests**.

Do not change the Plan to make old tests pass.

# 6. PHASE 0A — FAIL-CLOSED RUNTIME / ZERO PRE-PHASE-6 PROVIDER MUTATION

Re-audit all startup/provider mutation paths.

A. Keep the corrected fail-closed parsing:

```text
missing / "" / 0 / false / off / no / invalid
→ ADB_AUTO_COLLECT OFF
```

Only an authorized later Phase-6 transition may enable collection.

B. Current watchdog problem:

`startCollectionWatchdog()` can reach:

```text
cleanupOrphanSubscriptions()
```

and `cleanupOrphanSubscriptions()` can call provider:

```text
deleteSubscription(...)
```

even while no Phase-6 batch is active.

The Phase-0A PASS contract requires a fake provider spy to prove **zero outbound provider mutations for every pre-Phase-6 startup/refusal case**.

Fix this.

Before Phase 6, watchdog behavior may inspect/read/diagnose, but it must not:

* create provider subscriptions;
* delete provider subscriptions;
* refill;
* mutate remote state;
* issue any other provider mutation.

If emergency cleanup of a dangerous provider subscription is permitted by the binding Plan, it must be an explicit separately authorized incident/safety action, not automatic startup behavior.

C. Re-audit every startup path:

* `server/index.ts`
* `server/routes_v3.ts`
* `startCollectionWatchdog`
* controller startup
* management routes
* package startup commands
* any Replit deployment entry point.

D. Remove paid-use dependence on unfrozen old defaults.

Current controller still contains examples such as:

```text
watchdogSeconds default = 60
softStopMargin default = 50
COVERAGE_CACHE_MS = 12 hours
window defaults
legacy recent-batch logic
```

Where the Plan says a value is MEASURE→FREEZE, the code may contain a harmless offline placeholder only if the paid/mutating path **refuses** until the proper frozen artifact/config is present.

No placeholder may silently become the experiment's binding live value.

Specifically:

`coverage_cache_ttl` is MEASURE→FREEZE. The Plan explicitly says a hard-coded 12-hour cache policy is not binding.

E. `PHASE6_READY` must not be a manually-set generic bypass.

The Plan requires a separately authorized Phase-6 transition.

Build/verify a persistent, auditable Phase-6 readiness state/record tied to:

* exact frozen manifest hash;
* authorization ID/hash;
* gate predecessors;
* ceilings;
* current commit/schema;
* start authorization.

A manually exported `PHASE6_READY=true` must not, by itself, be enough to bypass the state machine.

F. Every mutating production owner must contain its own anti-bypass protection where required, not only rely on the outer CLI wrapper.

Direct execution of something such as:

```text
v39_phase6_start_owner_v39.ts
anchor probe owner
canary owner
refill owner
subscription create owner
```

must refuse without verified mediation/authorization.

# 7. PHASE 0B — RAW WEBHOOK DURABILITY / DELIVERY ACCOUNTING

Preserve the fixes that already worked:

* raw delivery + raw items persist transactionally;
* raw persistence occurs before successful 2xx;
* raw failure returns a retryable failure;
* semantic failure after durable raw commit does not erase raw evidence.

Now complete the missing pieces.

A. Preserve provider delivery-attempt billing data.

Current webhook currently sends:

```text
adbCostCredits = null
```

into raw persistence even though provider delivery-attempt cost evidence may exist.

The Plan requires preservation of provider billing/attempt information such as:

```text
deliveryAttempt.costCredits
delivery attempt identity
attempt/send metadata
notification item count
provider delivery ID
```

when supplied.

Persist these in the durable raw/attempt ledger.

Do not fabricate cost when absent.

B. Internal SEND accounting must use a durable ledger.

`adb_ingest_events` is a best-effort processing/ingest record and cannot be the sole safety authority if its write may fail after raw commit.

The active SEND watchdog/admission logic must derive internal exposure from a durable source such as:

```text
raw_delivery
raw_delivery_item
durable delivery-attempt ledger
provider costCredits when supplied
reserved unsettled exposure
```

not mutable current-state row count.

A missing internal attempt ledger is **uncertainty**, not zero spend.

Missing accounting evidence must PAUSE/BLOCK additional spend.

C. Raw item/row mapping must preserve original `item_index`.

In `routes_v3.ts`, extraction currently builds a filtered `rows[]` and later accesses `flights[i]`.

If an earlier raw flight item fails extraction and is skipped, indices can shift and a surviving normalized row can be paired with the wrong original provider flight for:

* timezone;
* provider flight ID;
* raw item hash;
* semantic identity;
* provenance.

Fix by carrying the original raw item index explicitly through extraction.

Never recover original payload identity using the filtered-array index.

Required test:

```text
raw flights = [bad/skipped item, valid item]
normalized rows = [valid item only]

identity/provenance for normalized row
MUST use original raw item index 1,
not raw item index 0.
```

# 8. PHASE 0C — FIDS / FLIGHT_POPULATION

Re-audit the entire FIDS population chain against Plan §5.

Current confirmed bug:

`fidsCensus_v3.ts::localDateOf()` still does approximately:

```text
if scheduled timestamp missing:
    use today's UTC date

if timezone conversion fails:
    use UTC-date-like fallback
```

This is forbidden.

Never fabricate an origin-local service date.

Required behavior:

```text
missing scheduled identity
OR invalid scheduled timestamp
OR missing/invalid IANA timezone
→ identity unresolved/quarantined
→ no fabricated service date
→ no canonical physical identity derived from today/UTC approximation
```

A. Make `localDateOf()` return nullable/error status.

B. FIDS rows with unresolved immutable service date remain visible in provenance/quarantine but cannot silently enter the resolved analytic identity population.

C. Confirm every canonical FIDS query obeys:

* requested airport;
* exact direction;
* `withCancelled`;
* `withCodeshared`;
* cargo/private exclusions;
* `withLocation=false`;
* half-open internal service interval `[start,end)`;
* role-aware population membership;
* departure-primary PRE denominator where required;
* opposite-movement context kept separate;
* scope classification;
* codeshare resolution status;
* raw response hash;
* provider/API/openapi version;
* original local from/to;
* airport IANA timezone;
* retrieval timestamp;
* availability timestamp;
* population query ID;
* batch/segment provenance.

D. Physical REST attempts:

* maximum three total attempts;
* initial + max two retries;
* retry transient classes only;
* never retry auth/validation/schema/nontransient 4xx;
* 15-second timeout where binding;
* reserve/debit REST category units immediately before each physical attempt;
* no borrowing across REST categories;
* exhausted category → DEFER/FAIL before HTTP call.

E. Availability:

`available_at` for FIDS must represent when the data was actually usable/durable.

Do not stamp an optimistic timestamp before persistence if durable commit occurs later.

F. Truncation/splitting:

The current 500-row signal can remain only as a clearly non-authoritative heuristic until Gate 0.5.

Production architecture must support generic recursive split handling after the actual provider limit/edge semantics are frozen.

Do not pretend a provider `truncated` flag exists unless verified.

G. Re-run full DST suite.

Required DST/date cases include:

* normal timezone;
* spring-forward;
* fall-back;
* UTC/local date crossing;
* invalid IANA timezone;
* missing schedule;
* adjacent split interval boundary;
* no duplicate/omitted boundary members after internal half-open filtering.

# 9. PHASE 0D — CANONICAL PHYSICAL FLIGHT IDENTITY

Preserve the useful new change: immutable first verified provider-native schedule identity must be part of canonical physical-leg key material.

But repair the current alias problem.

Current no-provider-flight-ID alias was changed to roughly:

```text
carrier + flightNumber + origin + destination
```

This solves a cross-midnight retime but can merge genuine recurring daily flights.

Example that MUST remain distinct:

```text
UA123 KLAX→KSFO Sep 1
UA123 KLAX→KSFO Sep 2
UA123 KLAX→KSFO Sep 3
provider flight.id absent
```

Example that MUST remain the same:

```text
UA123 KLAX→KSFO
original first verified schedule = Sep 1 23:40 local
later retime = Sep 2 00:15 local
same physical leg
provider flight.id absent
```

Implement a resolver that can distinguish:

```text
same physical leg + retime
vs
new recurring physical leg
```

without relying on provider `flight.id` as canonical key material.

Requirements:

* immutable `initial_service_date`;
* immutable first verified provider-native schedule identity;
* original destination;
* operating carrier/number;
* collision discriminator;
* append-only schedule versions;
* retimes do not create new physical ID;
* genuine distinct legs do;
* ambiguous cases remain ambiguous, never silently merge.

Do not simply solve cross-midnight retiming by removing all date/schedule discrimination.

Also implement production collision handling:

If two different stable identity strings produce the same shortened hash, detect the collision and assign/use a deterministic collision discriminator.

Never silently merge on a short hash collision.

Required tests:

1. provider ID absent + cross-midnight retime → SAME ID.
2. provider ID absent + genuine next-day recurring flight → DIFFERENT ID.
3. same carrier/number/OD/date but different first verified schedules → DIFFERENT IDs.
4. provider ID changes → canonical physical ID unchanged where physical flight unchanged.
5. retime ≥2h → same physical ID, new schedule version.
6. date-shift retime → same physical ID.
7. missing/invalid timezone → quarantined.
8. missing first verified schedule identity → quarantined/ambiguous.
9. forced hash collision → deterministic discriminator, no merge.

# 10. PHASE 0D/F — TIMESTAMP TAXONOMY / LEAKAGE

Preserve:

* `departure.runwayTime` and `arrival.runwayTime` remain UNVERIFIED until Gate 0.5;
* actual OOOI aliases stay NULL until semantics are verified;
* `isAvailableAtCutoff(NULL)` returns false.

Fix the remaining helper contradiction.

Current `isFeatureEligible()` still allows:

```text
informationAvailableAt = NULL
```

because it checks only:

```text
if (informationAvailableAt && informationAvailableAt > cutoff)
```

Unknown availability must never become cutoff-safe.

Required:

```text
information_available_at IS NULL
→ feature not deployably eligible
```

Maintain:

```text
information_available_at <= prediction_cutoff
valid_from <= prediction_cutoff
valid_to IS NULL OR valid_to > prediction_cutoff
```

for all included features.

Centralize timestamp semantic ownership.

Do not allow one helper/module to call a mapping verified while another keeps it unverified.

# 11. PHASE 0E — IMMUTABLE SEMANTIC EVENTS BEFORE CURRENT STATE

Preserve the corrected fail-closed ordering:

```text
raw durable
→ immutable research event append
→ only then current-state convenience mutation
```

If immutable event persistence fails:

* raw evidence remains;
* processing attempt records failure/partial;
* current-state upsert does NOT proceed.

Now make sure this is true for **every** semantic event path, not just one webhook branch.

A. Use canonical semantic observation identity:

```text
canonical flight_instance_id
+ event type
+ PRE/POST phase
+ relevant provider source clock(s)
+ raw item hash
```

for research semantic events.

Location-specific raw observation identity may exist separately, but it must not substitute for canonical semantic identity.

B. Unresolved identity:

* quarantine explicitly;
* preserve raw item;
* do not pretend a resolved flight event exists.

C. Ensure `flight_events.flight_instance_id` is populated for every event that claims resolved physical identity.

D. Inject event-write failures in tests and prove:

```text
event append throws
→ zero current-state mutation
→ processing attempt = failed/partial
→ raw remains durable.
```

# 12. PHASE 0F — PRE-DEPARTURE SNAPSHOT MATERIALIZER

The new pre-Gate-0.5 T blocking was a correct fix.

Preserve:

```text
selectedTMilestoneConfig = null
→ t_unavailable
→ no PRE snapshot
```

But repair the remaining production issues.

A. Current materializer accepts:

```text
selectedTMilestoneConfig.milestone
```

but always uses:

```text
dep_scheduled_utc
```

for T.

That means the config label can say one thing while the materializer uses another.

Implement a real selected-T resolver.

The Gate-0.5 frozen config must control which verified provider-native milestone supplies T.

If the frozen selected construct cannot be resolved, T stays unavailable.

B. Horizon eligibility must be based on the actual selected immutable T, not always `dep_scheduled_utc`.

C. Selected T must be immutable for the physical flight according to the Plan.

Later schedule revisions must not silently move historical prediction cutoffs.

Persist/retrieve the first verified selected-T construct/version needed for the prediction unit.

D. Do not merely tag:

```text
milestone:version:hash
```

while continuing to use a hard-coded field.

E. Verify selected-T artifact hash against the exact frozen/authorized artifact.

F. Persistence currently catches insert errors and returns zero.

Do not allow an unexpected DB failure to look like an ordinary idempotent re-run.

Distinguish:

```text
inserted
already_exists_expected
failed
```

A production materialization shortfall caused by DB failure must PAUSE/FAIL downstream.

G. Required tests:

* before Gate0.5 → zero snapshots;
* frozen selected T = configured field A → materializer actually reads field A;
* different configured verified T → cutoff uses that T;
* T NULL → blocked;
* later retime does not rewrite previously frozen T;
* feature available after cutoff → NULL/missing;
* feature availability NULL → NULL/missing;
* insert DB failure → fail-closed, not successful zero insert;
* idempotent rerun → explicitly recognized as already existing.

# 13. PHASE 0G — AIRBORNE / POST PIPELINE

This area still has several serious issues.

Do not consider the new `airborneMaterializer_v39.ts` complete merely because it exists.

## 13.1 Real schema mismatch

Current materializer runs approximately:

```sql
SELECT flight_number, carrier_iata
FROM clean.clean_airborne_points
WHERE flight_instance_id = $1
```

but current schema/migration 0020 did not define `flight_number` or `carrier_iata` on `clean_airborne_points`.

Migration 0032 only added `flight_instance_id`.

Fix the production schema/query mismatch.

Do NOT rewrite already-applied old migrations.

Add a new additive/idempotent migration if schema changes are needed.

## 13.2 Legacy uniqueness still defeats canonical identity

Current schema still contains legacy constraints such as:

```text
flight_trajectory UNIQUE(flight_key)

flight_airborne_snapshots
UNIQUE(flight_number, carrier_iata, event_timestamp)
```

The new canonical ID is only an added column/index.

Canonical physical identity must become the actual partition/uniqueness owner.

Migrate to canonical semantics such as:

```text
trajectory uniqueness by flight_instance_id

snapshot uniqueness by
(flight_instance_id, observation/event timestamp)
```

while preserving legacy values as attributes if useful.

No same-number different-day physical flights may collide.

## 13.3 AIRBORNE denominator must be independent

Current materializer effectively calls builder with:

```text
airborneEligible = true
```

for captured webhook airborne points.

That is circular.

Binding rule:

```text
AIRBORNE eligible denominator
=
population membership
∩
independently verified provider-native evidence
that the physical flight became airborne
```

Webhook capture cannot define eligibility merely because a point happened to arrive.

Implement the independent denominator/eligibility join.

## 13.4 Cutoff leakage in trajectory construction

Current materializer loads all points for a flight and creates a snapshot using:

```text
predictionCutoffUtc = now
```

then writes rows for earlier points.

That can leak later trajectory observations into an earlier AIRBORNE prediction row.

For every AIRBORNE prediction observation `t`:

```text
physical state time = provider observation time
decision cutoff = that observation's deployable available_at
trajectory/features = ONLY information available <= that cutoff
```

A later point may never enter an earlier snapshot.

Build each observation snapshot independently from its as-of prefix.

Required leakage test:

```text
point1 available 12:00
point2 available 12:10

snapshot at point1
MUST NOT contain point2
or trajectory statistics computed using point2.
```

## 13.5 Snapshot schema

Ensure AIRBORNE snapshot persistence explicitly records:

* `flight_instance_id`;
* prediction state;
* physical observation time;
* `prediction_cutoff_utc`;
* provider published time;
* durable `available_at`;
* source/provenance;
* trajectory prefix version/hash;
* quality/funnel status.

If `prediction_cutoff_utc` is absent from the current table, add an additive migration.

## 13.6 Gate-frozen cadence/completeness settings

Current materializer uses values such as:

```text
minUsablePoints = 1
completenessThresholdPct = null
```

These must not silently become Phase-6 binding settings when the Plan says cadence/thresholds are measured/frozen later.

Code the machinery now, but mutating/production dataset use must refuse until required frozen values exist.

## 13.7 QC completeness

Implement the binding QC behavior, not only lat/lon checks:

* impossible latitude/longitude;
* impossible/invalid altitude/speed as required;
* duplicate observation timestamps;
* out-of-order points;
* unjoinable identity;
* availability clock missing;
* canonical identity missing;
* gap/cadence metrics;
* explicit quarantine/reason codes.

Do not silently coerce missing values to healthy values.

## 13.8 Processing pagination

Current raw reader has a bounded `LIMIT` path.

Ensure production owner repeatedly/cursor-processes all eligible raw events rather than silently stopping after one page.

## 13.9 Required AIRBORNE integration tests

Use a real migrated PostgreSQL schema/test DB or equivalent schema-validating integration environment.

Fake-pool tests alone are insufficient.

Required cases:

* actual SQL executes against migrations;
* same flight number on different dates remains separate;
* codeshare observations map to correct physical leg;
* cross-midnight retime remains same leg;
* no canonical identity → quarantine, no trajectory;
* impossible QC point → excluded/flagged;
* future point never leaks into earlier snapshot;
* uniqueness uses canonical flight identity;
* repeated materialization idempotent;
* DB write failure fail-closed;
* > one page of raw events fully processed;
* independent AIRBORNE denominator enforced.

# 14. PHASE 0H — OUTCOME RECOVERY / TERMINALIZATION

The new `outcomeRecoveryOrchestrator_v39.ts` is not yet a real recovery orchestrator.

Currently it mainly:

* receives already-known actual values;
* terminalizes;
* subtracts estimated units in memory;
* sets a future due time.

It does not actually execute the bounded canonical provider recovery request.

Implement the full production owner:

```text
flight_instance_id
→ recover original population/query identity
→ determine logical opportunity
   +30 / +120 / +360 minutes
→ enforce +24h deadline
→ reserve OUTCOME REST category units
→ issue the bounded canonical FIDS recovery request
   through centralized limiter/client
→ max 3 total physical attempts
→ store query/request/response provenance + hashes
→ durable available_at/retrieval time
→ resolve the SAME canonical physical flight
→ extract only Gate-0.5-verified outcome milestones
→ terminalize each target
→ persist status/evidence
→ schedule/record next opportunity if applicable
```

Requirements:

* no loose flight-number/carrier search;
* no unbounded airport-wide recovery unrelated to original population query;
* never borrow REST units from another category;
* no in-memory-only budget authority;
* durable opportunity/attempt state;
* no duplicate physical recovery call on restart;
* max-three transport attempts;
* exact request/response hashes;
* terminal target status independently tracked;
* `scheduled / departed / arrived / canceled / canceled_uncertain / diverted / unknown` remains distinct from per-target `pending / observed / censored / missing / not_applicable`;
* actual milestone verification waits for Gate 0.5 semantics.

Required provider-spy tests prove actual FIDS-call orchestration without making a real paid call.

# 15. PHASE 0I — HISTORICAL FEATURES

Current `historicalFeatureStore_v3.ts` still converts database infrastructure failures into ordinary missing values.

Examples:

```text
query throws
→ return null / empty map / false
```

This makes:

```text
feature genuinely absent
```

indistinguishable from:

```text
historical store broken
```

Fix this.

Production API should distinguish at minimum:

```text
FOUND
MISSING_AS_OF
NOT_READY
INFRASTRUCTURE_FAILURE
```

Infrastructure failure must fail closed/pause snapshot materialization.

Do not silently create missingness flags for a broken database.

Also verify:

* bitemporal `information_available_at`;
* `valid_from`;
* `valid_to`;
* append-only store;
* ≥5 qualifying flights where required;
* route/airport/tail/OD readiness;
* previous-leg/tail features use cutoff-safe history only;
* no later data backfill into earlier cutoff;
* bootstrap readiness owner exists;
* history-ready state is persisted/versioned;
* history bootstrap budget belongs to the correct REST category.

If the Plan requires a production bootstrap/retrieval owner and only helper functions exist, implement the owner in Phase 0.

# 16. PHASE 0I — WEATHER

Current `weatherSignal.ts` contains several stale/fail-open behaviors.

Fix all of them.

## 16.1 Missing issue time

Current:

```text
isWeatherAvailableAtCutoff(NULL)
→ true
```

This is unsafe.

Required:

```text
missing issue time
→ not cutoff-safe
```

## 16.2 Missing available_at

`selectOperationalWeather()` currently rejects `availableAt > cutoff` but allows `availableAt=NULL`.

Required:

```text
available_at NULL
→ not operationally usable
```

unless the Plan explicitly defines a different verified availability source.

## 16.3 No benign numeric imputation

Current default weather signal fabricates values such as:

```text
wind = 0
gust = 0
visibility = 10
ceiling = 99999
risk = 0
```

for missing weather.

The Plan requires missing weather to remain explicit missing/NULL.

Do not turn unknown weather into good weather.

Use:

```text
weather_missing=true
source=NULL/none
numeric fields NULL
```

as appropriate.

## 16.4 Remove global K-prefix heuristic

Current unknown 3-letter IATA codes fall back to:

```text
K + IATA
```

This is invalid for a global experiment.

Use verified airport reference/frame mapping:

```text
IATA ↔ ICAO ↔ timezone
```

No heuristic global airport identity.

## 16.5 Complete operational hierarchy

The code comments state operational precedence but current retrieval path primarily implements latest METAR and leaves other sources incomplete.

Implement the Plan-required operational retrieval architecture:

* live METAR;
* archive/as-known METAR where applicable;
* frozen GFS/NAM fallback if binding;
* TAF/amendment semantics where binding;
* ERA5 retrospective-only;
* source/version;
* issue time;
* retrieval/available time;
* maximum operational lookback;
* explicit missingness.

Do not fetch today's latest METAR and call it an as-of observation for a historical cutoff.

For historical/as-of cutoffs, retrieve the qualifying observation that actually existed by that cutoff.

## 16.6 Required tests

* issueTime NULL → excluded;
* availableAt NULL → excluded;
* issue after cutoff → excluded;
* availability after cutoff → excluded;
* observation >6h old → weather_missing;
* no qualifying source → all weather values explicit missing, not benign defaults;
* ERA5 operational → refused;
* archive fallback respects cutoff;
* TAF amendment after cutoff excluded;
* global IATA mapping has no K-prefix fallback.

# 17. PHASE 0J — ADAPTIVE REGIONAL SAMPLING

`adaptiveMi_v3.ts` is currently implementing an older design and MUST be rewritten to the binding Plan.

The current stale implementation includes old behavior such as:

```text
m_i lowerBound = 0.001
m_i upperBound = 1.0
warmupObservations = 4
simple-average warmup
repeated zero threshold = 3
minimumPi = 0.001
coverage boost during first 20 days after frame inclusion
probe result seeding
```

Those are not the binding rules.

Implement exactly:

## 17.1 Initial Phase-6 state

Every eligible REGIONAL airport:

```text
m_i = 1.0
m_i_initial_source = uniform

ema_yield_i = NULL
ema_initial_source = none

zero_yield_state = normal

probe yields DO NOT seed adaptive state

never-observed:
coverage_floor_eligible = true
coverage_boost_i = 1.5
coverage_age = NULL
```

## 17.2 EMA

For first valid NONEMPTY completed Phase-6 observation:

```text
ema := yield
```

Thereafter:

```text
ema :=
0.5 * new_yield
+
0.5 * previous_ema
```

No warmup simple average.

No probe-seeded EMA.

No daily clock update.

Update only after completed valid airport observation.

## 17.3 m_i

Calculate reference median exactly from the binding eligible REGIONAL pool.

Then:

```text
raw_m = ema_yield_i / median_ema_yield_frame

m_i = clamp(raw_m, 0.25, 1.5)
```

If no valid EMA or median pool empty/nonpositive:

```text
base m_i = 1.0
```

Hard cap score at:

```text
traffic_prior * 1.5
```

## 17.4 Zero-yield state machine

Sole current rule:

```text
normal
  first valid complete empty
→ zero_yield_once

zero_yield_once
  second consecutive valid complete empty
→ zero_yield_repeated

zero_yield_repeated
  >=5 consecutive empties
  OR 30 days of empties
→ zero_yield_persistent
```

Provider error/auth/rate limit/timeout/parser/coverage failure is NEVER a zero-yield observation.

`zero_yield_once`:

* no numeric penalty;
* excluded from adaptive evidence as specified.

`zero_yield_repeated`:

```text
m_i = clamp(base_m_i * 0.75, 0.25, 1.5)
```

Prior valid EMA remains according to Plan.

`zero_yield_persistent`:

* no fabricated EMA update;
* excluded from reference median;
* manual review;
* remains selectable through coverage rule until properly adjudicated.

Successful observation returns state to normal and removes transient repeated penalty.

Every transition append to `m_i_history`.

## 17.5 Coverage boost

Binding rule:

```text
if NEVER had successful qualifying Phase-6 direct observation
OR last successful qualifying Phase-6 direct observation >=20 days ago:
    boost = 1.5
else:
    boost = 1.0
```

Current code does the reverse-ish rule using recent frame `built_at`.

Remove that.

Frame build date is not coverage age.

Only a successful valid Phase-6 direct observation resets coverage age.

Unsuccessful draw/provider failure does not.

## 17.6 Probability

For each eligible REGIONAL airport in selected tier×region cell:

```text
adaptive_score_i =
traffic_prior_i * m_i

draw_score_i =
adaptive_score_i * coverage_boost_i

p_i =
draw_score_i / Σdraw_score
```

Requirements:

* traffic_prior_i > 0;
* m_i >= 0.25;
* Σp_i = 1;
* positive normalized probability comes from positive score;
* do NOT apply the obsolete `minimumPi=0.001` floor;
* do NOT automatically set `sampling_weight=1/p_i`;
* only final weighted draw uses randomness.

Persist:

* airport;
* region/tier;
* traffic_prior;
* EMA;
* m_i;
* zero-yield state;
* coverage eligibility/age/boost;
* draw_score;
* complete probability vector or vector hash;
* state version/hash;
* random seed;
* selected ICAO.

Replay same state/history/seed twice → identical state/probabilities/selection.

# 18. PHASE 0J — PRODUCTION FRAME / AIRPORT SELECTOR

Current controller still generates region slots dynamically using roughly:

```text
seededShuffle(FRAME_REGIONS, batch seed)
```

This violates the binding frozen calendar design.

Fix production architecture.

## 18.1 Frozen slot→region sequence

The complete sequence is materialized and hash-frozen with the calendar before Phase 6.

Production must consume, not regenerate:

```text
run_day
slot_id
tier
region
sequence/hash
replay status
```

Slot IDs include:

```text
HUB
MID_A
MID_B
REGIONAL
```

Period-2 crossover replay performs no new region draw.

Do not call `seededShuffle(all regions)` at execution time to recreate the design.

## 18.2 Eligible nonempty region set

The frozen region sequence must be based on the eligible nonempty mapped region set at freeze.

Do not pick a region known to have no eligible cell merely because it is in the six-region enum.

If an execution-time frozen cell becomes empty:

```text
REFUSED_CELL_EMPTY
```

No substitution to another region/tier.

## 18.3 HUB

When anchor enabled:

```text
frozen rotating anchor
→ consumes the single HUB slot
```

Do not silently substitute another HUB if the frozen anchor fails unless the Plan explicitly authorizes that exact frozen failure path.

When anchor mode is not used, apply the binding deterministic freshest-first HUB rule.

No seeded random shuffle.

## 18.4 MID_A / MID_B

Must:

* use separate frozen region sequence/derived seed;
* be distinct;
* deterministic freshest-first within cell;
* enforce binding 7-day exclusion;
* period-2 replay bypasses new freshness redraw.

## 18.5 REGIONAL

Load each airport's persisted current:

```text
m_i
EMA/state version
coverage age
coverage boost
```

Do not pass one global:

```text
miValue = 1
```

after Phase-6 adaptation begins.

Initial uniform 1.0 is only the frozen initial state.

## 18.6 Selection metadata

Sampling metadata must come from the actual verified frame tier/region.

Do not fall back unknown/noncatalog airports to REGIONAL for evidence labeling.

Preserve:

```text
tier
region
slot_id
draw/replay type
p_i if randomized
state hash
random seed
sequence hash
anchor replay
crossover group/period
parent batch day
segment
```

# 19. PHASE 0J — TWO-STAGE ANCHOR PROBE

Current improvements are not yet sufficient.

## 19.1 Frozen Stage-1 membership

Paid Stage 1 must load the exact hash-locked preprobe artifact.

Validate:

```text
exactly 12 unique candidates
WSSS included
OMAA included
every candidate:
  tier=HUB
  in_frame=true
  pre_eligible=true
  post_eligible=true
mapped region
valid exogenous reference inputs
ordered frozen replacement list
no duplicates across active/frozen identities
```

Do not merely validate array length = 12.

The loader must verify the artifact's SHA-256 against the expected approved/frozen artifact hash.

Merely computing and returning a hash is not verification.

Every Stage-1 path including:

```text
--icao
single candidate
batch loop
wrapper owner
```

must refuse a candidate not in the verified frozen Stage-1/replacement artifact.

The provisional source-code `SHORTLIST` may remain only as non-authoritative development/reference data and must never decide paid membership.

## 19.2 Stage-2 scoring bug

Current `selectTop5Stage2()` calls effectively:

```text
computeScores(probes, null)
```

which leaves frozen-exogenous `anchorScore` unavailable/null.

Repair it to load and hash-verify the same frozen exogenous preprobe inputs used by the scoring command.

Stage-2 selection must use real frozen `anchor_score`.

## 19.3 Ambiguity invariance

A helper named something like:

```text
ambiguityRankingInvariant()
```

existing is not enough.

Actually apply it to production promotion.

Use:

```text
confirmed_unique_lower
confirmed_plus_ambiguous_upper
```

and require final-five membership/ranking invariance under ambiguity bounds.

If not invariant:

```text
INSUFFICIENT_IDENTITY_RESOLUTION
```

Do not guess the ranking.

## 19.4 Exact top five

After valid Stage-1 evidence:

```text
capacity PASS
→ valid score
→ ambiguity invariance
→ anchor_score DESC
→ ICAO lexical exact tie break
→ EXACTLY top 5
```

If fewer than five:

* consume frozen replacements sequentially;
* run Stage 1 for replacement;
* recompute/rerank entire valid pool;
* repeat until five valid candidates or frozen replacements exhausted;
* if still <5 → Gate 2 incomplete/BLOCKED.

Do not proceed with 1–4 candidates.

## 19.5 Stage-2 confirmation failure

Every final-five member must complete valid Stage 2.

If a selected member fails Stage 2:

* remove it;
* next ranked eligible candidate can enter only after completing required Stage 2;
* rerun final-five validation;
* no unconfirmed replacement.

Final anchor pool exactly five only after all five valid confirmations.

## 19.6 Time/weekday matching

Production runner, not just scheduler helper, must enforce:

```text
time class = frozen UTC slot ±1h
weekday class matched
sequential probes
no real-time overlap
```

Cross-midnight behavior must be explicit/fail-closed.

## 19.7 Feed check

A failed/unknown free coverage/feed check must not casually log:

```text
"may still work, proceeding"
```

if the paid candidate's eligibility cannot be verified.

Transient free-check failure should DEFER/BLOCK rather than authorize a paid probe on uncertainty.

## 19.8 Probe budget day

Preserve cumulative 500-credit probe budget-day semantics.

Explicit lifecycle:

```text
OPEN
→ CLOSED when fully settled/reconciled
OR
→ MISMATCH/UNRESOLVED
```

A later probe budget day cannot begin while predecessor is:

```text
OPEN
MISMATCH
UNRESOLVED
```

Close only after:

* no active probing attempts;
* all attempt spend resolved;
* stable balance settlement;
* required reconciliation complete;
* deletion/cleanup status resolved.

Do not swallow close failure and then create a new day.

## 19.9 Probe subscription deletion

Provider DELETE failure in probe/canary must trigger the same persistent incident-stop semantics as ordinary batch deletion.

Do not simply print:

```text
"clean up manually"
```

and continue as healthy.

# 20. PHASE 0K — ALERT CREDIT / SEND ACCOUNTING

Re-audit internal and external accounting end-to-end.

Binding concepts:

```text
external authoritative settled spend =
stable balance delta

internal operational exposure =
durable SEND/delivery-attempt ledger
+ reservations/unsettled margin

received/stored row count
!= billing authority
```

Fix/verify:

A. No current-state row-count fallback can authorize more spend.

B. Missing internal attempt ledger = uncertain → PAUSE.

C. Preserve `deliveryAttempt.costCredits` where provider supplies it.

D. Preserve every delivery attempt/send identity.

E. Stable settlement:

* ≥3 consecutive identical balance reads;
* changed balance resets stability count;
* timeout → unresolved;
* no fixed one-read/fixed-sleep settlement.

F. Gate-3 reconciliation tolerance is exactly:

```text
0
```

A generic configurable tolerance must never weaken Gate 3.

G. Pre-smoke and post-smoke unsettled-burst margins remain distinct and later-frozen.

Do not hardcode an old `50` margin as binding paid behavior before measurement/freeze.

H. Budget day is immutable parent `run_day_index`, not UTC calendar day.

I. Cross-midnight sends remain attributed to owning batch/subscription.

J. Next parent batch day cannot begin before previous budget day settled/closed.

K. 2×2 child segments share one parent Alert cap.

L. REST/API categories remain completely separate from Alert-credit cap.

# 21. PHASE 0K — INCIDENT STOP / PROVIDER MUTATION ADMISSION

Persistent incident stop must be global across every provider mutation owner.

An unresolved incident must block new:

* subscription creation;
* paid probe start;
* canary start;
* Phase-6 start;
* Alert refill;
* discretionary paid REST operations;
* automatic rotation.

Define and test incident causes required by the Plan, including at least:

* provider deletion failure;
* raw persistence failure during active paid collection;
* required semantic persistence failure where safety is affected;
* reconciliation mismatch;
* unresolved settlement;
* AUTH/admission failure if it indicates unsafe state;
* unexpected/foreign subscription contamination;
* budget accounting uncertainty.

Safety cleanup may have its own narrowly authorized path, but cannot become a generic bypass.

All HTTP mutation endpoints also consult the persistent incident stop, not only `startBatch()`.

All CLI mutation owners also consult it.

# 22. PHASE 0K / PREREQUISITE-P MACHINERY — SECURITY / RETENTION

Do not falsely claim legal/Terms rights in Phase 0.

However Phase-0 security/retention machinery must be honest.

Current security verifier still creates synthetic adapters for:

```text
primary
replica
backup
object
log
```

then only makes primary partially real.

Do not claim all five deployment surfaces are production-verified from synthetic adapters.

Implement deployment-aware verification.

For each retention surface:

```text
DEPLOYED
→ real adapter / real dry-run against actual surface metadata

NOT DEPLOYED
→ explicit NOT_APPLICABLE with evidence that surface does not exist

UNKNOWN
→ BLOCKED
```

Never:

```text
synthetic adapter → production PASS
```

Dry-run only; no actual deletion during this task.

Verify:

* retention candidate discovery;
* expiry calculation;
* raw-vs-derived distinction;
* tombstone/audit evidence;
* replay-safe deletion planning;
* no secret/raw payload leakage to logs;
* least-privilege runtime role;
* TLS;
* webhook authentication/replay behavior;
* redaction.

If runtime DB role currently has broader UPDATE/DELETE privileges than needed for append-only raw tables, re-audit least privilege and narrow if practical without breaking required retention-owner separation.

# 23. PHASE 0L — CALENDAR / CROSSOVER SOLVER

Do not patch only helper assertions.

`generateExperimentCalendar()` itself must produce a valid complete frozen experiment calendar or explicit UNSAT.

Binding calendar:

```text
31 ordered parent batch-days
26 × 4h
3 × 2×2h
2 × up-to-6h
```

Actual wall-clock dates may span >31 calendar dates due to washout.

## 23.1 Parent IDs

Current generator uses one common `batchId` for all 31 days.

That is not a valid parent batch-day identity.

Each run day needs distinct immutable parent identity:

```text
run_day_index
budget_day_id
experiment_day_id
parent_batch_id
```

For a 2×2 treatment:

* one parent day;
* two active child segment IDs;
* explicit gap;
* same airport set;
* same parent treatment;
* separate subscription lifecycle per active segment;
* no subscription remains active in the gap.

## 23.2 Absolute washout

Use actual absolute UTC datetimes.

Do not compare only `HH:mm` strings.

For any repeated airport:

```text
next start - previous actual end >= 24h
```

Record:

* washout_start;
* washout_end;
* duration.

## 23.3 Six UTC slots

Each complete six-day block must use the six frozen UTC start slots once as required.

Materialize/hash the slot sequence.

## 23.4 Exact five crossover pairs

Composition:

```text
3 × (4h vs 2×2h)
2 × (4h vs up-to-6h)
```

Pair periods must satisfy:

* same frozen airport set;
* same time class;
* same weekday class;
* same evaluation partition;
* ≥24h repeated-airport washout;
* same frozen pair template;
* period-2 airport replay;
* no new slot/region/anchor draw in replay.

## 23.5 Randomization

Binding randomization:

```text
freeze pair template
→ randomize order WITHIN pair using frozen seed
```

Current code primarily hashes a seed but keeps control as period 1.

Hashing a seed is not randomization.

Actually assign which treatment occurs first/second using the frozen seed.

Persist order and hash.

Treatment/order must not depend on post-freeze observations.

## 23.6 Hard constraints cannot be disabled

Do not allow production flags such as:

```text
weekdayWeekendMatching=false
timeClassMatching=false
```

to disable binding hard constraints.

Test fixtures may not redefine the production contract.

## 23.7 Evaluation partition

Pair periods must share the same frozen evaluation partition.

Implement and test it.

## 23.8 Alert and REST feasibility

Solver must prove:

* each parent Alert cap feasible;
* 2×2 children share parent cap;
* overall Alert run ceiling feasible;
* REST category totals feasible;
* no budget borrowing.

Otherwise:

```text
UNSAT
```

## 23.9 Frozen airport/region replay

Calendar/freeze artifact must carry enough information for the controller to consume:

* slots;
* region sequence;
* pair template;
* airport set;
* anchor;
* period replay;
* treatment order.

Do not let controller recreate these later.

## 23.10 UTC deterministic date math

Avoid environment-local `Date` arithmetic that can make solver output depend on machine timezone/DST.

Use explicit UTC date arithmetic.

# 24. PHASE 0M — MANIFEST / FREEZE MACHINERY / TRACEABILITY

Current manifest added hash proof, but the required source inventory remains incomplete and still contains static claims.

Repair it.

## 24.1 Required artifact inventory

Include all active Phase-0 critical owners, including newer artifacts such as:

```text
airborneMaterializer_v39.ts
outcomeRecoveryOrchestrator_v39.ts
migrations/0032...
migrations/0033...
new migrations added by this repair
new tests
incident stop owner/state
AUTH owners/wrappers
calendar solver
adaptive sampler
probe owners
security verifier
PRE materializer
FIDS population owner
raw ingress
timestamp taxonomy
weather/history owners
```

Do not hash only an outdated subset.

## 24.2 Static claims

Current `V39_MANIFEST` still contains hard-coded:

```text
implemented: true
tested: true
evidenceId: old RUN
```

Hashing the source file does not magically make those claims current.

Completeness/proof must derive from:

* current artifact existence/hash;
* current test mapping;
* current requirement mapping;
* current evidence ID tied to current SHA;
* current schema/migration state.

Do not allow a stale old evidence ID to certify modified code.

## 24.3 Final manifest versus Phase-0 machinery

Do not fabricate future Gate values.

Phase 0 should implement the final manifest machinery and fail closed while future values remain unavailable.

Later final FREEZE will contain the required:

* provider/account/channel evidence;
* frame hash;
* preprobe record;
* selected T;
* milestone mappings;
* measured margins;
* calendar;
* anchor pool;
* adaptive config;
* weather hierarchy;
* history readiness;
* split rule;
* etc.

Unknown required future value → BLOCKED, not guessed.

## 24.4 Split rule

Freeze/hash the split-assignment RULE only before Phase 6.

Do not materialize nonexistent future test row IDs before rows exist.

Preserve chronological/group constraints.

## 24.5 Stale references

Active production code comments currently still reference historical authorities such as:

```text
MDplan/
AugMDnotes/
V3.9-f.9
old § numbers
```

Correct misleading active-code comments so future agents do not use archived design text as current authority.

Do not delete historical evidence; simply stop presenting it as binding.

# 25. PHASE 0N — MIGRATIONS / REAL SCHEMA

Do not rewrite already-applied migrations to hide defects.

Current schema is through `0033`.

Any repair requiring schema changes must use the next additive migration number(s).

Likely schema areas include:

* canonical AIRBORNE unique keys;
* AIRBORNE prediction cutoff/provenance if absent;
* identity aliases/versioning;
* adaptive Phase-6 state/history if current schema insufficient;
* durable recovery-attempt ledger if absent;
* incident state extensions if needed.

For every migration:

1. fresh database path;
2. upgrade from current schema;
3. repeat boot/idempotency;
4. constraints/indexes;
5. expected unique keys;
6. failure/rollback recovery;
7. production queries compile against actual schema.

Mandatory AIRBORNE real-schema integration test must catch nonexistent columns and wrong conflict targets.

Run:

```bash
npm run v39:migrate:check
```

after repair.

# 26. PHASE 0O — COMMAND SURFACE / AUTHORIZATION / ANTI-BYPASS

Re-audit every package script in `package.json`.

Canonical commands must be thin wrappers over a single production owner.

No `echo`-style fake PASS.

No direct unguarded mutating alias.

For every mutating command:

```text
AUTH verification MUST occur before owner spawn/provider mutation.
```

AUTH record must bind:

* exact command;
* exact phase/gate scope;
* predecessor evidence IDs;
* ceilings;
* validity window;
* approved artifact hash;
* frozen artifact hashes where applicable.

Direct owner invocation must also fail safely when mediation is missing.

Specifically re-audit:

```text
v39:smoke:safety
v39:probe:stage1
v39:probe:stage2
v39:gate3:canary
v39:gate05:pilot
v39:gate4:live-check
v39:phase6:start
refill
subscription mutation endpoints
```

Do NOT run these live during this task.

Use fake provider tests to prove refusal and call ordering.

`v39:phase6:start` architecture must prove:

```text
exact authorized freeze
+ persistent PHASE6 readiness
+ manifest hash
+ gates complete
+ incident clear
+ ADB_AUTO_COLLECT transition owner
```

not merely:

```text
environment variable manually true
+ file hash
```

Safety pause/stop must remain callable according to the Plan even when normal start AUTH is absent.

# 27. PHASE 0P — TEST SUITE REPAIR

The current green suite is not authoritative because some tests assert obsolete rules.

Rewrite stale tests before adding new ones.

## 27.1 Mandatory adaptive tests

Prove:

* initial m_i = 1;
* EMA NULL initially;
* probe results do not seed;
* first valid yield initializes EMA;
* second yield uses α=.5 recurrence;
* clamp [0.25,1.5];
* no warmup average;
* zero once on first empty;
* repeated on second empty;
* persistent after >=5 or 30-day rule;
* provider failure does not advance zero state;
* true zero does not update EMA;
* repeated penalty ×0.75;
* success resets repeated penalty;
* never observed gets 1.5 coverage boost;
* recent successful observation gets 1.0;
* > =20-day old successful observation gets 1.5;
* frame built_at has no effect;
* no obsolete minimum p=.001;
* deterministic probability replay.

## 27.2 Mandatory probe tests

* missing frozen preprobe artifact → zero provider calls/refuse;
* wrong artifact hash → refuse;
* shortlist not exactly 12 → refuse;
* WSSS missing → refuse;
* OMAA missing → refuse;
* non-HUB/nondual-eligible candidate → refuse;
* `--icao` outside frozen membership → refuse;
* 12 valid Stage1 results → EXACTLY 5 Stage2 starts;
* frozen exogenous scores actually used;
* ambiguity ranking non-invariant → no Stage2;
* <5 valid → frozen replacements consumed sequentially;
* Stage2 failure → replacement must itself Stage2 confirm;
* final pool cannot PASS with <5 confirmed;
* time/weekday mismatch → refuse;
* cross-midnight unapproved probe → refuse;
* budget-day mismatch/unsettled → next day blocked;
* deletion failure → incident stop.

## 27.3 Mandatory selector tests

* frozen slot-region sequence consumed exactly;
* same freeze replay deterministic;
* period2 no new draw;
* anchor always consumes HUB;
* anchor failure does not silently substitute;
* HUB freshest-first;
* MID_A/MID_B distinct;
* MID seven-day rule;
* correct REGIONAL `traffic_prior*m_i*boost`;
* changing airport-specific m_i changes p_i exactly;
* changing coverage age changes boost exactly;
* probabilities sum 1;
* state/probability hash stable;
* empty frozen cell → REFUSED_CELL_EMPTY;
* UNCLASSIFIED/UNMAPPED never silently treated REGIONAL.

## 27.4 Mandatory identity tests

All tests listed in Phase 0D above.

## 27.5 Mandatory FIDS tests

All FIDS/DST/failure cases above.

Provider spy must count physical attempts and prove REST reservation happens BEFORE request.

## 27.6 Mandatory PRE tests

All PRE cases above.

## 27.7 Mandatory AIRBORNE tests

Use real migrated schema in addition to fake unit tests.

## 27.8 Mandatory outcome tests

Fake provider FIDS transport demonstrating:

* +30/+120/+360 scheduling;
* original bounded query;
* max 3 attempts;
* REST reservation;
* response hash;
* +24h deadline;
* persistence;
* restart idempotency.

## 27.9 Mandatory accounting tests

* row count cannot authorize spend;
* missing delivery ledger pauses;
* costCredits retained;
* balance settlement ≥3 stable reads;
* changed read resets counter;
* unresolved timeout blocks;
* Gate3 tolerance forced zero;
* cross-midnight SEND stays with owner budget day.

## 27.10 Mandatory incident/security tests

* open incident blocks every new provider mutation owner;
* pre-Phase6 watchdog produces zero mutations;
* synthetic retention adapter cannot satisfy a real-deployment surface;
* unknown surface → BLOCKED;
* incident delete failure survives restart.

## 27.11 Mandatory weather/history tests

All weather/history cases above.

## 27.12 Mandatory calendar negative tests

Each hard rule must have a failing fixture returning/throwing UNSAT:

* wrong total days;
* wrong 26/3/2 composition;
* wrong pair count;
* wrong 3/2 contrast composition;
* time-class mismatch;
* weekday-class mismatch;
* evaluation-partition mismatch;
* frozen airport-set mismatch;
* <24h washout;
* child segment/gap violation;
* 2×2 airport-set mismatch;
* period2 redraw instead of replay;
* Alert infeasible;
* REST infeasible;
* duplicate/invalid run-day identities;
* nonrandomized pair treatment order;
* slot-sequence violation.

Also test at least one solver-generated REAL valid calendar end-to-end rather than constructing a fake calendar by hand and only testing helpers.

## 27.13 Failure-injection tests

Inject DB/provider failures at every critical boundary:

```text
raw write
semantic event write
current-state write
FIDS persistence
PRE persistence
AIRBORNE clean write
trajectory write
snapshot write
outcome write
incident write
subscription delete
settlement
REST reservation
manifest read/hash
```

The failure outcome must be explicit and fail closed.

# 28. PHASE 0Q — FULL QUALITY CLOSURE

After all repairs, perform a complete fresh conformance pass.

Required commands, on the exact clean code commit:

```bash
git status --short
git rev-parse HEAD

npm run v39:repo-intake
npm run v39:migrate:check
npm run v39:test:offline
npm run v39:test:full
npm run v39:typecheck
npm run v39:lint
npm run v39:build
npm run v39:registry:check
npm run v39:traceability:check
npm run v39:scanner
npm run v39:security:verify
npm run v39:preflight
```

If any canonical command itself is defective, fix the command/tool rather than bypassing it.

Do not replace an aggregate preflight failure with hand-selected passing commands.

`npm run v39:preflight` must aggregate the real closure checks and must fail if any required check fails.

Also run production-startup smoke **offline/fake-provider only** and prove no provider mutation.

Do NOT execute:

```text
v39:gate0:inspect
v39:gate1:coverage
v39:smoke:safety
v39:probe:stage1
v39:probe:stage2
v39:gate3:canary
v39:gate05:pilot
v39:gate4:live-check
v39:gate5:population
v39:freeze
v39:phase6:start
```

as live experiment progression during this Phase-0 repair.

# 29. COMPLETE 0A–0Q RE-AUDIT AFTER THE KNOWN FIXES

This is mandatory and is intended to prevent another "green tests but incomplete Phase 0" cycle.

After fixing every issue explicitly listed above:

Read every active Phase-0 requirement in:

```text
V3.9_IMPLEMENTATION_LOG.md §1.5.1 through §1.5.17
```

and cross-check each requirement against:

```text
Plan requirement
→ production owner
→ real caller
→ schema/migration
→ config/frozen-value owner
→ refusal/failure path
→ unit test
→ integration test
→ evidence
```

Create a temporary/internal matrix while auditing.

For every Phase-0 requirement classify:

```text
PASS
FAIL
PARTIAL
NOT_APPLICABLE
BLOCKED_LATER_LIVE_VALUE
```

Rules:

* `BLOCKED_LATER_LIVE_VALUE` is acceptable only if the Plan intentionally measures/freezes that value after Phase 0 AND Phase-0 code refuses safely until it exists.
* A later live value cannot justify missing production code.
* A helper with no production caller = FAIL/PARTIAL.
* A migration without a production owner = PARTIAL.
* a test using fake schema that cannot validate real SQL = insufficient.
* old evidence ID for changed code = stale.
* a green test proving an obsolete rule = FAIL.

Do not declare Phase 0 complete until no Phase-0 requirement remains FAIL/PARTIAL.

# 30. PRESERVE THESE CORRECT FIXES — NO REGRESSIONS

The following latest fixes were useful and must remain correct:

* raw envelope/items transaction before 2xx;
* durable raw commit available_at behavior;
* exact AUTH scope/artifact hash framework;
* FIDS raw query/population transaction;
* REST reservation immediately before physical attempt;
* frame keeps UNCLASSIFIED/UNMAPPED visible;
* dual PRE+POST frame eligibility;
* stable settlement service;
* cumulative probe exposure;
* cap censoring metadata;
* `--force` probe cleanup removed;
* OOOI aliases NULL before Gate 0.5;
* PRE T blocked before Gate 0.5;
* event-log-before-current-state ordering;
* canonical ID first-schedule component;
* persistent incident-stop table;
* provider DELETE failure does not mark local sub ended;
* row-count fallback removed from billing authority;
* evaluation Engines A/B/C/D/R/P and POST partition code that already conforms;
* report-only commit after a clean evidence SHA is acceptable.

Add regression tests so these cannot be undone.

# 31. RUN REPORT / EVIDENCE POLICY

Do NOT rewrite or delete RUN-009.

It is historical evidence that made a premature closure claim.

After this repair:

1. Finish all code/migrations/tests first.
2. Commit the repaired code.
3. Working tree must be clean.
4. Record exact code SHA.
5. Run the complete closure on that exact SHA.
6. Only after all checks pass append a new Run Report with the next unused project-convention RUN ID.
7. A report-only evidence commit after the clean code SHA is acceptable.
8. Record both:

   * code SHA tested;
   * report HEAD after appending evidence.

The new Run Report must explicitly say RUN-009 was superseded as a readiness verdict by this later conformance audit; do not alter RUN-009 itself.

Update the current status/assessment section so it no longer simultaneously presents stale 0I/0J/0K/open-schema claims and a contradictory Phase-0 PASS.

Historical sections stay preserved.

# 32. REQUIRED FINAL RUN REPORT CONTENT

The new report must include:

```text
repository
branch
code SHA
report SHA/HEAD
working tree status
ADB_AUTO_COLLECT resolved value
provider mutation count during Phase0 repair = 0
migration range
migration fresh/upgrade/repeat results
test file count
test count
typecheck result
lint result
build result
registry result
traceability result
scanner result
security result
preflight result
Phase0 0A–0Q conformance matrix
known future Gate/live values still BLOCKED
no paid provider request made
no Phase1/Gate0 action performed
```

For each substantive fix, include:

```text
Plan/Log requirement
old behavior
new production owner/path
migration if any
tests
result
```

Do not claim live provider/account/Terms facts that were not actually verified.

# 33. FINAL HANDOFF — DO NOT MOVE TO PHASE 1 YOURSELF

When the complete Phase-0 closure passes:

STOP.

Do NOT begin Phase 1.

Do NOT run Gate 0.

Do NOT run coverage Gate 1.

Do NOT freeze references.

Do NOT run probes.

Do NOT run any paid action.

Return to me with:

```text
1. final code SHA
2. report HEAD
3. concise list of files changed
4. migrations added
5. exact test total/files
6. complete command/result table
7. complete 0A–0Q PASS matrix
8. any intentionally BLOCKED later-live values
9. confirmation:
   ADB_AUTO_COLLECT=0
   paid provider mutation count=0
10. your proposed verdict:
    PHASE0_COMPLETE = YES/NO
    PHASE1_READY_FOR_INDEPENDENT_REVIEW = YES/NO
```

Do not say "Phase 1 GO" merely because you believe it passes.

I will independently review the final code/report before Phase 1 is authorized.

# 34. DEFINITION OF SUCCESS

This task succeeds only if:

```text
V3.9 methodology unchanged
+
every known Phase0 code contradiction repaired
+
every stale test repaired
+
every 0A–0Q requirement independently re-audited
+
production callers verified
+
real schema verified
+
failure paths fail closed
+
no future leakage path
+
canonical identity safe
+
sampling mechanism exactly matches Plan
+
calendar exactly matches Plan
+
billing/accounting safe
+
security/retention machinery honest
+
manifest current
+
migrations valid
+
all closure commands PASS
+
ADB_AUTO_COLLECT=0
+
zero paid/provider experimental mutation
+
new evidence report appended
+
STOP before Phase 1
```

If any of those conditions is not met:

```text
PHASE0_COMPLETE = NO
```

Do not hide a remaining defect behind:

```text
tests passed
preflight passed
helper exists
migration exists
later gate will fix it
report previously said PASS
```

The purpose of this pass is to make the Phase-0 foundation trustworthy enough that beginning the later experiment cannot silently corrupt the study.

A few of the most important additions versus my previous answer are directly grounded in the current source: the Plan requires Phase-6 REGIONAL adaptation to start at `m_i=1`, EMA NULL with **no probe seeding**, then use the exact `[0.25,1.5]` adaptive rule and the never/≥20-day coverage boost.    The current code still uses the old adaptation design, while FIDS still fabricates a date when its schedule is missing, weather still treats missing issue time as available and fabricates benign weather values, and the watchdog still has a path to automatically delete remote subscriptions before Phase 6.

I also made the prompt require a **second complete 0A–0Q audit after the listed repairs**. That part is important: it tells the coding agent not to stop at my findings, but to trace every Phase-0 Plan/Log requirement through production caller → schema → failure path → tests → evidence before it writes another PASS report.
