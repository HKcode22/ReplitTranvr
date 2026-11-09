# Phase 5 P0 — Repair the earliest Phase 6 start against the real early airport-draw owner

**November 9, 2026.** Scientific FREEZE: **HOLD**. Paid Phase 6 GO: **NO**. This is a concrete source/clock sequencing correction, not a new stage, a new airport selection, a provider balance inquiry or a production experiment.

## The actual bug found by comparing merged code

PR #509's read-only calendar preview correctly reserved the flight-population `T−24h` source clock, scheduler slip, HTTP response/persist and margin. However, the separately installed early selection writer `phase5EarlyAdaptiveDrawOwner_v39.ts::validateEarlyDrawWindow` refuses a draw made **at or after** `startUtc−24h45m`. The real `phase5DynamicDaySourceGrid_v39.ts` enforces the same strict deadline and a maximum preselection lead of **72h**.

**Counterexample:** a *hypothetical* all-gates-ready time of `2026-11-09T23:15:00.000Z`, with synthetic 300s scheduler slip, 120s response/persist and 60s margin, still leaves enough lead for the *source T−24h* of a `2026-11-11T00:00:00Z` first parent. But it is **exactly** 24h45m before that parent, so the real early draw owner *rejects* the draw. Without this repair, the scenario could misleadingly propose November 11 while no legitimate day-one airport identifiers could be prepared in that exact scenario.

## Change made, with strict clock bounds

New source-of-truth constants in `server/lib/disruption/phase5ProspectiveEarlyDrawClockContract_v39.ts`:

- `P5_EARLY_DRAW_MIN_STRICT_LEAD_MS = 24h45m` — a draw must have **strictly more** lead; equality is rejected.
- `P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS = 72h` — a draw cannot happen earlier than 72 hours before its selected service start.
- `p5EarlyDrawLeadTimeEligible` — pure clock predicate for CI and owner reasoning, **not** production dispatch authorization.

Both the installed early DB draw owner and committed-day FIDS grid adapter now import the **same constants**, preventing 24h45 vs 24h30 drift. The rolling planner now uses BOTH necessary constraints, with precise 1-millisecond strictness:

```text
first parent start >= assumed readiness + safety(latency/persist/margin) + 24h
first parent start >  assumed readiness + 24h45m

actual early draw interval:
  first start - 72h <= draw time < first start - 24h45m
```

For a first slot at exactly UTC midnight, the planner rounds **UP** to the earliest eligible following date. It prints the hypothetical early draw window opening, its **last inclusive millisecond**, and earliest possible selection instant at/after claimed readiness. Under the counterexample, it rolls **Nov 11 → Nov 12** instead of proposing a date that the actual early-draw owner cannot admit. If readiness were `23:14:59.999Z` instead of `23:15:00.000Z`, the first window is still geometrically eligible for Nov 11, illustrating the strict boundary. This is test math, not proof Phase5 passed at either time.

Regression tests compare the shared predicate to the **real** `validateEarlyDrawWindow` function at precisely 24h45m, 24h45m+1ms, 72h, and 72h+1ms, plus the 31-day corrected five-pair calendar, budget-independent no-GO and first-day rollover. The existing historical sample remains identical: WSSS/OMAA/SKBO/YSSY, five crossovers and only one KTEB→KBUF adjudication.

## Actual release requirements not waived

This is a **necessary** first-day geometry calculation, not an authenticated readiness gate. The user has approved *paid actions conditional on scientific safety*; that does **not** permit early draw before FREEZE or provider content rights. No GET, Alert, production SQL, installation, source original or future flight T exists because of this PR. The first real selected operating-leg T may not equal parent start; true per-flight source `available_at` must still precede T−24/T−6/T−90; otherwise record missing/censored rather than backfill.

Next engineering release dependencies remain the four f.8 Phase5 exits documented in `2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md`: (A) properly defined, usable source/endpoint/retention, including open issue #300; (B) GitHub-only committed early draw→legitimate FIDS original→three cutoff-safe PRE→independent witness→POST/STOP; (C) reviewed real 31-batch-day protocol/date/region/calendar, provider range and seven-category physical UTC source budget; and (D) an independent Phase5 FREEZE PASS/HOLD followed by a **separate** Phase6 paid GO. The 21 ordinary days remain genuinely adaptive and must not be populated with fabricated future airport identities.

No arbitrary Nov 24 or Jan 5 deadline, no provider-email wait for offline engineering, no historical B0062 reselection or V0079–V0083 reinstall, no Cloudflare/Replit Agent. **No Replit Shell command required for this patch.**

**Owner study material:** `2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md`, linked from top of Phase5 README.
