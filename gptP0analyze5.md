I found the new push and re-audited the actual code again.

Current `main` is **`f2d401bb2fa4aba317fa29c40dd879f45bf0d9a2`**. The substantive code fixes are in the immediately preceding clean commit **`37b570d793bd2f9a1e00df3e3ae42f2b816d8ed8`**, which is the SHA RUN-009 claims as the Phase-0 closure state. RUN-009 reports `415/415` tests, migrations through `0033`, aggregate preflight `12/12`, and `0A–0Q = PASS`.

After comparing the **new production code itself** against the binding V3.9 Plan and Implementation Log, my answer is still:

# 🔴 Do **not** move to Phase 1 yet

Unfortunately, RUN-009 is again over-declaring Phase 0 as complete.

This new push **did fix many of the specific things I identified last time**, so the work was useful. But this deeper pass found several concrete production-code contradictions that the 415 passing tests did not catch.

Most importantly, I found one entire subsystem—the REGIONAL adaptive sampling machinery—that was **not changed by this push at all and is still implementing an older design that directly contradicts the current Plan**.

---

## What actually worked this time

Several of my previous blockers are genuinely fixed now.

* PRE materialization now refuses to fabricate T when there is no Gate-0.5-frozen selected-T configuration. It returns `t_unavailable` and builds zero snapshots. That's correct.
* `runwayTime` is no longer treated as a verified actual OOOI milestone before Gate 0.5, and `available_at=NULL` is no longer considered cutoff-safe by `isAvailableAtCutoff()`.
* Event-log persistence now throws, and the webhook blocks current-state mutation when the immutable research event fails.
* Live-location rows now attempt canonical flight identity resolution.
* Provider subscription deletion failure is no longer silently marked closed; it leaves the subscription unresolved and persists an incident stop that future starts consult.
* The probe has a real OPEN→CLOSED budget-day lifecycle now.
* Anchor-HUB insertion itself was repaired: the anchor is now forced to the front rather than only used when the random HUB draw happened to contain it.
* Identity now includes the first verified schedule identity in the canonical hash.
* New migrations 0032/0033 exist for canonical AIRBORNE identity and persistent incident stop.

So this is significantly better than the previous push.

But the following remaining issues are Phase-0 blockers.

---

# 1. 🔴 The REGIONAL adaptation algorithm is still the old algorithm

This is probably the single strongest blocker I found.

The binding Plan requires:

* `m_i ∈ [0.25, 1.5]`;
* first valid Phase-6 yield initializes EMA directly;
* thereafter `EMA = 0.5 × current + 0.5 × previous`;
* **no warm-up average**;
* probe results **do not seed** Phase-6 adaptation;
* initial Phase-6 state is `m_i=1.0`, EMA `NULL`, zero-yield state `normal`;
* coverage boost `1.5` applies when the airport has **never had a successful qualifying Phase-6 direct observation or its last one is ≥20 days old**;
* a true zero advances the zero-yield FSM but **does not update EMA**;
* repeated state occurs after the second consecutive valid empty observation.

But the current `adaptiveMi_v3.ts` still has:

```text
lowerBound = 0.001
upperBound = 1.0
warmupObservations = 4
repeatedThreshold = 3
persistentDays = 20
minimumPi = 0.001
```

It uses a simple-average warmup before EMA. Its coverage boost is based on time **since inclusion in the frame**, not time since the last successful Phase-6 observation. And `freezePhase6InitialState()` explicitly allows probe results to seed Phase-6 adaptation.

Worse, the tests are affirmatively testing the wrong behavior. They expect:

* airport included 10 days ago → boost eligible;
* airport included 26 days ago → not boost eligible;
* probe results → `m_i_initial_source="probe_results"`;
* probe results → EMA seeded from probe results.

Those are the opposite of the binding current Plan.

So the **415/415 test result is misleading here**: the tests pass because the tests themselves are stale.

### This alone prevents Phase 0 from closing.

