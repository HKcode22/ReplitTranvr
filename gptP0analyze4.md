Yes. I found the actual current files in GitHub and audited them against each other, not from memory.

The three authoritative files I used are:

`SEPmd/V3.9_DataCollectPlan_f.8.md`
`SEPmd/V3.9_IMPLEMENTATION_LOG.md`
`SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md`

I also found the two new commits after my previous audit. The real code changes are on `415af0e8455d1771dfe10295dcdc2748511263ac`; current `main` is `0a32abbddfaf0114a99f959aaea1912d06c1e926`, and that second commit is report-only. So I am **not** treating the report-only SHA movement as a Phase-0 failure.

I read the new RUN-006, RUN-007, and RUN-008 entries. RUN-008 explicitly claims `0A–0Q = PASS`, 401/401 tests, preflight 12/12, and “no remaining Phase-0 production wiring.”

After checking those claims against the current production code and the binding Plan/Implementation Log, my verdict is:

> ## 🔴 NO-GO for Phase 1 yet.
>
> **Phase 0 is still not completely correct.**
>
> This is much closer than before, and a lot of your work is genuinely fixed. But RUN-008's conclusion that all of 0A–0Q are complete is still too strong.

This is **not** another methodology redesign. I am not asking you to change V3.9. The remaining problems are cases where current code directly differs from rules already written in your existing V3.9 Plan/Log.

---

## What you successfully fixed

A substantial amount of the latest work is real and good.

The raw webhook envelope and item persistence are now a single transaction before semantic processing, with durable commit time carried forward as availability time.

The AUTH architecture is considerably stronger: the CLI/HTTP paths now bind records to exact gate scope, ledger predecessors and approved artifact hashes instead of relying on a simple enable flag.

FIDS is also much closer to the required architecture: query provenance/population persistence and per-attempt REST-unit reservation now exist. The evaluation engines A/B/C/D/R/P and POST partition machinery also now exist.

The frame database itself is improved: unclassified/unmapped airports are no longer automatically treated as ordinary REGIONAL candidates, and the production query now requires PRE+POST eligibility with mapped region and verified tier.

The probe now has stable settlement, reservation accounting, ambiguity bounds, complete-bucket stability logic, censoring metadata and removal of the dangerous `--force` cleanup path.

So this latest development cycle was not wasted.

---

# Remaining Phase-0 blockers

| Work package          | Severity | Current problem                                                                                                                                           | Why it matters                                                        |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **0J probe**          | 🔴 P0    | Stage 2 runs every candidate with a completed Stage 1 rather than the exact top five capacity-passing candidates                                          | Direct violation of Plan §9                                           |
| **0J probe**          | 🔴 P0    | Stage 1 still runs from the hard-coded provisional `SHORTLIST`, rather than the exact hash-locked frozen shortlist/replacement list                       | Paid probe membership is not yet frozen correctly                     |
| **0J/K probe budget** | 🔴 P0    | I found no production transition that closes one OPEN `probe_budget_day_id` and permits the next settled 500-credit probe day                             | Probe sequence can dead-end after the first budget day                |
| **0J selector**       | 🔴 P0    | Production selector still does not implement the frozen slot→region sequence, HUB/MID freshness rules, or REGIONAL `traffic_prior × m_i × coverage_boost` | Changes the actual experimental sampling mechanism                    |
| **0J anchor**         | 🔴 P0    | Anchor only moves to the front if random HUB selection already contains it                                                                                | Anchor is not guaranteed to consume the HUB slot                      |
| **0D identity**       | 🔴 P0    | Canonical physical-leg key omits first verified provider-native schedule identity                                                                         | Same-number/same-route same-day legs can collide                      |
| **0D identity**       | 🔴 P0    | No-provider-ID cross-midnight retime can still miss its old alias                                                                                         | Same physical flight can split into two IDs                           |
| **0F PRE**            | 🔴 P0    | PRE materializer hard-codes `dep_scheduled_utc` as T while admitting semantics are still pending Gate 0.5                                                 | Plan explicitly says T must remain BLOCKED before Gate 0.5            |
| **0D timestamps**     | 🔴 P0    | Timestamp taxonomy still calls runway→actual-gate mappings “verified”                                                                                     | Contradicts current Plan and the newer route implementation           |
| **0D/F leakage**      | 🔴 P0    | `available_at=NULL` is treated as cutoff-eligible in timestamp helper                                                                                     | Unknown availability can become future leakage                        |
| **0E event log**      | 🔴 P0    | Research-event persistence swallows DB errors, then current-state upsert can continue                                                                     | State can exist without its required immutable event                  |
| **0G AIRBORNE**       | 🔴 P0    | Live-location events are still keyed by flight/carrier/time rather than canonical flight-instance ID; no full production materializer was found           | Trajectories can merge physical flights                               |
| **0H outcomes**       | 🟠 P1/P0 | Terminalizer logic exists, but I did not find the complete production recovery orchestrator                                                               | +30/+120/+360 recovery and outcome REST budgeting are not fully wired |
| **0K safety**         | 🔴 P0    | `stopBatch()` swallows subscription DELETE failure and still marks it ended locally                                                                       | Provider subscription can remain active while DB says closed          |
| **0K accounting**     | 🔴 P0    | Internal spend can fall back from a missing ingest ledger to row counts                                                                                   | Row counts cannot be the SEND/billing authority                       |
| **0L calendar**       | 🔴 P0    | Calendar solver still does not enforce several hard crossover/washout constraints                                                                         | Experiment schedule can be declared SAT when it is not                |
| **0A/K security**     | 🟠 P1    | Retention five-surface “PASS” uses synthetic adapters and incident-stop is not integrated into production start paths                                     | Verifier proves functions exist, not actual runtime enforcement       |
| **0M manifest**       | 🟠 P1    | Manifest still contains static `implemented/tested/evidenceId` declarations rather than current artifact-hash-derived proof                               | Current manifest completeness can certify stale implementation        |

