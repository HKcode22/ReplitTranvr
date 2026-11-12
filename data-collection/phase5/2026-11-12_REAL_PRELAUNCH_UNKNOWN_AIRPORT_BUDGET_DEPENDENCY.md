# Phase5→Phase6 — real cold-start sequencing: the 21 unknown adaptive airport days

**Prepared:** 2026-11-12 UTC. **Status:** engineering review candidate, not an approved study, installed DB migration, production reservation, scientific FREEZE, or Phase6 GO.

## Why the actual empty Neon tables cannot be initialized from the old fixture

The 2026-11-12 15:27Z owner read-only inventory found a real `neondb` cold start: B0062 calendar/auth 0 rows, V0079 cycle/day/UTC budgets 0 rows, V0082 seven REST categories 0 rows, SOURCE 0, and T24 witness 0. This is not evidence that historical Phase4 flight captures vanished.

[PR #601](https://github.com/HKcode22/ReplitTranvr/pull/601) fixed one ordering bug: **V0082 immutable seven-category input freeze must happen while B0062 paid authorization is disabled**.

A further actual dependency arises from comparing source code:
- The 31-day shape envelope deliberately leaves **21 ordinary-day airport identities unknown** until their prospective DB-clock early draw. The other 10 crossover days have reviewed pair-site *candidates*, not paid FIDS flight samples.
- `phase5F8SegmentedSourceCoverage_v39.mjs` and `phase5V0082SevenCategoryFreezePacket_v39.mjs` expect an actual `calendar.days[].airports[slot]` and a matching exact `request.airportIcao` for **all** 31 days. The synthetic full-31 fixture supplies invented ICAOs solely for CI.
- The genuine early-draw owner `phase5EarlyAdaptiveDrawOwner_v39.ts` correctly requires **enabled B0062 authorization** to choose future airports.
- Therefore a live pre-GO reviewer **cannot honestly sign a full 31-day identity-bound Stage22 request grid** by substituting fixture/placeholder airports just to populate V0082. The design must distinguish frozen **budget ceilings** from later legitimate **per-airport source query identity**.
- Independently, V0079 `phase5_fids_day_budget_v39.early_draw_sha256` is NOT NULL and Stage9 checks it matches the real selected draw. Do **not** populate future per-day budgets with fabricated draw hashes before selection. Pre-GO **cycle and physical UTC charge-day ledgers** are distinct from post-draw per-day source reservations.

## New code here: zero-provider slot-only budget envelope

[`phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs`](../../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs) is a **pure planning function**. Inputs must specify a real reviewed future 31-day date/shape and protected 20/5/6 partition, true provider range evidence hash, actual pricing, bounded refresh cadence/lead, physical-get multiplicity, cycle ceiling/floor, and separately reviewed five non-FIDS REST categories **for every physically chargeable UTC date**.

The code calculates four **slot** positions × each of T−24h, T−6h, T−90m × every exposed source partition × planned refresh attempts. It partitions the 6-hour days by the externally supplied maximum range and never fills the inactive 2×2h gap. Every planned request gets a physical UTC charge date; it counts BASE and SPLIT separately and verifies every charge date's seven-category unit total and project ceiling. It does not query, store or invent the actual airports or operating flights.

The output `SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN` includes a reproducible candidate digest, explicit upper-bound GET counts, UTC seven-category rows and **all GO/rights/source-query/paid flags false**. Its SHA is **not** an independent signature, valid provider price, rights approval or live database budget. The optional horizon sensitivity model remains separate; this still budgets the original three horizons only.

**Critical boundary:** this PR does **NOT** modify the installed V0079–V0092 schema, relax Stage22 actual-source fidelity, add a new paid GET endpoint, write V0079 or V0082, or install/enable B0062 authorization. It does not yet make `phase5V0082SevenCategoryBudgetFreezeWriter_v39.ts` consume the new envelope. That integration requires separately reviewed budget-only admission and exact source/spend reconciliation at each later draw. The existing Stage22 real-ICAO validator must remain strict for actual source release.

## Safe remaining activation order

1. Independently review and fix a genuinely **future-dated** 31-day B0062 shape, treatment seed and known ten pair-site candidates; leave 21 ordinary airports unknown and preserve 24h END→START washout, prospective sampling and 20/5/6 split.
2. Confirm provider charge units, maximum request range, actual prospective latency, account ceilings, seven REST categories, separate Alert headroom, and the applicable Contents retention/ML use. Use that evidence to review a **conservative slot-only UTC budget envelope**; if over budget, change refresh/pagination/horizons **prospectively** and re-review before signing.
3. Complete code-level restricted staging for the **disabled** B0062 auth, true 31 calendar rows, V0079 cycle/physical UTC budgets, and V0082 category freeze. **Do not demand 21 future flight identities for a cost envelope.** Do not use this candidate directly in the existing live V0082 writer until a separately reviewed compatible admission and full tests exist.
4. After separate scientific FREEZE and paid GO, enable the early-draw owner. At each genuine early draw, bind exactly four real airports, prepare matching V0079 day budgets/source queries with actual `early_draw_sha256`, and enforce signed pre-cutoff FIDS/3 PRE/POST/receiver/STOP and conservative charge-date reservations. Do not backfill missing PRE.
5. Reuse Phase4's genuine 9 FIDS originals / 36 on-time PRE / 3 POST source-timing evidence where valid for its **narrow** schedule-revision claim. Physical gate-out and source-use/expiry remain independently reviewed.

**Scientific state:** HOLD. **Paid Phase6 GO:** NO. **Live production writes from this PR:** 0. **Paid source calls from this PR:** 0. No repeat of old migrations or SOURCE login proof.
