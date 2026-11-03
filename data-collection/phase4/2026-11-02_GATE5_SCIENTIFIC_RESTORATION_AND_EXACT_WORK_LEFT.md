# November 2, 2026 — scientific scope correction / exact remaining Gate 5 work

**CURRENT INTERPRETATION:** Prior `GATE5_REVISED_COLLECTION_READINESS_PASS` is a measured **operational source-acquisition checkpoint**, not the full f.8 population-observability Gate 5 PASS. The study owner objected to moving core Gate5 work into the first day of Phase6 or changing the primary research objective. Corrective [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) restores f.8 §§5–7,16–17 and hash-locked Implementation Log §§1.9,2.22 for future scientific release. Keep historical immutable A/PRs/Actions, do not erase evidence, do not automatically close Gate5.

## What is genuinely finished

- 9/9 real paid WSSS three-horizon FIDS requests, 18 measured REST units, independent metadata/log audit #41477141869. Operational **PASS**. Rerunning the same source-only pilot is unnecessary.
- Verified GitHub-only source schedule + owner identity/budget; tested V0076 metadata-only physical reservation, with V0077 source-to-physical original-binding staged in disposable PG16. **V0077 NOT installed in production**. No newer live producer authorized.
- Existing source-as-of SQL/read-only inspect modules, scoped PRE *staging/writer* as library (not active live handler), event/outcome candidate funnels, stratified coverage and label sensitivity, airport weather cutoff selector, ADSB.lol secondary candidate safety. These are useful **engineering pieces**, not proof an actual prospective cohort was ingested.
- [Actual main Gate5-R run](https://github.com/HKcode22/ReplitTranvr/actions/runs/41587498998) successful, six scoped tests. **Do not delete or call it false**; its scope was narrower than the full Gate5.

## Mandatory f.8 §1.9 measurement matrix — not handwaved

| Original requirement / Log step | Evidence already in repo | Missing real proof for full scientific Gate 5 |
|---|---|---|
| 1. Role-aware FIDS input, immutable raw receipt and operating/marketing/Unknown resolution | Nov2 source-only nine paid GETs; offline/native shape and original read-only candidate services | Lawful retained, **future** flight-level source receipts, source rights, qualified identity and V0077 physical+query owner proof |
| 2. Frozen source-observable population | Existing fidsCensus, live SQL, offline funnel | **Actual** deduplicated unique operating leg as-of cutoff, unresolved role count and denominator with source hashes |
| 3. Per-flight horizons T−24h/T−6h/T−90m, PRE expected/created | Existing scoped PRE writer & offline tests | Genuine run-attested source, provider-native scheduled-T semantics where available or explicit original subcohort not estimable; **persisted PRE** with cutoff provenance |
| 4. Independent in-frame/outside/unresolved webhooks | Existing receiver/ingest, live capture and outcome/read-only candidate routines | Per-flight in/out matching for same real frozen cohort, outside investigation, missing receipts/attempts; billed Alert credits not counted as flights |
| 5. Target applicability and observed actual-only vs estimated vs proxy | Existing label observability, partial ID bounds, provider semantic audit; new BTS US source adapter | True independent ACTUAL record and link on applicable subset; real post-service original, pending/unknown/missing; T unresolved must be explicit not invented |
| 6. Stratified source/completeness/missingness by airport, tier, region, UTC, carrier, route, tail | Existing strata/coverage modules and leakage guards | Actual production-sourced strata counts & coverage-age; no label-conditioned population |
| 7. AIRBORNE nested flight funnel & POST | Existing offline and AIRBORNE code | Real actual flight-level observed→usable→complete→POST-eligible→labeled proof (unavailable labels censored and reported) |
| 8. Reference validation where available, especially US | ADSB.lol dual-source candidate guard, NOAA weather as-of, free BTS actual wheels-off matching adapter | Independent source receipt & correct physical leg match; US monthly publication delayed so not applicable to WSSS Nov2, always optional coverage subgroup |
| 9. Per-horizon exact numerator/denominator, zero→NULL, outside population, coverage bias and sensible uncertainty | Existing offline gate, partial-identification and selection bias audits | Audit **live** source/flight counts with independent READ ONLY repeatable-read reviewer, exact same run/source authority, sensitivity tables |
| 10. Finance, rights, durable raw-before-2xx and safety reconciliation | Existing V0076 budget ACL and STOP recovery tests; 9 GETs measured | Current provider Content permitted use/expiry, V0077 installation when needed, backup/replica expiry, bounded authorized live collection; never infer license from balance |

**Status:** real end-to-end Gate5 **not complete**; do NOT say Gate5 scientific PASS, Phase5 FREEZE, Phase6 GO or "Gate5R substitutes Gate5". The user requested necessary long-run science even if it takes real work.

## Low-cost external reference decision

- **BTS:** freely published and defined actual `WheelsOff` on eligible **U.S. reporting-carrier domestic historic** flight records. Match operator, number, date, origin/dest with independent evidence and safely convert local HHmm to UTC. Late publication → **POST-only reference**; never PRE; not current WSSS/YSSY real-time. File: `server/lib/disruption/phase4Gate5BtsIndependentReference_v39.ts` + strict synthetic offline regression. This is **not yet linked to real BTS CSV**.
- **ADSB.lol:** ongoing public daily positions/traces (ODbL) can support kinematic takeoff **interval proxy** and coverage, using existing `phase4Gate5DualSourceAdsbAdmission_v39.ts` and `phase4Gate5AircraftLinkage_v39.ts`; cannot alone make precise runway truth or an authoritative schedule.
- **NOAA Aviation Weather:** worldwide METAR/TAF, free and rate limited. Existing `phase4Gate5WeatherAsOfFeature_v39.ts` tests source issue/receipt <= cutoff; missing optional weather never suppresses PRE.
- **OpenSky:** possible free academic research via approval; automated operational REST needs prior written agreement, so not assumed usable in live collection or a strict blocker; no commercial airline schedules.
- **OurAirports:** public domain airport frame identifiers/locations for crosswalk and region checks, not individual flight schedules/labels.

**No universally free instant complete worldwide flight-schedule plus exact runway-time feed verified.** A free source is used only for the label/reference/subcohort it truly measures, with source-specific rights. Do not keep researching the same unavailable AeroDataBox email response; record its negative evidence once and advance the real source producer/denominator/PRE/capture/POST.

## Next actual engineering, in order

1. **Restore original gate ownership** in GitHub (this Amendment B, README/issue and tests). The historical Gate5R PASS survives as subsidiary `ACQUISITION_READY`, not the final scientific gate. Close nothing under old convenient shortcut.
2. Make **one exact future cohort** using reuse of V0076/V0077/frozen GitHub physical owner and admissible source retention: source query receipts, physical operating-leg resolution, source snapshots by cutoff; first make a complete **disposable PG16** rehearsal including identity ambiguity, expiry, late source, duplicate run, outside webhooks and POST. Real paid dispatch only with source rights/legitimate content use, frozen manifest, STOP, and explicit bounded authorization. Avoid a second 9-GET source-only feasibility repetition.
3. Wire the existing scoped PRE writer to the reviewed future source owner, correct eligibility, output real per-horizon counters. Independently audit with same source hash/run and READ ONLY; link webhook in/out/unresolved and outcome terminalizer; characterize observed source target vs ADSB proxy/BTS subcohort, missingness, coverage and MNAR sensitivity.
4. **Report Gate5 science from real data**, allow documented ≤3-minute transient gaps and moderate incomplete label coverage with honest numeric denominators, bias and uncertainty. Do not let an absent native runway alias make the entire global operational-status model useless, but **do not certify unavailable actual-only outcomes**. Full Gate5 may PASS_WITH_MEASURED_LIMITATIONS only when actual funnel/clock/custody/role/permissions checks pass and target-specific coverage is stated. Then start Phase5 FREEZE with its own checks.

## Governance

The owner has authorized scientifically bounded paid work in earlier chats, but this file does **not** arm a new live paid window or grant content retention. Never instruct user to run multiple time-sensitive Replit shells. GitHub remains the scheduler, 6+6 notification recovery retained, existing cycle budget ceiling/quotas documented. **No production change, no new provider call, no DB write from this correction.**
