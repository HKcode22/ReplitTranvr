I reviewed both new files against the exact corrections we previously told the agents to make.

The answer is **no, I would not certify this as “fully implemented and finished” yet**.

The agents did a substantial amount correctly, especially on the **specification/documentation side**, but the files themselves prove that several things are still only **documented, stubbed, pending tests, or internally inconsistent**. This is not a new redesign of the aviation methodology. It is an implementation-completion problem.

## Overall verdict

| Area                                          | Verdict                                          |
| --------------------------------------------- | ------------------------------------------------ |
| Core aviation/research architecture           | ✅ **Still sound / locked**                       |
| 10 corrections from my previous review        | ⚠️ **Mostly incorporated into the written plan** |
| All 10 corrections cleanly applied everywhere | ❌ **No**                                         |
| FIDS population implementation                | ❌ **Stub**                                       |
| Historical feature store                      | ❌ **Stub**                                       |
| Weather as-known-at-cutoff tables/pipeline    | ❌ **Incomplete/stub**                            |
| Adaptive `m_i` / coverage floor               | ❌ **Stub**                                       |
| `available_at` leakage-safe wiring            | ❌ **Pending**                                    |
| Flight-instance/codeshare logic               | ⚠️ Code claimed, but wiring/tests pending        |
| Frame tier/region rebuild                     | ❌ **Not done**                                   |
| Manifest                                      | ❌ **Not written**                                |
| Gates                                         | ❌ **Several blocked**                            |
| Phase 6                                       | ❌ **NO-GO**                                      |

Your own current log actually admits this very clearly: FIDS is a fetcher stub, `m_i` is a stub, the historical store is a stub, the manifest is unwritten, and Gate readiness is blocked. 

So we should **not** tell ourselves “the agent implemented everything.”

---

# Checking the 10 things I told them to fix

## 1. Traffic-tier rule

### What I previously said

Do not call the tier rule frozen while it contains choices such as OAG **or** FAA/BTS, departures **or** operations, top ~7% **or** 25k.

### What they did

They fixed the wording properly. It now explicitly says these are **candidate values pending freeze**, and that one source, metric and deterministic threshold rule must eventually be selected. 

### Verdict

**✅ Specification fixed.**

But the actual final values are still not chosen and the frame has not been rebuilt. The current log explicitly calls the frame provisional. 

So:

**Document:** ✅
**Implemented/frozen:** ❌

---

# 2. Region overlap

They fixed the conceptual overlap:

* South America no longer contains Central America.
* Oceania is separated from Asia-Pacific.
* Russia gets an override.
* one airport is supposed to map to exactly one macro-region.

That is an appropriate correction.

However, the current frame in the database is **still the old provisional 4,320-airport frame** and has not been regenerated using the corrected mapping. 

Even more importantly, the issue record still lists the ICAO heuristic as part of the open blocker set. 

### Verdict

**Specification:** ✅
**Actual frame using it:** ❌

---

# 3. `T` milestone contradiction

This was one of the main things I told them to fix.

They correctly changed §6.0 to:

> Candidate `T = scheduled_gate_out`, pending Gate-0.5 verification, with `scheduled_wheels_off` as the predeclared fallback.

That is correct. 

### But they did not clean up all the old wording.

Immediately underneath, the plan still says:

> all computed from frozen `scheduled_gate_out` UTC.



That becomes false if Gate 0.5 selects the predeclared `scheduled_wheels_off` fallback.

And the adjudication table elsewhere still says:

> Frozen `T = scheduled_gate_out`



So correction #3 was **not completely propagated through the document**.

The correct wording everywhere should effectively be:

`T-24/T-6/T-90 are computed from the milestone selected and frozen by Gate 0.5 (`t_milestone`), either scheduled_gate_out or the predeclared scheduled_wheels_off fallback.`

### Verdict

**⚠️ Mostly fixed, but stale contradictory wording remains.**

---

# 4. Retime contradiction

Previously one section said ≥2h retime stayed the same flight while another said it became a new flight instance.

That appears to have been genuinely harmonized.

The current plan says:

* `<2 h` → same `flight_instance_id`
* `≥2 h` or service-date change → new `flight_instance_id`
* link through `retime_parent_id`



And §7.1 now agrees with it.

### But code proof is not complete.

The test matrix says the codeshare/flight-instance test is still:

**STUB TODO / BLOCKED**. 

The implementation map similarly calls flight identity implemented but with tests/wiring pending. 

### Verdict

**Specification:** ✅
**Implementation verified:** ❌

---

# 5. FIDS retry budget / 899-unit maximum

The mathematical correction was good.

They changed:

`744 + 60 + 20 = 824`

plus an enforceable retry allowance:

`+75`

giving:

`899 < 1000`.

The plan explicitly says there is a global `FIDS_RETRY_UNIT_BUDGET=75` and calls it enforceable. 

That is exactly the kind of correction I asked for.

### But here's the problem

The same implementation log says:

`fidsCensus_v3.ts ... STUB`

and its DST tests are pending. 

So the statement:

> controller `fidsCensus_v3.ts` enforces global retry unit counter

cannot yet be treated as proven implementation.

At the moment it is **a required behavior written into the specification**, not demonstrated working code.

### Verdict

**Budget design:** ✅
**Actual enforcement:** ❌ not yet demonstrated.

---

# 6. Undefined `r_i`

This one was fixed correctly.

The formula is now:

`score_i = traffic_prior × m_i`

with:

`p_i = score_i / Σscore`

and `r_i` is explicitly removed. 

### But again: actual adaptation isn't implemented.

The log says:

* REGIONAL draw currently uniform
* adaptive `m_i` = **STUB**
* coverage-floor implementation = only documented.



### Verdict

**Specification:** ✅
**Adaptive implementation:** ❌

---

# 7. One authoritative execution order

This one is **still not actually fixed**.

The plain-human checklist correctly says:

> STOP — do not run probes yet.

Then it gives the proper order:

missing B code → choose exact traffic/region rules → rebuild frame → Gate 0 → Gate 1 → Gate 2 → official Gate 3 → Gate 0.5 → Gate 4 → Gate 5 → FREEZE.



That is the order I agree with.

### But `Log §1`, which calls itself authoritative, contradicts it.

Its master table says:

Step 6 = smoke canary

then immediately:

**Step 7a–7l = run all twelve Stage-1 anchor probes**

and only later at Step 10b mentions the frame rebuild as a prerequisite to the official Gate-3 canary. 

That means it still tells you to spend probe credits on the old provisional frame before completing the corrected traffic/region rebuild.

That is exactly what we were trying to prevent.

### Verdict

**❌ Not fixed.**

The master table needs to be reordered.

After smoke canary, it should say:

**implement B code → freeze traffic/region references → rebuild frame → rerun Gate 1 → then Stage-1 anchor probes.**

---

# 8. “Phase 0 DONE / everything implemented”

The implementation log was improved. It now says:

> Legacy R1-R7/S1-S5 foundation IMPLEMENTED; f.7 deltas DOCUMENTED+STUB, NOT LIVE-VERIFIED.

That's much more accurate. 

### But the binding plan itself still says something stronger.

§15 says:

> R1–R7 IMPLEMENTED
> S1–S5 IMPLEMENTED

while admitting in the very same sentence that:

* FIDS population fetcher isn't done,
* provenance wiring isn't done,
* `available_at` isn't done,
* historical store isn't done.



So my earlier correction #8 was only made in the **log**, not consistently in the binding plan.

### Verdict

**❌ Not fully fixed.**

The Plan §15 status should use the same distinction as the implementation log:

**foundation/schema implemented; f.7/f.8 execution deltas pending/stubbed.**

---

# 9. A/B/C/D counts

This was improved significantly.

The newest log says the source-of-truth count is:

* 57 pure B
* 2 B/C
* 4 pure C
* 13 D
* 1 A

and says the old `45 B / 10 C / 17 D / 5 A` numbers were wrong. 

That's much better.

### One limitation

The actual complete `A30_77_ADJUDICATION.md` isn't among these two attached files, so I cannot independently recount all 77 rows from the source table.

But the current implementation log is at least internally using the new numbers consistently in its status section. 

### Verdict

**✅ Probably fixed at documentation level.**

---

# 10. Chain completeness + `history_ready_at` + primary-target fallback

This was supposed to contain three corrections.

### `history_ready_at`

This was fixed well.

It now means the earliest time at which the **entire required historical lookback is genuinely available as-of that time**, rather than the old simplistic formula. 

✅ Good.

### Primary target fallback

Also fixed.

The plan now predeclares:

* candidate = wheels-off delay
* fallback = gate-out delay if wheels-off semantics cannot be verified.

That prevents changing the target after looking at model results.

✅ Good.

### Chain completeness

**This part was not actually fixed.**

The adjudication table claims:

> fixed chain denominator to distinguish scheduled vs observable successor.

But the actual §12.2.2 still says only:

`should_have_successor_legs = legs where tail had another scheduled departure...`

and doesn't implement the promised scheduled-vs-observable distinction. 

### Verdict

**⚠️ 2 of 3 fixed; chain portion still incomplete.**

---

# I also found two new consistency problems in the agent output

These are not new science requirements. They're mistakes in how the agent reported its work.

## A. The test matrix incorrectly marks the failed canary as a PASS

The current-state section correctly records:

`C_external = 1`
`C_internal = 0`
`delivery_failures = 1`
`FAIL`