The most important ones are below.

---

## 1. The Stage-2 probe still violates the exact Plan

This one is unambiguous.

Your binding Plan says:

> **Stage 2: The top 5 capacity-passing candidates by `anchor_score` get a confirmation probe.**

It further requires exactly five, frozen replacements, reranking, and Stage-2 confirmation of every final-five member.

But current `anchor_probe.ts` does this:

```text
for each candidate in SHORTLIST:
    if it has completed stage 1:
        eligibleForStage2.push(candidate)

for each eligibleForStage2:
    runSingleProbe(stage 2)
```

So if ten candidates completed Stage 1, the script can Stage-2 probe all ten.

That is a direct code-vs-Plan contradiction.

This needs to become:

```text
load frozen preprobe artifact
→ verify exact Stage-1 candidate set
→ compute valid Stage-1 scores
→ capacity PASS only
→ ambiguity-rank-invariance PASS
→ sort anchor_score DESC, ICAO lexical tie
→ select EXACTLY top 5
→ Stage-2 those five
→ if one fails, consume next frozen replacement correctly
```

---

## 2. Stage 1 is still attached to a provisional hard-coded shortlist

The script itself says:

> “The SHORTLIST below remains the provisional candidate structure only, not frozen membership.”

But the Plan says Stage 1 must use an:

> **Exact 12 dual-eligible HUB-tier** shortlist frozen in the hash-locked preprobe record before paid execution.

This is especially important because those ten non-WSSS/OMAA candidates are intentionally **BLOCKED until the final frame/reference variables are frozen**.

The current runner therefore should not obtain its Stage-1 membership from a source-code constant. It should obtain it from the verified frozen preprobe artifact.

---

## 3. The production airport selector is still not the locked V3.9 selector

The new selector absolutely improved one thing: it now chooses tier×region before selecting the airport and refuses an empty selected cell.

But the remaining algorithm is still different from the Plan.

The current implementation chooses its region by:

```ts
seededShuffle([...FRAME_REGIONS], seed + tier.length)
```

and then HUB/MID candidates are shuffled. REGIONAL uses only:

```text
score = trafficPrior
```

The binding Plan requires something different:

* slot→region sequence is frozen with the calendar;
* MID_A and MID_B use separate balanced region sequences;
* MID is deterministic freshest-first with seven-day exclusion;
* HUB, when anchor disabled, is freshest-first;
* REGIONAL uses `traffic_prior × m_i × coverage_boost`;
* crossover period 2 replays period 1 and performs no new region draw.

And when anchors are enabled, the Plan says the anchor **consumes the one HUB slot**.

Current code instead first chooses HUB candidates, then only moves the anchor to the front if:

```ts
anchor && candidates.HUB.includes(anchor)
```

If the random HUB target region excluded the anchor, the anchor does not enter the batch at all.

