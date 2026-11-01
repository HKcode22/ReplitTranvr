# Phase 4 Gate 5 — reusable cohort-scoped READ ONLY source/PRE/capture/outcome diagnostics

**October 31, 2026. Engineering progress for [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293).** This is a reusable **read-only function** requiring an existing caller-owned PostgreSQL repeatable-read transaction. It is NOT an active paid/after-flight workflow, and not independent Gate 5 scientific certification.

## Why a separate implementation
The original successful Oct31 [postflight audit](https://github.com/HKcode22/ReplitTranvr/actions/runs/41211969335) and script enforce exact **WSSS 2026-10-31 17:00–18:00Z** and must remain as historical evidence. A fresh Gate5 redo needs a **separate** reviewed future airport/interval with no accidental Oct31 carryover. The [frozen grid planner](2026-10-31_GATE5_FROZEN_GRID_OFFLINE_PLANNER.md) is draft-only and does not supply independently authenticated provider selected T.

## New reusable service
- server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39.ts
- tests/phase4_gate5_fresh_cohort_readonly_v39.test.ts
- Requires explicit WSSS/ICAO, ISO-UTC service start/end (10 minutes–4 hours), read timestamp and **reviewed frozen manifest SHA-256**. A valid hex string is only a syntactic requirement; this service cannot authenticate the owner or manifest review by itself. The caller must enforce exact approved identity, GitHub SHA/first attempt, zero-provider secret and a preverified manifest.
- Executes exactly THREE parameterized SELECT/WITH aggregate queries against the **same supplied cohort and read-as-of UTC** inside a caller-owned PostgreSQL **REPEATABLE READ READ ONLY** snapshot:
  1. Original FIDS query receipts ever recorded versus **still-retained, unexpired originals**, matched population observations, original/member response-hash and availability ordering, provisional distinct identities and separately tagged operating/core candidates.
  2. Stored PRE rows linked to retained original FIDS source queries, partitioned by T−24h/T−6h/T−90m, NOT merely in-memory preview rows and NOT certified snapshots absent source-native T.
  3. Provisional original-identity-resolved webhook matches inside/outside the **sampled core only**, and latest stored wheels-off status counts observed/pending/censored/missing/not-applicable. Does NOT certify actual-only timing of the underlying outcome.
- If NO original source remains retained, known historical receipt count can still be reported but **all source-derived population, PRE, capture and outcome denominators return NULL**, not falsely measured zero. Source clocks and SHA disagreements are separate error counters; impossible count relations throw instead of automatic reconciliation.
- Unverified physical operating denominator, first selected native T, actual-only wheels-off, source HTTP wire authenticity, full provider frame/outside capture rates and certified persistent PRE remain unknown/null or false. No provider calls or writes occur.
- No old workflow, original source data or hash-locked canonical implementation log was modified. Synthetic tests use **Nov4 example dates** as mere fixtures, not an approved new study or a paid schedule.

## Next actions before any real future cohort
1. Merge only after all four CI checks. Connect this service to a reviewed **new** main-only protected GitHub zero-provider action whose runner starts only for a SHA-frozen future study manifest and runs **BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY**, then ROLLBACK. Do not reuse dated Oct31 audit runner or its stored cron/physical dispatch evidence.
2. Validate the actual live schema, DB access, source integrity, source rights and expiry before relying on this audit. Ensure follow-up complete true source-as-of per-flight grid eligibility, full outside-provider-population and actual-only verified target proof. The current module is a reusable original-source **candidate diagnostic**, not a complete Gate 5 acceptance engine.
3. Resolve authenticated [AeroDataBox source semantics issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200). A Live-quality runwayTime is explicitly actual OR estimated in current official OpenAPI. Do not write certified PRE or train a model with unverified labels.
4. Only after the fully scoped, verifiable prospective grid, exact permission/REST balance/retention and actual GitHub prearms exist should new paid Gate5 collection be considered. Original missed 03:07 PDT T−6h remains UNOBSERVED and cannot be backfilled.

**Decision:** Source diagnostic code progress only. No new paid request, no Replit shell; Gate5 HOLD, Phase5 FREEZE HOLD, Phase6 NO-GO.
