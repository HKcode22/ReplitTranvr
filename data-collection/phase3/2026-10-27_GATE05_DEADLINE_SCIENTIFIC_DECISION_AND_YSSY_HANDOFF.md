# Gate 0.5 scientific adjudication — finite October 28, 2026 8 PM PDT decision

**Owner priority:** Finish Gate 0.5 scientifically, factually and mathematically, then investigate YSSY P25 sender accounting. This is a consolidated **decision** and checkpoint, not a new paid Gate05g/h pilot, not authorization to change the frozen f.8 plan, not a claim of strict PASS, and not a requirement to repeat old expensive requests. The original source of truth is `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§5.2, 6.0–6.6, 7, 16 and `data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md`; see issue #173 and October 27 Gate05 identity checkpoint.

## LIVE UPDATE — independent Gate05f 16-row raw shape now OWNER VERIFIED (Oct 27, after PR198)

**Source evidence, not an inference:** user executed **the exact merged main** `dab275919da41ed5c283cd70a29e4f865d3b7d83` / script blob `1e64d7d4160bb1cd1af5b944f72ec731e2871e79`, returned `INDEPENDENT_T6_EXACT_RAW_AND_NORMALIZED_PROFILED`; no provider HTTP, no DB writes, no returned raw/flight IDs. Scoped source UUID `16dfcf40-f8df-42a3-b739-8110d7de2449`, SHA256 `5e901d257ce62672d384c30f88a0796b3667b0f9741720bd23eccbb4f3ab96db`, durable `available_at=2026-10-27T23:23:23.414Z`. Original Gate05e 15-row source is **another population**.

| Exact actual Gate05f observed count | Value |
| --- | ---: |
| Original FIDS departure response objects / normalized rows / requested-primary rows | **16 / 16 / 16** |
| Flight number matches newly accepted two-character carrier + optional whitespace + digits | **16** |
| Numbers specifically have a space between carrier and digits | **16** |
| Provider-designated `IsOperator` response rows | **6** |
| Provider-designated `IsCodeshared` response rows | **10** |
| Explicit departure origin ICAO in source | **0** |
| Explicit arrival destination ICAO / departure scheduled UTC | **16 / 16** |
| Provider `flight.id` / callsign / `departure.runwayTime.utc` present | **0 / 0 / 0** |
| Operator-designated *provisional* context-origin candidates | **6** |
| Historical original normalized canonical IDs | **0** (old strict parser/context policy; **not zero flights**) |
| Durable source before individual *candidate* scheduled departure minus 6 hours | **16** |
| Source within exploratory 10 minutes preceding each candidate T−6h | **0** |

**Interpretation:** This is a genuine positive provider acquisition, source-availability and shape observation; the flight-number format bug has already been repaired under PR #197 and reproduced on both genuine cohorts, but persisted historical rows were NOT silently rewritten. The PRE snapshot need not contain a posttakeoff runway timestamp; zero runway times for this future service window does **not** establish missing future actual runway labels. The `candidate_within_10m_t6=0` is **not a late-data failure**: all 16 observations were available *more* than 10 minutes before their respective candidate T−6h cutoffs, whereas a validated nonadaptive max staleness has not been frozen. No arbitrary 10m window may now be made a post-hoc success requirement or a scientific release threshold.

**Current exact operator/physical status:** Six records have provider `IsOperator` role; ten have marketing alias role. None provides explicit queried origin, native provider `flight.id` or callsign. The existing fail-closed canonical logic properly does not promote provisional context-based origin into *independently verified* physical-leg identity; neither `N_unique_physical=6` nor `N_unique_physical=16` is proven. The 15/16 cross-cohort row totals are not a sample of matched T−24/T−6 histories.

**Material scientific blocker remains** (original f.8, no shortcuts): first source-verified `selected_t_milestone`, exact scheduled runway/gate semantics, a **provably actual** wheels-off observation, linked operating leg/retimes, and the complete §16 prospective dedicated pilot's prespecified duration/notifications/airborne cadence/target recovery. Official AeroDataBox ADS-B article (2020; updated 2022) describes possible retroactive actual takeoff estimates at selected covered airports, historically lists YSSY (not WSSS), explicitly warns data is not guaranteed and coverage can change; it is **not a 2026 WSSS or YSSY feed guarantee, per-observation actual/estimated flag, or scheduled wheels-off definition**. Source: https://aerodatabox.com/flight-take-off-and-landing-time-runway-detection-based-on-ads-b-data-more-flights-and-status-updates/ . Official current provider API contract still describes `runwayTime` actual OR estimated and `scheduledTime` general departure. We MUST NOT compute `runwayTime − scheduledTime` as exact original runway delay without independently verified operands.

**Deadline decision contract:** Oct28 8PM PDT remains last written evidence/disposition checkpoint, *not* guaranteed full scientific PASS. If no authoritative source establishes both operands, unique physical-leg identity and the original §16 pilot adequacy, report `FULL_GATE05_SCIENTIFIC_PASS=NO`, `EXTERNAL_SOURCE_SEMANTICS_UNPROVEN`, and document finite external dependency, while allowing Phase4 offline work. Do not spend API units on another same-shape pilot or alter f.8 merely to mark complete. Only a pre-reviewed *new* research estimand with user-approved formal f.8 amendment could replace the unavailable original label. YSSY sender-gap investigation remains **next** once this honest Gate05 closeout decision is recorded, not a prerequisite to falsely calling Gate05 PASS. Issue #173 owner receipt: https://github.com/HKcode22/ReplitTranvr/issues/173#issuecomment-6457322182 .

### Exact AeroDataBox clarification package — proposed, **not yet sent**

Ask support to answer for AeroDataBox OpenAPI version `1.15.4.0` and the active RapidAPI account/airports WSSS and YSSY, without sharing raw flight records, tokens or account secrets:

1. **Scheduled reference:** Is `departure.scheduledTime.utc` scheduled **gate-out**, scheduled **wheels-off**, or source-dependent? Is an independent `scheduled_wheels_off` milestone exposed anywhere, and on which field/endpoint with verified semantics?
2. **Actual takeoff:** When `departure.runwayTime.utc` is filled, how does a client distinguish a physically **observed actual** wheels-off instant from an **estimate/prediction** for that *individual flight*? Is an ADS-B trajectory-derived actual flag, source provenance and event availability timestamp exposed?
3. **As-of and identity:** Is there a source-authentic, first-frozen schedule history/available-at event, provider-operating leg identity/codeshare-parent mapping, and dated WSSS/YSSY actual-takeoff coverage to construct leakage-free per-flight T−24/T−6/T−90 decisions and later targets? If not, explicitly confirm limitations.
4. **Retention:** Which allowed derived metadata/labels may be retained after the AeroDataBox FIDS raw-content 24h expiry under the current subscription terms?

No provider answer has been received and no email/request has been sent. This checkpoint does not claim otherwise.

## 1. Deadline and progress expressed with correct pass/fail dimensions

**Decision deadline:** Wednesday Oct 28 at **8 PM PDT** (`2026-10-29T03:00:00Z`). This is an evidence/acceptance deadline, not a guarantee a third-party provider can supply scientific definitions by then. Engineering PRs may land earlier. A failed/source-unverifiable criterion must remain named and must not be converted into a 'PASS' because 2 REST units were paid or a source JSON was durably saved.

| Requirement | Already verified | Current judgement |
| --- | --- | --- |
| Original WSSS12 FIDS technical GET, charge, independent STOP | 2 responses of 30 objects each, 4 API units, no retries, exact independent STOP | `TECHNICAL_FEASIBILITY_PASS_QUALIFIED`; not 60 unique flights |
| Gate05b/c provider UTC nesting | 15+15, then 33+33 *response objects*, timestamp parsing rectified | `FORMAT/COVERAGE_EVIDENCE`, not actual runway label |
| Gate05d mature WSSS | FIDS 3/20 positive runway UTC, deliberately picked status 1/1 | Positive possible runway field; 3/20 response-object coverage, not population physical leg coverage; actuality still unknown |
| Original Gate05e future T−24h prospective | original UUID `aa89e0c3-23ab-4b93-99dd-7624b456931f`, 15 raw-first primary, valid durable available_at, 15 candidate before T−24h, 11.37 min early | Good raw-first **candidate** milestone acquisition. No first VERIFIED T semantic or canonical physical-leg cohort yet |
| Original Gate05e parser diagnosis | Actual read-only 15/15 spaced two-character flight numbers, 3 provider `IsOperator`, 12 marketing, 0 explicit original origin, 15 destination/schedule, 0 provider ID/callsign, 0 departure runway UTC | Root cause real; strict parser fixed in merged PR #197 commit `03f3c0ffd7afbf685de9a1cf07226dd9bdb22998` (4/4 CI). Historical normalized rows not rewritten |
| Independent Gate05f future T−6h | different UUID `16dfcf40-f8df-42a3-b739-8110d7de2449`, 16 raw-first primary, one GET 2 API units, 16 candidate before T−6h, source `available_at=2026-10-27T23:23:23.414Z`, separate physical population | Good *independent* as-of mechanics; cannot retroactively match original 15 into a same-flight T−24h/T−6h pair |
| Original f.8 pilot 8 milestone aliases, native T, full operating-leg identity, complete duration/notifications/trajectory/cadence/grace and source rights | Not demonstrated by current 10m FIDS experiments or small genuine Gate4; no observed sample adequacy for original §16 thresholds | **NOT_CERTIFIED** |
| Original actual-wheels-off minus scheduled-wheels-off scientific label | `departure.runwayTime` may be **actual or estimated**, `departure.scheduledTime` does not unambiguously mean **scheduled wheels-off**. There is NO per-observation actuality/independent scheduled-runway equivalence proof in reviewed source | **EXTERNAL_SOURCE_SEMANTICS_UNPROVEN**; do NOT compute `runwayTime - scheduledTime` as the original label |
| Full Gate 0.5 scientific PASS | Native selected T, both runway-delay operands, same canonical physical leg and strict sample protocol not all established | **NO** |
| Phase4 offline / Phase4 paid / Phase6 live | No new spend authorized by checkpoint | **Offline GO; paid NO-GO** |

## 2. Binding mathematics; no invented physical denominator or timestamps

- Per-flight cutoff: `C(i,h) = T_first_verified(i) - h`, for `h∈{24h,6h,90m}`. `T` is the *first verified provider-native selected milestone*, not any guessed FIDS time. Until semantic proof exists, current pilot `departure.scheduledTime` is **candidate-only T**, not a released Phase6 cutoff.
- As-of membership: retain the latest **qualifying** query whose **durable** `available_at <= C(i,h)`; age `S(i,h) = C(i,h)-available_at` must satisfy a prospectively frozen `S_max`. A future refresh may not backfill an earlier cutoff. The latest actual pre-cutoff version must be selected rather than pretending a previously paid query occurred exactly at cutoff. The exploratory 10-minute age count is NOT an authorized hard quality threshold.
- Exact primary flight delay in minutes is `D(i) = (actual_wheels_off_UTC(i)-scheduled_wheels_off_UTC(i))/60000` when UTC values are epoch milliseconds, and **NULL** if either operand's milestone/actuality, independently linked physical operating identity, or relevant provenance is unverified. Zero must never stand for missing; estimates are not actuals; gate departure proxy is a **different estimand** requiring amendment/owner agreement.
- Raw response objects `N_response` != `N_unique_operating_legs`. Real Gate05e 15 response objects include 3 provider-designated operators and 12 marketing codeshares, but due contextual-only origin / absent native provider ID / incomplete alias linkage, **no strict independent count of verified unique operated legs** follows. We cannot assert `3` certified, nor `15` certified, and certainly not add 15+16 across different independent service windows as repeat measurements. Do not silently reclassify append-only original normalized rows after parser repair.
- Provider future FIDS vs actual schedules may be revised; frozen T/service date and append-only schedule versions must be validated before matching across horizons.
- Named `runwayTime` can be present with unknown actuality. Provider's own ADS-B runway detection article shows some retrospective actual time data with variable, non-guaranteed coverage, but does not prove that every WSSS FIDS `runwayTime` in Oct2026 is actual, nor any independently scheduled wheels-off reference. `quality=Live` is NOT `isActual`.

## 3. Remaining scientific blocker: evidence acquisition, not more blind repeats

The next decisive action is a **semantic answer**, not another blind paid GET. Current AeroDataBox public OpenAPI (observed `1.15.4.0`; known SHA `63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09`) describes `scheduledTime` as scheduled arrival/departure and `runwayTime` as actual **or** estimated landing/takeoff. The prior WSSS12, 05b/c/d/e/f receipts and retroactive raw coverage cannot independently identify a specific per-field actual-vs-estimate signal or an independently scheduled runway baseline.

**Single external clarification request** (not yet sent, and no provider reply presumed): `https://aerodatabox.com/contact/`
1. Does `departure.scheduledTime` represent scheduled **gate-out** or scheduled **wheels-off** at WSSS and YSSY? Is the semantic fixed across upstream sources? Is a separately named scheduled-runway milestone actually available?
2. Does `departure.runwayTime` have a per-observation authoritative actual-vs-estimated flag, ADS-B-derived provenance and recorded time of availability? Can another endpoint expose a certifiably **actual** wheels-off timestamp per matched physical flight? What is WSSS coverage/quality for October 2026?
3. Can an immutable *first observed schedule* and valid provider-side as-of history be obtained for the original prediction cutoff? If not, is early real-time durable FIDS acquisition the only reliable means of measuring pre-cutoff information?