But TEST-001 says:

> `rl9 1→1 PASS live canary`



That's objectively wrong.

rl9 was **1 external credit vs 0 internally recorded items**.

The test row should be something like:

`Observed: C_external=1, C_internal=0, delivery_failures=1 → FAIL; re-run after fix pending.`

Do **not** count TEST-001 as passed yet.

This matters because we don't want a fake green test matrix.

---

# B. File versioning is out of sync

The binding plan says:

**V3.9-f.8**. 

But the implementation log change history later says:

> V3.9-f.9 CODEBUFF F1–F7 remediation
> Version bumped to V3.9-f.9.



Meanwhile the top status sections of the log still repeatedly call the current version f.8.

So right now you have:

**Plan = f.8**
**log change history claims f.9**
**log status board = f.8**

That is not a clean single source of truth.

Either:

* f.9 modified only the implementation log → do **not** call the binding plan V3.9-f.9, or
* f.9 is a normative plan patch → the actual Plan header/adjudication must also become f.9.

Don't leave both interpretations.

---

# And the actual code state is very clearly NOT done

This is probably the most important part of your question.

The implementation log's own code map currently says:

* `fidsCensus_v3.ts` → **STUB**
* `historicalFeatureStore_v3.ts` → **STUB**
* weather tables → **STUB**
* adaptive `m_i` → **STUB**
* `available_at` → pending wiring
* frame → provisional
* manifest → not written.



The testing matrix agrees:

* FIDS DST tests → BLOCKED
* flight-instance codeshare test → BLOCKED
* cutoff/leakage test → BLOCKED
* coverage-floor test → BLOCKED
* SOFT_STOP live test → BLOCKED
* hard-cap test → BLOCKED
* POST split integrity → BLOCKED
* final-test protection → BLOCKED.



And the issue record still has the central implementation blocker open. 

So there is no ambiguity here.

# My final grading of what the agents did

| Work                                                  |                  Grade |
| ----------------------------------------------------- | ---------------------: |
| Understood our architectural corrections              |                  **A** |
| Applied the majority of f.8 specification corrections |                 **A−** |
| Preserved the architecture/no-V3.10 rule              |                  **A** |
| Improved implementation documentation                 |                 **A−** |
| Actually implemented collection-critical f.7/f.8 code |     **D / incomplete** |
| Tested new code                                       | **D / mostly pending** |
| Kept status claims perfectly consistent               |                  **C** |
| Ready to start Phase 6                                |                 **NO** |

The key distinction is:

> **They did a good job turning our audit into a much better specification and implementation roadmap. They did NOT finish implementing that roadmap.**

## What should happen now

I would **not ask another agent to perform another theoretical aviation/research audit**. That part is settled.

I would give the coding agent a much narrower instruction now:

**“Stop editing methodology. Implement the outstanding B requirements already specified in V3.9-f.8, replace all stubs with working code and tests, rebuild the sampling frame, and produce evidence for every PASS. Do not start probes or Phase 6 until the authoritative execution order is corrected and the preconditions are satisfied.”**

Specifically, the next development work is:

1. fix the remaining document inconsistencies I identified above;
2. implement `fidsCensus_v3.ts` fully, including DST, hashes and retry-unit enforcement;
3. implement/wire the flight-instance canonicalizer and its tests;
4. wire `available_at` + raw payload SHA/provenance;
5. implement historical feature store + bootstrap/readiness;
6. implement weather observation/forecast tables and as-known joins;
7. implement `m_i`, zero-yield FSM and coverage floor;
8. choose and freeze one traffic reference system and one deterministic tier rule;
9. implement/finalize the country/override region mapping;
10. rebuild the frame;
11. run the blocked tests;
12. then proceed through the gates.

And **only when those B items are actually code-complete + tested and the gates pass should the manifest be frozen and Phase 6 begin**.

So compared with our previous review: **the agent definitely listened, and most of the requested corrections appear in the files. But the project is not at “everything we told them has been implemented” yet.** There is still a very concrete, finite implementation list—not another research-design cycle.

Yes. I reassessed the two files again with a stricter standard, and I **did find additional things that my previous pass did not call out**.

The good news is that I am **not finding a reason to redesign the aviation research architecture**. The PRE/AIRBORNE separation, population layer, leakage rules, provenance concept, sampling philosophy, evaluation philosophy, etc. remain sound.

But I would **not let the agent say “everything is fixed/implemented” yet**.

The most important limitation is that these two uploads are the **plan and implementation log, not the actual repository**. The log itself says major components remain stubs—FIDS, historical store, adaptive `m_i`, weather tables, `available_at` wiring—and the manifest is not frozen.  So the next agent must audit the real repo, not merely edit these Markdown files until they look green.

### Additional issues I found on this recheck

Beyond the problems from my last answer:

* **Snapshot existence is internally contradictory.** One line correctly says every population flight gets a snapshot and missing features remain missing; the next says a snapshot exists only if “features available ≤ cutoff.”  Correct rule: population/horizon eligibility determines snapshot existence; `available_at ≤ cutoff` determines whether each individual feature value may enter it.
* **The 899 REST “worst case” is not actually proven.** The base assumes exactly one FIDS call per airport/horizon, but the protocol itself requires additional calls if results hit the limit/truncate.  It also never precisely defines the spacing of the `2×2h` treatment, so one-call coverage is not proven. 
* **Your supposedly exogenous 12-month balancing reference is suspiciously sourced from `flight_population`.** §4.5 says network degree comes from a 12-month `flight_population` reference snapshot while also saying it must exist before frame freeze and must not come from the recursive sample.  The agent must either use a genuine external/pre-run 12-month global reference dataset or prove a separately acquired full reference snapshot exists. It cannot derive the exogenous 80% of the anchor score from Phase-6 sampling.
* **Historical bootstrap source isn't proven to provide historical delays.** The store needs airport/route/tail delay values, but the listed bootstrap source says “FIDS history.”  A schedule feed alone does not automatically supply actual historical delay outcomes. The agent must prove a real source per historical feature.
* **The primary-target fallback is only half implemented in the specification.** It says wheels-off may fall back to gate-out, but the decision formula and primary endpoint table still hard-code wheels-off. 
* **Chain completeness was claimed fixed but wasn't actually changed.** The actual formula still only defines a scheduled successor and doesn't implement the promised scheduled-vs-observable distinction. 
* **Phase-5 chronology is still stale in the implementation log.** It still says “materialize + hash Engine-A test rows” before Phase 6, despite the binding plan correctly saying only the split rule can be frozen before the rows exist. 
* **The execution order is still inconsistent.** One human section correctly says frame rebuild before probes, but the supposedly authoritative master table still sends you from smoke canary straight into twelve paid Stage-1 probes. 
* **The test matrix falsely reports the old canary as a PASS.** The real historical result was `C_external=1`, `C_internal=0`, `delivery_failures=1`, FAIL; yet TEST-001 says `rl9 1→1 PASS`. 
* **Grace is hard-coded as 60m in the data dictionary while the plan says it is still Gate-0.5 measure→freeze.**  
* **Research-event-key documentation disagrees with itself.** Some tables say `(carrier, locReportedUtc)`, while the repository map says `SHA256(flight|carrier|locReportedUtc)`.   The actual code/schema must determine the truth.
* **T fallback still has stale hard-coded gate-out wording.** The section correctly introduces a candidate/fallback, then says every horizon is computed from frozen `scheduled_gate_out`. 
* **f.8/f.9 versioning is inconsistent.** The plan identifies itself as V3.9-f.8, while the implementation-log change history says “Version bumped to V3.9-f.9,” and many status/manifest fields remain f.7/f.8.  
* **The detailed implementation-log requirement is still partly aspirational.** The f.9 notes admit there is no real 59-field LOG entry yet, the environment registry is delegated, the 88-component map is only summarized, and lineage still needs expansion. 
* **T−24 scheduling is specified but not demonstrated in executable code.** The experiment requires airport/window assignment ≥25h before the earliest T−24 collection.  The agent must prove the scheduler actually does that.
* **Engine-A chronology needs a boundary-conflict rule.** The plan has fixed days 1–20 / 21–25 / 26–31 while also requiring whole disruption events not to cross partitions. If an event spans day 25→26, the split rule needs deterministic precedence before its hash is frozen.
* **“All verified” and several `IMPLEMENTED+LIVE` labels remain too strong.** The same log clearly shows unresolved stubs and blocked gates. 

The current AviationWeather Data API still states that its database allows access to the previous 30 days, so that particular correction remains current. ([Aviation Weather Center][1]) AeroDataBox published an updated API specification on August 28, 2026, so the coding agent should pin and audit against that actual current OpenAPI specification rather than trusting copied endpoint assumptions in the Markdown. ([AeroDataBox][2])

So I would now use the following as the **replacement handoff prompt for the coding agent**.

# FINAL V3.9 REPOSITORY REMEDIATION, VERIFICATION, AND PRE-FREEZE PROMPT

You are performing a **REPOSITORY-LEVEL IMPLEMENTATION COMPLETION AND CONSISTENCY AUDIT** of the existing V3.9 aviation PRE-DEPARTURE + AIRBORNE/POST experiment.

This is **NOT another theoretical redesign**.

The scientific architecture is considered locked unless the executable repository or current provider contract demonstrates an actual contradiction that makes the existing design impossible.

