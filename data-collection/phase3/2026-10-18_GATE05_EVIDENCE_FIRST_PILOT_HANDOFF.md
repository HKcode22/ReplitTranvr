# Phase 3 / Gate 0.5 — evidence-first pilot handoff (2026-10-18 PDT)

**Status:** ENTRY READY FOR OFFLINE WORK; DEDICATED PILOT **NOT STARTED**; no Gate 0.5 PASS, no paid AUTH, no Phase 6 GO. **Draft; review before merging.** This is a prospective protocol, not a retroactive amendment to V3.9-f.8 or historical fieldwork.

## Executive decision

The WSSS08 isolated Gate 3 canary supplied **real engineering evidence**, not Gate-0.5 scientific sample adequacy:

- Auth `AUTH-20261019-G3WSSS08`, authorization SHA256 `63f09aaca80160d07268c855fb0d85b5382df5febf21b482cc2bcd65009a2746`, source `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`, one WSSS departures subscription with planned **600 seconds** starting `2026-10-19T04:00Z`.
- Durable LOGGED terminal `SETTLED` at `2026-10-19T04:12:13.565Z`, exact 19 received vs 19 billed (2056 → 2037), 3 settled provider reads, 0 foreign active billables, owned subscription deleted, six-plus-six callback-health audit not pending.
- GitHub independently authenticated safety run [39196709528](https://github.com/HKcode22/ReplitTranvr/actions/runs/39196709528) finished `success` and lease `STOPPED`; reported `OWNED_NOT_ACTIVE_SETTLEMENT_SEPARATE` before the owner independently completed its financial settlement.
- Seven original `clean.provider_content_blob_ref` LOGGED references not tombstoned. Original bytes read independently from Replit Object Storage: **7/7**, **19 items**, **27,387 bytes**, verified against SHA-256/JSON/delivery identity, audit digest `fcd9972c57d8818f29f52fb2991b0a4c396abb945d54458793f7d9b091018d7f`. `UNLOGGED` delivery/session rows had disappeared following a PostgreSQL postmaster restart at `2026-10-19T04:20:21.668Z` (after settlement). Do not reconstruct the transient rows by writing guessed data.
- Runtime terminal is `SETTLED_CANDIDATE_RECORDED_NOT_CRYPTOGRAPHIC_ORIGIN_PASS`, expressly `paidCanaryCertified:false`; callback secret URL does **not** independently prove AeroDataBox's cryptographic sender signature. **Operational Gate3 R1/R3 evidence met**, formal provider-origin certification not invented. No second Gate3 CREATE is authorized.
- A notification *item* can be a repeated observation for a physical flight; **do not call these 19 independent flights**.

**Next intended milestone:** a separate, adequately sampled Gate-0.5 pilot that tests **whether prediction T and the primary departure delay target are constructible** from actual provider-native movements, clocks and FIDS coverage. The existing 19-item canary can inform a **zero-provider/zero-write preliminary field audit**, not certify Gate0.5.

## Source inventory on reviewed main (no deployment change)

| Source | Actual status and limitation |
|---|---|
| `scripts/v39_gate05_owner_v39.ts` | Reads operator-supplied `--measurements-file` JSON and calls `evaluateGate05`. **Cannot authenticate whether any count or boolean came from real data.** Not a live provider pilot. |
| `scripts/v39_gate05_pilot_v39.ts` | Generic `runAuthorizedOwner` wrapper; verifying AUTH at the wrapper is not a complete dedicated FIDS + webhook observation protocol. **Do not run this as if it collected a pilot.** |
| `server/lib/disruption/gates_v3.ts` | `DEFAULT_GATE_05_CRITERIA` = 100 notifications / 50 unique flights / 20 completed / 30 airborne flights / 100 airborne points / 60 minutes; numeric checks + boolean flags. These are **currently source defaults, not proven prospective pilot sample thresholds**. Passing fixture JSON proves only code arithmetic, not a real Gate0.5 PASS. |
| `tests/phase3_gate05_measurement_runtime_validation_v39.test.ts` | Good shape/type regression tests; does not establish observational provenance, exposure/budget, FIDS semantics, or target validity. |
| `server/lib/disruption/fidsCensus_v3.ts` | Contains canonical query role, IANA-local time translation, provisional-vs-confirmed identity, FIDS retry/persist code. Real FIDS REST calls **may consume API units** and must not be invoked without separate category budget/authorization. |
| `server/lib/disruption/flightNotificationExtractor_v3.ts`, `flightDataPrePostStore_v3.ts` | Existing notification field/event extraction and PRE/POST provenance helpers; require actual payload and clock verification, not blind scheduled→gate-out or revised→actual aliases. |
| `server/lib/disruption/airborneMaterializer_v39.ts`, `airborneSnapshotBuilder_v3.ts` | Observation/trajectory path exists. Production snapshot output is gated on appropriately frozen cadence/completeness config; **do not fake AIRBORNE denominator from webhook presence**. |
| `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§5–6, 11.2, 16–17 | Binding scientific and authorization requirements. Gate0.5 is a **dedicated pilot**, distinct from Gate3, requiring FIDS roles/semantics, clocks, actual-versus-estimated target, trajectories, range and sample adequacy. |

## Stage 0 — exploit existing WSSS08 evidence safely (NOW, no provider spend)

Perform an **in-memory read-only field-coverage report** over precisely the seven verified originals before their ordinary 168-hour TTL, but never upload the raw items, secret callback URL, subscription ID or unredacted payload to GitHub. The earliest raw original at `2026-10-19T04:01:47.548Z` has nominal expiry `2026-10-26T04:01:47.548Z` (2026-10-25 21:01:47 PDT). Respect provider licensing and deletion policy; do not extend TTL by assumption.

Safe metrics to report: number of original callback envelopes and notification items; counts of per-item `departure.scheduledTime.utc`, `departure.revisedTime.utc`, `departure.runwayTime.utc`, `arrival.scheduledTime.utc`, `arrival.revisedTime.utc`, source `lastUpdatedUtc` and `location`/observation-time field availability; available airport ICAO, flight number/provider ID, codeshare markers and status; number of parseable UTC values; **provisional** dedup keys; missing/ambiguous reasons. Do not claim scheduled vs revised vs runway have gate-out/wheels-off semantics solely because their values look plausible. Do not derive a full data-quality percentage from seven envelopes alone or count unseen provider SEND attempts.

An observed `19` items must not be substituted for `minUniqueFlights`, `minCompletedFlights` or `minAirborneFlights`. Avoid collecting/printing raw arrays. If any blob is now unavailable, report the specific class of failure and keep the original settlement intact.

## Actual WSSS08 Stage 0 field-inventory result — owner-executed, zero-provider, 2026-10-19 PDT

The operator executed the approved `GATE05_FIELD_INVENTORY` read-only Node/PG/Replit-object-storage command against exact WSSS08 session `386efd78-9155-4264-9533-7939d814d521`. It re-downloaded SHA-verified seven original callback envelopes (19 notification items, 27,387 bytes), did not print raw content, and printed `status=WSSS08_GATE05_FREE_FIELD_INVENTORY`, `provider_api_calls=0`, `database_writes=0`, `blob_writes=0`, `gate05_pass=false`, `unique_flights_certified=false`, `target_semantics_certified=false`.

| Per-item path checked | Populated out of 19 | Valid UTC strings |
|---|---:|---:|
| `number`, `status`, `codeshareStatus`, `departure.airport.icao`, `arrival.airport.icao` | 19 each | n/a |
| `departure.scheduledTime.utc` | 19 | 19 |
| `departure.revisedTime.utc` | 17 | 17 |
| `departure.runwayTime.utc` | 5 | 5 |
| `arrival.scheduledTime.utc` | 19 | 19 |
| `arrival.revisedTime.utc` | 16 | 16 |
| `arrival.runwayTime.utc` | 0 | 0 |
| `lastUpdatedUtc` | 19 | 19 |
| `id`, `flightNumber` | 0 | n/a |
| `location.reportedTime.utc`, `location.reportedAtUtc`, `location.reportedTimeUtc`, `location.latitude`, `location.longitude` | 0 each | n/a |

**Interpretation and schema correction:** The 19/19 scheduled departure timestamps and 5/19 departure runway timestamps are promising *field presence* only. Actuality and gate-vs-runway semantics are NOT verified. A one-airport departures-only 10-minute canary is not expected to evidence completed arrivals for all items. The first field inventory used the *wrong latitude/longitude property names*: the existing `flightNotificationExtractor_v3.ts` actually reads `flight.location.lat`, `flight.location.lon`, `flight.location.reportedAtUtc`, not `location.latitude`/`location.longitude`; the `reportedAtUtc` path **was** inspected and absent, but latitude/longitude at `lat/lon` remain UNMEASURED. The extractor also understands numerical `status` and `codeshareStatus` enum codes. A subsequent zero-provider, read-only corrected-path audit is necessary. Provider schema change page: https://aerodatabox.com/breaking-changes-2023-10/ .

The 0 `id` field count makes the project’s schedule-/carrier-/route-aware physical-leg identity handling especially important: **do not deduplicate by `number` alone**, and do not infer 19 unique flights. Distinguish field counts, provisional unique observation fingerprints and independently resolved physical-leg identities. Do not backfill transient rows after the Neon restart.

**Updated next action:** verify the correct `location.lat/lon/reportedAtUtc` shape, map observed status/codeshare categories to numerical codes, count provisional duplicate observation keys and airport/flight-time pairs, report only aggregated counts. Then design the separate pilot’s FIDS REST budget and target-semantics proof; no paid WSSS rerun and no legacy Gate05 JSON `PASS` claim.

## Stage 1 — exact prospective pilot protocol to review BEFORE spending

1. **Freeze provenance and sample logic**: source SHA and API/OpenAPI contract/version and marketplace/account; airport(s), direction/role, local IANA zones, UTC interval, query identities and half-open `[start,end)` semantics, `withLeg`, `withCodeshared`, `withCargo=false`, `withPrivate=false`, and flight identity/dedup policy. FIDS and webhook observations must be tied to independently grounded physical-leg identity; unresolved codeshares remain ambiguous.
2. **Freeze adequate-sample minima prospectively** for **six separate units**: notification deliveries/items, *unique verified physical flights*, completed flights with independently verified actual movement targets, airborne-eligible flights, nonduplicate airborne points and elapsed pilot minutes. Existing source defaults (100 / 50 / 20 / 30 / 100 / 60) are **candidates only**; evaluate feasibility/cost and justify a reviewed freeze **before** pilot observations. If impossible under the spending envelope, report `INSUFFICIENT_SAMPLE`, propose one separately approved change, not arbitrary post hoc easing.
3. **Budget every provider activity separately**: authenticated prepaid-account Alert credit balance and protected floor; no foreign active billables; max one unique Alert CREATE if authorized, no CREATE retry, independent watchdog and exact owned DELETE + stable settlement; **FIDS REST requests consume separate API units**, have category reservations, exact attempt ceilings and permitted retries. Don't assume a 50 Alert-credit request sets a provider-side hard stop. Record exclusive start/expiry, unsafe-overshoot handling, retention and authorized cleanup owner in exact new AUTH.
4. **Pilot data-plane**: real published prepaid receiver/raw-before-2xx; durable original bytes/SQL SHA readback; FIDS airport queries with actual provider time zone and bounded local request windows; preserve `requested_airport_primary` vs `opposite_movement_context`; compare `withLeg=true/false` only under independently authorized requests. Record query start/response/available-at, response hashes, provider errors/rate-limits and empty/unavailable snapshots.
5. **Constructible T and departure outcome**: inventory provider-native `departure.scheduledTime`, `departure.revisedTime`, `departure.runwayTime` separately. Verify from actual contract + payload what is **scheduled** versus **actual**, and whether each represents **gate-out** or **wheels-off** (not synonyms). The target `actual - scheduled` may only use a pair with matching verified semantics. If no actual/paired label verified, label `PRIMARY_TARGET_SELECTED=BLOCKED` rather than inventing a proxy.
6. **Temporal leakage wall**: store provider event time, provider publication time, callback receive time, SQL durable `available_at`, FIDS request/response availability separately; for T−24h/−6h/−90m the proof is data available by the cutoff, never final schedule/retrospective revised status reinterpreted as earlier truth.
7. **Movement/trajectory/censoring**: actual per-flight observation sequence, median/P95/max interpoint gaps, nontrivial trajectory duration, usable/eligible denominator, location availability, postdeparture latency, recovered completion/arrival censoring grace. No assumed universal cadence.
8. **Stop and conservation**: exact provider DELETE and 3 stable balance reads, received/billed accounting, separate categorized FIDS API-unit ledger, callback failure count, immutable terminal receipt, cleanup/retention verified; never declare complete if a source, owned subscriber or account remains ambiguous.

Official endpoint information should be checked against the active provider OpenAPI/marketplace version. Source references: https://doc.aerodatabox.com/ ; https://aerodatabox.com/fids-with-extended-information-flight-time-and-distance/ (`withLeg` changes response shape); https://aerodatabox.com/breaking-changes-2023-10/ (nested time objects); https://aerodatabox.com/pricing (plan-dependent FIDS range). These describe available *features*, not proof of actual gate/runway/actuality semantics for our subscriber's records.

## Final decision and evidence schema

Proposed certified assessment (NOT yet implemented) must **derive**, not trust, counts/flags from versioned immutable evidence:
- `PASS`: previously frozen and verified sample minima all met; zero applicable source/callback failures, verified real raw-before-ACK, exact sender/account/list/settlement evidence, event and availability clocks, independently verified provider T and primary-target semantics, correct FIDS population/identity roles, cadence/latency metrics and no unresolved critical contradictions.
- `INSUFFICIENT_SAMPLE`: evidence itself sound, but one or more frozen minima unmet; **no automatic extension** or second paid pilot.
- `BLOCKED`: no authorized budget/contract, provider semantic target not constructible, unverifiable crucial identity/clock, unresolved provider/source custody or certification condition.
- `FAIL`: actual tested requirement violated (e.g. source integrity, leakage/actuality assertion, billing failure, untracked billable subscription, invalid data-plane behavior). Preserve evidence and classify the exact reason.
- A strict safety subgate may BLOCK before measurements begin; report fail-closed reason without manufacturing zero-valued observed measurements.
- Distinguish `Gate05_OFFLINE_SHAPE_TEST_PASS`, `Gate05_REAL_OBSERVATION_MEASURED`, and `Gate05_DEDICATED_PILOT_PASS`. The legacy `v39.gate05-evidence.v1:PASS` output from operator-provided JSON is **not** the last category without new trusted provenance validation.

Future tests should cover: fabricated boolean-true JSON, duplicate flights counted as unique, empty/invalid/expired sources, timestamp estimates masquerading as actuals, UTC/local/DST crossings, opposite-leg inflation, zero denominators, incomplete outcome label, AIRBORNE not eligible, unexpected REST/Alert spend, unclean provider DELETE, source-verified post-Neon restart recovery, and exactly one auth scope.

## Session checkpoint / no-go boundary

**Verified now:** reviewed main `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e` was unchanged at entry; original WSSS08 closeout [PR #79 comment #6259652716](https://github.com/HKcode22/ReplitTranvr/pull/79#issuecomment-6259652716) and WSSS08 seven-blob verification evidence are sufficient to start offline Gate0.5 field exploration.

**Not done:** no new Gate0.5 pilot, no frozen adequacy threshold, no live FIDS/API REST test, no Gate0.5 scientific PASS, no paid Gate0.5 AUTH; no deploy or provider call. The WSSS08 168h originals are retention-bound, not a permanent approved training corpus. No Project Phase6 start.

**Next exact activity:** owner executes the source-preserving WSSS08 seven-original *in-memory field-inventory read-only script* from the reviewed Replit workspace, outputs **counts and null coverage only**, then freeze the minimal Gate0.5 prospective sample/budget protocol and implement an evidence-producing, audited pilot in a **separately reviewed** source PR. Do not run `npm run v39:gate05:pilot` or manually write `true` flags as scientific evidence. No Replit AI Agent, no Cloudflare, no new CREATE and no main merge/re-publish during this draft review.

**Order after Gate0.5:** Gate4 scaled offline and separately authorized small live second-start/reliability test; Gate5 independent FIDS population observability; then manifest/retention/calendar/budget FREEZE and separate Phase6 authority per Plan §§16–17. No ML training in Phases3–6.
