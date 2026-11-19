# Phase 2G Gate-2 closeout evidence — explicit fieldwork completion and formal selection hold

**Date:** 2026-10-14 UTC. **Status:** OFFLINE REVIEW ONLY. This document and companion pure evaluator do not constitute an authorized scientific amendment, formal Gate-2 PASS, new subscription, payment, or acceptance of an originally failed probe under a retrospectively weakened rule.

Frozen Oct 2 early-pilot amendment `artifacts/phase2g-compact6-early-pilot-scope-reduction-freeze-20261002.json` selects **six** compact candidates (WSSS, OMAA, MMUN, LKPR, SKBO, YSSY), subsequently **defers LKPR**, freezes three older baselines (WSSS/OMAA/MMUN) and directs the two new observations (YSSY/SKBO). It explicitly retires automatic 4-hour Stage2 confirmations for the early pilot, not their conditional evidence trigger, nor exact-match reconciliation.

## Actual observed cohort
| Site / probe | Window | Reconciliation | Official capacity metric | Fieldwork conclusion |
|---|---|---|---|---|
| WSSS 11 | ~2h, uncensored | MATCH | 160.498 items/hour, PASS ≥60 | completed accepted reference |
| OMAA 12 | ~2h, uncensored | MATCH | 73.999 items/hour, PASS ≥60 | completed accepted reference |
| MMUN 14 | ~2h, uncensored | MATCH | 22.999 items/hour, below 60 | completed observational reference, **not capacity-eligible** |
| SKBO 15 | ~2h, uncensored | MATCH | 150.498 items/hour, PASS ≥60 | completed accepted reference |
| YSSY 19 | **7203.639s, uncensored** | **DELIVERY_GAP: 231 external, 229 received** | NULL official; *descriptive observed density* 114.442/hour | ✅ completed, verified qualified research observations; not formally eligible under frozen rule |

YSSY original source integrity verified on Replit Shell: **58/58 SHA+size checked, 308832 bytes**, 229 original saved-body items with exactly 229 item cost claims and zero duplicates or cost disagreements. The local aggregate report has SHA `a42a3736ac362ad38398e51f268273ae10c20103e5a53e21b0852c0f4e063fcf`. The observed billed-credit matching ratio is 229/231 = **99.134%**, not a measured independent callback-arrival probability. Root cause of two externally billed units not observed at receiver remains unknown.

## Scientifically honest decisions
- **FIELDWORK CLOSED / ✅** five measured sites and five completed target windows, with study data preserved and source limitations visible.
- **RESEARCH INVENTORY ✅** YSSY included as **B_DEGRADED_OBSERVED_ONLY**, and WSSS/OMAA/MMUN/SKBO as verified received-data sites. This is inclusion of verified measurements, **not** automatic inference-validity certification across unknown missingness mechanism. MMUN scientifically observed but fails the capacity screen.
- **FORMAL GATE-2 ANCHOR PROMOTION: HOLD.** Only **three** formal capacity-passing candidates: WSSS/OMAA/SKBO. The frozen `phase2g_complete_after_valid_new_targets` condition is not fully earned by YSSY's original `DELIVERY_GAP`. User's preference to count YSSY in research inventory does not retroactively rewrite ledger or historical CI red. Existing official 5-confirmation Plan also cannot be claimed. A *future prospective protocol* could treat qualified observational data separately once sensitivity/fit-for-purpose verified.
- **PHASE 2H:** Conditional fewer-than-five-valid-candidates trigger *exists*, but Oct2 amendment retired **automatic** 4h confirmations. This is an explicit design/approval decision, not permission to buy another run. No automatic reruns/replacements.
- **PHASE 3:** Offline Gate3 prepaid-compatible receiver preflight + Gate0.5/4 design can start; a live Gate3 isolated canary requires formal gate disposition, correct published receiver and **fresh explicit bounded paid AUTH**, and exact 0-gap canary tolerance. Legacy canary is hard-blocked in draft PR #36.
- **CLEANUP:** incident31 remains unresolved and 58 original blobs live with expiry starting Oct20. Do not use the old `--apply` without its missing UNLOGGED session row. Review permitted research-derived metrics and source TTL before using existing scoped retention operator; after all 58 verified tombstoned, separately reviewed incident closure requires explicit user approval. NO deletion was done.
- **SCOPE CHANGE:** The 2026-10-02 outcome-informed early-pilot reduction is explicitly for pilot purposes; no claim that five selective 2h windows represent all regional flight delay populations. Research rank is multidimensional under NIST SP1500-18r2, ISO25012, and STROBE missingness/sensitivity guidance, not one universal arbitrary passing percentage.

## Deliverables & next work
1. Code: `server/lib/disruption/phase2gEarlyPilotCloseout_v39.ts` pure, with `tests/phase2g_early_pilot_closeout_v39.test.ts`, CI-required. It ensures not even an explicit qualified research inclusion becomes formal gate PASS or automatic Stage2 authorization.
2. Finish permitted nonraw derived evidence before originals expire; scope-bound retention expiry and incident31 checks later, no generic all-system cleanup.
3. If full formal Gate2 is desired without additional paid studies, **operator-scientist must approve a separately dated protocol exception/early-pilot-only gate**, with declared scientific objective, data limitations and acceptance conditions; never call it original 5-anchor confirmation completed. Existing early-pilot observation completion does not need to be repeated. Until then formal Gate2 stays HOLD.
4. Prepare offline future Gate3 canary adapter with prepaid session route and 0-credit end-to-end tests, only subsequent AUTH can enable actual paid canary.

**No paid usage, deployment, historical edits or backend mutation by this closeout review.**