That is not the locked V3.9 sampling design.

---

# 4. Identity-v2 still has a real collision problem

The Implementation Log explicitly defines the canonical physical-leg key as:

> operating carrier + operating flight number + origin + original destination + immutable `initial_service_date` + **first verified provider-native schedule identity** + collision discriminator.

Current implementation says its key is:

```text
carrier
+ number
+ origin
+ destination
+ initialServiceDate
```

and the actual hash input confirms exactly that.

So consider two real physical operated legs with:

```text
UA123
KSFO → KLAX
same origin-local service date
different scheduled departure instances
```

They currently receive the same base physical key unless an external collision suffix is separately supplied.

That is precisely why the Plan includes the initial provider schedule identity.

### Cross-midnight retime issue

When provider `flight.id` is unavailable, the webhook persistence alias is currently:

```text
carrier+flight | origin | destination | initialServiceDate
```

A later schedule retime crossing origin-local midnight derives a different service date before looking up the alias. That can miss the original identity.

The tests need an explicit:

```text
providerFlightId = NULL
23:xx local original schedule
→ retimed to 00:xx next local date
→ SAME physical flight_instance_id
```

case.

---

# 5. PRE materialization currently chooses T too early

This is another direct contradiction.

Your Implementation Log says:

> the code path must be implemented now, but the actual `selected_t_milestone` remains **BLOCKED until Gate 0.5** verifies provider-native semantics.

Yet current `materializePreSnapshotsForCutoff()` sets:

```text
selectedTMilestoneUtc = depScheduledUtc
selectedTVersion =
  "scheduled_gate_out:provider-native
   (milestone semantics pending Gate 0.5)"
```

and builds the snapshot.

“Pending Gate 0.5” and “use it as T” cannot both be true.

Before Gate 0.5, the correct production behavior is:

```text
verified selected-T config absent
→ T unavailable
→ horizon BLOCKED
→ no fabricated PRE prediction snapshot
```

After Gate 0.5:

```text
load frozen selected-T construct/version/hash
→ first verified T for physical flight
→ immutable cutoff generation
```

---

# 6. Your timestamp tests are still proving an old assumption

This is one of the strongest explanations for how the repo can report **401 passing tests while Phase 0 is still wrong**.

`timestampTaxonomy_v3.ts` currently declares:

```text
departure.runwayTime.utc
→ actual_gate_out_utc
verified = true
```

and:

```text
arrival.runwayTime.utc
→ actual_wheels_on_utc
verified = true
```

`buildSnapshotTimestamps()` then copies these values.

But the current Implementation Log says all such unverified OOOI/ASPM mappings remain NULL until Gate 0.5 verifies their exact provider-native semantics.

Interestingly, the newer webhook route does the correct thing and keeps actual aliases NULL.

So you now have **two different semantic owners giving two different answers**.

There is also:

```ts
if (availableAt === null) return true;
```

in `isAvailableAtCutoff()`.

Unknown availability cannot safely mean “available before cutoff.”

These stale tests/helpers should be corrected before Phase 0 closure.

---

# 7. The immutable event-log-before-state rule is still breakable

The intended architecture is:

```text
durable raw
→ immutable semantic event
→ mutable current state
```

Current `appendResearchEvents()` catches its own DB error and does not propagate it.

Then the route calls:

```text
appendResearchEvents(...)
→ researchAppended = true
→ upsertFlightNotifications(rows)
```

Because the lower function swallowed the exception, `researchAppended=true` can be recorded even when no research event was actually written, and mutable state can still be updated.

That violates Phase 0E's event-log-before-state contract.

A raw payload can still be safely acknowledged after its durable raw commit if your policy allows that, but the semantic processing attempt needs to become a failure/partial state and **must not silently advance current state without its research event**.

---

# 8. AIRBORNE still does not use the canonical physical-flight identity end-to-end

The database tables exist.

But the current production webhook deliberately does not resolve canonical identity for live-location rows:

```ts
if (r.hasLiveLocation === true && r.locReportedUtc)
    return null;
```

and then uses `researchEventKey(flightNumber, carrier, locReportedUtc, ...)`.

Migration 0020 likewise organizes clean trajectories around a `flight_key` such as flight number/carrier, not the canonical `flight_instance_id`.

That is dangerous for:

* repeated flight numbers across service dates;
* codeshares;
* multiple same-day physical legs;
* retimes.

