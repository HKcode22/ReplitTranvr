# Gate 0.5 — source-backed scientific evidence matrix and zero-provider continuation

**Date:** 2026-10-21 PDT (completed after 22:10 PDT). **Scope:** `d1e2cdc6-2b1d-40bb-930e-a872a534ea72`. **Status:** `FIDS_TWO_QUERY_TECHNICAL_FEASIBILITY_PASS`, `INDEPENDENT_STOP_PASS`, `GATE05_FULL_SCIENTIFIC_ACCEPTANCE_NOT_DEMONSTRATED`. This is a **documentation-only, non-billable assessment** using already observed signed receipts, reviewed source, and controlling Plan f.8; it neither alters `main` nor invites a repeat of a terminal paid scope.

Controlling evidence: [Final technical closeout](2026-10-21_GATE05_WSSS12_TERMINAL_STOP_VERIFIED_FINAL_TECHNICAL_CLOSEOUT.md); [independent STOP Actions run #39719432734](https://github.com/HKcode22/ReplitTranvr/actions/runs/39719432734); [controlling Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§2,5–7,16–17; live source `server/lib/disruption/gates_v3.ts`, `scripts/v39_gate05_scoped_fids_feasibility_operator_v39.ts`, `server/lib/disruption/aerodataboxLimiter_v3.ts`, `server/lib/disruption/fidsCensus_v3.ts`, reviewed at `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`.

## Key result and epistemic rule

- Exact WSSS 10-minute provider FIDS window `2026-10-22T12:35` through `12:45` Asia/Singapore; signed operator with `direction=Departure`, `withLeg=true`, `withCancelled=true`, `withCodeshared=true`, `withCargo=false`, `withPrivate=false`, and two `withLocation` variants.
- **30** departure objects with `withLocation=false`, **30** objects with `withLocation=true`. **Do not add to claim 60 unique flights**; neither canonical keys nor dedup/overlap were retained.
- **Two base attempts / zero retries / four units reserved; observed account balance fell 60,000→59,996**, with no active subscription conflicts at last readback. Account-wide quota delta is not an itemized provider invoice. At end: signed independent STOP at `2026-10-22T05:10:01.235Z`, `STOPPED / EXPIRED`, 0 open scopes. Safety closeout PASS.
- The dispatcher passes provider response departure objects through RAM and writes **only counts and top-level field keys**. The saved receipt contains **no nested per-flight departure movement fields**, timestamps, flight identifiers, event clocks, provider payload hashes, raw JSON or per-flight overlap keys. Thus absence of nested fields from the receipt is **absence of measurement**, not proof that the provider payload lacked them. A documentation-only analysis cannot reconstruct missing observations. **No new paid GET under the old authorization.**

## Evidence matrix — distinguish observed PASS, design capability and UNKNOWN

| Topic / governing test | Exact observed evidence | Disposition | What would actually establish it |
|---|---|---|---|
| Restricted source, signature, bounded dispatch | Main SHA pinned; verified scope and signature hashes, separate owner permit and restricted three-role admission | **PASS for the scoped pilot** | Historical owner receipts and terminal ledger suffice for this claim |
| FIDS endpoint responds | Two real WSSS departure results, 30 objects each | **PASS (retrieval only)** | Already shown; no paid repeat |
| FIDS cost/attempt safety | Two 2-unit attempts; 0 retries; SQL cap 12; provider delta -4 | **PASS (numeric reconciliation)** | Retain account-wide attribution caveat |
| Independent expiry STOP | GitHub run successful and independently verified PG `STOPPED / EXPIRED`, exact timestamp, 0 open scopes | **PASS** | Already closed; do not dispatch again |
| Top-level JSON field inventory | Identical arrays of keys `aircraft, airline, arrival, codeshareStatus, departure, isCargo, number, status` | **PARTIAL** | To assess nested movement, sample an aggregate nested-path inventory with no raw identifiers |
| Unique physical flights and overlap | Two 30-record counts only, no retained identity joins | **UNKNOWN** | In-memory canonicalization and only aggregate unique/codeshare/overlap counters, audited separately |
| Provider `scheduledTime`, `revisedTime`, `runwayTime` observed values | The top-level `departure` property appears; nested field presence/non-null/actuality unmeasured | **UNKNOWN — P0 target** | Count measured nested fields by distinct role and clock semantics; do not infer actual from non-null revised/runway |
| Valid primary departure runway-delay label | No actual-vs-estimated classification, runway clock source, reference schedule or observed T linkage | **UNKNOWN — P0** | Establish exact source-supported actual timestamp and delay formula with verified anchor/reference; missing/estimated never labeled as actual |
| Prediction cutoff `T` and feature as-of safety | No schedule milestone/cutoff proof, no `available_at` comparison | **UNKNOWN — P0** | Provider-native milestone, as-of cutoff available timestamp, outcome occurring after cutoff, no leakage |
| FIDS location difference | Both request variants returned 30; nested location count/value shape not saved | **UNKNOWN** | In-memory location-availability summary and unique comparison, no raw coordinates |
| `withLeg=true` and requested-airport role | Request flag was true, returned `departure` and `arrival` top-level | **PARTIAL contract / UNKNOWN semantic role** | Prove primary requested-airport movement vs opposite-leg context and no denominator inflation |
| Codeshare and physical dedup | Top-level `codeshareStatus` key appears | **UNKNOWN** | Aggregate `IsOperator`, `IsCodeshared`, `Unknown` and unresolved rates; do not force Unknown to operator |
| FIDS interval boundary and maximum range | Only one 10-minute local range; no adjacent boundary/split experiment | **UNKNOWN** | Plan f.8 §5.1 half-open UTC population and controlled non-overlap check on a genuinely approved design |
| Flight Alert notifications, airborne trajectories, terminal outcomes | This was **FIDS GET-only** with zero Alert creates and no 60-min webhook exposure | **NOT MEASURED IN THIS PILOT** | Separate planned Gate3/0.5 source-backed sample, *not* fabricated zeroes |
| Full sample adequacy `evaluateGate05` | No observed unique/completed/airborne/notification counts or provider-clock boolean evidence | **NOT EVALUABLE** | Never fill unknown fields with zero or fabricated true; evaluate only after traceable source-backed metrics |

## Existing repository acceptance contract — do not overclaim

At reviewed `server/lib/disruption/gates_v3.ts`, `DEFAULT_GATE_05_CRITERIA` contains **minNotifications=100, minUniqueFlights=50, minCompletedFlights=20, minAirborneFlights=30, minAirbornePoints=100, minPilotDurationMinutes=60**. It also requires 14 evidence-supported behavioral booleans: `payloadFieldInventory`, `providerTimestampSemantics`, `tConstructibility`, `primaryTargetConstructibility`, `fidsMaxRange`, `fidsBoundaryBehavior`, `withLegBehavior`, `codeshareAmbiguity`, `observationCadence`, `trajectoryCompleteness`, `arrivalNotificationLatency`, `censoringGrace`, `rateLimit`, `unsettledAlertCreditBurst`. Those are **project-chosen operational gate thresholds, not statistical laws**; results still must be source-proven. The 10-minute 2-query FIDS-only check is a **microtest**, explicitly narrower than this multi-feed Gate 0.5 rubric. Missing metrics in its receipt mean **not measured**, not observed false/zero, and must never be inserted into a claimed full Gate05 PASS/FAIL score.

The Plan also requires schedule identity, arrival/departure role, local-time DST conversions, half-open intervals, codeshare status policy, provider-native actual vs estimated movement times, and the available-at <= prediction-cutoff constraint. The fact that `server/lib/disruption/fidsCensus_v3.ts` contains normalization helpers **does not prove they were invoked or their results persisted during tonight's pilot**.

**Provider OpenAPI semantic shape is a *contract* only.** The repo's offline `inspectGate05OpenApiBytesV39` checks `scheduledTime`, `revisedTime`, `runwayTime` descriptions. It deliberately returns `sourceAuthenticityVerified:false`, `observedMovementActualityVerified:false`, `providerCurrentTariffVerified:false`. A structural description is not an observed proportion of actual runway times.

## Additional provider-contract finding — actual versus estimated is not resolved by a non-null time

The *public official* AeroDataBox OpenAPI **v1.15.4.0** ([source](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json), `FlightAirportMovementContract`) describes:

- `departure.scheduledTime`: **scheduled departure or arrival time**, without itself saying that it is a scheduled *runway* rather than gate milestone.
- `departure.revisedTime`: **actual/estimated**; if `runwayTime` differs, this is gate-side, otherwise it **may** be gate or runway. It is unsafe to map it unconditionally to actual gate-out.
- `departure.runwayTime`: **actual/estimated** runway take-off for departures, *if known*. Thus presence alone does not establish a verified actual runway departure timestamp.
- `departure.quality`: a quality-indicator array with possible `Basic`, `Live`, `Approximate`; this is **not an unequivocal per-timestamp boolean** `isActual`. Whether flight status/quality makes any particular runway value scientifically actual needs demonstrated semantics, not inference from the field's presence.
- With `withLeg=true`, `AirportFlightContract` can have `departure` and `arrival` and the opposite airport is context; keep population role distinct.

The controlling Plan f.8 §6.3 explicitly separates **gate-out delay** (`actual_gate_out − scheduled_gate_out`) from **wheels-off/runway delay** (`actual_wheels_off − scheduled_wheels_off`). `scheduledTime` without proven runway semantics cannot silently be used for `scheduled_wheels_off`. This distinction is central to the project's desired **departure-runway delay** target; it is a P0 scientific admissibility issue, not mere missing-data bookkeeping. It does not invalidate tonight's 30/30 two-query technical success.

Any future aggregate-only observer should count `quality` categories and fields separately, but label `actuality=UNKNOWN` when the provider contract/observed status does not unambiguously prove actual. Avoid guessing by comparing times, by 'Completed' status alone, or by a convenient fallback from revised to runway. A second endpoint/source may be needed to validate semantics, only after separate source-rights and spend approval.

## Finite continuation: zero provider spending now

1. **Preserve closure and audit trail.** Do not rerun the paid operator, reactivate the old scope, replay signed auth, create a new STOP worker, or rewrite its private receipt. Existing total 4 units and terminal STOP are final for this authorization.
2. **Offline source-backed contract assessment** (no external provider requests): inspect already downloaded official OpenAPI `/tmp/gate05-wsss.hhs6OC/openapi-rapidapi-v1.json` using `inspectGate05OpenApiBytesV39`, compare to pinned hash `63b8...7f09`, and report explicit field/contract availability only. No raw provider payload or secrets need leave private Replit filesystem.
3. **One targeted code fix/design for NEXT, separately approved pilot only**: a streaming **aggregate-only** FIDS evidence function that receives in-memory provider responses during an authorized GET and emits counts/histograms for nested schedule/revised/runway fields, actual/estimated provenance flags where actually supported; identity resolvability; codeshare ambiguity; per-variant distinct counts and overlap; departure/arrival primary vs opposite role; time-boundary membership, observed retrieval/available clock provenance and nonidentifying summary. Store **no raw flights, flight numbers, persistent hashes of identifiers, tail numbers, coordinates, or full timestamp tuples** in public GitHub. Define null/unknown separately from observed false/zero and freeze denominators before outcome peeking.
4. **Offline tests before another cost**: fixture missing `departure`, nested revised but no runway, unknown actual-vs-estimated flag, ambiguous codeshare, duplicate flight numbers vs genuinely unique operating legs, zero-length response, flight exactly at end boundary, DST edge, expected location inclusion, response-shape drift, and wrong-scope/duplicate attempt refusal. Require no network and no production database mutations in tests.
5. **Fresh authorization needed if and only if still scientifically necessary** after verifying available legally retained existing sources. A follow-up may be smaller than the full 60-minute Gate05 when its sole goal is one unresolved nested FIDS field, but must not fraudulently PASS the full Gate05 threshold rubric. After that, separately evaluate Gate3/4 evidence and whether a complete 60-minute source-backed notification/trajectory pilot is really necessary for the full gate. Do not spend more just to meet an arbitrary percentage or to erase a previously successful 4-unit technical pilot.
6. **Phase3 milestone tracking**: report `Gate05_FIDS_MICROTEST=PASS`, `Gate05_SAFETY_STOP=PASS`, `Gate05_FULL_SCIENCE=PENDING_SOURCE_EVIDENCE`, `Gate3=NOT_CERTIFIED_BY_THIS_PILOT`, `Gate4=NOT_CERTIFIED_BY_THIS_PILOT`; do not mark Phase3 complete.

### Statistical/provenance basis

The empirical missingness counts and sensitivity/selection limits are standard observational reporting concerns; the STROBE Statement requires reporting missingness by variable and participant/observation flow, not treating unmeasured fields as zeros: https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/ . This is methodological motivation, **not** a new hard numerical pass threshold.

### Immutable run and documentation lineage

- Completed independent safety Action: https://github.com/HKcode22/ReplitTranvr/actions/runs/39719432734 .
- Final technical closeout: [WSSS 12-unit technical report](2026-10-21_GATE05_WSSS12_TERMINAL_STOP_VERIFIED_FINAL_TECHNICAL_CLOSEOUT.md).
- This continuation document is confined to a separate review branch, based on the exact source that ran. It does not alter `main`, Replit deployments, credentials, provider balance, source custody or paid budgets.

**Next chat restart:** Read the final technical closeout and this matrix. The immediate task is **offline FIDS contract/aggregate evidence harness** (no billable GET) and a precise decision on whether another prospectively authorized measurement is unavoidable. No need to redo WSSS safety prep or paid pilot, Phase2G YSSY, Replit root diff, or Gate3's past work.