Do **NOT** create V3.10.

Do **NOT** change sampling philosophy, PRE/POST architecture, population philosophy, model ladder, or evaluation philosophy merely because you prefer another design.

Your task is to make the existing V3.9 design **internally consistent, actually implemented, tested, documented, and ready for its existing Gates**.

---

# 1. MATERIALS YOU MUST READ BEFORE MAKING CHANGES

Read completely:

1. `V3.9_DataCollectPlan.md`, especially binding PART 1 §§1–22.
2. `IMPLEMENTATION_LOG.md`.
3. `A30_77_ADJUDICATION.md`.
4. The complete executable repository.
5. All migrations.
6. `package.json` and lockfile.
7. Current run reports `rl*.md`.
8. Relevant archive/change records only for provenance.
9. Current AeroDataBox OpenAPI specification matching our marketplace/subscription.
10. Current AeroDataBox Flight Alert documentation.
11. Current AviationWeather Data API documentation.

The Markdown files are **not sufficient evidence that code exists**.

Repository code + tests + DB state + command output are the implementation truth.

---

# 2. ABSOLUTE SAFETY RULES

Keep:

```text
ADB_AUTO_COLLECT=false
```

until final preflight authorizes Phase 6.

Do NOT automatically:

* start Phase 6;
* run Stage-1 or Stage-2 probes;
* enable automatic collection;
* perform expensive FIDS sweeps;
* refill large credit amounts;
* Rescore/Simulate;
* create uncontrolled Flight Alert subscriptions.

Live billable operations require explicit human authorization.

A tiny smoke canary may be prepared, but do not execute it without authorization.

Never expose API keys, database passwords, webhook secrets or tokens in logs.

---

# 3. DO NOT CONFUSE THESE STATUS WORDS

Use exactly:

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

A file existing does NOT mean implemented.

A stub does NOT mean implemented.

A migration creating a table does NOT mean the ETL is implemented.

A code fix not rerun live is NOT LIVE-VERIFIED.

A value written in Markdown is NOT FROZEN until it is in the final manifest where required.

Never mark PASS based on expected behavior.

---

# 4. FIRST OUTPUT: REPOSITORY TRUTH REPORT

Before editing anything, inspect the current repository and produce:

```text
Git SHA:
branch:
dirty/uncommitted files:
migration level:
Node version:
npm version:
TypeScript version:
database schema version:
ADB_AUTO_COLLECT:
live balance if safely readable:
manifest version/status:
current plan version:
current log version:
```

Then inventory every critical implementation file.

For every item classify:

```text
missing
stub
partial
implemented-unverified
unit-tested
integration-tested
live-verified
frozen
```

Do not rely on IMPLEMENTATION_LOG's status. Verify from executable code.

---

# 5. RECONCILE VERSIONING FIRST

There is currently a version inconsistency.

The binding plan identifies itself as V3.9-f.8 while the log contains a later:

```text
V3.9-f.9 CODEBUFF F1-F7 DEFECT REMEDIATION
Version bumped to V3.9-f.9
```

Determine exactly what f.9 means.

Choose one coherent rule:

### If f.9 changed only IMPLEMENTATION_LOG documentation

Then:

```text
binding_plan_version = V3.9-f.8
implementation_log_revision = f.9-log
```

Do NOT pretend the plan itself is f.9.

### If f.9 changed normative PART 1 behavior

Then PART 1 itself must receive an adjudicated f.9 patch and all:

```text
plan_version
code_version
manifest_version
adjudication references
status board
traceability tables
```

must agree.

No mixed f.7/f.8/f.9 current-state labels.

Historical references may remain only when explicitly marked historical/SUPERSEDED.

---

# 6. FIX THE REMAINING SPECIFICATION CONTRADICTIONS

Do not redesign the science. Resolve these concrete contradictions.

## 6.1 Snapshot-existence rule

Current conflict:

One section says:

```text
flight_snapshots are built for every population flight;
missing features are marked missing and never dropped
```

but the normative rule also says snapshot exists iff:

```text
population ∧ features available ≤ cutoff ∧ horizon eligible
```

That can wrongly make feature completeness determine snapshot existence.

Replace with one rule:

```text
snapshot_exists =
    population_member_at_cutoff
    AND horizon_eligible
```

Then separately:

```text
feature_value_eligible =
    information_available_timestamp <= prediction_cutoff
```

If a feature is unavailable:

```text
feature = NULL
feature_missing = true
```

unless a separately predeclared REQUIRED-history condition makes the row
`history_incomplete` for the PRIMARY evaluation.

A webhook after cutoff must never determine snapshot existence.

Add unit tests proving:

1. population flight + missing optional feature → snapshot still exists;
2. feature available after cutoff → feature excluded/NULL;
3. post-cutoff webhook absent → snapshot still exists;
4. horizon-ineligible flight → no snapshot for that horizon.

---

## 6.2 T milestone fallback must propagate everywhere

Current intended rule:

```text
candidate T = scheduled_gate_out
fallback T = scheduled_wheels_off
Gate 0.5 selects one based on verified provider semantics
```

But stale wording still hard-codes:

```text
T-24/T-6/T-90 computed from frozen scheduled_gate_out
```

Replace every current normative reference with:

```text
selected_t_milestone
```

where:

```text
selected_t_milestone ∈ {
  scheduled_gate_out,
  scheduled_wheels_off
}
```

and is frozen at Gate 0.5.

Update:

* §6.0;
* cutoff builder;
* service-date logic where applicable;
* T−24 scheduler;
* manifest;
* tests;
* adjudication table;
* implementation log;
* data dictionary.

No stale statement may imply gate-out if the fallback was selected.

---

## 6.3 Primary-target fallback must propagate everywhere

Current intended rule:

```text
candidate primary target = wheels_off_delay
fallback = gate_out_delay if required milestones cannot be verified
```

But the decision rule and endpoint table still hard-code wheels-off.

Introduce:

```text
selected_primary_target
```

Freeze at Gate 0.5 before outcome analysis.

Then make ALL primary-claim machinery reference it:

```text
primary_target
primary_endpoint
decision_rule
manifest
evaluation config
report heading
Engine-A test metadata
```

Example:

```text
Model1 beats Model-1 iff
MAE_Model1(selected_primary_target)
<
MAE_ModelMinus1(selected_primary_target) - 2 minutes
AND the predeclared CI rule passes.
```

If wheels-off is verified:

```text
selected_primary_target = wheels_off_delay
```

Otherwise:

```text
selected_primary_target = gate_out_delay
```

Do not choose a third target after results.

Add tests for both branches.

---

## 6.4 Chain completeness fix was claimed but not actually present

Current §12.2.2 still defines:

```text
should_have_successor_legs
```

using scheduled successors only.

The previous correction specifically required distinguishing:

```text
scheduled successor
observable successor
known absent
unknown/unobservable
```

Implement a denominator that does NOT treat a successor that could not possibly
have been observed by the collection mechanism as an observed missing chain.

Define and document at minimum:

```text
successor_scheduled
successor_observable
successor_observed
successor_linked
known_absent
unknown
boundary
```

Report both if scientifically useful:

```text
scheduled_chain_completeness
observable_chain_completeness
```

Do not inflate a failure rate merely because a future leg falls outside the
observable window.

Write unit tests for:

* successor in window and linked;
* successor scheduled but outside observable boundary;
* missing registration;
* canceled successor;
* aircraft swap;
* day/window boundary;
* true known-absent edge.

---

# 7. FIX THE FIDS / REST BUDGET PROOF

This is a new high-priority finding.

The current budget says:

```text
31 days × 4 airports × 3 horizons × 1 call/horizon × 2 units = 744
```

and then calls:

```text
899 units
```

the enforceable worst case.

But the SAME FIDS protocol says:

```text
if result is truncated / limit ~500:
    split window into smaller calls
```

Those are not retries. They are additional successful billable calls.

Therefore `1 call/horizon` is not currently a proven worst case.

Also the design includes:

```text
2×2h
```

days, but the exact within-day separation of the two 2-hour windows is not
fully specified, so it is not proven that one ≤12h FIDS query can cover both.

Do NOT continue calling 899 a worst case until this is resolved.

Create an explicit call-count model.

For each run-day shape:

```text
4h
2×2h
up-to-6h
```

calculate:

```text
base FIDS requests
requests after result-limit splitting
requests after local-date/DST splitting if applicable
validation requests
retry requests
diagnostic requests
```

Distinguish:

```text
protocol-induced split call
retry call
validation call
```

They are different cost categories.

The REST safety invariant must be executable:

```text
total_rest_units_consumed <= REST_BUDGET
```

not merely a prose estimate.

If necessary implement:

```text
FIDS_TOTAL_UNIT_BUDGET
FIDS_RETRY_UNIT_BUDGET
FIDS_VALIDATION_UNIT_BUDGET
```

with atomic accounting.

The program must refuse/defer a FIDS request before it can exceed the protected
REST line.

Add tests forcing:

* normal one-call response;
* 500/truncated response → split;
* repeated splitting;
* retry after split;
* DST conversion;
* 2×2h day;
* up-to-6h day;
* remaining-unit exhaustion.

Produce a new mathematical budget proof from executable limits.

If a guaranteed `<1000` design is impossible under the current query protocol,
STOP and report the exact arithmetic. Do not silently steal units from the
57,900 experimental envelope.

---