---

# 2. 🔴 Stage-2 anchor promotion has a new production bug

The new probe code correctly introduced `selectTop5Stage2()` and frozen shortlist loading.

But look at the key line:

```ts
const scored = computeScores(probes, null);
```

Then immediately:

```ts
const stage1Valid = scored.filter(
  s => s.capacityPass &&
       s.anchorScore !== null &&
       s.yieldScore !== null
);
```

The same script's actual scoring path requires the frozen exogenous artifact:

```ts
const frozen =
  await loadFrozenExogenousInputs(...);

const scored =
  computeScores(probes, frozen.inputs);
```

Without frozen inputs, `anchorScore` remains null.

So `selectTop5Stage2()` effectively asks:

```text
compute scores WITHOUT exogenous inputs
→ anchorScore = NULL
→ filter for anchorScore != NULL
→ zero candidates
```

Meaning the newly implemented Stage-2 top-five path can refuse everyone even when Stage 1 was successfully completed.

The Plan requires the top five capacity-passing candidates **by `anchor_score`** from the frozen preprobe references.

The fix is straightforward:

```text
selectTop5Stage2()
    ↓
load same verified frozen exogenous artifact
    ↓
computeScores(probes, frozen.inputs)
    ↓
capacity PASS
    ↓
ambiguity-rank invariance PASS
    ↓
anchor_score DESC
    ↓
ICAO lexical tie
    ↓
exact top 5
```

It also needs the replacement protocol rather than merely returning fewer than five.

---

# 3. 🔴 The production airport selector still does not use the frozen slot→region calendar

This was partially fixed, but not fully.

The current production selector still constructs the region choices dynamically with:

```ts
const regionSlots =
    seededShuffle([...FRAME_REGIONS],
                  seed + tier.length);
```

The binding Plan says the opposite:

> freeze and hash the **complete slot→region sequence with the calendar**, then the production selector consumes that frozen sequence; MID_A/MID_B use their own derived region sequences, and crossover period 2 replays period 1 without a new region draw.

So every Phase-6 batch should not re-create its region assignment from a fresh batch seed.

It should receive something conceptually like:

```text
run_day_07
HUB      → Europe
MID_A    → North America
MID_B    → Asia-Pacific
REGIONAL → South America
```

from the already frozen calendar/manifest.

Then choose an airport **inside those cells**.

---

# 4. 🔴 REGIONAL weighting in the controller is also wrong

The latest code now multiplies:

```text
traffic_prior
× miValue
× coverageBoost
```

which is directionally correct.

But production calls it with:

```text
miValue = 1
```

globally, rather than each airport's current persisted `m_i`.

And the coverage boost function currently uses `frame.built_at` and gives `1.5` to an airport whose frame row is **recent**:

```text
daysSince <= 20 → 1.5
```

The binding rule is:

```text
never successfully observed in Phase 6
        OR
last successful observation ≥20 days ago
        ↓
coverage_boost = 1.5
```

Freshly and successfully observed airports get `1.0`.

So the current implementation is essentially boosting the wrong side of the age rule.

---

# 5. 🔴 The new no-provider-ID identity fix can merge different daily flights

One identity issue was fixed but another was introduced.

The canonical hash itself is improved. It now includes the immutable first verified schedule identity.

But the database alias used when AeroDataBox `flight.id` is absent was changed to:

```text
carrier + flight number
| origin
| destination
```

It deliberately removes service date and schedule time so a cross-midnight retime still finds the original record.

That solves:

```text
UA123 LAX→SFO
Sep 1 23:40
retimed to Sep 2 00:15
```

But now consider:

```text
UA123 LAX→SFO — Sep 1
UA123 LAX→SFO — Sep 2
UA123 LAX→SFO — Sep 3
```

with no provider flight ID.

They all share the same alias.

The persistence layer can therefore reuse the first physical `flight_instance_id` for subsequent real daily legs.

The new test checks the cross-midnight retime case, but not the essential inverse test:

```text
same carrier/number/route
+ genuinely new service day
+ no provider ID
→ MUST NOT reuse yesterday's physical leg
```

The correct solution cannot simply remove every date/schedule discriminator from the alias. It needs a stable schedule-version/alias strategy capable of distinguishing:

* same physical flight retimed across midnight, versus
* actual next scheduled day's distinct physical flight.

If that distinction cannot be proven, it needs to stay ambiguous rather than silently merge.

---

# 6. 🔴 The new AIRBORNE materializer would fail against the real schema

This is a very concrete production bug.

The new `airborneMaterializer_v39.ts` inserts canonical identity into `clean_airborne_points`, then later runs:

```sql
SELECT flight_number, carrier_iata
FROM clean.clean_airborne_points
WHERE flight_instance_id = $1
```

But the actual schema for `clean_airborne_points` contains:

```text
raw_event_id
flight_key
event_timestamp
...
```

It does **not** contain `flight_number` or `carrier_iata`.

Migration 0032 only adds:

```text
flight_instance_id
```

to that table. It doesn't add those two missing columns.

So that SELECT will fail on the actual Neon schema.

Why didn't the tests catch it?

Because `airborne_materializer_v39.test.ts` uses a fake in-memory DB router and simply fabricates the response to the `LIMIT 1` query instead of having PostgreSQL validate the columns.

That's exactly the kind of thing a green unit suite can miss.

---

# 7. 🔴 AIRBORNE still has old uniqueness keys underneath canonical identity

There are two more AIRBORNE problems.

`flight_trajectory` still has:

```text
UNIQUE(flight_key)
```

where `flight_key = flight_number|carrier`.

And the materializer inserts with:

```sql
ON CONFLICT (flight_key) DO NOTHING
```

So two distinct physical legs that reuse the same carrier/flight number can still collide even though you added `flight_instance_id`.

Likewise `flight_airborne_snapshots` still has:

```text
UNIQUE(flight_number,
       carrier_iata,
       event_timestamp)
```

rather than canonical:

```text
UNIQUE(flight_instance_id,
       event_timestamp)
```

Migration 0032 adds an index on canonical identity, but it does not replace these legacy uniqueness constraints.

That means canonical identity has been **added as metadata**, but it has not yet become the database identity owner everywhere it needs to be.

---

# 8. 🔴 AIRBORNE denominator is still circular

The new materializer does:

```ts
buildAirborneSnapshot({
    flightInstanceId: inst,
    airborneEligible: true,
    ...
});
```

for flights it found in the webhook airborne-point table.

But the binding design requires:

```text
airborne_eligible
=
flight_population
∩
independently verified provider-native
evidence that the flight actually became airborne
```

A captured webhook point cannot itself define the denominator.

So this needs an independent eligibility join, not unconditional:

```text
airborneEligible = true
```

---

# 9. 🔴 The “outcome recovery orchestrator” does not actually perform recovery requests

The new file sounds like the missing production owner:

`outcomeRecoveryOrchestrator_v39.ts`

But its implementation does not actually call AeroDataBox/FIDS.

It:

1. receives `actualUtc` from the caller;
2. calls `terminalizeTarget()`;
3. stores the result;
4. subtracts a number from an in-memory “remaining REST units” value;
5. sets a future recovery due time.

It does **not** implement the Plan's actual recovery operation:

```text
original bounded FIDS query identity
→ reserve OUTCOME_REST_UNIT_BUDGET
→ central FIDS client
→ physical request
→ ≤3 total transport attempts
→ response hash
→ retrieval time
→ available_at
→ match canonical flight_instance_id
→ verified actual milestone
→ terminalize/persist
```

So it currently accounts for a hypothetical REST call without issuing or processing the recovery call.

That's still Phase-0H production wiring work.

---

# 10. 🔴 Calendar solver remains incomplete despite the new tests

The latest code does now correctly reject a **time-class mismatch**. That's a good fix.

