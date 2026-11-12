# November 12 — three complementary flight sources: ADSB.lol before/after departure and actual prior-tail chain

**Status:** optional Phase5 engineering, no new provider subscription and **NOT** a Phase6 launch or a live deployed ADSB.lol collector. Keep ONE canonical Amendment E and the existing f.8 31-day AeroDataBox prospective source/identity/clock plan. Scientific FREEZE HOLD / Phase6 paid GO NO.

## The direct answer to the owner's question

**ADSB.lol can support three different phases, but it cannot serve as an equal substitute for AeroDataBox or BTS:**

| Phase | Legitimately useful ADSB.lol role | What it does NOT prove |
| --- | --- | --- |
| **PRE T−24h / T−6h / T−90m (future departing leg)** | Only an **existing, pre-issue-time** correctly linked aircraft/ground/location observation or preceding-leg track context, if the physical flight/tail identity and ODbL usage are independently reviewed | A future scheduled flight exists, original selected scheduled T, final gate-out, a guaranteed tail assignment, actual previous gate-in, missing AeroDataBox PRE, or actual runway time |
| **Previous-leg tail/rotation before the next PRE** | Precisely matched **prior aircraft** trajectory or ground observation can strengthen a **same physical tail + matching airport** context if received before this later flight's forecast; an independent actual gate-in + original scheduled next gate-out can produce a **planned turn buffer** | A ground/landing signal is not *actual gate-in*, an ADSB ICAO24/callsign is not a canonical flight identity, and a prior airplane's later track cannot be imported into an earlier PRE |
| **AIRBORNE after independently verified takeoff** | Cutoff-safe positions/altitude/speed and trajectory prefixes for a separate in-flight ETA candidate with quality, staleness and receiver-coverage metadata | Certified physical wheels-off, exact landing/gate-in, a working continuously commissioned API feed, or a customer-facing ETA model |
| **POST after flight** | Archived ground→air transition bracket/takeoff or landing proxy, separate from real airport/operator milestone and calibrated against independently matched actual references where eligible | A physical exact-only label without reviewed calibration, or postdeparture features injected into predeparture snapshots |

The **three-source responsibility split** stays invariant:
- **AeroDataBox FIDS/Alerts:** primary prospective population, immutable original source and selected T, scheduled/updated flight statuses, T−24h/T−6h/T−90m PRE, independently qualified actual POST when genuine source semantics support it. Original FIDS missingness is not backfilled from other providers.
- **ADSB.lol:** optional same-aircraft evidence, distinct trajectory/coverage/error layer and potentially independently matched aircraft movement after a decision cutoff. ODbL attribution/derivative-database obligations and production service access must be reviewed; free ≠ permission for unlimited customer-scale polling. This isn't a paid second airborne service.
- **U.S. BTS (actual August 2026 official normalized data already stored):** **historical U.S. reporting-carrier** postflight labels and tail/route reference, not worldwide real-time current PRE. This source's original ZIP, 608,389 normalized historical rows and SHA receipts are documented in [real BTS postmerge verification](2026-11-12_REAL_BTS_2026_AUGUST_608389_VERIFIED_NORMALIZED_ARTIFACT_READBACK.md). The normalized GitHub artifact expires Dec12 and still needs a durable owner-selected provider-specific object path.