# 8. FREEZE THE EXACT 2×2H TREATMENT

The current design names `2×2h` but does not completely define the two segments.

Freeze:

```text
segment_1_start
segment_1_duration = 2h
segment_2_start
segment_2_duration = 2h
gap between segments
relationship to assigned UTC slot
same airport set or not
same crossover unit
FIDS query strategy
```

The treatment must be deterministic/replayable from the frozen template + seed.

No post-freeze condition may choose the second segment.

Add scheduler tests.

---

# 9. FIX THE FRAME REFERENCE-DATA PROBLEM

The experiment says balancing variables and the exogenous 80% of the anchor
score must come from a fixed PRE-FREEZE reference snapshot.

However §4.5 currently names a 12-month scheduled route graph from
`flight_population`.

`flight_population` is also the experiment's cutoff-specific FIDS population
layer.

Do NOT let the experiment recursively create its supposedly exogenous reference.

Before the anchor probe, prove the source of:

```text
annual traffic
network degree
carrier diversity
international share
geo/network score
carrier/international score
```

These must come from:

1. a genuine external/pre-run reference dataset, OR
2. a separately acquired global schedule reference snapshot whose collection,
   date range, cost, coverage and hash are fixed BEFORE probing/Phase 6.

Do not use Phase-6 sampled outcomes to construct the exogenous 80%.

Do not claim OAG/Cirium access unless credentials/data actually exist.

Do not substitute FAA/BTS as a global source.

If no globally adequate source is available, report BLOCKED and show the
coverage gap instead of inventing data.

Freeze:

```text
traffic_source
traffic_metric
traffic_period
tier_cut_rule
hub_cut
mid_cut
traffic_source_hash

reference_schedule_source
reference_schedule_period
reference_schedule_hash

region_mapping_version
region_mapping_hash
region_overrides_hash
```

Then rebuild `clean.adb_sampling_frame`.

The old:

```text
4,053 unclassified → REGIONAL
```

frame must not be used for the real anchor probe.

---

# 10. IMPLEMENT AND VERIFY COUNTRY→REGION MAPPING

Implement actual data-driven:

```text
country_code -> macro_region
```

plus explicit overrides.

Test:

* US/Canada/Mexico;
* Central America;
* South America;
* Australia;
* New Zealand;
* Pacific islands;
* Turkey;
* Greenland;
* Russian airport west of 60°E;
* Russian airport east of 60°E;
* unknown country.

Assert:

```text
one eligible airport -> exactly one macro_region
```

`UNMAPPED` may not silently enter a stratum.

Rebuild and hash the final region assignments.

---

# 11. IMPLEMENT FIDS POPULATION FOR REAL

`fidsCensus_v3.ts` may no longer remain a stub before Gate 5.

Verify current AeroDataBox OpenAPI rather than trusting copied prose.

Pin:

```text
OpenAPI version/date/hash
marketplace
endpoint path
parameter names
units per call
maximum request window
result limit/truncation behavior
time interpretation
codeshare behavior
canceled/cargo/private flags
```

Implement:

```text
fetchFidsPopulation()
utcIntervalToLocal()
splitFidsWindowIfRequired()
FIDS unit accounting
raw-response persistence
response SHA-256
retrieval timestamp
fromLocal/toLocal
IANA timezone
canonical UTC bounds
codeshare canonicalization
population inserts
```

No silent pagination/truncation.

Mandatory DST tests:

* US spring-forward;
* US fall-back;
* southern hemisphere DST;
* UTC interval crossing local midnight.

---

# 12. IMPLEMENT T−24 OPERATIONAL ACQUISITION

Specification requires the future airport/window assignment to be frozen at
least 25h before the earliest T−24 read.

Prove actual executable scheduling.

Implement/persist:

```text
assignment_frozen_at
template_hash
airport_set
UTC slot
window shape
crossover block
t24_due_at
t6_due_at
t90_due_at
```

Scheduler must refuse:

```text
assignment_frozen_at > earliest_t24_due_at - safety_margin
```

unless the flight is explicitly:

```text
t24_unavailable=true
```

under the predeclared policy.

Do not reconstruct T−24 from a final schedule.

Write clock/fake-timer tests proving the timed acquisition occurs.

Do not merely point at `build_stratified_catalog.ts` and call this implemented.

---

# 13. IMPLEMENT FLIGHT INSTANCE / CODESHARE LOGIC END TO END

Audit actual:

```text
flightInstanceCanonical_v3.ts
```

Do not accept existence of the file as proof.

Verify it is actually called by:

```text
FIDS population ingestion
webhook/event ingestion
trajectory joins
outcomes
snapshot builder
evaluation grouping
```

Implement/test:

```text
provider flight id stability
fallback operating-carrier key
marketing codeshare collapse
retime <2h
retime >=2h
service-date shift
diversion
collision fallback
retime_parent_id
```

No marketing code may become a separate physical population unit.

---

# 14. VERIFY THE RESEARCH-EVENT KEY

Documentation currently disagrees:

```text
(carrier, locReportedUtc)
```

versus:

```text
SHA256(flight | carrier | locReportedUtc)
```

Read the actual migration + code.

The research observation key must not collide merely because two flights from
the same carrier report at the same timestamp.

Establish one canonical rule and synchronize:

```text
migration
code
data dictionary
implementation map
tests
Plan
Log
```

Test two simultaneous same-carrier flights at identical report timestamps.

They must remain separate observations.

---

# 15. WIRE FOUR-TIMESTAMP PROVENANCE FOR REAL

Implement and test:

```text
event_timestamp
provider_published_utc
available_at
received_timestamp_utc
```

`available_at` must represent when the system could actually use the information.

It may not remain NULL for rows used as features.

Implement:

```text
payload_sha256
ingest_event_id
parser_version
schema_version
feature_builder_version
provenance_json/hash
```

Test:

```text
event=14:00
received/available=14:07
prediction_cutoff=14:05
```

Result:

```text
feature MUST NOT enter snapshot
```

even though event time is earlier than cutoff.

---

# 16. IMPLEMENT TARGET-SPECIFIC OUTCOMES

Do not use one generic observed boolean.

Implement:

```text
gate_out_label_observed
wheels_off_label_observed
wheels_on_label_observed
gate_in_label_observed
```

Each target trains only on its own label-observed population.

Do not infer gate-in from wheels-on.

Do not infer gate-out from runway time.

Unknown provider milestone:

```text
NULL
milestone_unverified=true
```

---

# 17. GATE-0.5 MILESTONE VERIFICATION

Use actual payload evidence to verify provider semantics for the eight movement
milestones.

For every milestone record:

```text
internal field
provider JSON path
provider documentation meaning
live payload example
verified yes/no
available_at source
caveat
```

Freeze:

```text
selected_t_milestone
selected_primary_target
milestone_mapping_version
```

only after this evidence.

No outcome-driven changes.

---

# 18. CENSORING / GRACE

Current data dictionary incorrectly hard-codes `grace 60m`.

The binding rule is measure→freeze.

Before Gate 0.5:

```text
grace_minutes = UNFROZEN_C
```

At Gate 0.5 measure:

```text
arrival notification latency
P50
P95
max
chosen margin
```

Then freeze the documented rule.

If the final rule is:

```text
P95 + margin
```

store both the measured inputs and selected value.

Do not retroactively label:

```text
window ended = missing outcome
```

---

# 19. IMPLEMENT THE HISTORICAL FEATURE STORE

`historicalFeatureStore_v3.ts` cannot remain a stub.

More importantly, prove an actual data source for EACH historical feature.

Required examples:

```text
airport_delay_1h/6h/24h
route_delay_1h/6h/24h
carrier_airport_delay
tail_previous_leg_delay
OD_delay
utilization_7d
congestion_1h
weather_snapshot_id
```

Do NOT assume a schedule/FIDS feed automatically supplies actual historical
delay outcomes.

Produce a source matrix:

```text
feature
source API/table
actual vs scheduled fields needed
retention depth
retrieval method
cost
available_at semantics
bootstrap coverage
missing behavior
```

If provider history cannot populate a feature's actual delay history, use only a
legitimate pre-run source/collection strategy already allowed by the plan.

If adequate bootstrap is unavailable:

```text
history_incomplete=true
```

and the primary evaluation may not start until `history_ready_at` under the
frozen rule.

Never fake historical values from the completed Phase-6 dataset.

---

# 20. IMPLEMENT WEATHER AS-KNOWN-AT-CUTOFF

Build first-class:

```text
weather_observation
weather_forecast
```

Store:

```text
source
observation_time
issue_time
retrieval_time
available_at
valid_from
valid_to
amendment/revision id
source version
```

Implement the frozen source hierarchy only where the source was available to the
system by cutoff.

Do not silently use later reanalysis as if it had existed operationally.

Current AviationWeather API documentation says up to the previous 30 days are
available; pin the docs date/version in the manifest.

Implement tests for TAF amendments:

```text
TAF revision issued AFTER cutoff
=> MUST NOT appear in earlier snapshot
```

---

# 21. IMPLEMENT REGIONAL ADAPTATION

Current `m_i` is a stub.

Implement exactly the frozen recurrence:

```text
ema_yield
alpha=0.5
m_i clamp [0.25,1.5]
score_i = traffic_prior * m_i
p_i = score_i / sum(score)
```

Implement state/version persistence.

Persist sufficient state for deterministic replay:

