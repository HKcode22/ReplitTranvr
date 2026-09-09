I reviewed the **newest GitHub `main`**, the new RUN-20260908-005 report, and the binding V3.9 Implementation Log again.

## Verdict

> 🔴 **Do not start Phase 1 yet.**
>
> **Phase 0 is still not correctly complete.**
>
> The latest push is substantially better, and several of my previous critical findings are genuinely fixed. But this deeper audit found that the Run Report is still marking Phase 0 complete while some requirements that the Implementation Log explicitly assigns to Phase 0 remain unfinished or are only partially wired.

The current GitHub HEAD I see is:

`108513d899558103bfbe1dc1082741b964eccf06`

The newest report, however, records its Phase-0 closure against **`8a2f424c...`**, the previous commit, while simultaneously saying several pieces remain open.

So this is **not** a V3.10/redesign situation. Your V3.9 scientific architecture remains the architecture to follow. The problem is that the implementation still has to fully conform to it.

### What is genuinely fixed now

Several things that were wrong in my previous audit are now actually corrected in current code.

The controller now imports and uses the shared `runSettlement()` service and performs ≥3 stable reads instead of one balance read. It also uses exact `tol=0` reconciliation.

`persistRawDeliveryItems()` now **throws** on database failure instead of silently returning 0, so the webhook route can correctly return 5xx.

The watchdog no longer indiscriminately deletes foreign subscriptions: it identifies experiment-owned IDs and refuses when a foreign active billable subscription is found.

There is now a real AUTH-record data structure and a verification function with an actual success path, instead of the previous always-refuse implementation.

Security verification now correctly distinguishes **Phase-0 machinery** from the actual provider Terms/legal-right verification that belongs later at prerequisite P.

Those are meaningful corrections.

## What still blocks Phase 1

| Severity           | Finding                                                                     | Why it still blocks Phase 0                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔴 **P0 Critical** | **Anchor probe remains legacy**                                             | Still uses UTC-day spend, fixed 10-second sleep + one balance read, `--cleanup --force`, and lacks the required ambiguity bounds/censoring/complete-bucket stability logic.                                  |
| 🔴 **P0 Critical** | **Watchdog soft-stop still uses UTC-day spend**                             | Admission was partly converted to budget-day logic, but the active-batch soft stop still calls `creditsUsedTodayUtc()`.                                                                                      |
| 🔴 **P0 Critical** | **Sampling frame/selector violates the binding Phase-0J rules**             | Unclassified airports are still coerced to REGIONAL, region uses an ICAO-prefix heuristic, core selector lacks PRE+POST+verified-tier+mapped-region requirements, and region is not selected before airport. |
| 🔴 **P0 Critical** | **FIDS → `flight_population` production path is not wired**                 | `persistPopulationRows()` exists but the actual FIDS fetch path does not call it; required provenance and REST-attempt budgeting are incomplete.                                                             |
| 🔴 **P0 Critical** | **Provider mutations still have bypass paths**                              | Legacy `npm run canary`, `anchor-probe`, and `refill` bypass the new v39 AUTH wrappers; management routes use only an `ALLOW_MANAGEMENT_MUTATIONS` boolean rather than exact AUTH.                           |
| 🔴 **P0 Critical** | **Canonical identity is still approximated in the production webhook path** | `routes_v3.ts` still builds identity using the UTC date slice rather than immutable origin-local `initial_service_date`.                                                                                     |
| 🟠 **P1 Major**    | **Raw envelope + items are not one transaction**                            | Item failure now returns 5xx, but envelope and item writes are separate DB operations, not the atomic transaction required by the Log.                                                                       |
| 🟠 **P1 Major**    | **AUTH verifier isn't actually bound to the requested gate/evidence state** | It does not compare record `phaseGate` to the wrapper's gate, uses `existingEvidenceIds: []`, and accepts a user-supplied JSON file without a hash-locked approved artifact.                                 |
| 🟠 **P1 Major**    | **Several `v39:*` commands are guard-only wrappers**                        | Smoke, Gate 0.5 pilot, Gate 4, Gate 5, Phase-6 start do not actually perform their production responsibility after AUTH passes.                                                                              |
| 🟠 **P1 Major**    | **Security/retention machinery is incomplete**                              | The verifier checks files/envs but doesn't implement/prove expiry across storage/backup/log surfaces, least privilege, dry run, incident-stop, etc.                                                          |
| 🟠 **P1 Major**    | **Evaluation engine code is still incomplete**                              | The new guard handles leakage, ablations and preregistration, but not Engines A/B/C/D/R/P that the Log explicitly says must exist/test pre-collection.                                                       |
| 🟠 **P1 Major**    | **Final evidence is against the wrong SHA**                                 | RUN-005 records `8a2f424c`; current code is `108513d...`. Phase0Q requires one exact current HEAD/schema/config evidence state.                                                                              |

