# Phase 5 — exact five-pair provisional UTC date map: 31 parent batch-days, no live release

**Nov 9 owner superseding scheduling directive:** The hypothetical **Nov 24, 2026 → Jan 5, 2027** dates below are **not a target or intentional waiting period**. The goal is the **earliest safe Phase6 first batch-day after actual Phase5 independent FREEZE and verified pre-T−24h readiness**; see the [rolling-start study checkpoint](2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md) and the pure earliest-ready-bound helper. Recompute the entire date map when readiness is known, and re-review flight coverage/seasonality, 24h global washout, UTC slots, treatment seed and physical REST/Alert budgets. An earlier calendar has a **different date-map SHA** and cannot reuse already dated source receipts. Never treat a passed calendar SAT as paid GO.

**Prepared:** November 9, 2026 UTC. **Scientific state:** REVIEW CANDIDATE ONLY. **Evidence:** actual archived Nov 9 PostgreSQL B0062 corrected five-pair readback; SHA-256 `f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592`; *not* collected prospective flights, a true provider source license, physical GET budget, or signed Phase 6 schedule.

## What this actually advances

The Nov 9 PR #505 repaired a real **SKBO Pair4→Pair5 22-hour global washout** defect in the calendar validator. It allowed an externally reviewed, COMPLETE 31-day UTC date map, but did not supply a generator from our **real** corrected airport sets. This patch adds a deterministic bounded **read-only date-only proposer**, grounded to the unabridged corrected owner JSON and all 19 preserved pair slots. It does not redo the B0062 frame, original random draw, KTEB correction, GitHub login, database installation, or paid source calls.

- Code: `server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39.ts`; exact SHA-bound owner packet, 1,013 strict frame, five exact four-airport pair sets, no missing/excess slots, and explicit **not-frozen** evidence flags required.
- Unit tests: `tests/phase5_corrected_pair_date_geometry_proposal_v39.test.ts`; run the real source packet through both this proposal logic and the existing strict four-HUB **draft** solver with unmistakably *synthetic* budget placeholders.
- Optional **local offline** command: `npx tsx scripts/v39_phase5_corrected_pair_date_geometry_readonly.ts --first-date 2026-11-24`. This reads repository JSON and prints an immutable-digest-reviewable proposal. It does NOT authenticate to a database, contact AeroDataBox, charge credits, dispatch a workflow or write files.

## Date-only algorithm and experimental boundaries

For each of the 31 parent batch-days in strict `run_day_index` order, retain the six pre-existing UTC start slots **00/04/08/12/16/20**, repeated over blocks of six; do not rewrite the sampled 20 pair slots or draw future ordinary-day airports.

For paired run days **1–5** and **7–11**, enforce the exact same known four airport identities in the corresponding pair and the same **weekday/weekend class** for both periods. Use a **conservative 6-hour maximum planned exposure** for every batch-day even when its eventual shape is 4h or 2×2h with one 1h inactive gap, so the date choices do not depend on an as-yet-unsigned independent treatment-order seed. From each prior known paired airport's conservative END, require **at least 24 hours before next reuse START across all pairs**; also forbid overlapping consecutive parent windows. Other 21 ordinary batch-days have **unknown adaptive airport identities**: their true prior-airport END→START rule must still be enforced prospectively by the real early immutable draw owner.

The algorithm searches day by day for the **earliest locally feasible date** within an explicit maximum 31–366-day bound. **Greedy earliest-fit is not a globally optimal SAT solver.** A bounded failure means only `HOLD_NO_DATE_GEOMETRY_WITHIN_BOUNDED_HORIZON`, not a proof that any conceivable schedule is impossible. A successful result means **mathematical/date geometry only**, not an independently approved study calendar.

## One illustrative review calendar — deliberately NOT frozen

Assuming the reviewer supplies hypothetical `firstRunDateUtc=2026-11-24`, this candidate packs 31 parent batch-days into **43 calendar dates**, from **November 24, 2026 through January 5, 2027**, while preserving the five real airport sets and avoiding the 22h SKBO collision.

