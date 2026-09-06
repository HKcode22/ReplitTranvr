I reviewed the three new files against each other carefully.

## The answer in one sentence

**Yes, we are now on the same page about the architecture and scientific methodology. No, I would not call the project completely “done/set” yet, because V3.9-f.7 still contains a small number of internal specification contradictions and the repository still has major implementation/gate work that the documents themselves correctly acknowledge.**

That distinction is important:

| Question                                                         | Verdict                   |
| ---------------------------------------------------------------- | ------------------------- |
| Is the PRE + AIRBORNE architecture settled?                      | **YES**                   |
| Do you need V3.10 or another scientific redesign?                | **NO**                    |
| Are the main scientific principles settled?                      | **YES**                   |
| Is the new implementation log much closer to what you asked for? | **YES**                   |
| Are all three documents generally telling the same story?        | **YES**                   |
| Is V3.9-f.7 completely internally frozen as written?             | **ALMOST, but not quite** |
| Is all required code implemented?                                | **NO**                    |
| Are all preflight gates passed?                                  | **NO**                    |
| Is the final manifest written/frozen?                            | **NO**                    |
| Should Phase 6 start now?                                        | **ABSOLUTELY NOT YET**    |

The binding plan itself now states exactly the right high-level status: **architecture locked, manifest values still measure→freeze, collection waits for Gates 0–5 and FREEZE.** 

And your implementation log is now structured much more like the detailed technical manual you asked for—it includes status, next steps, plan walkthrough, phases, science teaching, code, records, run reports, change history, traceability, data lineage, configuration, tests, gate records, etc. 

The independent assessment reaches the same core conclusion: the architecture is sound; what remains is specification freeze + code wiring, not another redesign. 

# What I would still fix before calling the specification FINAL-FROZEN

I found **10 cleanup issues**. Importantly, these are **not 10 new architectural problems**. Almost all belong to blocker families you already identified. They are contradictions inside the newly written f.7 patch that should be cleaned up once.

1. **Traffic-tiering is still not actually frozen.** §4.1 labels the table “Frozen value,” but then says annual scheduled departures are “preferred” **or** operations/passengers, sources can be OAG/Cirium **or** ACI/FAA/BTS, HUB can be “top ~7% OR ≥25,000, whichever yields ~30,” MID is “~20% OR 5,000–25,000,” and `traffic_prior` can be “or normalized equivalent.”  Those are legitimate choices **before freeze**, but they are not a deterministic frozen algorithm yet. Pick one actual source, one metric, one 12-month period, and one exact cut rule when the reference data are obtained; then hash it. Do not call this field frozen before that selection.

2. **The six-region definition currently overlaps itself.** North America includes Central America, while South America also says “Central America south.” Asia-Pacific includes Australia-Pacific/Y/N, while Oceania separately includes Australia/NZ/Pacific. On top of that, the mapping says `country_code → macro_region` is 1:1, but Russia is supposed to split by longitude—meaning country alone cannot implement the rule.  Fix this with a single non-overlapping mapping where **every airport maps to exactly one region**. Country can be the default, with explicit airport/longitude overrides where required.

3. **`T = scheduled_gate_out` is simultaneously called frozen and unverified.** §6.0 says the exact T milestone is `scheduled_gate_out` and even gives a provider path; but the milestone section correctly warns that AeroDataBox `scheduledTime` cannot simply be assumed to mean FAA gate-out and says unverified milestones must remain NULL.   Those cannot both be final simultaneously. The clean solution is: **candidate T = scheduled_gate_out, pending Gate-0.5 provider semantic verification; predeclare one fallback if gate-out cannot be verified.** Then Gate 0.5 freezes the actual mapping before T−24 data collection starts.

4. **There is a direct retime contradiction in `flight_instance_id`.** §6.0 says a retime ≥2 hours keeps the same identity/original T for identity stability. But §7.1 says a retime ≥2 hours or a date shift creates a **new** `flight_instance_id` with `retime_parent_id`.   Pick one. This absolutely has to be deterministic because it changes your population N, deduplication, trajectories and test grouping.

5. **The “919 API units worst case” is not actually a mathematical worst case under the written retry policy.** FIDS says up to 3 retries, but the budget allocates only +75 units, described as roughly 10% retry contingency.   That is a reasonable **planned contingency**, but not a worst case unless you enforce a global retry budget. Best fix: establish something like `FIDS_RETRY_UNIT_BUDGET=75`; once exhausted, calls stop/defer rather than exceeding the REST partition. Then 919 really becomes an enforceable maximum.

6. **`r_i` is undefined in the REGIONAL formula.** §8.2 writes `score_i = traffic_prior · r_i · m_i`, but `r_i` is not defined there and appears to have no other binding definition.  Either define exactly what `r_i` is, including its range/source/update behavior, or remove it from the equation. You cannot freeze an adaptive probability formula containing an undefined variable.