### 1. Anchor probe is definitely still a blocker

This is the clearest contradiction in the new Run Report.

RUN-005 itself admits:

> “Settlement adoption into probe run paths ... anchor_probe runner adoption = next integration”

But Phase 0J explicitly requires the **probe code now**, including the immutable 500-credit probe budget day, shared settlement, ambiguity bounds, complete 15-minute buckets, minimum stability sample, cap censoring, and deterministic ranking behavior.

Current `anchor_probe.ts` still imports:

`creditsUsedTodayUtc`

and defines the 500-credit probe cap as a UTC-day concept.

After the probe it still performs:

```text
delete subscription
sleep 10 seconds
getBalance once
calculate balanceBefore - balanceAfter
```

rather than `runSettlement()`.

And `--cleanup --force` can still delete untracked ACTIVE subscriptions.

So **Phase 0J is not finished**.

### 2. Budget-day accounting is only partially fixed

`startBatchInner()` has genuinely improved. It now checks the previous immutable budget-day state rather than resetting simply because UTC midnight happened.

But during an ACTIVE batch the watchdog still does:

```text
usedToday = creditsUsedTodayUtc()
softStop = dailyCreditCap - softStopMargin
```

and stops according to that UTC-day value.

That means a batch spanning UTC midnight could have part of its spend disappear from the authoritative soft-stop calculation.

So the report's claim that UTC-day accounting is now “diagnostic-only” is **not true yet**.

### 3. The sampling frame is still scientifically noncompliant

This one is important because it can directly alter **which airports enter your experiment**.

The binding Log says:

* `UNCLASSIFIED` must remain visible;
* never blanket-map it into REGIONAL;
* no unstated ICAO-prefix region fallback;
* core slots require PRE+POST eligibility, verified tier, and mapped region;
* **region must be selected before airport**;
* empty tier×region cell = REFUSE, not substitution.

Current `build_stratified_catalog.ts` still says universe airports outside the curated catalog become:

```text
tier = REGIONAL
tier_source = unclassified
traffic_prior = 1
```

and uses ICAO first-letter mapping for macro-region.

The actual code does exactly that, and `persistFrameToDb()` even deletes the current active frame before inserting the rebuilt one rather than preserving versioned frame history.

Meanwhile the production controller's candidate query is still effectively:

```sql
WHERE in_frame = true
  AND post_eligible = true
```

and draws by tier rather than tier×region. It does not enforce the full binding dual-eligible/verified-tier/mapped-region core rule.

That is **not a minor documentation issue**. It affects sampling validity.

### 4. FIDS population is still not actually production-wired

The Log requires Phase 0 to make this real:

```text
AeroDataBox airport FIDS
→ immutable/versioned query/response provenance
→ flight_population
→ PRE snapshots
```

Current `fetchFidsPopulation()` still calls `fetchFidsAirport()` directly and writes its raw FIDS information into the legacy `adb_ingest_events` table.

There **is** now a `persistPopulationRows()` helper, but the normal `fetchFidsPopulation()` / `fetchBatchFidsPopulation()` path does not call it. And the SQL written by that helper does not yet carry all the required query direction, population role, timezone, retrieval, available-at, scope/codeshare and version-pin information.

The limiter's current FIDS method also directly issues the REST request; it doesn't reserve/debit the proper REST category before every physical attempt as required by Phase 0C.

The report itself admits “provider fetchers” remain open.

That is not a Gate-1-only issue. **The live measurement happens later; the production path has to exist now.**

### 5. Exact AUTH still has bypasses

The new AUTH module is a good start, but there are two separate problems.

First, `package.json` still exposes these direct commands:

```text
npm run canary
npm run anchor-probe
npm run refill
```

in addition to the guarded `v39:*` commands.

`refill_credits.ts` explicitly calls the billing refill endpoint when given an amount and contains **no AUTH verification**.

So the system is still capable of:

```text
operator → legacy command → provider mutation
```

without the canonical V3.9 authorization system.

Second, management HTTP routes now use:

```text
ALLOW_MANAGEMENT_MUTATIONS=true
```

as the mutation gate.

Once that single boolean is true, refill/create/delete can call the provider directly.

Your binding Log requires exact AUTH + state/phase + budgets/evidence, not merely a boolean kill switch.

### 6. The AUTH verifier needs another correction

`verifyAuthRecord()` currently validates that a record has **some** `phaseGate`, but it doesn't validate:

```text
record.phaseGate == the gate currently being executed
```

And the wrapper currently calls it with:

```ts
existingEvidenceIds: []
```

