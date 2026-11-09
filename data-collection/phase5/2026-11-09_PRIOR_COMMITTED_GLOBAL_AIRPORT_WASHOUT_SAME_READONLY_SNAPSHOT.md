# Phase 5 — independent earlier-committed airport washout in ONE restricted PostgreSQL readback

**November 9, 2026. Source-only engineering integration; no real flight/Phase6 paid release.**

## Why this is a release-critical correction

PR #515 brought the **current ordinary adaptive day** into the reviewed 31-day date/shape contract with its real four saved airport rows inside the same restricted `REPEATABLE READ READ ONLY` PostgreSQL transaction. It deliberately did **not** prove that the four selected airports satisfy the **global prior-day 24-hour END→START washout** rule. The present PR closes that narrow independent readback gap; it does **not** retrospectively certify old Phase4 cohorts.

The actual corrected five-pair source has **SKBO in pair 4 and pair 5**, so a prior-site check cannot be confined to only the immediately preceding paired period or the `last_selected_at` field. Earlier code already discovered a concrete 22-hour cross-pair END→START conflict. Ordinary days also select their four sites prospectively, not in the original 31-day calendar.

## New code and contracts

- [Pure historical-prefix validator](../../server/lib/disruption/phase5PriorCommittedAirportWashoutReadonly_v39.ts), `inspectP5PriorCommittedAirportWashoutReadonly`.
- [Restricted PostgreSQL reader](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts), `readCommittedP5DayCandidateGrid`, under its **optional, separately pinned** `reviewedOrdinaryDayEnvelope` path.
- [Adversarial offline transaction tests](../../tests/phase5_committed_day_grid_readonly_v39.test.ts).

Within the **same role-verified read-only repeatable snapshot**, the reader gets all earlier `adb_phase6_calendar_day` parent dates and `adb_sampling_draw` rows in a single LEFT JOIN. It refuses an absent earlier parent day, incomplete four-slot selection, altered calendar/config/frame, bad UTC date or shape, missing or late saved draw, invalid regional probability vector, changed paired candidate, non-atomic selection, unknown window end, and any repeated ICAO selected with less than 24 hours between earlier **reviewed planned END** and later **START**.

No future ordinary airport IDs are manufactured: only **already committed earlier** selected sites are read. For the current ordinary day, the independently reviewed shape and exactly four saved rows still require a frozen draw hash and genuine strict early-draw deadline. The new boolean `priorDaySiteWashoutVerified=true` refers **only** to that concrete saved historical-prefix readback, not to unseen future days or account/licensing evidence.

For time-window arithmetic use exact planned ends: continuous 4h ends at START+4h; split 2h+1h excluded gap+2h ends at START+5h; up-to-6h conservatively ends at START+6h. This is deliberately stricter than trusting a mutable earlier `last_selected_at` or stopping early without a signed end update. The source writer's `adb_airport_sampling_state` constraints remain independent.

## Scientific and operational boundaries

This does **not** establish that all 21 future ordinary draws exist now, that the signed seed/treatment/calendar is approved, or that raw FIDS flight-level T/three PRE horizons/POST and independent witness receipts were obtained. It does not certify provider max GET range, seven-category physical UTC REST reservation, current balance, Contents-use/retention, published receiver, STOP execution, or Gate0.5 physical wheels-off.

The current historical DB inventory from November 8 showed **zero Phase6 calendar/draw/source/witness rows**. These tests use MOCK PostgreSQL rows plus the actual archived B0062 corrected pair packet to exercise the new contract. **No production SQL writes, no AeroDataBox GET, no Alert CREATE, no user Replit Shell action, no new migrations/roles.**

**Phase 5 independent scientific FREEZE = HOLD. Separate Phase 6 paid GO = NO.** Do not launch the existing manual paid FIDS workflow on this result alone.

Related: [assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), [four exit deliverables](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md), [real 31-day shape](2026-11-09_F8_THIRTY_ONE_SHAPE_ENVELOPE_TWENTY_ONE_REAL_ADAPTIVE_DRAWS.md), [rights issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300), [early owner issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

**Next binding work:** finish independently authentic source-rights/short-TTL design; independently witness actual treatment-order commitment and freeze the real future calendar; prove current FIDS range/latency and physical UTC seven-category budget; execute genuinely lawful, authorized original→T−24/T−6/T−90 PRE→witness→POST+STOP, then independent Phase5 freeze and separate paid-start review. No additional invented engineering stage is required.
