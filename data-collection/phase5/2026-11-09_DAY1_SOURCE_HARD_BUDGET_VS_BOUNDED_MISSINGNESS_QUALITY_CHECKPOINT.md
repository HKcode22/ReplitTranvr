# Phase 5 Day 1 — reuse real read-only QA to separate safety STOP from bounded missingness

**November 9 Pacific / November 10 UTC. Engineering review, not operational authorisation. Source-use/Phase5 FREEZE HOLD, Phase6 paid GO NO. No provider request, no production DB writes or actual sampling launched.**

## Why this was a real remaining Phase 5 release dependency

The existing `phase5DaySourceQualityReadonly_v39.ts` already reads V0079 budget, prepared source queries, exactly stored physical GET attempts, bound FIDS originals, early four-site draw and PRE clock-order candidate aggregates from **one restricted PostgreSQL REPEATABLE READ READ ONLY snapshot**. The existing `phase6SafetyWatchdog_v39.ts` handles separately authorized paid Alert/segment safety and should not be duplicated. The missing bridge was a cautious, non-mutating Day1 interpretation of the existing source auditor's counts.

One missed source request, absent FIDS original, late arrival, or expired content can be a scientifically recorded **missing/censored observation**, not a negative delay, a fabricated PRE, or necessarily a reason to abandon all 31 days. A physical UTC cost overrun or contradictory source custody denominator is more serious and should HOLD further acquisition pending independent STOP owner adjudication. The owner explicitly accepts bounded missingness but not fabricated evidence or unauthorized credits.

## Exactly what was added, and where

- [Existing daily restricted source QA module](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) now exports `assessP5Day1SourceSafetyFromReadonlyAudit()` and includes `day1SourceSafetyReview` in the **existing** `auditPhase5SourceDay()` result (no extra SQL).
- The classifier validates the original read-only schema, exact manifest/date, zero provider/DB writes by the auditor, canonical UTC as-of time, strict numeric budget and actual per-slot/horizon counts. It refuses forged/incomplete or duplicate source quality groups.
- Crosschecks physical GET reservation ≤ planned queries, bound original ≤ reserved, not-yet-due+missed = unreserved; before/late source provenance = total original bindings; suspicious loss of original or PRE quality count is never papered over.
- Independently detects *daily physical UTC source+other REST reserved units* over daily ceiling and *cycle physically reserved + other classes + protected floor* over project cap; it returns `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH`, but **does not itself call STOP, reserve credits or override signed release**.
- Validates four chosen airport/slot/draw records were genuinely present. Missing draw is `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD`, not an invitation to redraw after outcomes.
- Missed GET deadlines, reserved-without-original after cutoff, late source and technical expiry are **counted named quality gaps**, not inferred negatives or auto-PASS. Candidate PRE count not independently proof of physical/native identity. Future not-yet-due source observations are distinctly `SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE`.
- [Existing metadata-only and PG16 quality tests](../../tests/phase5_day_source_quality_readonly_v39.test.ts) gain regression checks for partial source loss, late originals, budget overflow, inconsistent counters, incomplete four-site draw, source still not due, and falsified audit metadata. Existing [CI](../../.github/workflows/phase5-day-source-quality-readonly-offline.yml) runs both credential-empty exact tests and disposable real PG16 lineage test.

## Crucial science and model boundary informed by proposed Amendment E

This audit is **source/cutoff/budget metadata**, not a label authority. Its row counts cannot certify a physical wheels-off outcome, a binary schedule-revision target, provider cancellation, route support, weather or ADS-B. [Independent proposed Amendment E review](2026-11-09_AMENDMENT_E_CROSS_BRANCH_SCIENCE_REVIEW_AND_ENDPOINT_MATRIX.md) adds the *separate* optional endpoint/tier coverage descriptions without changing the originally defined physical-delay scorecard. Never relabel unknown source as absence of delay or let optional ADS-B/NOAA missingness block a qualified PRE.

The Day1 classifier returns `independentStopOrContinueAuthorizedByThisFunction=false`, `scientificPhase5FreezeGranted=false`, `paidPhase6GoGranted=false`. A real owner/authorized workflow must independently review and act on hard reasons. Quality status describes existing evidence, not a release decision, safety action, or prediction score.

## Remaining real Phase 5 work — do not confuse this step with completion

1. Independently approve one scientific first-cycle primary endpoint, observed/native vs conditional scope, Amendment E secondary hierarchy and exact label/metric; source Contents purpose, account-specific TTL/retention, archive/backup and optional-source terms.
2. Review and sign the actual 31 future parent batch-days, corrected five pair sets, treatment-order seed and source/REST seven physical UTC category plus separate Alert budget; 21 ordinary-day airport selections remain future unknown.
3. Authorize and integrate the **real unattended GitHub** adaptive draw → Stage7/8/9 prepared FIDS source → existing signed one-GET queue → source-bound flight T24+Stage17 witness → T6/T90 PRE → POST/receiver/Alert STOP, using precommitted immutable release governance and DB-clock no-backfill. The existing independently reviewed *manual* flight packets must not be silently reclassified as automatically signed.
4. Complete independent Phase5 READ-ONLY final scientific FREEZE with explicit quality STOP/CONTINUE rules and separately gated Phase6 paid GO. Genuine first-day original/POST data occur **after** GO and must never be required to certify already finished prelaunch code.

**No Replit Shell step, no paid provider spending, no SQL installer and no historic pilot repetition in this PR.**
