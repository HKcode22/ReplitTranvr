# Phase 4 Gate 5 G5A — independent audit disposition and minimum remaining work

**As-of:** 2026-11-06 18:48 PST (2026-11-07 02:48 UTC). **Status:** `REAL_COLLECTION_AND_LATE_INDEPENDENT_METADATA_AUDIT_COMPLETE; STRICT_SCIENTIFIC_GATE5_HOLD`.

**Decision:** The prospective three-horizon source→PRE→POST cohort is genuinely collected. The separately privileged independent *late metadata* audit ran successfully and emitted measurements. **Do not repeat the same paid FIDS collection, backfill PRE, run a duplicate audit, or change the frozen cohort.** Do not assert strict original Gate 5 PASS, unrestricted G5A scientific PASS, Phase 5 freeze, Phase 6 live authorization, or certified real-world actual departure delay.

## 1. Immutable evidence and versions

- Frozen cohort `WSSS_G5A_20261106_1400Z`; manifest SHA256 `02865331b9137c2ffb4d7e2b0a8c2a6016d0838051fd04f09a44c6f02e238667`.
- Three real PRE horizon owner actions: [T−24h #42022373703](https://github.com/HKcode22/ReplitTranvr/actions/runs/42022373703), [T−6h #42159915594](https://github.com/HKcode22/ReplitTranvr/actions/runs/42159915594), [T−90m #42193627043](https://github.com/HKcode22/ReplitTranvr/actions/runs/42193627043), frozen original owner main SHA `66ff4908cbd63a19668485c935da49fc18652654`.
- Repaired [POST #42230194925](https://github.com/HKcode22/ReplitTranvr/actions/runs/42230194925) on `b05cc2afb2f10eace38a0ce6576a44a6f7289a34`: 3 source originals; 312 + 304 + 303 = **919** POST-normalized repeated source-member rows; source unknown slots = **0**; source aggregate at 09:01 PST.
- Four original scheduled independent audits [#42302215470](https://github.com/HKcode22/ReplitTranvr/actions/runs/42302215470), [#42302449663](https://github.com/HKcode22/ReplitTranvr/actions/runs/42302449663), [#42302627533](https://github.com/HKcode22/ReplitTranvr/actions/runs/42302627533), [#42303223421](https://github.com/HKcode22/ReplitTranvr/actions/runs/42303223421) arrived hours late and safely HOLDed before database access; **no original on-time independent audit occurred**.
- [PR #411](https://github.com/HKcode22/ReplitTranvr/pull/411) merged `e7038b31f52031f5317d0f5446c904f038b292a7`, adding an explicitly flagged late read-only recovery. [Recovered audit #42330969278](https://github.com/HKcode22/ReplitTranvr/actions/runs/42330969278) job `audit-independent` **completed/success**, published the exact safe output to [issue #293 comment](https://github.com/HKcode22/ReplitTranvr/issues/293#issuecomment-6701236001). Audit as-of `2026-11-07T02:48:13.851Z`. Its required classification is `LATE_READONLY_METADATA_ATTESTATION_NOT_ORIGINAL_ON_TIME_AUDIT`, not a reconstruction of the missed window. Independent transaction ran read-only, provider calls **0**, DB writes **0**.

## 2. Independently measured source / PRE / POST funnel

| Horizon | Planned source slots | Reserved physical requests | Bound authentic originals | Stored on-time PRE | Distinct PRE identities | Late / invalid PRE | Baseline | POST observed at W | Revised ≥15m | Revised <15m | Unknown/censored label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T−24h | 3 | 3 | 3 | 12 | 12 | 0 | 12 | 12 | 0 | 12 | 0 |
| T−6h | 3 | 3 | 3 | 12 | 12 | 0 | 12 | 12 | 0 | 12 | 0 |
| T−90m | 3 | 3 | 3 | 12 | 12 | 0 | 12 | 12 | 0 | 12 | 0 |
| **Total repeated horizon units** | **9** | **9** | **9** | **36** | **12 common identities across horizons, not 36 unique flights** | **0** | **36** | **36** | **0** | **36** | **0** |

- PRE source-member population: **432** normalized member rows across nine source responses (repeated observations, *not* 432 independent physical flights).
- `distinctConfirmedOperatingLegIds=0`; `distinctConditionalCompositeOperatorKeys=12`; `ambiguousOrMarketingRows=324` source-member observations; `conditionalQueryFilteredScopeUnknownOperatingIds=0` under the independent audit's literal predicates. The 324 figure is a repeated *row count*, not 324 unique ambiguous flights. The selected 12 keys are conditional `leg:g5a` composites, **not provider-native certified operating-leg IDs**.
- Audit budget `reservedProjectRestUnits=24`, `projectRestUnitCeiling=24`. This measures the internal project reservation ledger, **not an independent provider invoice / actual billed units**.
- Three T−24h originals had elapsed source-use lifetime by late audit. The independent count of `sourceBoundAndOnTimeNow=3` for T−24h documents binding/time-of-capture and non-null raw-expiry marker; it does **not override** `sourceLifetimeExpiredByAudit=3` and does **not grant further raw Contents use**. Subsequent horizons each showed original bound=3, lifetime-expired=0 at that instant. Retention rights remain distinct from database technical presence.
- POST label is **provider-reported scheduled departure revision of ≥15 minutes** between legal as-of PRE schedule and selected observed POST by W=T_native+2h. It is **not** actual wheels-off, actual gate-out, actual flight delay, cancellation proof, or a negative traveler disruption label. With **zero positive schedule revisions among the 12 candidate flight identities**, a binary classifier's positive-event recall/calibration or disruption-detection performance is not estimable from this cohort.

## 3. Acceptance and release decision

| Acceptance area | Verdict and evidence | Scientific boundary |
|---|---|---|
| Frozen prospectively sampled frame; authentic fixed-time acquisition | **Observed**: nine original bindings, three PRE sources per horizon, fixed POST slots | One airport + one hour; external representativeness and flight status uncertain |
| Cutoff-safe three-horizon PRE | **Observed**: 12/12 each, zero late, zero missing hash or native T version in audit | T means first provider-reported scheduled departure, not a certified gate/runway event |
| Post-cutoff provider schedule-revision measurement | **Observed**: 36/36 horizon comparisons, 0 missing, 0 ≥15m revised | One class only; no validity for actual delay |
| Physical operating-leg / codeshare denominator | **Conditional / not independently certified**: 12 composite keys; 0 positively provider-confirmed IDs | Fatal to any claim of uniquely certified physical operating-leg census; stratify and limit claims |
| Webhook inside / outside / unresolved, AIRBORNE or actual-only nested funnel | **Not independently measured by this recovered audit** | Do not infer zero missing/outside or use POST coverage as a substitute |
| Provider use / retention / billing | **Partially measured**: 24/24 internally reserved; three expired source-use lifetimes; provider invoice/account-specific rights unproven | Do not reuse expired Content; address [rights issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) |
| Original Plan f.8 actual-only wheels-off target | **Not estimable / HOLD** | [Field-semantics issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200); do not rebrand scheduled revision as actual |
| Independent source→PRE→POST audit | **Completed, but late**: real least-privilege read-only result #42330969278 | Cannot claim earlier 09:10–10:00 PST audit happened |
| **Strict scientific Gate 5 / Phase 5 freeze / Phase 6** | **HOLD, not PASS** | No retroactive protocol change, no automatic release |

The prospective [G5A amendment](2026-11-03_G5A_PROSPECTIVE_PROVIDER_OBSERVABLE_PROTOCOL_AMENDMENT.md) allows an honest narrower schedule-revision track; the [owner directive](2026-11-03_OWNER_DIRECTIVE_NO_PERFECTION_LOOP_FAST_SCIENTIFIC_GATE5_CLOSURE.md) specifically prohibits indefinite perfection loops. Its own requirements still include measured webhook in/out/unresolved, lawful source classes and adequate population identity denominators. Thus the *collection-validation milestone* is complete, while the *full scientific release gate* remains incomplete. Preserve both facts.

## 4. Minimum consequential next work — no duplicate collection

1. **One bounded read-only reconciliation using already persisted metadata (not new paid provider GETs):** inspect whether an existing V3.9 receiver/flight-alert ledger can honestly partition G5A as-of source identities into webhook `inside / outside / unresolved / not subscribed`, without treating absent subscription as zero. If such a compatible join is not present, mark `WEBHOOK_CAPTURE_NOT_ESTIMABLE_FOR_THIS_COHORT`; do not fabricate a zero or create a post-hoc receiver. Similarly report AIRBORNE eligibility/observability only for actually linked lawful evidence.
2. **Source rights / retention scope decision:** confirm independently supported research purpose, raw/normalized classification and permitted storage/deletion behavior; record technical 23-hour expiry separately from contractual authorization. Do not rehydrate expired originals or indiscriminately delete historical data from this document.
3. **Narrow G5A scientific report:** preserve the source→PRE→POST evidence as a positive **pilot of pipeline functioning**, with explicit conditional composite identity and zero-positive outcome limitations. Give criterion-by-criterion `OBSERVED / CONDITIONAL / NOT_ESTIMABLE / HOLD`, rather than claiming scientific strict PASS or falsely discarding a successful pilot. Anonymized aggregates need no additional paid run.
4. **Phase 5 plan only, no freeze:** if further validation is scientifically necessary, preregister a **more varied future cohort and/or verified actual-only outcome subset** with independent identity/rights and realistic sample sizes **before** allocating another budget. Do not repeat the identical one-hour one-class cohort merely to obtain a green dashboard.

### Stop conditions and non-actions

No provider calls, new paid runs, changed observation time, PRE backfill, retrospective target shifts, new source-use grants, rerun of failed time-window jobs, or automatic scientific PASS are authorized by this report. The research dataset and its genuine provenance remain intact. This report is a **documentation-only disposition on draft PR #409**, not a production deployment or training-stage approval.