**Strict timeline:** if independently authenticated semantics and adequately sampled live source evidence are available before Oct 28 8PM, review exact provider-version paths, time/identity and frozen sampled thresholds; only then assess separate bounded paid authorization. If not, finish Gate05 decision as `EXTERNAL_SOURCE_SEMANTICS_UNPROVEN / FULL_SCIENTIFIC_PASS=NO`, preserve technical passes, expose one finite provider response dependency, and work on Phase4 **offline** observability while awaiting meaningful evidence. Do NOT mark original Gate05 completed scientific PASS, grant Phase6 data collection or erase original statuses to satisfy calendar dates. A carefully renamed and preregistered **alternative prediction target** is possible but is a material scientific-plan amendment; must not be silently substituted.

## 4. Immediate research work without new paid calls

New short one-command **read-only** script `scripts/v39_gate05_independent_t6_shape_readonly_20261027.mjs` verifies already purchased independent pilot query UUID+SHA in PostgreSQL `REPEATABLE READ READ ONLY`, counts native number formats, codeshare role, omitted origin, destination, runway field, original canonical rows and candidate T−6h relative availability, with no source records/individual flight numbers printed. It **never joins** original 15 and independent 16. It does not mutate database, run provider HTTP, or alter source clocks. Real disposable PG16 compiles/executes the same SQL in regression tests. Run it only while raw is still retained. If raw was legally expired/tombstoned, emit `HOLD` and do not recreate it. Source raw from original Gate05e was durably acquired ~Oct27 04:18 PDT, so the 24h source-content deadline is ~Oct28 04:18 PDT; independent Gate05f acquired ~Oct27 16:23 PDT, its raw 24h point ~Oct28 16:23 PDT (actual automatic retention mechanics/terms govern). **Run read-only profiles now, not paid same-cohort T−6h just for appearance.** This data can inform eligibility and missingness but cannot make unidentified labels identified.

