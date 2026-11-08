# Phase5 — actual eligible airport sampling frame for the real 31-batch-day calendar (Nov 8 UTC)

This is **one actual next release dependency** after the [production Nov8 live 16-table cold-start audit](2026-11-08_LIVE_EMPTY_PHASE5_COLD_START_AND_TRUE_RELEASE_ORDER.md), **not** another numbered migration or paid source pilot.

## Why it matters
The successful PG16 `neondb` audit at `2026-11-08T08:18:35.246Z` observed 16/16 Phase5 release tables and 7/7 NOLOGIN roles, but all 16 *Phase5* tables had zero rows. **It did not inspect baseline `clean.adb_sampling_frame_registry`, `clean.adb_sampling_frame`, or `clean.adb_airport_sampling_state`**. Therefore the status of the active frozen input frame for the strict f.8 solver is **UNKNOWN**, not verified or absent. The existing [strict calendar solver](../../server/lib/disruption/experimentCalendarSolver_v39.ts) cannot be legitimately run on a made-up HUB/MID/REGIONAL candidate set. The older [finite candidate solver](../../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs) instead requires supplied literal airport identities for all 31 dates, which would be unsafe for adaptive ordinary days. Reuse the existing authoritative solver and carefully distinguish candidate feasibility from a signed/committed plan.

## One read-only production owner report

`scripts/v39_phase5_active_frame_for_calendar_readonly_once.mjs` connects using the **already configured** Replit owner `DATABASE_URL`, requires actual PostgreSQL16 `neondb` primary and verifies an actual `REPEATABLE READ READ ONLY` snapshot, then `ROLLBACK`. It checks:

- exact current `ACTIVE` registry identity, `active_frame_version`, original source/region/frame/tier hashes, reference period and dates (all metadata, no secrets);
- counts of all stored frame versions and adaptive sampling-state rows;
- matching active version/hash rows, mismatch counts and verified dual `PRE`+`POST` eligibility;
- counts by tier and region of `in_frame AND tier_verified AND pre_eligible AND post_eligible` for HUB, MID and REGIONAL;
- up to 20 **candidate**, not selected, eligible HUB ICAOs/regions ordered deterministically by reference traffic metric, and eligible MID/REGIONAL region names; no flight-level source Contents or airport activation.

`scripts/phase5_active_frame_for_calendar_owner_readonly_launcher.sh` is a source-SHA-pinned *one-line Replit Shell launcher* distributed from a fixed immutable Git blob. It refuses if current main source differs, current main CI `offline-safety` is not completed green, or owner/runtime database URLs are not distinct. No DB changes, provider HTTP/credits, secrets, source Contents, API key reads or Phase6 activation. It prints `PHASE5_OWNER_ACTIVE_FRAME_READONLY_DONE_NO_PROVIDER_NO_DB_WRITES` on a successfully completed scan. **A successful database query can still have status `HOLD_NO_VERIFIED_ACTIVE_SAMPLING_FRAME`**; absence of frame is a measured blocker, not code failure.

## Interpreting evidence

The candidate HUB airport list is **not** a valid frozen five-anchor pool: it still requires independently reviewed f.8 §8.5 exogenous traffic, network, diversity, yield and source feasibility qualifications, five eligible dual-source stations and the source/legal license. MID/REGIONAL region lists are only allowed-region candidates, not a substitute for prospective random draws. An empty registry, missing hash, fewer than five dual-eligible HUBs, missing MID or REGIONAL regions, mismatched frame hashes or missing reference-source hashes are explicit HOLD conditions. **Never invent five ICAOs, provider maximum range, actual selected operating legs, 31 future dates, legal Contents rights, or a Phase5 scientific PASS** from this report.

## Latest known AeroDataBox account evidence (do not ask again)

[Issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) already documents the original grandfathered RapidAPI Team Ultra account, historical $32 renewal, 60k REST-unit entitlement, 2026-11-07 09:00 UTC remaining **59,968/60,000 REST**, **1,830 Alert credits**, zero active subscriptions at that observation, original correspondence and the distinct current source-purpose/normalized flight-record retention questions. The airport frame readback requires **no new provider account request**; if a new API field eventually becomes material for pricing/range go/no-go, use one reviewed short **free metadata-only** Replit Shell command with an immutable GitHub evidence checkpoint.

## Next after owner supplies output

If a real active frame is verified: choose/review five final eligible HUB anchors and MID/REGIONAL region sets under the binding f.8 constraints, reconcile the five matched crossover pair airport sets and timing, then invoke existing `scripts/calendar_solve.ts` with a genuinely reviewed `FrozenCalendarDesignInput` and independently review its complete 31-batch-day output before a separate DB freeze/admission. Need exact real dates (26×4h/3×2x2h/2×up-to6h), five matched pairs, allowed account range and seven physical REST categories/Alert budgets. Future ordinary REGIONAL selection remains genuinely prospective before cutoff; no full-month invented fixed ICAO assignment.

If frame is absent/invalid: localize the **frame prerequisite** and use existing `scripts/build_final_frame_v39.ts` plus its authentic Gate1/reference proofs. Do not create artificial traffic/country metadata or buy FIDS to fill a missing frame without a reviewed cause.

At all times: Phase5 **scientific FREEZE HOLD**, Phase6 **paid GO NO**, and old V0079–V0083 migrations and four worker credentials must not be reinstalled.