```text
eligible_pool
eligible_pool_hash
m_i state
m_state_hash
traffic_prior
score_i
p_i
random_seed
```

---

# 22. IMPLEMENT ZERO-YIELD FSM + COVERAGE FLOOR

Implement exact states:

```text
normal
zero_yield_once
zero_yield_repeated
zero_yield_persistent
coverage_failed
stale
```

One zero may NOT reduce evidence improperly or remove the airport.

`coverage_failed` is the only automated exit condition under the current plan.

Implement 20-day no-starvation boost.

Test exact interaction between:

```text
m_i cap
repeated-zero penalty
coverage-floor boost
final score cap
p_i
```

Ensure final probability remains positive for eligible airports subject to the
frozen design.

---

# 23. FIX ENGINE-A SPLIT RULE BEFORE FREEZE

Before Phase 6 freeze only the RULE exists.

Do NOT materialize future row IDs.

Freeze:

```text
train days
validation days
test days
calendar-day grouping
event grouping
event definition
seed
chronological ordering
boundary policy
```

There is a currently unresolved edge case:

```text
train = days 1-20
validation = days 21-25
test = days 26-31
```

while disruption events must remain whole.

Define deterministic precedence if an event spans a boundary such as day 25→26.

For example, choose and document one policy before data collection:

```text
assign entire event to later partition
OR
assign entire event to earlier partition
OR
exclude boundary-spanning event from primary Engine A
```

Do not decide after seeing outcomes.

Hash the complete rule.

After Phase 6 but BEFORE any model tuning:

```text
apply frozen rule
materialize actual row IDs
hash test_row_hash
make test set read-only
```

---

# 24. REMOVE ALL STALE PRE-PHASE-6 TEST-ROW LANGUAGE

Current IMPLEMENTATION_LOG still contains statements such as:

```text
Phase 5 — FREEZE: materialize + hash Engine-A test rows
```

This is wrong.

Replace with:

```text
Phase 5:
freeze/hash split-assignment RULE only

Post-Phase6, pre-tuning:
materialize/hash actual test row IDs
```

Fix:

* phase table;
* Phase-5 prose;
* code map;
* command index;
* implementation-log checklist;
* any archived current-looking section.

Historical wrong text may remain only under SUPERSEDED archive.

---

# 25. FIX EXECUTION ORDER ONCE

There must be ONE current authoritative execution order.

The current master table still places Stage-1 probes immediately after the smoke
canary even though the frame is still provisional.

Correct order:

```text
A. repository remediation
B. all required B code implemented + tests
C. choose/freeze external traffic/reference source
D. choose/freeze region mapping
E. rebuild final sampling frame
F. Gate 0 re-verification
G. Gate 1 on rebuilt frame
H. optional explicitly-labelled smoke canary if authorized
I. Gate 2 Stage-1 probes
J. Gate 2 scoring + Stage-2 confirmation + anchor lock
K. official Gate 3 canary
L. Gate 0.5 measure→freeze
M. Gate 4
N. Gate 5
O. historical/weather readiness
P. write final manifest
Q. freeze split rule
R. consistency/lexical preflight
S. Phase 6 only after GO
```

No Stage-1 probe before the rebuilt final frame.

The smoke canary is NOT official Gate 3.

---

# 26. CORRECT THE CANARY RECORDS

Historical truth:

```text
rl9:
C_external = 1
C_internal = 0
delivery_failures = 1
stored rows = 0
VERDICT = FAIL
```

The code bug may be fixed, but the historical run remains FAIL.

Correct TEST-001.

Correct any component tables that say:

```text
Gate3 IMPLEMENTED+LIVE
```

if they imply PASS.

Use:

```text
IMPLEMENTED
historical live run = FAIL
fix committed = yes
re-run = PENDING
official Gate3 = NOT PASSED
```

The next successful canary must create a NEW run/test/gate record.

Never rewrite the failed record into a pass.

---

# 27. CORRECT “ALL VERIFIED” / IMPLEMENTED OVERCLAIMS

Search the entire current Plan + Log for:

```text
all verified
implemented
complete
live
pass
frozen
done
```

Cross-check every occurrence against repo/test/run evidence.

Examples requiring correction include Phase-0 text and Plan §15.

Preferred wording:

```text
Legacy R1-R7/S1-S5 foundation implemented.
f.7/f.8 execution deltas remain partial/stubbed until listed evidence passes.
```

Do not describe:

```text
FIDS fetcher
historical store
weather tables
m_i
available_at wiring
coverage floor
snapshot builder
evaluation split builder
```

as implemented if only schemas/stubs/docs exist.

---

# 28. FIX DATA-DICTIONARY DRIFT

Audit every current table/column description against actual migrations and code.

Specifically fix:

```text
flight_outcomes.grace = 60m
```

because grace is still measure→freeze.

Use:

```text
grace_minutes = NULL/unfrozen until Gate0.5
```

then final manifest value later.

Also verify:

```text
flight_events research key
payload_sha256
available_at nullability
flight_instance_id
provider_record_key
weather tables
historical_feature_store
```

Never document a column as NOT NULL/implemented unless migration truth agrees.

---

# 29. IMPLEMENT ALL BLOCKED TESTS

At minimum implement and execute:

```text
TEST-FIDS-DST-SPRING
TEST-FIDS-DST-FALL
TEST-FIDS-DST-SOUTHERN
TEST-FIDS-MIDNIGHT
TEST-FIDS-TRUNCATION-SPLIT
TEST-FIDS-TOTAL-BUDGET
TEST-FIDS-RETRY-BUDGET
TEST-2X2H-FIDS-CALLS

TEST-FLIGHT-ID-CODESHARE
TEST-FLIGHT-ID-RETIME-UNDER-2H
TEST-FLIGHT-ID-RETIME-OVER-2H
TEST-FLIGHT-ID-DIVERSION
TEST-RESEARCH-KEY-COLLISION

TEST-AVAILABLE-AT-CUTOFF
TEST-SNAPSHOT-MISSING-FEATURE
TEST-SNAPSHOT-NO-WEBHOOK
TEST-PAYLOAD-SHA

TEST-MILESTONE-MAPPING
TEST-T-FALLBACK
TEST-PRIMARY-TARGET-FALLBACK
TEST-TARGET-SPECIFIC-OBSERVED

TEST-GRACE-NOT-EARLY
TEST-GRACE-MEASURE-FREEZE

TEST-MI-EMA
TEST-ZERO-YIELD-FSM
TEST-COVERAGE-FLOOR
TEST-DETERMINISTIC-REPLAY

TEST-T24-FUTURE-ASSIGNMENT
TEST-T24-LATE-ASSIGNMENT-REFUSAL

TEST-WEATHER-TAF-ASOF
TEST-HISTORY-ASOF
TEST-HISTORY-READY

TEST-CHAIN-OBSERVABLE-DENOMINATOR

TEST-SOFT-STOP
TEST-HARD-CAP
TEST-DELIVERY-FAILURE-PAUSE

TEST-SPLIT-RULE-HASH
TEST-BOUNDARY-SPANNING-EVENT
TEST-POST-SAME-FLIGHT-PARTITION
TEST-FINAL-TEST-PROTECTION

TEST-MIGRATION-FRESH-DB
TEST-MIGRATION-EXISTING-DB
TEST-MIGRATION-RERUN
```

For every test record:

```text
test id
requirement
file
command
fixture
expected
observed
exit code
status
artifact
Git SHA
```

No `STUB TODO` may count as PASS.

---

# 30. IMPLEMENTATION LOG MUST ACTUALLY BECOME THE MANUAL REQUESTED

The current log admits several A30 documentation requirements remain
aspirational/delegated.

Do not call it complete until these are addressed.

## 30.1 Real 59-field records

Create actual:

```text
LOG-YYYYMMDD-###
```

entries for every remediation performed in this session.

Do not merely define the template.

## 30.2 Environment/configuration registry

Inline the active complete registry into IMPLEMENTATION_LOG.

Do not say "see prior version."

Never include secret values.

For every variable:

```text
name
purpose
required/optional
safe default
type
producer
consumer
Phase/Gate
failure behavior
secret yes/no
```

## 30.3 88-component walkthrough

The current summarized file:function:status list is not the requested full
implementation walkthrough.

For every critical component provide:

```text
component
requirement
Plan section
file path
function
signature
inputs
outputs
tables read
tables written
external API
configuration
timestamps
provenance
randomness
cost
failure modes
retry behavior
test
current status
Git SHA
next dependency
```

## 30.4 Data lineage

Expand the one-line arrows.

Document each hop:

```text
provider coverage
→ reference frame
→ final sampling frame
→ future template
→ T-24/T-6/T-90 FIDS
→ flight_population
→ webhook envelope
→ flight_events
→ flight_state
→ raw_airborne_events
→ clean points
→ trajectory
→ historical/weather joins
→ PRE snapshots
→ AIRBORNE snapshots
→ outcomes
→ split rule
→ datasets
→ models
→ evaluations
```

For every arrow state:

```text
producer
consumer
join key
timestamp
availability rule
hash/provenance
failure behavior
```

---

# 31. CURRENT PROVIDER CONTRACT VERIFICATION

Use the CURRENT AeroDataBox OpenAPI specification matching our subscription.

Record:

```text
docs URL/reference
docs date
OpenAPI hash/version
marketplace
```

Reverify rather than assuming:

```text
FIDS endpoint path
fromLocal/toLocal semantics
window limit
result limit
truncation
codeshare behavior
cargo/private/cancel flags
cost in API units
edge inclusivity
flight ID stability
movement field meanings
```

If the provider documentation does not guarantee something, mark it:

```text
UNVERIFIED
```

and make Gate 0/0.5 test it.

Do not convert an assumption into a frozen constant.

---

# 32. WEATHER PROVIDER VERSION

Current AviationWeather documentation states the Data API permits access to up
to the previous 30 days.

Record:

```text
weather_api_docs_date
weather_api_version/reference
archive_depth_verified_at_freeze
```

Do not treat 30 days as an eternal constant.

---

# 33. FINAL MANIFEST MUST NOT BE WRITTEN EARLY

Only after prerequisite B items and Gate-measured C values are resolved write:

```text
plan_version
Git SHA
migration hash
frame_hash
traffic source/version/hash
traffic thresholds
region_mapping_hash
reference schedule hash
anchor formula/version
anchor pool/hash
scheduler seeds
crossover spec
2x2h exact spec
FIDS protocol/version
FIDS total budget
FIDS retry budget
selected_t_milestone
milestone mapping
flight_instance version
label-observability version
grace_minutes
cadence/completeness thresholds
adaptive version
coverage-floor version
weather version
history_ready_at
historical store version
snapshot builder SHA
selected_primary_target
primary metric
practical threshold
split_rule_hash
deferred-item deadlines
```

Manifest values may not contain silent `TBD`, unresolved `proposal`, or
unadjudicated alternatives.

---

# 34. FINAL PRE-PHASE-6 CONSISTENCY SCAN

Before GO, search current normative Plan + current implementation sections for:

```text
STUB
TODO
TBD
proposal
candidate
preferred
or
~
pending
not verified
not implemented
not frozen
blocked
failed
f.7
f.8
f.9
materialize test rows
scheduled_gate_out
60m
919
899
r_i
4053
ICAO heuristic
```

Classify every match:

```text
VALID FINAL
MEASURE→FREEZE
DEFERRED
HISTORICAL/SUPERSEDED
BLOCKING DEFECT
```

No blocking current match may remain unexplained.

Do NOT blindly replace words. Adjudicate semantics.

---

# 35. PHASE-6 GO CONDITIONS

You may declare:

```text
PHASE 6 GO
```

only if ALL are true:

```text
[ ] Actual repository inspected
[ ] No critical implementation item remains a stub
[ ] Final traffic source/metric/cuts frozen
[ ] Final region mapping frozen
[ ] Frame rebuilt from final rules
[ ] Frame hash recorded
[ ] Exogenous reference variables proven pre-freeze
[ ] FIDS implementation complete
[ ] FIDS current provider semantics verified
[ ] FIDS unit accounting includes split/truncation calls
[ ] REST maximum mathematically and programmatically protected
[ ] T-24 scheduler implemented and tested
[ ] flight_instance/codeshare integration tested
[ ] research-event key verified
[ ] four timestamps wired
[ ] payload SHA/provenance wired
[ ] milestone semantics verified
[ ] selected_t_milestone frozen
[ ] target-specific labels working
[ ] selected_primary_target frozen
[ ] censoring grace measured/frozen
[ ] airborne cadence/completeness C values measured/frozen
[ ] m_i implemented
[ ] zero-yield FSM implemented
[ ] coverage floor implemented
[ ] historical store implemented
[ ] per-feature historical bootstrap source proven
[ ] history_ready_at achieved
[ ] weather observation/forecast tables implemented
[ ] weather as-known-at-cutoff tested
[ ] split rule frozen and hashed
[ ] event-boundary split policy frozen
[ ] NO pre-Phase6 test row IDs materialized
[ ] Gate 0 PASS
[ ] Gate 1 PASS on FINAL rebuilt frame
[ ] Gate 2 PASS
[ ] Gate 3 PASS on a NEW successful canary
[ ] Gate 0.5 PASS
[ ] Gate 4 PASS
[ ] Gate 5 PASS
[ ] final manifest written + hashed
[ ] blocked tests = 0 for Phase-6-critical requirements
[ ] unresolved B = 0
[ ] required pre-run C = 0
[ ] lexical/consistency preflight PASS
[ ] ADB_AUTO_COLLECT remains false until explicit start authorization
```

If any are false:

```text
PHASE 6 = NO-GO
```

Do not soften this.

---

# 36. REQUIRED FINAL RESPONSE FROM YOU

When finished, return exactly these substantive sections:

## A. Executive verdict

```text
Architecture:
Specification consistency:
Repository implementation:
Unit tests:
Integration tests:
Live verification:
Frame:
Manifest:
Gates:
Phase 6:
```

## B. Defect adjudication

For every defect in this prompt:

```text
ID
confirmed / not confirmed
evidence
root cause
files changed
code changed
tests
status
```

## C. Repository implementation table

For every critical component:

```text
requirement
file:function
before
after
test
status
```

## D. Remaining blockers

Must explicitly print:

```text
unresolved B =
unfrozen required C =
blocked Phase-6 tests =
unverified provider assumptions =
manifest missing fields =
```

## E. Evidence

Include:

```text
Git diff summary
Git SHA
migration output
test commands
test exit codes
test PASS/FAIL counts
frame counts
frame hash
provider docs/OpenAPI version
manifest hash if frozen
```

## F. Exact next human command

Give only the **next permitted command**, based on actual achieved state.

Do not tell the human to run probes if the frame/code prerequisites are not
complete.

---

# 37. MOST IMPORTANT BEHAVIORAL RULE

Do not optimize for saying "done."

Optimize for making every status claim true.

A correct result such as:

```text
BLOCKED: exact global traffic source unavailable
```

is better than inventing a source.

A correct result such as:

```text
IMPLEMENTED but live verification pending
```

is better than claiming PASS.

A correct result such as:

```text
REST worst case exceeds 1000 under response splitting
```

is better than hiding the arithmetic.

A failed test remains failed until a new execution passes.

Never rewrite historical failures.

Never change scientific rules after looking at outcomes.

No Phase 6 until the evidence says GO.

That is the prompt I would send now.

The most important change compared with the previous agent prompt is that this one does **not merely tell the agent to “implement the missing stubs.”** It forces the agent to prove the implementation against the repository and catches the additional inconsistencies we just found: FIDS split-call budgeting, exogenous-reference circularity, snapshot-existence semantics, primary-target fallback propagation, historical-delay bootstrap sources, test-row chronology, false canary PASS, research-key mismatch, grace-value drift, detailed-log incompleteness, and version drift.

I would **not ask for another broad methodology review after this**. Have the agent execute this repository-remediation prompt and return its code/test evidence. Then the useful next review is an **evidence audit of its actual diff + test outputs**, not another theoretical V3.9 rewrite.

[1]: https://aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
[2]: https://aerodatabox.com/api-spec?utm_source=chatgpt.com "API Specification | AeroDataBox"
Yes. I checked it again at a deeper level, and this time I did something materially different from the earlier reviews: I loaded and scanned the **entire current V3.9 plan (1,834 lines)** and the **entire implementation log (3,025 lines)** together, then traced rules across sections instead of reviewing each section in isolation.

And I need to be transparent with you:

**I found additional contradictions.**

That means I should not tell you, “I guarantee there is absolutely nothing else anywhere.” That would be irresponsible. What I *can* do now is give you a much stronger closure standard so you stop getting trapped in an endless loop of “audit → patch → another audit → another patch.”

The architecture still does **not** need another redesign. The new things I found are specification-consistency, data-contract, accounting, and implementation-definition problems.

# My updated closure verdict

At this point I would describe V3.9 as:

**Scientific architecture:** ✅ GO
**Overall sampling philosophy:** ✅ GO
**PRE vs AIRBORNE separation:** ✅ GO
**Population-vs-webhook principle:** ✅ GO
**Anti-leakage principle:** ✅ GO
**Evaluation philosophy:** ✅ GO
**Current binding specification internally contradiction-free:** ❌ not yet
**Implementation complete:** ❌ no
**Ready to freeze:** ❌ no
**Ready for Phase 6:** ❌ no

The implementation log itself still acknowledges major stubs and blockers, so this isn't me inventing a new problem. 

---

# NEW things I found in this closure audit

These are in addition to the previous list.

## 1. Critical: FIDS population membership uses the wrong time interval

This is probably the most important new discovery.

The plan currently says:

> population membership = flight whose scheduled departure is in `[cutoff, cutoff+window)`.

The FIDS protocol says exactly that. 

But think about a T−24 prediction.

Suppose:

```text
Flight departure T = September 10 at 18:00

T−24 cutoff = September 9 at 18:00
```

The population you need at the T−24 cutoff is:

```text
Flights scheduled to depart around September 10 at 18:00
that were known to the provider on September 9 at 18:00.
```

It is **not**:

```text
Flights departing September 9 at 18:00–22:00.
```

Those are different concepts.

The plan correctly says the FIDS observation itself occurs at T−24. 

Therefore there must be two separate times:

```text
observation / retrieval cutoff
    C = T−24

service window being queried
    [T_window_start, T_window_end)
```

Current §5.1 collapses them together.

### Required correction

Define separately:

```text
prediction_cutoff_utc
service_window_start_utc
service_window_end_utc
fids_retrieved_at_utc
```

