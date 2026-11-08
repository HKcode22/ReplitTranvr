# 2026-11-08 — P25 administrative closeout completed; Phase5 calendar budget admission hardening

## A. Verified historical P25 closeout (completed, never repeat)

**Actual owner production execution:** November 8, 2026, around 13:53:03–13:53:05 UTC. The reviewed, once-only P25 script returned `ADMIN_DISPOSITION_APPLIED_P25_HISTORIC_FAILURE_PRESERVED`, exact receipt hash `d6beaddc73ba7788cc7f237bad770ad8267081607212ecaf1397cf3b7c54679c`. The *different independent READ ONLY database post-audit* returned `PASS_EXACT_P25_ADMIN_METADATA_APPLIED_HISTORIC_SCIENCE_PRESERVED`; both shell exit codes 0.

- Historical `clean.adb_incident_stop` IDs **31 and 32**: `resolved=true`, exact scoped administrative annotations, completed 13:53:04.176Z and 13:53:04.178Z.
- Historical `clean.adb_probe_budget_day` `P2G-S1-20261013-03`: **CLOSED**. The post-audit found **zero globally open incidents** and **zero globally open budget days**.
- Exactly **58 of 58 historical original-reference tombstone metadata** preserved. The audit did not reconstruct/read the expired raw bytes.
- **Immutable scientific outcome:** P25 YSSY probe19 remains `failed / DELIVERY_GAP`, 231 externally billed versus 229 internally received; historical gap **2**. The admin closeout is *not* a paid provider scientific PASS or proof of physical wheels-off.
- No AeroDataBox subscription write, new flight GET, Alert create/delete, signed webhook POST, or provider-blob mutation. At-most-once admin marker exists and **must never be removed or rerun**. PR #490's previous synthetic signed webhook attempt marker remains separate and cannot be reused.
- GitHub [issue #416 real outcome](https://github.com/HKcode22/ReplitTranvr/issues/416#issuecomment-6722370632) is the durable owner evidence. This task is **DONE**; no new shell command needed.

## B. Next actual scientific-calendar gate: valid dates, integer credits and original-five total ceiling

While reviewing the authoritative [strict original-five f.8 solver](../../server/lib/disruption/experimentCalendarSolver_v39.ts), a concrete admission defect was found. It validated every *individual* day at at most **1,900** projected Alert credits, but the **57,900 total Alert design ceiling** was applied **only to exploratory three-/four-anchor draft modes**, not to the production original-five path. Therefore `31 × 1,900 = 58,900` could incorrectly produce calendar `SAT` on the intended five-anchor path even though the binding original [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) caps total designed Alerts at 57,900. A proved `SAT` with physically impossible billing isn't an admissible scientific freeze.

The solver also allowed fractional `0.5` or negative projected REST units and fractional Alert charges in some paths: physical API units/Alert credits are whole charge units. JavaScript `Date` normalized invalid input `2026-02-31` into March instead of rejecting the intended frozen start day. These are **offline code-level counterexamples**, not real user budget inputs, paid provider observations or a new 31-day schedule.

A narrowly scoped source patch therefore:
1. Validates the exact canonical `YYYY-MM-DD` UTC date and round-trip, rejecting impossible February days. It does **not** assert which future collection start date is correct.
2. Requires all 31 planned daily Alert credit amounts to be safe, nonnegative **integers** and no more than 1,900/day, with **sum <= 57,900 for every mode**, including the five-anchor original. Actual available Alert spend may be **lower**; source entitlement and paid use remain independently gated.
3. Requires physical projected REST units and protected project budget to be nonnegative **safe integers**, projected <= protected, and project planned <= **50,000** REST units. A 60k account entitlement cannot silently override the project's own 50k spending limit.
4. Leaves the original 26×4h, 3×2×2h, 2×up-to6h, five matched pairs, strict region/anchor policy, dates, budget witnesses and scientific no-GO unchanged.

Regression tests demonstrate an original-five calendar with projected 58,900 Alerts now UNSAT; exactly 57,900 can still pass the *existing synthetic example*; a 50,001 REST-unit plan is refused even with 60k claimed protected account funds; impossible UTC dates, negative/fractional/NaN units are refused. Tests do not prove a **real** future calendar is feasible, eligible provider airport frame has five qualified anchors or current provider rights.

## C. What remains before scientific Phase5 FREEZE

The actual production 16-table Phase5 cold-start inventory last observed 0 calendar/draw/budget/source/T24-witness rows; no new production schema readback was done by this offline patch. V0079–V0083 and four GitHub worker credentials already exist and should never be reinstalled. The genuine next sequence is:

- Independently qualify the B0062 active dual-eligible airport sampling frame; finalize five HUB anchors and MID/REGIONAL region pools, five crossover pair sets, 31 prospective UTC batch-day dates and adaptive day-selection rules.
- Freeze reviewed real per-segment/UTC-charge-day **seven** REST category budgets and separate Alert ceilings, using actual allowed provider request length and current enforceable expiry/ML-use purpose, never made-up synthetic fixture costs.
- Certify a callback-only published receiver for signed nonempty original-before-2xx ingestion (old PR490 marker preserved; no blind retry), connect GitHub-only real early draw → SOURCE original → T24/T6/T90 prospective PRE & independent witness → POST/STOP and honest missingness.
- Issue exactly one independently evidenced **Phase5 FREEZE PASS/HOLD**. A separate **Phase6 paid launch GO** must not be inferred from these source-level tests or historical admin completion.

**Current scientific status:** Phase5 FREEZE **HOLD**; paid Phase6 GO **NO**. AeroDataBox email replies are **not** a blocker for bounded nonpaid engineering.