7. **There are currently two incompatible “what do I do next?” sequences.** The binding runbook says Gate 0 → Gate 1 → Gate 2 anchor → Gate 3 canary → Gate 0.5 → Gate 4 → Gate 5 → FREEZE.  But the implementation-log current-state table says the next permitted action is immediately `git pull → safe boot → cleanup → canary`, while another updated section correctly says to code missing components → rebuild frame → Gates 0→1→2 → canary.   You need **one authoritative next-action list**. I would use the binding §17 order. If you want an early canary solely for debugging, call it a **pre-gate smoke test**, not the official Gate-3 PASS.

8. **“Phase 0 DONE / all implemented” is too strong and conflicts with your own detailed audit.** The implementation log still says Phase 0 DONE and “all verified,” yet its new truth table says the FIDS fetcher is a stub, `available_at` is partial, canonical flight identity wiring is pending, weather is a stub, the historical store is a stub and `m_i` is a stub.  The same file later calls Phase 0 DONE/all verified.  I would rename that status to something like **“Legacy R1–R7/S1–S5 foundation complete; f.7 pre-freeze implementation deltas pending.”** That is much more accurate.

9. **The A/B/C/D counts disagree between documents.** The implementation log says `45 B + 10 C + 17 D + 5 A = 77`.  The independent assessment says approximately `45 B + 15 C + 17 D = 77`.  This is easy to fix: make the literal 77-row adjudication table the only source of truth and have all summary counts generated from it. Keep saying **“12 blocker families”** at the high level.

10. **A few lower-level definitions need one last operational cleanup.** In particular, chain completeness should distinguish a scheduled successor from a successor that was actually observable inside your collection boundary, and `history_ready_at` should be expressed as an operational “full required lookback available as-of this timestamp” criterion rather than relying only on the current formula. Also, your primary target says wheels-off is “most reliable per Gate 0.5,” even though Gate 0.5 has not yet happened; predeclare the fallback if wheels-off semantics fail verification instead of choosing a new primary target afterward. These belong to your already-existing chain/history/milestone families, not new architecture.

# What is definitely **not** finished yet

Separate from those document cleanups, your files explicitly acknowledge that the actual experiment is not executable yet.

The independent repo assessment says the frame has not been rebuilt, the FIDS fetcher is not coded, flight identity/codeshare canonicalization is not finished, historical/weather implementation is missing, adaptive `m_i`/coverage-floor/zero-yield wiring is missing, provenance timestamps/hash still need wiring/live verification, the canary has not passed, the manifest is not written, and the final lexical preflight has not passed. 

The updated plan itself agrees: frame not frozen, population/FIDS not validated, and Phase 6 remains NO-GO. 

So **do not interpret all the new detailed text as meaning the code is finished**. Much of it is now a very detailed specification of what the code **must become**.

# The stable verdict I would use from now on

**ARCHITECTURE — GO / LOCKED**

No V3.10. No new sampling philosophy. No redesign of PRE/POST, FIDS population, provenance, cutoff leakage, aircraft chains, 4h default, XGBoost-first or GNN-later.

**SCIENTIFIC METHODOLOGY — GO**

The main research design is coherent.

**V3.9-f.7 SPECIFICATION — ALMOST FROZEN**

Fix the 10 consistency points above. This should be a **small f.7 consistency cleanup**, not another 3,000-line research review.

**IMPLEMENTATION LOG — STRUCTURE IS GOOD, CONTENT STILL NEEDS SYNCHRONIZATION**

It now has the detailed structure you wanted, but a few older explanations/statuses still conflict with the new f.7 rules.

**CODE — NO-GO / INCOMPLETE**

Several collection-critical components remain stubs or unwired.

**GATES — NO-GO / PENDING**

Especially Gate 3 rerun, Gate 0.5 and Gate 5.

**MANIFEST — NOT FROZEN**

Your own log says zero f.7 values are currently frozen in the manifest.

**PHASE 6 — NO-GO**

Do not start the 31-day run.

## The order I would now lock

**Finish those f.7 consistency corrections → implement the already-specified missing B items → select/freeze exact traffic+region reference rules → rebuild the frame → Gate 0 → Gate 1 → Gate 2 → Gate 3 canary → Gate 0.5 measure/freeze → Gate 4 → Gate 5 → final manifest → final lexical/consistency preflight → Phase 6.**

After that preflight reports:

`unresolved B = 0`
`required C pending = 0`
`primary-evaluation unresolved = 0`
`category-4 lexical unresolved = 0`
`all Gates PASS`
`manifest FROZEN`

**then I would say stop reviewing and collect.**

So the important answer is: **we are finally aligned on the science. I am not discovering another hidden architectural problem. What remains is a finite cleanup + implementation/preflight list.** That is a much better position than before.
