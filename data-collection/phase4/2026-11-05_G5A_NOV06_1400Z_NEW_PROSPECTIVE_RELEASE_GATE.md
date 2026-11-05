# Phase 4 Gate 5 — distinct Nov 6 14:00Z WSSS future three-horizon release candidate

**Status: CODE / FROZEN FUTURE CANDIDATE, NOT A PAID ACTIVATION OR SCIENCE PASS.** This supplements binding Plan f.8 v3.9, Phase4 owner directive, and issue #293. No modifications to prior append-only original FIDS, V0076/V0077/V0078, or the canceled cohort. Repository/GitHub Actions remain the only scheduler; no Cloudflare, Replit Agent, or Replit timers.

## Why this new cohort exists

At Nov5 00:30 PST, the earlier `WSSS_G5A_20261106_0900Z` T24 paid original persisted 82 departure entries: 27 positive native `IsOperator`, 54 `IsCodeshared`, 1 other; 0 native `id`; all 27 operator composites unique within that original, 0 raw in-original collisions. Existing (pre-PR405) G5A code required a native `id`, yielding zero operating/PRE. The user canceled the owner at 00:51 PST before any second original. PR405/#406 added future-only ID-less conditional matching, duplicate demotion, cross-horizon frozen T, first-source qualified-as-of budget veto, and common-3-PRE POST budget veto. The original cohort is invalid for complete three-horizon G5A and MUST NOT be resumed, retroactively requalified or charged again.

**Important unclosed source clock fact:** The first native aggregate reported 0 `qualified_on_time_candidate_count` but applied a literal `^2026-11-06T` timestamp prefix to raw native date-time text. This result is **not authoritative for the normalized TIMESTAMPTZ cutoff**. Separate no-paid, read-only source-only diagnostic `v39_phase4_gate5_g5a_cancelled_t24_cutoff_eligibility_readonly.ts` must independently distinguish a timestamp formatting artifact vs true late-source absence before a paid release. If the actual `source_asof_cutoff_qualified_idless_operators` is 0, stop and investigate instead of starting this replacement.

## Frozen candidate geometry

* New immutable manifest: `GATE5_G5A_WSSS_20261106_1400Z_FROZEN_SOURCE_GRID.json`
* Cohort: `WSSS_G5A_20261106_1400Z`, WSSS Friday Nov6 **14:00–15:00Z** (Fri Nov6 **6–7am PST**; Fri Nov6 **22–23 Singapore local**). Separate source from the old Friday 09–10Z, NOT a shifted/overwritten historic original.
* Freeze timestamp 2026-11-05T10:00Z (Thu Nov5 02:00 PST), before earliest first GH prearm and all new physical GET cutoffs.
* New grid acquisition guard 30min, cadence 30min, max staleness 45min, revised **GitHub verified prearm lead minimum 15min** (not a three-hour standby), 3 fixed one-attempt 2-unit source GETs per horizon = max18, plus three one-attempt 2-unit POST = max6. V0076 shared project hard ceiling 24 units. Exact original source rights/remaining account quota MUST be verified by owner before irreversible reservation; never assert an owner subscription is active solely from a historical receipt.
* T24 first physical Thu Nov5 13:30Z = **Thu 5:30am PST**; 14:00/14:30Z = 6/6:30am PST. First native candidate cutoffs Thu 14–15Z; last first-horizon PRE cutoff Thu 7am PST. T24 GH job start must be authenticated no later than **Thu 13:15Z = 5:15am PST**.
* T6 first physical Fri Nov6 07:30Z = **Thu 11:30pm PST**, then midnight/00:30 Fri PST; first cutoff Fri 08:00Z, last 09:00Z; GH prearm deadline Fri 07:15Z = Thu 11:15pm PST.
* T90 first physical Fri Nov6 12:00Z = **Fri 4:00am PST**, then 4:30/5:00am; first cutoff Fri 12:30Z, last 13:30Z; prearm deadline Fri 11:45Z = Fri 3:45am PST.
* POST prearms Fri 14:40,14:52,15:07,15:22Z; actual GETs Fri 15:40/16:10/16:40Z = **Fri 7:40/8:10/8:40am PST**. Frozen W aggregate Fri 17:01Z = 9:01am PST. POST runs ONLY if at least one actual same flight key has cutoff-safe PRE at all three horizons and one selected original T. Unknown/absent later observation is censored not negative.
* Independent least-privilege no-provider audit Fri 17:12/17:18/17:24/17:30Z = **Fri 9:12–9:30am PST**; posts counts to issue #293, NOT a PASS.

## Identity and source conditions

FIDS native `codeshareStatus=IsOperator` (1) positively required for ID-less conditional candidate. Provider flight number two-character carrier+digits, destination ICAO, requested WSSS departure query context, in-window scheduled UTC, not known cargo/private/charter-positive; missing commercial flags still UNKNOWN, not certified commercial. Identity key is SHA of frozen service start, number, carrier, origin+destination: no departure time or revised time in key. Marketing/unknown, duplicates within original, mixed-nonnative aliases, and conflicting source evidence are UNKNOWN/ambiguous, never silently promoted. New source and POST both explicitly pass `g5aCompositeIdentityStudyStartUtc=2026-11-06T14:00Z`. They must never use same key for a different frozen cohort.

Future T6/T90 PRE cutoffs anchored to real persisted on-time T24 first schedule. First original source must have at least one truly as-of operating candidate before any second paid GET, not merely syntactic identity. PRE writer DB-clock three-minute admissible window, no historical backfill. POST requires actual all-three-horizon common PRE. Repeated GET, duplicate owner, expired GH event, missing quota, DB failure all refuse or remain unknown without fabricating observation.

## Scientific limitations, and release gate

* This is **G5A provider-reported scheduled departure revision ≥15 minutes**, not actual wheels-off delay, gate-out, or provider-certified physical metal for every record. Still only a Phase4 technical science feasibility study.
* **Source retention/label integrity:** the earliest T24 original can pass its 23-hour source-use expiration before the Friday POST watermark. The corrected future POST classifier MUST derive its as-of baseline from the immutable `fids_departure_schedule_asof` feature in the genuinely on-time PRE snapshot (`flight_snapshots.features_json`), never re-read raw FIDS or `flight_population` source content after expiry. A missing or malformed PRE baseline is UNKNOWN, never a 0-minute revision. Derived-feature use still requires the scoped owner rights attestation; this code change does not invent new license rights.
* Before merge/paid start: (1) actual normalized source as-of count from retired original (if available) positive or documented alternative independent positive no-provider evidence; (2) exact source/POST/audit YAML times, frozen manifest, 24 budget and security context verified by static and offline tests; (3) realistic id-less native FIDS source→cutoff-safe PRE→retimed POST replay in disposable PG16, with unknown and duplicate negatives and no provider, and full V3.9 safety green; (4) GitHub released `main` before prearm, GH job actual start <= frozen deadline, no competing old paid run. If any of these cannot be met by T24 prearm, **do not backfill**; choose a later future cohort.
* No provider rights or exact November remaining quota measured by this PR. Do not reinstall schemas or use Replit to schedule. Paid operation remains HOLD while this is a review candidate.

**Decision:** Prep candidate only. Phase4 Gate5 science HOLD, Phase5 and Phase6 no-go until independently measured and reconciled.