instead of actually loading the evidence ledger.

That creates two problems:

* a legitimate record requiring predecessor evidence cannot pass;
* a locally constructed record with an empty predecessor list can potentially pass even though no actual gate evidence has authorized it.

This needs to become a genuinely **hash-locked, evidence-bound authorization artifact**, not simply “JSON file supplied by caller.”

### 7. Some supposedly “wired” commands still don't do anything after AUTH

For example, current `v39:phase6:start` is:

```ts
enforcePaidGuard(...)
```

and then the file ends.

The same pattern exists for safety smoke, Gate 0.5 pilot, Gate 4 and Gate 5.

If the AUTH succeeds, those commands don't actually perform their required operation.

And this matters because your Log specifically says:

> a non-echo mapping is **not automatically runnable or PASS-capable**; implement the production owner first and then the wrapper.

The test currently mostly checks “it's a `.ts` file and not `echo`,” which is too weak to prove this requirement.

### 8. Security/retention Phase-0 machinery still isn't complete

The current verifier now has the correct **conceptual separation** between Phase-0 machinery and later Terms verification.

But its actual machinery checks are only:

* webhook secret/base URL;
* DATABASE_URL;
* rawIngress file exists;
* redact file exists.

The binding Log requires much more before Phase-0 exit: least-privilege DB path, TLS/auth/compensating control, retention expiry execution across primary/replica/backup/object/log surfaces, a dry-run, incident-stop behavior, etc.

I did not find a corresponding retention/expiry implementation in the current disruption modules/scripts/tests.

So `security:verify = PASS` currently means much less than the Log's Phase-0 security PASS definition.

### 9. Evaluation guard is useful, but it isn't all the evaluation code the Log requires

The new `evaluationGuard_v39.ts` has good mechanics for:

* preregistration;
* ablation arms;
* leakage checks;
* protected-test read state;
* info-per-credit.

But the binding Log explicitly says that **before collection** code must exist/test for:

Engine A chronological, B unseen airport, C unseen region, D unseen tail, R unseen route, P population audit and POST grouped/chronological evaluation.

Those are not implemented by `evaluationGuard_v39.ts`.

Model fitting belongs later in Phase 7; **the evaluation partition/engine machinery does not**.

---

# The Run Report has a direct internal contradiction

RUN-005 says:

> “Full closure re-run green.”

but then says:

> “What remains honestly open: settlement adoption into probe run paths, 0D join wiring, provider fetchers…”

Those first three are not merely Gate-future measured values. They correspond to production paths the binding Implementation Log puts inside Phase 0.

So I would change the report's status from:

> `Phase 0 = COMPLETE`

to:

> **`Phase 0 = BLOCKED — implementation closure remaining`**

until the items above are fixed.

---

## What you should do next

Do **not** redesign V3.9 and do **not** start Phase 1 yet.

The remaining repair should be one bounded closure pass:

1. finish `anchor_probe.ts` to the actual Phase-0J contract;
2. eliminate UTC-day authority from the controller soft-stop;
3. repair the sampling frame/region/tier/core-selector implementation;
4. production-wire FIDS → full immutable `flight_population` + per-attempt REST ledger;
5. remove or AUTH-gate all legacy direct mutation commands and replace `ALLOW_MANAGEMENT_MUTATIONS` with the canonical exact AUTH state machine;
6. bind AUTH to the exact phase/gate, evidence ledger, scope, ceilings, expiry, hashes and approved artifact;
7. fix production identity to use immutable origin-local `initial_service_date`;
8. make raw envelope+items one transaction and derive `available_at` from actual durable persistence;
9. implement the missing security/retention dry-run controls;
10. finish the required pre-collection evaluation engines and remaining calendar/manifest hard constraints;
11. make each `v39:*` command actually perform its responsibility after authorization rather than being guard-only;
12. then commit everything and run **the entire Phase-0Q closure again on that exact final SHA**.

The final report must say something like:

```text
git_inspected_commit = <exact current main SHA>
working_tree = clean
schema = <exact version/hash>
0A–0Q = PASS
TEST-001–028 required offline portions = PASS
preflight = PASS
no remaining Phase-0 production wiring
ADB_AUTO_COLLECT = OFF
```

Then stop and give it to me once more.

### Bottom line

**Current state: NO-GO for Phase 1.**

This latest push fixed several serious issues and is moving in the right direction, but Phase 0 is **still not scientifically/operationally closed according to its own Implementation Log**. The biggest remaining blockers are the **sampling frame, FIDS population production path, anchor-probe implementation, authorization bypass paths, identity wiring, and truthful final-current-HEAD evidence**.

Once those are fixed, I would expect the next review to finally be **GO → Phase 1 / Gate 0**, rather than another redesign.