A separate *genuine same-cohort* Gate05e near-nominal T−6h capture would fall Oct27 `22:26–22:36 PDT`, and T−90m Oct28 `02:56–03:06 PDT` **only under still unverified schedule T**. Those acquisitions have NOT been scheduled or authorized here; planning without source semantics is not scientific certification, and the original T−24h sample cannot retroactively become a full §16 pilot.

## 5. YSSY next, after the Gate05 finite review is documented

YSSY Oct13 P25: 7203.639 seconds, 58 observed successful HTTP 2xx callback requests and 58 byte/SHA-verifiable old sources (later lawfully expired/tombstoned), 229 receiver-item credit claims vs 231 provider-billed credit units. `G = 231 - 229 = +2 billed units`, `229/231=99.134199%`; **not** two proven lost HTTP requests or two unique missed operating flights. Repeated positive `G=+2` snapshots existed during live window *before* later cleanup race. 6+6 refers to primary+backup **receiver-health observations**, not 12 provider redelivery attempts or sender SEND receipts. Historical `failed/DELIVERY_GAP` remains immutable and source-verified observed items are qualified research candidates, distinct from formal complete-pass. Next YSSY investigation is sender side receipt/attempt ID accounting, drift vs genuine missingness warning/STOP logic and 6+6 limits, per issue #173. Do not claim historical cause from a later WSSS NEXT3 422. The Oct28 8PM checkpoint remains the decision deadline; no automatic YSSY redo or new paid calls.

## 6. Operator / continuity

Use GitHub `main` as source of truth, Replit **Shell only**, no Replit AI Agent, no Cloudflare, no other paid data provider, no secrets in GitHub/terminal, do not republish or rewrite preserved raw. Existing one-use Gate05b/c/d/e/f paid intents all **SPENT** and may never be replayed. Gate3 WSSS08 and NEXT4 remain qualified accepted. Link this document and CI PR SHA in issue #173 after review. This checkpoint documents a bounded scientific decision and does **not** supersede the frozen Plan or Implementation Log.