| Run day | Candidate UTC date | UTC start slot | Real crossover identities | Planned exposure |
| --- | --- | --- | --- | --- |
| 1 | Nov 24, 2026 | 00:00 | Pair 1 OMAA / OMSJ / SPJC / KDEC | Shape **NOT** signed |
| 2 | Nov 25, 2026 | 04:00 | Pair 2 WSSS / SBFL / TJSJ / LSZB | Shape **NOT** independently randomized |
| 3 | Nov 26, 2026 | 08:00 | Pair 3 YSSY / KBUF / LFQQ / NZNP | Shape **NOT** signed |
| 4 | Nov 27, 2026 | 12:00 | Pair 4 SKBO / EBAW / NZNS / RJNK | Shape **NOT** signed |
| 5 | Nov 29, 2026 | 16:00 | Pair 5 SKBO / YBUD / RKTU / FAKM | More than 24h after Pair 4 |
| 7 | Dec 2, 2026 | 00:00 | Pair 1 repeated same 4 airports | Same weekday class + UTC slot |
| 8 | Dec 3, 2026 | 04:00 | Pair 2 repeated same 4 airports | Same weekday class + UTC slot |
| 9 | Dec 4, 2026 | 08:00 | Pair 3 repeated same 4 airports | Same weekday class + UTC slot |
| 10 | Dec 7, 2026 | 12:00 | Pair 4 repeated same 4 airports | Same weekday class + UTC slot |
| 11 | Dec 12, 2026 | 16:00 | Pair 5 repeated same 4 airports | Same weekend class + UTC slot |
| 31 | Jan 5, 2027 | 00:00 | Ordinary adaptive day: airport IDs UNKNOWN | No pre-drawn data |

The complete 31-date map is produced by the local read-only command and is tested against the existing f.8 **draft** calendar validator, which applies the exact 26×4h / 3×2×2h / 2×up-to-6h shape totals using its **provisional** seed-derived treatment assignment and placeholder budgets in CI. These are NOT current provider prices, live Alert credits or an independently reviewed treatment-order randomization.

### Important scientific obstacles exposed *by* the provisional dates

1. **Bern LSZB** appears at **2026-11-25 04:00 UTC** in Pair2's first period and Dec3 04:00 in its replay. Prior public schedule evidence lists no passenger departures in early November and possible resumed operations beginning Nov25, **not proof of a genuine scheduled flight in the 04:00–08:00 UTC segment on either date**. The absence of a supported real passenger population must be recorded before freezing; don't silently substitute another airport or move Pair2 dates to increase observed results after seeing outcomes.
2. **Antwerp EBAW**, Kimberley FAKM, and small single-route sites may be seasonally/temporally sparse. Every one of all **15** selected MID/REGIONAL airports plus four HUBs requires the same date/window operating-leg population / native provider source test or honest supported-zero/unknown result. The historical B0062 feed flags are *not* present-day flight counts.
3. **Thanksgiving, Christmas, and New Year's regime effects:** this example falls over major holidays. This is an important selection/generalization limitation; route/day/weekday/calendar-regime support, event balance and Engine R must be reported, not extrapolated naively to all global seasons. This is a review candidate, not an unexamined preference for holiday data.
4. **Ordinary adaptive airport choices are missing.** The code proves only fixed pair-site washout; the real earlier selected airport writer must be able to assign each other day within frozen region/HUB restrictions after checking previous scheduled END. A calendar-proposal result does **not** prove it can do so for every day.
5. **Physical source/budget/release:** No actual verified ADB FIDS maximum service range, provider FIDS rate and response-latency bounds, seven-category physical UTC GET charge-day units, per-parent Alert headroom, durable source original, genuine first T, all three cutoff-valid PRE, independent witness, POST/STOP, published receiver, normalized Contents/ML usage and expiry has been certified **by this tool**. Existing infrastructure is real and should be reused, but nothing in this date proposer bypasses the separate gating documents.

## Next critical-path action, not another Stage-N

Independently review a feasible **dated** calendar, including provider schedule/seasonal operating-population availability at **every selected paired site and time window**, the prior airport washout for future ordinary early draws, region rotation and UTC/local mapping. After that, complete the actual segmented FIDS request/refresh grid with verified provider range and latency, physical seven-category UTC bill-day ceilings, and source→three PRE→POST/STOP custody and data rights. Issue exactly one independent Phase5 scientific FREEZE PASS/HOLD followed by a separate paid Phase6 GO. Vendor emails should not block this offline planning work; an unproven Contents right cannot be treated as legal-use evidence.

**Truth labels:** `DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE` does NOT mean `SAT_FINAL_RELEASE`. The proposer always emits `phase5ScientificFreezePassed=false`, `phase6PaidGo=false`, `providerCalls=0`, `databaseWrites=0`, and false live-source/rights/budget/independent-order flags. No new Replit Shell action is required.
