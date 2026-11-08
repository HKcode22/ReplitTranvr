# Phase 5 — live B0062 sampling frame and exact owner-selected four-HUB admission

**Production owner READ ONLY evidence**: 2026-11-08T14:20:54.706Z, Replit Shell source-pinned `scripts/v39_phase5_active_frame_for_calendar_readonly_once.mjs` (Git blob `4bf7f52c07c48fbfaa09811674f549d79d4aa336`). Owner output: `ACTIVE_FRAME_STRUCTURAL_CANDIDATE_REQUIRES_REVIEW` and `PHASE5_OWNER_ACTIVE_FRAME_READONLY_DONE_NO_PROVIDER_NO_DB_WRITES`. Actual source [issue #416 checkpoint](https://github.com/HKcode22/ReplitTranvr/issues/416#issuecomment-6722672884). PostgreSQL16 `neondb`, consistent `REPEATABLE READ READ ONLY` transaction, ROLLBACK; **0 provider calls, 0 SQL writes**. This is evidence of frame availability, not LIVE scientific FREEZE.

## 1. Verified live frame, not synthetic fixture evidence

| Metadata | Observed |
| --- | --- |
| `active_frame_version` | `frame_02ec6e78ba1fe3c2` |
| Active frame SHA-256 | `02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94` |
| Traffic source | `MrAirspace aircraft-flight-schedules + OurAirports` |
| Traffic reference period | 2025-07-01 through 2026-06-30 |
| Reference retrieved | 2026-09-13 |
| Frame activated | 2026-09-13T15:01:44.318Z |
| Traffic reference SHA-256 | `8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424` |
| Region mapping SHA-256 | `4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764` |
| Tier SHA-256 | `18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc` |
| Entire frame rows | **4,346** |
| Exact current version hash matches / mismatches | **4,346 / 0** |
| Verified dual PRE+POST-eligible rows | **1,125** |
| Adaptive sampling-state rows | **0** — expected pre-Phase6; does not certify future draws |

### Six-region dual-eligible structure (real counts)

| Tier | North America | Europe | Asia-Pacific | Gulf/Africa | South America | Oceania | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| HUB | 45 | 34 | 21 | 4 | 3 | 4 | **111** |
| MID | 181 | 149 | 53 | 15 | 10 | 19 | **427** |
| REGIONAL | 251 | 167 | 80 | 28 | 34 | 27 | **587** |
| **Total** | **477** | **350** | **154** | **47** | **47** | **50** | **1,125** |

These are **candidate airport records**, not sampled flights, not guaranteed AeroDataBox route coverage, and not probabilities of selection. The earlier highest-traffic top20 HUB rows are **not** automatically the anchor rotation.

## 2. Crucial study-scope distinction already chosen by the owner

The original binding [f.8 Plan §9](../plans/V3.9_DataCollectPlan_f.8.md) demands **five** Stage2-confirmed HUB anchors selected from a frozen 12-site Stage1 shortlist after objective traffic/diversity/yield and ≥60/h feasibility gates. That original Stage2 five-anchor proof is **NOT PASSED** and must not be renamed a PASS.

However, the owner's October 14 prospective direction, already documented in [four-anchor research protocol](../phase3/2026-10-14_PROPOSED_PROSPECTIVE_SMALL_ANCHOR_MAIN_STUDY_AMENDMENT.md), specifically selects **FOUR sites**: `WSSS`, `OMAA`, `SKBO`, `YSSY`; `MMUN` excluded. The already implemented `solveV39FourAnchorExploratoryDraft` returns a separate research-versioned candidate and explicitly refuses operational authorization. A five-*matched-pair* 31-batch-day design does **not** require five different anchor sites: those are two different integers representing different experimental concepts.

For the prospective four-site study to replace the original five-anchor production design, a distinct frozen scientific/methods version must identify those four purposively selected HUB airports and constrain inference to that eligible operational frame. Historical YSSY P25 probe19 remains `failed/DELIVERY_GAP` (231 external billed, 229 received, gap2) even though its unrelated historical administrative incidents were resolved. The four-site data design must NOT claim global HUB representativeness or any retrospective Gate2 Pass.

**What the 14:20Z frame report did not provide:** the top20 HUB list excluded these 4 owner-selected ICAOs because it was a traffic top20 *truncation*, not proof that those four were missing or ineligible. No inference about exact four-site tier/region/dual-feed eligibility was justified from that truncated list.

## 3. Targeted, READ ONLY four-site follow-up, not another setup/reprobe

New `scripts/v39_phase5_owner_four_anchor_active_frame_readonly_once.mjs` strictly compares only these **four frozen owner-selected ICAOs** against the one active frame using `SELECT ... WHERE frame_version=$1 AND icao=ANY($2::text[])`. It records:

- Exact present/missing `icao`, `HUB` tier, `in_frame`, `tier_verified`, `pre_eligible`/ `post_eligible`, physical `feed_schedule` and `feed_live|feed_adsb` booleans; mapped six-region membership, timezone and country metadata.
- Exact `frame_version`, `frame_hash` and `traffic_reference_hash` equal to the active registry; exogenous traffic metric, route network degree, effective carriers and international share (metadata values only, not provider Contents).
- Per-ICAO typed `problems` when absent/invalid; all-four structural success returns **`FOUR_OWNER_ANCHORS_FRAME_ELIGIBLE_ONLY_NOT_FREEZE`**, never an approved four-HUB experiment, Stage2 score, confirmed external FIDS route delivery, signed calendar, approved retention/use rights or paid Phase6 authorization.
- A strictly PG16 `neondb` READ ONLY repeatable-read transaction and `ROLLBACK`, no source HTTP, no paid provider, no raw flight bodies, no SQL writes, no synthetic signed webhook, no project migrations.

New `scripts/phase5_owner_four_anchor_frame_readonly_launcher.sh` enforces the one existing main's ancestor, exact source blob SHA, and current `offline-safety` completed-success before executing that read-only script from an immutable GitHub blob. It doesn't reset the Replit workspace or install dependencies. A reviewer must check exact head CI and main source hash before giving the owner its one-line Shell invocation.

**Interpretation:** a structural pass for all four means the owner-chosen prospective four-site protocol can proceed to scientific/source-rights/receiver and calendar feasibility review, not that the original five-anchor gate has been met. A failure means explicitly HOLD for the affected site; do not invent a substitute fifth anchor or promote a MID/REGIONAL site to HUB.

## 4. Remaining shortest scientific Phase5 critical path

1. **Use actual exact four-ICAO readback**, then version and independently freeze the four-HUB frame/methods/claims *prospectively* rather than the old original-five schedule. Include 31 batch-days with 26×4h / 3×2×2h / 2×up-to-6h, five pairs, six UTC slots, pair replay and actual end→start washout. For ordinary noncrossover days, the airport draw remains prospective before earliest T24 (not all 31 future ICAO selections).
2. Derive every child-partition FIDS scheduled source refresh, seven physical REST billing categories and separate Alert SEND cap. Use actual provider/account charge and maximum range evidence; no fixture costs or imaginary retained normalized flight rights.
3. Certify actual callback-only published receiver (source SHA, signed nonempty original-before-2xx and STOP), GitHub-only early draw→physical original GET→real T24/T6/T90 cutoff PRE with separate committed witness→POST, with bounded audited missingness and exact rights/expiry. Reuse already-installed V0079–V0083 and dedicated worker roles.
4. Issue independent, recorded **Phase5 scientific FREEZE PASS/HOLD**. Separate **Phase6 paid GO** remains unavailable until actual criteria satisfied. Do not wait for provider email replies to do the nonpaid work.

### SQL mini-lesson

`WHERE icao=ANY($2::text[])` means *compare each airport row to exactly the four reviewed ICAO strings*, not a search for more airports. `frame_version=$1` limits records to the active version; comparing `frame_hash` to the `ACTIVE` registry prevents silently reading a different snapshot. The `READ ONLY` transaction plus `ROLLBACK` establishes that the report did not mutate user data. A `JOIN` or `SELECT` reads matching rows; it does not make a real provider call or certify the origin of a raw flight snapshot. The `traffic_metric_value` is an **exogenous observed-movement reference**, not the final Gate2 combined anchor score or a paid AeroDataBox yield measurement.

**Status:** active B0062 frame structural PASS at 14:20Z, four selected exact-ICAO status pending target readback; original five-anchor Gate2 still not passed; Phase5 scientific FREEZE **HOLD**; Phase6 paid GO **NO**.