But several binding R6 requirements are still only comments, not actual solver logic.

For example, it still does:

```text
31 consecutive dates
slot = day % 6
first 26 = 4h
next 3 = 2x2h
last 2 = up-to-6h
```

rather than solving the full constrained schedule.

More importantly, its supposed treatment-order randomization is still:

```ts
const orderHash =
  sha256(seed + pair IDs);
```

It hashes the seed, but does not actually randomize:

```text
control first
vs
alternative first
```

for each pair.

I also could not find actual code enforcing:

* same evaluation partition between pair periods;
* same frozen airport set;
* period-2 airport replay;
* slot→region sequence;
* pair treatment-order randomization.

Those appear in comments, not actual enforcement.

The new tests likewise build a special artificial `satisfiableCrossoverCalendar()` and test time-class/weekday/orderability, rather than proving the generated production calendar itself satisfies the complete V3.9 solver contract.

---

# 11. 🟠 Retention verification is still not really five production surfaces

This also improved, but RUN-009's description is still too strong.

The verifier still begins by constructing synthetic adapters for:

```text
primary
replica
backup
object
log
```

It then replaces **primary only** with a read of `clean.retention_tombstone`.

Replica, backup, object and log remain synthetic fake adapters.

And reading the tombstone table proves audit records exist; it doesn't prove the actual raw-content expiry/deletion path for the primary data itself.

So “five-surface production retention machinery verified” is still not established.

---

# 12. 🟠 The new hash-derived manifest still hashes an incomplete static manifest

`manifest_v3.ts` now has a useful hash-proof function. That's a genuine improvement.

But the source list it hashes is still `V39_MANIFEST`, which contains hard-coded entries like:

```text
implemented: true
tested: true
evidenceId: RUN-...
```

and, importantly, I do not find the newly critical artifacts in that manifest, such as:

```text
airborneMaterializer_v39.ts
outcomeRecoveryOrchestrator_v39.ts
0032_airborne_canonical_identity.sql
0033_incident_stop.sql
```

The proof hashes **the entries it knows about**; it cannot prove completeness for files absent from its required set.

So 0M still needs its inventory updated.

---

# A smaller leakage helper remains stale too

`isAvailableAtCutoff(null)` was fixed correctly.

But `isFeatureEligible()` still effectively permits:

```text
informationAvailableAt = NULL
```

because it only rejects:

```ts
if (informationAvailableAt &&
    informationAvailableAt > cutoff)
```

For a deployable feature, unknown availability must not automatically become cutoff-eligible.

That should be brought into the same fail-closed rule.

---

# Why did 415/415 tests still pass?

I can now give you a much more concrete answer than before.

There are at least three examples where the test suite itself explains the false closure:

1. **Adaptive sampling:** tests explicitly assert obsolete rules—probe seeding, wrong boost direction, old thresholds.
2. **AIRBORNE materializer:** a fake DB never validates SQL column names against migration 0020, so the nonexistent-column query passes.
3. **Calendar:** tests construct an artificial crossover calendar rather than proving that `generateExperimentCalendar()` itself generates the full constrained V3.9 calendar.

So:

> **415/415 means the code agrees with the current tests.**
>
> It still does not mean the code agrees with the binding V3.9 Plan.

---

# Current status after this push

