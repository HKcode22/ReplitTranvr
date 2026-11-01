# November 1, 2026 — Gate 5 V0076 cross-horizon physical-dispatch budget continuation

**Status: engineering correction only.** Strict scientific Gate5 HOLD, Phase5 FREEZE HOLD, Phase6 NO-GO. No paid GET, V0076 role grant, live release pin or actual future cohort. Binding Plan f.8 §5/§16 and [Nov1 verified running-job checkpoint](2026-11-01_GATE5_REAL_GITHUB_RUNNING_JOB_ATTESTATION.md).

## Root cause identified after PR #320

PR #317 fixed PREPARED-stage continuation after T−24h reserved units. A **separate** pure physical attempt guard retained `priorOtherReserved + fullGridWorstCase > projectBudget`. For a manifest exactly allocating the 54-unit synthetic full-grid ceiling, the first legitimately reserved 2 units of T−24h made **every later T−6h/T−90m physical attempt fail admission** even if the V0076 budget had room. This is double counting of the already-budgeted full grid, not an authentic depletion.

## Corrected accounting

- The reviewed manifest full-grid maximum is checked `fullGridWorstCase <= projectBudget` once without stacking that entire maximum on top of prior spend.
- The running per-attempt guard now checks **other owners/queries already reserved + this owner's previous nonrefundable reservations + the current physical attempt's units <= projectBudget**. The two prior counters must not overlap; they remain *untrusted advisory values* until reconciled with the database.
- Enforces independent current available project units, current provider free-quota units and requests, per-owner budget and physical attempt/cutoff timing. **No paid permission is returned**.
- The locked V0076 `reserve_phase4_g5_fids_physical_attempt_v39` SQL remains the sole authoritative ledger of project cohort reservations and prevents concurrent oversubscription. No SQL or production role changes here.
- Tests on the same frozen 54-unit synthetic plan: 18 T−24h reserved → T−6h first attempt passes advisory guard; 36 T−24h/T−6h reserved → T−90m first attempt passes; 53 prior units + 2 current units fails; 36 other + 18 owner + 2 fails; depleted remaining project units fails. No actual network calls.

## Acceptance and follow-up
Review all four standard PR checks, merge only after green, inspect the GitHub main-push three-job physical owner rehearsal. This is necessary engineering but insufficient for Gate5 scientific PASS: the external selected-T/actual-only physical-leg semantic issue [#200](https://github.com/HKcode22/ReplitTranvr/issues/200), account retention rights [#300](https://github.com/HKcode22/ReplitTranvr/issues/300), and real future cohort persisted PRE/source/callback/outcome read-only audit [#293](https://github.com/HKcode22/ReplitTranvr/issues/293) remain blockers. Never backfill the missing Oct31 T−6h or call a synthetic GitHub rehearsal actual flight collection.


## Verified merged evidence — Nov 1, 2026, after #321

- [PR #321](https://github.com/HKcode22/ReplitTranvr/pull/321) passed all **four required PR CI checks**, then merged into `main` at **`d94b886a1d7bda91f5a87070896d55f8a2543cb7`**.
- The independent [main-push three-owner GitHub rehearsal run #41299189793](https://github.com/HKcode22/ReplitTranvr/actions/runs/41299189793) completed **SUCCESS for owner-t24, owner-t6, owner-t90 separately**, each including both the real Actions API self-attestation and synthetic physical cutoff step. No provider, production database writer or paid source was activated.
- Regression tests explicitly accepted the after-prior-spend T−6h/T−90m cases and rejected actual overspend. This does **not** establish external provider semantics/rights, future live early prearms, actual provider GET or scientific Gate5 PASS.
- The previously verified [#320 actual job attestation checkpoint](2026-11-01_GATE5_REAL_GITHUB_RUNNING_JOB_ATTESTATION.md) remains authoritative for real running GitHub job identity/started-time evidence. Next critical engineering dependency is the separately reviewed real frozen future cohort + paid sender **after** external source/right certification, immutable original/PRE durability and independent cohort-scoped audit. Never promote historical Oct31 missed T−6h.