Population membership should be something like:

```text
flight was returned/observable at prediction_cutoff
AND
selected scheduled milestone falls in the future service window
```

not:

```text
scheduled departure ∈ [cutoff, cutoff+window)
```

This is a **real blocking specification issue**.

---

# 2. The 1,000-unit REST budget incorrectly includes “probes”

Your accounting says:

```text
~1,000 API units
= FIDS + anchor probes + diagnostics
```

but anchor probes themselves are Flight Alert webhook subscriptions and spend **credits**, not FIDS REST units.

Your log explicitly describes Stage-1 probes as:

> creates one subscription, bills per item

and estimates 30–80 credits each.

So right now two different billing mechanisms are being mixed again.

This matters because your clean 60,000 partition is:

```text
57,900 Phase-6 spendable credits
1,000 protected balance floor
1,000 REST units
100 unallocated
-----------------
60,000
```

There is **no explicit current-month allocation for pre-run billable Alert validation** such as:

* smoke canary;
* official canary;
* 12 Stage-1 probes;
* Stage-2 probes;
* potentially live Gate-4 testing.

Your current 2,900 existing balance might cover them, but whether that balance belongs to a previous quota cycle / persistent credit balance must be explicitly established rather than assumed.

### Required correction

Create separate accounting categories:

```text
A. Phase-6 experimental Alert credits
B. protected Alert-credit floor
C. pre-run validation/probe Alert credits
D. REST/FIDS API units
E. unallocated units
```

If C comes entirely from a pre-existing persistent balance that is outside the new 60k monthly entitlement, document and prove that at Gate 0.

Otherwise the 60k partition has to account for it.

This is **not a minor wording issue**.

---

# 3. Region mapping still contains a direct Greenland contradiction

The f.8 patch claims the overlapping region problem was fixed.

But the current mapping still says, in its Europe description, effectively:

```text
Europe + Turkey + western Russia + Iceland/Greenland
```

while its explicit override later says:

```text
Greenland BG → NA
```

Those cannot both be authoritative.

The agent's own change table says the region mapping was fixed. 

It wasn't completely fixed.

There's another ambiguity:

```text
Central America north of 7°N
```

while the actual mechanism is supposedly:

```text
ISO country → region
```

Those are two different classification systems.

### Fix

Use exactly:

```text
ISO country -> macro_region
+
explicit airport/country/longitude overrides
```

Do not put latitude-defined Central America in the prose unless latitude is truly part of the executable algorithm.

And define Greenland once.

---

# 4. POST-only REGIONAL eligibility contradicts the POST denominator

This is important.

§4.4 allows:

```text
REGIONAL:
post_eligible=true
pre_eligible may be false
```

because some REGIONAL airports can contribute POST data despite lacking schedule/PRE coverage. 

But later the POST denominator is defined as:

```text
airborne_eligible =
flight_population(FIDS)
∩ evidence aircraft flew
```

and explicitly says it comes from the **same `flight_population` layer used by PRE**. 

Those cannot both work if:

```text
pre_eligible=false
```

means:

```text
no usable FIDS/schedule population source.
```

For that REGIONAL airport you would have airborne webhook observations but no independent FIDS denominator.

### You need one deterministic policy

Probably one of:

```text
A. require pre/FIDS eligibility for all PRIMARY POST population analyses

or

B. define a separate independent provider-observable POST denominator

or

C. allow post-only REGIONAL collection but classify it auxiliary/exploratory
   and exclude it from population-denominator POST claims
```

Do not let the agent silently pick one after data collection.

---

# 5. The T fallback problem goes deeper than I originally caught

Previously I caught:

```text
candidate T = scheduled_gate_out
fallback = scheduled_wheels_off
```

while later prose still hard-coded scheduled_gate_out.

The deeper problem is that `scheduled_gate_out` is embedded inside:

```text
service_date
flight_instance_id fallback key
retime threshold
identity stability logic
```

The identity section explicitly uses `scheduled_gate_out` in its fallback canonical key.

So imagine Gate 0.5 concludes:

```text
scheduled_gate_out semantics cannot be verified
=> select scheduled_wheels_off
```

The plan would still create identity using an **unverified scheduled_gate_out field**.

That defeats the purpose of the fallback.

### Fix

Identity must use either:

```text
verified stable provider flight ID
```

or a canonical key based on a **verified selected scheduled milestone**.

You need something like:

```text
identity_scheduled_milestone
selected_t_milestone
```

and their relationship explicitly frozen.

Do not keep an unverified `scheduled_gate_out` in the canonical key.

---

# 6. Retime parent/child outcome semantics are missing

You now say:

```text
retime <2h
→ same flight_instance_id

retime >=2h
→ new flight_instance_id
→ retime_parent_id
```

Good.

But there's no complete rule explaining what happens to the **old population instance and its earlier predictions**.

Example:

```text
UA123 scheduled 10:00
T−24 snapshot made

then airline retimes it to 13:00
difference ≥2h

new flight_instance_id created
```

Now:

* Which instance gets the eventual wheels-off label?
* Does the parent become `retimed`?
* Does the T−24 snapshot on the parent evaluate against the child's actual operation?
* Are parent and child treated as the same service lineage for splitting?
* Can parent be train while child is test?
* Does population N count both as separate scheduled opportunities?

The `retime_parent_id` link exists, but the **analytical semantics of that link are unspecified**.

That needs to be frozen.

---

# 7. Tail-chain date rule contradicts itself

In one place your tail-chain rule requires:

```text
consistent registration
max turnaround = 6h
same calendar date
```

But the chain-completeness section talks about:

```text
same service date
```

and also excludes a “last leg of day” boundary. 

That breaks legitimate aviation rotations such as:

```text
Leg 1 lands 23:40
same aircraft departs next leg 01:05
```

That's a perfectly meaningful 1h25m aircraft rotation.

The relevant scientific concept should be the aircraft rotation/turnaround and **observability boundary**, not arbitrary midnight unless you're deliberately defining otherwise.

### Fix

Freeze one rule.

Likely:

```text
same tail
next origin = previous destination
0 < turnaround <= 6h
regardless of UTC/local midnight
unless separated by a defined service/observation boundary
```

Then explicitly define collection-window boundary handling.

---

# 8. Weather precedence can accidentally introduce retrospective reanalysis

Your leakage section is good:

> forecast as known at cutoff; later truth cannot leak backwards.



But your hierarchy says essentially:

```text
live_metar
> archive_metar
> GFS
> ERA5 reanalysis
```

with:

```text
first available at available_at ≤ cutoff wins
```

The danger is ERA5.

ERA5 is **reanalysis** generated retrospectively. A value downloaded today describing weather from a past date was not actually available to the prediction system at that historical cutoff.

So:

```text
retrieved today
for weather yesterday
```

must not become:

```text
available_at = yesterday
```

just because its valid time is yesterday.

### Fix

Separate:

```text
operational predictive features
```

from:

```text
retrospective truth/reference/reanalysis
```

ERA5 should not masquerade as an operational as-known-at-cutoff feature unless you can prove a version actually available then.

This is an anti-leakage correction, not architecture redesign.

---

# 9. `history_ready_at` is too strong / internally confused

This wording says `history_ready_at` is when the **full required lookback is available for all required history**. 

But your same store permits legitimate row-level insufficiency:

```text
airport has <5 previous flights
tail has no previous leg
```

Those are not infrastructure-not-ready conditions.

They're legitimate missing history.

So you need two separate concepts:

```text
history_store_ready_at
```

= the system has sufficient chronological source coverage to construct a 7d/24h/6h lookback without future leakage;

versus:

```text
history_complete_for_snapshot
```

= this particular airport/tail/etc actually had enough observations.

Otherwise one low-volume airport could theoretically prevent a global `history_ready_at`.

---

# 10. Related history contradiction: primary vs “history_complete subset”

Your plan says:

> `history_incomplete=true` → excluded from primary evaluation

and then says:

> a `history_complete` subset is reported separately.



But if incomplete rows are already excluded from primary, then the primary set **is already a history-complete subset**.

So what is the separately reported history-complete subset?

Those statements aren't logically distinct.

You need explicit evaluation populations, e.g.:

```text
all eligible labeled snapshots
history-ready snapshots
persistence-applicable snapshots
```

and say which one is PRIMARY.

---

# 11. Bootstrap source does not prove historical delays exist

You require:

```text
airport_delay_1h/6h/24h
route_delay
tail_previous_leg_delay
OD_delay
utilization
congestion
```

but the bootstrap source is described largely as:

```text
weather archive
+
provider FIDS history
```



A historical **schedule** source is not automatically a historical **actual-delay** source.

The agent needs a source matrix proving where:

```text
actual departure
actual arrival
previous-leg delay
```

come from historically.

I included this in the previous remediation prompt, and after re-reading the complete file I consider it definitely necessary.

---

# 12. Evaluation settings are simultaneously FROZEN and DEFERRED

This is a very clear documentation contradiction.

Earlier §13 says:

```text
95% block-bootstrap CI
1000 replicates
```

are frozen.

Then §13.6 lists:

```text
block-bootstrap replicates/confidence
→ D=DEFERRED
→ current = 1000 / 95%

ECE bins
→ deferred
→ current = 15

rolling-origin folds
→ deferred
```

But elsewhere:

```text
ECE bins=15
rolling_folds=[15,18,21,24,27]
```