Also, `airborneSnapshotBuilder_v3.ts` is presently a pure builder; it does not itself implement the production:

```text
raw_airborne_events
→ clean_airborne_points
→ flight_trajectory
→ flight_airborne_snapshots
```

materialization chain.

The existing airborne test is largely timestamp/helper testing rather than a complete DB/materializer pipeline proof.

So Phase 0G is not yet closed.

---

# 9. `stopBatch()` can claim cleanup succeeded when the provider deletion failed

Current code:

```ts
try {
    await deleteSubscription(...)
} catch {
    // keep going
}

UPDATE adb_collection_subs
SET ended_at = now()
```

This is unsafe for a paid experiment.

If provider DELETE failed, you can have:

```text
provider subscription = still ACTIVE
database subscription = ended
controller = thinks batch closed
```

Your Plan specifically says persistence/reconciliation/**deletion** failures trigger incident stop and disable new experimental subscriptions pending review.

The new incident-stop helper exists, but this production failure path does not use it.

This should be fail-closed.

---

# 10. The calendar solver is not yet a real implementation of the locked calendar constraints

This is another major issue that was already present before the round-3 patch.

The Plan requires the solver to enforce:

* exact 26/3/2 shape composition;
* every six-day block uses all six UTC slots;
* exactly five crossover pairs;
* same frozen airport set in paired periods;
* same time class;
* same weekday class;
* same train/validation/test partition;
* ≥24h actual **end→start** washout;
* seeded order randomization within the pair;
* period-2 airport replay;
* budget feasibility;
* UNSAT instead of relaxing a hard condition.

But current `generateExperimentCalendar()` literally contains:

```ts
// Validate washout between consecutive days
for (...) {
    const ...
    const ...
    const earliest = ...
    // washout validation...
}
```

with no actual validation or refusal.

Current crossover assignment checks shape and weekday class, but not the full matching constraints. And this:

```ts
const orderHash = sha256(seed + pair IDs)
```

does not actually randomize which shape goes first.

The tests themselves currently configure:

```text
weekdayWeekendMatching = false
timeClassMatching = false
```

in their base constraints.

So 0L cannot truthfully be PASS yet.

---

## 11. Security/retention is better, but its PASS is partially synthetic

The latest verifier does perform useful **live** checks of the dedicated DB role and webhook configuration. That part is meaningful.

But its retention five-surface check creates artificial adapters in memory:

```text
primary
replica
backup
object
log
```

with fake `${surface}-probe` objects and then proves the generic dry-run function handles them.

That's a good unit test for the retention engine, but it is not proof that your actual primary DB, backup/replica, object storage and application logs are hooked into that engine.

Similarly, incident-stop behavior is currently demonstrated by calling the pure function in the verifier; it is not yet the state that `startBatch()`/subscription creation consistently consult after a real deletion/persistence/accounting incident.

So RUN-008's wording:

> “five-surface retention dry-run + … incident-stop”

is technically true as a machinery test, but too strong if interpreted as production integration.

---

# Why did all 401 tests and preflight still pass?

Because **the preflight only proves the tests and checkers that exist**.

Current aggregate preflight runs:

```text
repo intake
migration check
offline tests
full tests
typecheck
lint
build
registry
traceability
scanner
security
ADB_AUTO_COLLECT safe-off
```

That is useful.

But it cannot detect that:

* Stage 2's production loop tests the wrong candidate set if no test checks exact top-five promotion;
* the selector uses the wrong region/adaptation mechanism if the tests only assert deterministic region-first behavior;
* a timestamp test itself encodes stale OOOI semantics;
* calendar tests do not exercise all hard matching constraints.

In other words:

> **401/401 proves implementation consistency with the current test suite. It does not automatically prove consistency with the authoritative Plan.**

That is exactly why this source-code-vs-Plan audit is necessary before spending money.

---

# The Run Report itself also needs correction

RUN-008 should remain immutable as historical evidence of what the coding agent believed at that point.

I would **not delete or rewrite RUN-008**.

But the current report should append a new entry saying that independent review found remaining Phase-0 contract gaps and therefore supersedes the RUN-008 readiness conclusion.

There is another documentation inconsistency already visible: the report's status tracker still describes 0L, 0M and 0N as partially open while RUN-008 later declares every 0A–0Q item PASS.

That should be reconciled so your teammate/agent cannot read two different current states.

---

# What I would have your coding agent fix now

Do **one final bounded Phase-0 conformance pass**. Do not redesign the Plan and do not change scientific constants merely to satisfy tests.

1. **Probe owner:** load the exact frozen 12 + replacement list from the preprobe artifact; refuse otherwise. Implement exact top-5 Stage-2 promotion, valid replacement/reranking, and explicit OPEN→CLOSED/MISMATCH probe-budget-day lifecycle.

2. **Selector:** make it consume the frozen calendar's slot→region sequence; enforce anchor-HUB consumption; HUB/MID freshness rules; pair replay; and REGIONAL `traffic_prior × m_i × coverage_boost`. Add exact deterministic-replay tests.

3. **Identity:** add first verified provider-native schedule identity to canonical key material and persist it immutably. Add distinct-same-day-leg and no-provider-ID cross-midnight-retime tests. Remove all current-date/UTC fallback identity paths.

4. **T/timestamps:** PRE materializer must require a Gate-0.5-frozen selected-T construct; otherwise BLOCKED. Remove stale runway→actual aliases and make unknown `available_at` ineligible.

5. **Event/AIRBORNE:** make research-event write status explicit and prevent state mutation after semantic-event persistence failure. Give every airborne point canonical `flight_instance_id` and implement/test the entire raw→clean→trajectory→snapshot materializer.

6. **Outcomes:** wire the target-specific recovery owner to the bounded original FIDS identity, +30/+120/+360 schedule, `OUTCOME_REST_UNIT_BUDGET`, max-three transport attempts and evidence ledger.

7. **Safety/accounting:** provider DELETE failure must leave the sub unresolved and trigger persistent incident-stop. Remove row-count fallback as a spend authority; missing SEND accounting must block/settle rather than authorize continuation. Preserve provider delivery-attempt cost when supplied.

8. **Calendar:** implement an actual constraint solver/validator for all Phase-0L hard constraints: UTC-block balance, five paired contrasts, same airport/time/weekday/eval partition, ≥24h absolute washout, seeded within-pair order, pair replay, parent/child 2×2 semantics, UNSAT on violations.

9. **Security/retention:** wire real deployment adapters/dry-run evidence for actual retention surfaces and make incident state a production admission prerequisite.

10. **Manifest/tests/report:** update stale tests to the current Plan, derive manifest proof from current hashes rather than static booleans, rerun full 0Q on a clean code commit, and append a new evidence report. A report-only commit after that is fine as long as the compare proves only the evidence file changed.

No provider SEND, subscription creation, refill, probe, canary, or paid Gate should be used to fix these.

---

# Final Phase-0 decision

| Question                                                               | Answer                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| Did I find the new GitHub push?                                        | **Yes**                                          |
| Did I find the new script/test/server files?                           | **Yes**                                          |
| Did I find/read the SEPmd report?                                      | **Yes — including RUN-006, RUN-007 and RUN-008** |
| Did I compare it to the Plan and Implementation Log?                   | **Yes**                                          |
| Are the new fixes real?                                                | **Yes, many are**                                |
| Are 401 tests / preflight evidence useful?                             | **Yes**                                          |
| Does RUN-008's `0A–0Q PASS` conclusion survive the code-vs-Plan audit? | **No**                                           |
| Is V3.9 methodology itself the problem?                                | **No**                                           |
| Should you redesign V3.9?                                              | **No**                                           |
| Is Phase 0 finally complete?                                           | 🔴 **No**                                        |
| Start Phase 1 / Gate 0 now?                                            | 🔴 **NO-GO**                                     |
| Start paid probes/canary?                                              | 🔴 **Absolutely not yet**                        |

The most important distinction is that I am **not adding new scientific requirements** here. The Stage-2 top five, frozen region sequence, identity-v2 schedule identity, Gate-0.5 T blocking, OOOI NULL rule, event-log-before-state rule, canonical airborne identity, incident stop, and crossover constraints are already written in your own current V3.9 Plan/Implementation Log. The current code has not fully reached those specifications yet.

This pass was broader than my previous reviews because I audited **0A through 0Q against the binding contract**, instead of stopping once the previously identified blockers were repaired. That is why I found stale tests and deeper production-composition issues that a green preflight could not expose.

Once those specific items are repaired, I would do one more exact-SHA review. At that point, if the production paths match the Plan and the full clean closure remains green, the correct answer should finally be **GO → Phase 1 / Gate 0**.
