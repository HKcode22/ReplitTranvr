# 2026-11-02 — Final independent Gate5 November 2 WSSS source pilot closeout

**Last independently observed:** Monday November 2, 2026, after the T−90m owner and independently triggered closeout completed. **Operational source-only pilot: 9/9 successful physical GETs, zero missed slots, 18 API units measured from response headers. Scientific Gate5: HOLD; Phase5 FREEZE HOLD; Phase6 NO-GO.**

This file **supersedes any earlier Phase4 “T−90m running” or “T−6h failed” statements** for the November 2 cohort; those remain immutable historical troubleshooting notes and should not be used as the current answer. Binding sources remain `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§5–7, 16–17, the hash-locked Implementation Log (DO NOT EDIT), original [frozen 2026-11-02 nonretained manifest](GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json) SHA256 `aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136`, and independent actual GitHub Actions logs.

## Proven real source jobs — frozen **candidate** horizons, not verified flight-specific T

| Horizon | Original run and job | Actual provider dispatch UTC | Source responses | Measured REST API units |
| --- | --- | --- | --- | --- |
| T−24h | [run 41309044744](https://github.com/HKcode22/ReplitTranvr/actions/runs/41309044744), job 124855394173 | Nov 1 16:30:00.552 / 17:00:00.435 / 17:30:00.497 | 3/3 success | 6 |
| T−6h | [run 41402736335](https://github.com/HKcode22/ReplitTranvr/actions/runs/41402736335), job 125137897353 | Nov 2 10:30:00.261 / 11:00:00.322 / 11:30:00.327 | 3/3 success | 6 |
| T−90m | [run 41437078179](https://github.com/HKcode22/ReplitTranvr/actions/runs/41437078179), job 125250256608 | Nov 2 15:00:01.099 / 15:30:00.563 / 16:00:00.629 | 3/3 success | 6 |
| **All** | **Three distinct original GitHub run IDs** | **Nine date-frozen, single-attempt slots** | **9/9 success; 0 unknown/unobserved** | **18 units** |

The original T−90m GitHub workflow finished at `2026-11-02T16:00:11Z`, **8:00:11 a.m. PST**, run conclusion `success`, job conclusion `success`. T−90m responses were received at `15:00:01.989Z`, `15:30:00.931Z` and `16:00:00.982Z`. Every source result reported `expectedTier2Units=2`, `headerDeltaMeasured=2`, `providerRequestAttempts=1`, `retries=0`, `rawBodyPersisted=false`, `flightIdsPersisted=false`, `dbWrites=0`. The original T−24h / T−6h jobs also reported 3/3 complete source responses and measured 6 units per horizon. Never count 3 repeated observations as three different physical flights.

**Independent postrun GitHub-only audit:** [workflow run 41477141869](https://github.com/HKcode22/ReplitTranvr/actions/runs/41477141869), job 125385605763, `event=workflow_run`, `completed/success`, actually triggered `2026-11-02T16:00:14Z`. This independently fetched original completed GH run/job metadata and logs, checked exact pinned source SHAs, query slots and clock/guard consistency, observed **three per-horizon verdicts** `SOURCE_ONLY_LOGS_CONSISTENT` with `issueCodes=[]`, and published final `ALL_NINE_LOG_RECEIPTS_CONSISTENT_SOURCE_ONLY` with `confirmedFromSuppliedLogsOnly=true`, `paidStarts=9`, `successfulSourceReports=9`, `measuredTwoUnitDeltas=18`, `providerCallsMadeByAudit=0`, `databaseWritesMadeByAudit=0`. These are **GitHub log receipts, NOT original provider-wire authentication or lawful raw-source custody**.

## Source-field facts, no individual flight originals retained

| Source-field counter | T−24h at all three slots | T−6h at all three slots | T−90m in chronological order |
| --- | --- | --- | --- |
| Observed departures (per repeated response) | 23,23,23 | 79,79,79 | 79,79,78 |
| Explicit IsOperator | 7,7,7 | 23,23,23 | 23,23,22 |
| Explicit IsCodeshared | 0,0,0 | 56,56,56 | 56,56,56 |
| Unknown role | 16,16,16 | 0,0,0 | 0,0,0 |
| Generic `departure.scheduledTime.utc` present | 23 each | 79 each | 79,79,78 |
| `departure.revisedTime.utc` present | 0 each | 79 each | 79,79,78 |
| `departure.runwayTime.utc` present | 0 each | 0 each | 0 each |
| `departure.quality` present | 23 each | 79 each | 79,79,78 |
| `departure.airport.icao` present at exact inspected path | 0 each | 0 each | 0 each |
| Top-level `leg` object present at exact inspected path | 0 each | 0 each | 0 each |

Counter meanings are defined in `server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39.ts`. Zero at an **inspected path** is not proof that equivalent information is unavailable elsewhere in the full source schema. These are **nine snapshots of one fixed WSSS service interval**, not 9 independent populations or 23/79 certified unique flights. Before service, a missing actual runway time is unsurprising; it **does not establish that the provider could never deliver a postflight actual value**, nor certify that a future `runwayTime` is actual rather than estimated.

## Scientific decision after the real paid experiment

**What this actually proves:** early GitHub-runner prearms and exact paid dispatch timing can work despite missed cron; the bounded FIDS endpoint returned source observations at each candidate cutoff; the one-shot rescue prevented duplicate paid retries; all nine GitHub source-only log receipts reconcile; measured API spend within the frozen 18-unit cap.

**What it does NOT prove:** provider-native selected T, the physical operating-leg denominator, truly actual-only wheels-off with per-value actuality/provenance, legal source retention, original bytes/receipt hash custody, persisted flight-horizon PRE, inside/outside webhook or actual outcome rate. Every T−90m source report explicitly marked `firstProviderNativeSelectedTCertified=false`, `runwayActualOnlyPerRecordCertified=false`, `confirmedOperatingLegPopulation=false`, `retainedSourceForFutureCohort=false`, `strictGate5Passed=false`, Phase5/6 false. The independent report returned `distinctPhysicalFlights=null`, `certifiedPersistedPRE=null`, `providerNativeSelectedT=null`, `verifiedActualOnlyWheelsOff=null` (UNKNOWN **not zero**).

A real progress milestone **does not justify claiming scientific PASS**. Do not rewrite the target to revised/estimated departure or treat 56 marketing codeshares as separate operated legs. Do not repeat the Nov 2 source-only paid test; it is finished.

## Next Phase 4 critical path

1. **Native semantics [#200](https://github.com/HKcode22/ReplitTranvr/issues/200):** prove the provider-native first scheduled T field's actual operational meaning and per-record actual-only runway label. The binding Plan f.8 §6.0 explicitly refuses a generic `scheduledTime` guess. If AeroDataBox cannot supply it, produce an honest unavailable/alternate-source or formally amended-target decision, not an invented actual label.
2. **Lawful source custody [#300](https://github.com/HKcode22/ReplitTranvr/issues/300):** documented grandfathered RapidAPI Team Ultra account and prior quota measurements already exist—**do not reask**. Public provider [September 7, 2026 terms update](https://aerodatabox.com/2026-09-terms-update) identifies **November 7, 2026** existing-subscriber grace and default 7-day caching with exceptions. Actual account-specific permitted purpose, extended rights, HTTP cache headers, normalized Contents, backup/replica expiry and effective deletion remain **unverified**. Quota does not establish rights.
3. **Full original-linked future cohort [#293](https://github.com/HKcode22/ReplitTranvr/issues/293):** newly merged [PR #334](https://github.com/HKcode22/ReplitTranvr/pull/334) protects PRE original hash + as-of joins; [PR #335](https://github.com/HKcode22/ReplitTranvr/pull/335) stages V0077 source-to-reservation metadata and disposable PG16 tests. V0077 is **not installed or granted in production**, and source request airport/window/flags binding must still be independently authentic, plus licensed raw-first storage/expiry, physical flight identity, retained PRE and outcomes. The future audit manifest `GATE5_NEXT_FROZEN_COHORT_READONLY_AUDIT_HOLD.json` remains HOLD and release pin null.
4. **Review feasibility, not another indefinite pilot:** choose the exact acceptable evidence route for scheduled T / actual wheels-off. If it cannot be established from the current paid provider + allowed independent sources, the binding Plan requires recording a blocked primary target or a reviewed revised protocol; optional ADSB.lol-derived takeoff proxies remain **proxies**, not exact actual-only runway ground truth.

**Final Nov 2 disposition:** `SOURCE_ONLY_OPERATIONAL_9_OF_9_PASS`; `SCIENTIFIC_GATE5_HOLD`; `PHASE5_FREEZE_HOLD`; `PHASE6_NO_GO`. No new paid call, Replit shell, scheduled job, production DB install or provider source persistence triggered by this closeout.

## Contract-verified correction to historical shape counter interpretation (Nov 2 evening)

Official [RapidAPI OpenAPI AirportFlightContract](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json) declares `withLeg=true` means **`movement` is replaced by separate `departure` and `arrival` objects**; a FIDS `leg` object is **not a documented property** in that contract. It also documents that `departure.airport` is not set when the origin equals the *requested airport*. Therefore the original pilot's `flightLegObjectPresent=0` and `originIcaoFieldPresent=0` reflect **inapplicable/optional inspected paths**, NOT proof that opposite-leg or requested airport context was unavailable. The frozen original producer and GH log counters remain unchanged as historical measured facts.

An offline follow-up correction in `server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39.ts` replaces those misleading counts for **future** source-shape analysis with `departureMovementObjectPresent`, `arrivalMovementObjectPresent`, `withLegExpandedMovementPairPresent`, `movementOnlyFidsShapePresent`, `oppositeArrivalAirportIcaoFieldPresent`, `departureAirportIcaoFieldPresent`, and `requestedAirportDepartureObjectWithAirportOmitted`; adds direct assertions in `tests/phase4_gate5_one_paid_nonretained_source_inspection_v39.test.ts`. No new source GET, provider body persistence or change to frozen source run SHA; no retroactive ability to measure these new counters from the nonretained November 2 responses. Even a movement pair does not independently confirm one operated physical leg or an actual wheels-off label.