Official current ADSB.lol terms/data: [API usage and free quotas](https://www.adsb.lol/docs/open-data/api), [service about + ODbL](https://www.adsb.lol/about), [request free key/service notice](https://www.adsb.lol/request), and [historical traces](https://www.adsb.lol/docs/open-data/historical). As of Nov12 2026, official API says no-key **500 requests/day/IP**, free adhoc **1,000/day** and feeder **7,200/day** (different limits/obligations); 429 Retry-After, UTC reset. Free keys are best effort/no commercial guarantees. This is a **capacity upper context, not permission to start a 31-day production poll**. Prior Nov9 ADSB.lol error-study source code/protocol must be reused, not reintroduced.

## Existing implementation reused, not reimplemented

- **Previous source raw point clock:** `gate05ZeroCostAdsbEvidence_v39.ts` parses already recorded ADSB.lol API JSON and checks **receipt + approximate provider sample time** by issue/cutoff; `gate05LiveAdsbContinuity_v39.ts` checks interval/jumps.
- **Physical leg admission:** `phase4Gate5DualSourceAdsbAdmission_v39.ts` gates actual independent AeroDataBox operating leg, aircraft linkage, no known swap, ODbL rights, as-of position; it **intentionally accepts only AIRBORNE** and never certifies actual wheels-off.
- **Existing trajectory system:** `airborneSnapshotBuilder_v3.ts` / `airborneMaterializer_v39.ts` preserve points/clock/eligible denominator; eligibility must be independently verified and separately configured.
- **Existing same-tail PRE slot:** `historicalFeatureStore_v3.ts` + `phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts` already allow a prior-aircraft context; [`phase5AmendmentETailChainAsOfCandidate_v39.ts`](../../server/lib/disruption/phase5AmendmentETailChainAsOfCandidate_v39.ts) requires **real actual previous gate-in** and original scheduled next gate-out, with same reviewed physical tail/airport and pre-issuance receipt to form a *planned ground turn buffer*, not actual completed turn.
- **Independent POST proxy calibration:** `phase5PhysicalDepartureProxyCalibration_v39.mjs` supports separately labeled ADSB inferred takeoff brackets against actual-only reference when matched, including eligible delayed U.S. BTS wheels-off; TRAIN/VALIDATION only (never protected days 26–31).

## New bridge in this PR — ACTUAL code contract, not production feed

[New `phase5AmendmentEAdsbThreePhaseAsOfBridge_v39.ts`](../../server/lib/disruption/phase5AmendmentEAdsbThreePhaseAsOfBridge_v39.ts) supplies two distinct pure functions:

1. **Prior-aircraft PRE context:** invokes the existing actual-gate-in tail checker. Independently qualified, as-of ADSB prior aircraft observation can be marked `CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN`. A post-issued position, callsign-only join, aircraft swap or unreviewed ODbL return missing/hold. **Even a ground-reported ADSB point cannot create a gate-in timestamp.** Existing independently evidenced true gate-in feature remains eligible when optional ADSB is absent, so missingness is bounded rather than globally invalidating PRE.
2. **AIRBORNE trajectory prefix:** for each existing normalized ADSB sample, calls the current P4 independently reviewed physical-leg/source/clock admission; refuses mixed ICAO24 aircraft, duplicate observations, ground-only movements, after-decision receipt or approximate observation time. Separately requires an independently authenticated airborne-eligibility observation and its **available-at** no later than forecast cutoff. Only the honest eligible prefix is passed to the existing Phase0 `buildAirborneSnapshot` for cadence/funnel diagnostics; output returns a prefix hash, counts and **ALL physical outcome labels NULL**. It cannot persist a snapshot, produce actual ETA, certify receiver coverage, or authorize polling.

A local verified source digest/explicit boolean is **not itself an independent signed operator attestation**; real source/rights proofs must be reviewed outside this pure code. No new source-collection poll, GitHub cron or Neon role, no POST actual gate-out conversion, no replacement of original Stage14. Code emission status is explicitly *candidate* and all flags for live Phase6 use remain false.

### Synthetic/nonpaid tests

`tests/phase5_amendment_e_adsblol_pre_tail_airborne_bridge_v39.test.ts` uses the **existing normalized WSSS-compatible Gate05 ADSB response parser** and reused Phase0/P4/P5 functions to test:
- Genuine distinct pre-cutoff two-point AIRBORNE prefix gives eligible diagnostic; no actual wheels-on/off/gate fields, no ETA or persisted POST.
- Post-issue receipt forbidden even where provider's approximate observation time predates issue; unreviewed movement/rights/callsign-only/mixed hex/duplicate/ground points fail or stay missing.
- Prior inbound ground ADSB context may be observed by the next PRE issue but cannot replace previous actual gate-in; no previous gate-in means no numeric planned turn, even with ground ADSB.
- Missing optional ADSB never invalidates independently qualified true gate-in tail buffer. No network, SQL, provider credits or live activation.

## Actual Phase6 critical path, still prioritized

**Do not make ADSB auxiliary coverage a new all-or-nothing condition for paid AeroDataBox start.** Continue:
1. Independent genuinely prospective signed future **31-day** B0062 region/HUB/time calendar and treatment seed, UTC 7-REST-category approved cost cap, real provider request range/account balance and source Contents intended model-use/retention evidence. Avoid a fabricated full 21-future-airport source query grid.
2. Explicit one-use, owner-reviewed, hash-pinned commissioning of already-merged V0093 budget compatibility migration and narrow V0093 cost-only release actor **after** B0062 production cold-start readback; **never reinstall V0079–V0092**.
3. Real GitHub-only after-draw source origins plus independently verified Stage14 PRE T24/T6/T90, source receipt/original hash/selection bias/POST; C+D bounded task/leases/recovery + STOP, and independent full live readback.
4. ADSB.lol pilot separately: operator ODbL policy/rate/retention, bounded asynchronous read after **same physical leg** is independently linked and approved; actual received/available timestamps, receiver coverage and error measurement; AIRBORNE and tail/POST are separate branches. Record unobserved as missing; avoid asserting customer ETA accuracy.
5. Final independent finite Phase5 science FREEZE then separately paid Phase6 GO. The user's broad paid approval is not evidence of a signed physical source/rights/calendar, but separate offline engineering continues without vendor-email dependency.

**No Replit Shell command required for this PR. Phase5 science FREEZE HOLD / Phase6 paid NO-GO; no physical flight data or production ADSB.lol measurements asserted by this code.**