| Area I previously flagged              | Now                                                       |
| -------------------------------------- | --------------------------------------------------------- |
| PRE T blocked until Gate 0.5           | ✅ Fixed                                                   |
| runway→actual premature aliases        | ✅ Fixed                                                   |
| NULL `available_at` cutoff helper      | ✅ Mostly fixed                                            |
| event-log write swallowed              | ✅ Fixed                                                   |
| DELETE failure swallowed               | ✅ Fixed                                                   |
| persistent incident-stop admission     | ✅ Fixed                                                   |
| anchor guaranteed HUB position         | ✅ Fixed                                                   |
| probe budget-day close lifecycle       | ✅ Fixed                                                   |
| frozen Stage-1 membership              | ✅ Added                                                   |
| exact Stage-2                          | 🔴 **broken by null frozen scoring**                      |
| REGIONAL adaptation                    | 🔴 **still old Plan-incompatible implementation**         |
| frozen slot→region production sequence | 🔴 Still missing                                          |
| identity schedule discriminator        | 🟡 hash fixed, **alias now over-merges daily legs**       |
| AIRBORNE canonical chain               | 🔴 Added, but production/schema/denominator bugs remain   |
| outcome recovery                       | 🔴 wrapper exists, physical FIDS recovery does not        |
| calendar                               | 🔴 Still not full constraint solver                       |
| retention                              | 🟠 Partially real, still synthetic for 4/5 surfaces       |
| manifest                               | 🟠 hash proof added, required inventory incomplete        |
| exact clean closure evidence           | ✅ RUN-009 exists, but its verdict is invalidated by above |

---

# What I recommend you tell your coding agent now

Do **not** ask it to redesign Phase 0 again.

Tell it this is a **targeted conformance correction of RUN-009**, and have it fix only these areas:

1. Rewrite `adaptiveMi_v3.ts` + `adaptation.test.ts` exactly to Plan §8.2/8.3/8.6: `m_i 0.25–1.5`, α=.5 with no warmup, exact zero FSM, no probe seeding, correct ≥20-day/no-observation boost.

2. Fix `selectTop5Stage2()` to load the same verified frozen exogenous inputs used by `--score`, perform ambiguity-invariance validation, and implement exact top-five + frozen replacement/rerank protocol.

3. Make controller selection consume the frozen **slot→region calendar artifact**, not generate `seededShuffle(FRAME_REGIONS)` at runtime. Load each airport's current persisted `m_i` and last successful Phase-6 direct-observation timestamp.

4. Repair no-provider-ID identity resolution so genuine next-day recurring flights don't reuse yesterday's identity while cross-midnight retimes still do. Add both opposite tests.

5. Repair AIRBORNE schema and uniqueness:

   * no nonexistent `clean_airborne_points.flight_number/carrier_iata` query;
   * canonical unique trajectory key;
   * canonical unique snapshot key;
   * independently derived `airborneEligible`;
   * snapshot cutoff from each point's actual durable `available_at`;
   * inject later-frozen cadence thresholds rather than hard-coding them.

6. Make the outcome recovery owner perform the real bounded canonical FIDS call through the centralized REST ledger/limiter, with attempt/request/response/availability evidence.

7. Finish calendar constraints in the actual generator/solver: pair-order randomization, same partition, same frozen airport set, replay, washout, slot sequence and UNSAT behavior.

8. Finish real retention adapters and expand the manifest required-artifact inventory to include all the new Phase-0 closing modules/migrations/tests.

Then rerun Phase-0Q on one new clean code SHA and append a **RUN-010**. Do not rewrite RUN-009; preserve it as historical evidence that this audit later found additional defects.

---

# Final answer

**No, I would not move to Phase 1 yet.**

This push got substantially closer, and I can now confirm a large portion of the previous fixes really did work. But there are still **multiple objective Phase-0 production defects**, particularly the stale adaptive sampling subsystem, the broken Stage-2 scoring call, daily-flight identity collapse, the AIRBORNE schema/identity issues, and the non-functional physical outcome-recovery path.

Those are not theoretical refinements and they are not a V3.10 redesign. They are direct mismatches with rules already present in your current binding V3.9 Plan.

So the current decision is:

> **Phase 0: 🔴 NOT COMPLETE**
> **Phase 1 / Gate 0: 🔴 NO-GO**
> **Paid probe/canary/FIDS experimentation: 🔴 DO NOT START**

The strongest thing to fix first is `adaptiveMi_v3.ts` and its stale tests, because that subsystem currently proves conclusively that RUN-009's `0A–0Q PASS` cannot be correct.