are explicitly called frozen. 

And the later section calls these analysis settings deferred. 

You have to choose.

My recommendation:

Anything already intentionally preregistered can simply remain:

```text
FROZEN
```

There's no benefit to calling 1000 replicates, 95% CI, 15 ECE bins, and exact rolling folds “deferred” if you've already chosen them.

This doesn't block collection scientifically, but it must be internally consistent.

---

# 13. Generic `P(delay>15)` violates your own milestone-explicit rule

You worked hard to fix ambiguous delay labels:

```text
gate_out delay
wheels_off delay
wheels_on delay
gate_in delay
```

Yet evaluation still says things like:

```text
P(delay>15)
P(delay>60)
P(delay>120)
expected_delay
```

without identifying **which delay**. 

That reintroduces the exact ambiguity §6 was supposed to eliminate.

### Fix

Use names such as:

```text
P(wheels_off_delay > 15)
P(gate_out_delay > 15)
P(gate_in_delay > 60)
```

or explicitly:

```text
P(selected_primary_target > 15)
```

for the headline classification.

Same for:

```text
expected_delay
```

It must be milestone-specific.

---

# 14. Anchor traffic score appears mathematically degenerate for HUB anchors

This one is subtle.

Your anchor consumes the HUB slot.

Your exogenous traffic score is:

```text
traffic_score =
min(1, scheduled_departures / hub_cut)
```

But by definition, any HUB satisfying the threshold has roughly:

```text
scheduled_departures >= hub_cut
```

Therefore:

```text
scheduled_departures / hub_cut >= 1
```

so:

```text
traffic_score = 1
```

for every eligible HUB candidate.

That means your supposedly largest anchor component:

```text
40% traffic
```

may become **constant across the entire anchor shortlist**.

Then it contributes zero ranking information.

You need to check this mathematically after the exact HUB rule is frozen.

If all anchor candidates are HUBs, use a traffic normalization that preserves differences between HUBs, such as a preregistered percentile/log/min-max score within the reference frame.

If some anchor candidates are not HUBs, then explain how a non-HUB can “consume the HUB slot.”

One of those has to be resolved.

---

# 15. `Both` FIDS responses need a primary-membership vs context rule

You request:

```text
Direction=Both
```

because arrivals + departures help chains/network context. 

But the actual prediction unit is a flight-leg with a scheduled departure in the selected service window.

So the agent needs to distinguish:

```text
primary population member
```

from:

```text
context-only FIDS leg
```

Example:

At LAX:

```text
UA100 departing LAX
→ primary population candidate

SQ12 arriving LAX
→ possibly useful context/previous-leg/network evidence
→ not automatically another LAX departure prediction unit
```

Otherwise `Both` risks double-counting.

And if two selected airports both return the same operating leg, you need a rule for:

```text
one physical flight instance
multiple FIDS provenance rows
```

The physical prediction row should be unique while preserving all source-airport provenance.

---

# 16. The previous f.8 adjudication table itself contains stale claims

This is why you kept getting confused.

Its own “we fixed these” table still claims things such as:

```text
T frozen scheduled_gate_out
```

despite §6.0 now calling it a candidate.

It claims:

```text
chain completeness fixed
```

even though the actual chain section doesn't implement the claimed scheduled-vs-observable distinction.

And your implementation log later claims f.9 even though the binding plan remains f.8.

So the **audit history itself is becoming a source of contradictory current claims**.

The solution is not another architecture review.

The solution is:

> historical adjudication tables must never be treated as current normative truth.

Only current PART 1 + a generated current-status matrix should count.

---

# 17. Gate 0 status is inconsistent

Some places say:

```text
Gate 0 LIVE
Gate 0/1 IMPLEMENTED+LIVE
```

while the current status says Gate 0 still needs live account verification and is only provisional/nearly done. 

Those statuses need to be generated from one gate record.

Use:

```text
Gate0 = NOT PASS
```

until every binding criterion is satisfied.

Partial subchecks can individually be live-verified.

---

# 18. The “all verified” phrase is still present

Your current Phase-0 section still says:

> All verified.

even though the same file calls critical f.7/f.8 elements stubs. 

That's another status contradiction.

It must say something like:

```text
Legacy subset verified.
Current f.7/f.8 deltas not yet complete.
```

---

# 19. Existing issues from my previous pass are STILL real

I am not replacing the previous findings.

The following still need correction/implementation:

* snapshot existence vs missing features;
* 899 REST split-call proof;
* exact `2×2h` treatment;
* external traffic source;
* exogenous reference schedule source;
* flight ID/codeshare integration;
* research event-key disagreement;
* `available_at`;
* raw payload SHA provenance;
* historical store;
* weather tables;
* adaptive `m_i`;
* zero-yield FSM;
* coverage floor;
* canary record;
* Phase-5 test-row chronology;
* execution order;
* grace hard-coded as 60m;
* primary target fallback propagation;
* chain-completeness definition;
* f.8/f.9 versioning;
* full implementation-log records;
* Gate evidence.

The current log openly shows the relevant stubs and pending wiring. 

---

# So how can you ever know this is the last audit?

This is the part that matters most.

You should **not** use:

> “ChatGPT reviewed it again and didn't notice anything.”

as your stopping rule.

That's exactly what has caused weeks of repeated reviews.

Instead use an **objective closure protocol**.

## The project is finished being “planned” when these four conditions hold

### Closure condition 1 — one normative specification

There is exactly one current PART 1.

No current normative section contains:

```text
OR
candidate
proposal
preferred
TBD
~
unverified
```

unless it is explicitly a `MEASURE→FREEZE` value with:

```text
measurement
decision rule
freeze deadline
manifest field
```

defined.

---

### Closure condition 2 — contradiction matrix = zero

The agent should automatically extract every binding constant/rule and compare duplicates.

For example:

```text
selected_t_milestone
primary_target
history_ready_at
grace
traffic source
region mapping
chain boundary
daily cap
REST cap
split boundaries
test-row chronology
POST denominator
```

Each one should have:

```text
one canonical definition
```

and every other occurrence either:

```text
MATCHES
```

or:

```text
SUPERSEDED/HISTORICAL
```

There should be:

```text
CURRENT_CURRENT_CONTRADICTIONS = 0
```

---

### Closure condition 3 — requirement-to-evidence matrix

Every Phase-6 requirement must have all four:

```text
SPEC
CODE
TEST
EVIDENCE
```

Example:

```text
FIDS population
SPEC ✅
CODE ✅
TEST ✅
LIVE EVIDENCE ✅
```

not:

```text
SPEC ✅
STUB ✅
```

The latter is not done.

---

### Closure condition 4 — no more theoretical review

Once:

```text
unresolved B = 0
required pre-run C = 0
current-current contradictions = 0
Phase6-critical blocked tests = 0
provider assumptions unverified = 0
Gates 0/1/2/3/0.5/4/5 = PASS
manifest = FROZEN
```

then:

# STOP REVIEWING THE DESIGN.

At that point a later reviewer may suggest a nicer statistical method or alternative design, but that is **not a reason to change V3.9**.

Only reopen the specification for:

```text
1. failing executable test
2. provider contract contradiction
3. proven leakage
4. proven accounting violation
5. impossible implementation
6. actual data evidence showing a frozen assumption cannot operate
```

Not:

```text
"I have another idea."
```

---

# The most important conclusion from this new audit

I do **not** think you've wasted weeks because the central architecture was wrong.

What's been happening is different:

The document became extremely large, and every patch added another local correction without a mechanically enforced **global consistency layer**.

That's why one section gets fixed while another still says the old thing.

For example:

```text
§6 fixes T fallback
→ §7 identity still assumes gate_out

§13 fixes row-ID chronology
→ implementation log Phase 5 still says materialize rows

§4 allows POST-only REGIONAL
→ §7 requires PRE/FIDS population for every POST denominator

f.8 says chain fixed
→ §12 chain text still contains old denominator
```

The problem now is not “we need more aviation ideas.”

The problem is:

> **the specification needs normalization, exactly like a database. One fact should have one authoritative definition, and every other section should reference it instead of redefining it.**

That is the way out of the audit loop.

---

## My recommendation now

Do **one final remediation pass**, but change what the agent is being asked to do.

Do not say:

> review V3.9 again.

Say:

> **Use the existing locked architecture. Build a canonical-rule registry, resolve the finite contradiction list, implement the missing code, and mechanically prove zero current-current contradictions. No new requirements may be invented.**

The previous master remediation prompt is still good, but these new closure findings should be added to it—especially:

1. cutoff vs future service-window FIDS semantics;
2. pre-run Alert-credit accounting;
3. Greenland/region contradiction;
4. POST-only airport vs FIDS denominator;
5. T fallback → identity/service-date/retime dependency;
6. retime lineage/outcome semantics;
7. midnight/service-date chain contradiction;
8. ERA5 operational-vs-retrospective distinction;
9. `history_ready_at` infrastructure-vs-row completeness;
10. frozen-vs-deferred evaluation constants;
11. milestone-specific probability outputs;
12. anchor traffic-score saturation;
13. FIDS primary-vs-context duplicate semantics;
14. Gate/status normalization.

After that agent returns its **actual diff + tests + canonical-rule registry**, I would do one last kind of review only: **verify the evidence against those fixed requirements**. I would not search for another “better design.”

That gives you a real endpoint instead of an endless loop.
