# Gate 0.5 — October 27 owner-requested pragmatic qualified closeout and immediate YSSY handoff

**Controlling original scientific protocol:** `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§0, 5.2, 6.0, 6.3, 6.6, 7.1 and 16. **This checkpoint does not amend its strict PASS criteria**. The project owner on October 27 asks to stop disproportionate perfection-seeking, accept small measured missingness, finish the legitimate Gate05 work today and proceed immediately to YSSY forensic investigation. The owner also agreed that an email can be *prepared*, but does not want to wait on a third-party response. The scientific admission and named limitations below are a **qualified research/feasibility closeout**, not a claim that the strict Gate05 scientific pilot passed.

## The concrete separation that prevents endless iterations

**Already completed; stop investigating the same symptom:**

| Evidence axis | Observed evidence | Current closeout |
| --- | --- | --- |
| Provider FIDS endpoint, real account and cost | Oct21 WSSS12 2 real GETs returned 30+30 provider response objects (not 60 unique), 4 REST units, 0 retries, independent exact STOP, no foreign subscription | `PASS_QUALIFIED_TECHNICAL` |
| Nested time schema/UTC source instrumentation | Later Gate05b/c/d diagnosed local nested-field omission, fixed UTC parsing and inspected real provider responses; Gate05d mature FIDS runwayTime presence 3 of 20 response objects (15% **descriptive only**, not a representative physical-flight availability rate) | `SOURCE_SHAPE_MEASURED`; no repeat of these paid intents |
| Real prospective FIDS (two independent pilot windows, NOT a longitudinal pair) | Gate05e original 15, Gate05f independent 16, both exact source hash and durable `available_at`, all **31/31** response records before their respective *candidate* cutoff; exploratory near-cutoff 10-min proximity not a predeclared hard threshold | `PROSPECTIVE_CANDIDATE_ASOF_EVIDENCE_PASS` under explicitly provisional T |
| Flight-number parser | Real 15/15 original and 16/16 independent have spaced flight numbers. PR197 merged and CI-tested an optional interior-whitespace parser. Old original normalized rows have not been silently rewritten | `SOFTWARE_DEFECT_FIXED` |
| Raw/source custody | PR198 source-hash-checked, read-only real PG16 tested, strict raw-content 24h limit; owner original-scope read-only receipts; 0 provider calls/0 DB writes for audits | `DATA_CUSTODY_DIAGNOSTIC_PASS` |
| Independently confirmed unique physical operating-leg denominator | Original 15 responses: 3 provider `IsOperator`, 12 marketing; independent 16 responses: 6 operator, 10 marketing; both source responses omit explicit origin ICAO, provider ID, callsign; source context yields 3/6 **provisional operator candidates**, not certified unique operated physical flight counts | `PHYSICAL_IDENTITY_STRICT_UNPROVEN` |
| Original §16 adequately sampled dedicated pilot | Small FIDS probes and separate Gate3/4 webhooks do not supply prespecified one-airport one-window minimum notifications, completed flights, airborne points/duration, proper P95 terminal grace and all eight semantically authenticated aliases | `FULL_DEDICATED_PILOT_NOT_CERTIFIED` |
| f.8 strict first scheduled prediction milestone and exact wheels-off delay | OpenAPI `departure.scheduledTime` is scheduled departure (gate vs runway not independently attested); `departure.runwayTime` can be **actual OR estimated**. In PRE future cohorts runwayTime 0/31 is not a postflight quality failure. Cannot show same physical leg with independently verified scheduled wheels-off and observed actual wheels-off | `T_SEMANTICS_UNPROVEN / EXACT_RUNWAY_LABEL_UNIDENTIFIABLE_FROM_EXISTING_EVIDENCE` |

**Verdict — two independent axes instead of one endless binary debate:**

```text
GATE05_TECHNICAL_FEASIBILITY=PASS_QUALIFIED
GATE05_SOURCE_INSTRUMENTATION_AND_PARSER_REPAIR=COMPLETE
GATE05_PROSPECTIVE_CANDIDATE_ASOF_MECHANICS=EVIDENCED
GATE05_RESEARCH_DIAGNOSTIC_TIMEBOX=CLOSED_QUALIFIED
GATE05_ORIGINAL_F8_STRICT_SCIENTIFIC_PILOT_PASS=NO_NOT_CERTIFIED
GATE05_SELECTED_T_AND_ORIGINAL_EXACT_RUNWAY_DELAY_TARGET=BLOCKED_SEMANTICS
GATE05_STRICT_PILOT_MINIMA_AND_EIGHT_ALIASES=NOT_ALL_MEASURED
YSSY_P25_READONLY_FORENSIC_INVESTIGATION=GO_NOW
PHASE4_OFFLINE_ENGINEERING=GO
PHASE4_6_NEW_PAID_COLLECTION=NO_GO_UNTIL_SEPARATE_SCIENTIFIC_ADMISSION_AND_AUTH
```

**Meaning of `CLOSED_QUALIFIED`**: finite Oct27 engineering/feasibility work is closed without repeating the paid b/c/d/e/f chain. Remaining P0 source/target semantics and strict §16 pilot are carried explicitly as a *bounded named research release blocker*, not silently excused. This project management closeout is **not the strict original Gate 0.5 PASS** required by f.8 §16 for final paid Phase6. No original status is rewritten.

## Exact tolerance policy: what the Plan *does* and *does not* require

The frozen Plan §0 explicitly ranks defects P0/P1/P2/P3. P2/P3 do not justify recurring paid diagnosis of minor cosmetic/reproducibility imperfections once reliable data are preserved. §7 reports `eligible → observed → usable → complete → snapshot → labeled` with **explicit missingness**, nullable timestamps and target-specific censoring. It permits observed data to be scientifically useful with dropout, selection limitations, measured coverage, sensitivity bounds and separate auxiliary model groups. The approved Oct14 **Phase2 early-pilot exception** is direct precedent that qualified scientific use can coexist with a frozen strict failed historical gate. It is **not** a license to reclassify that gate as a strict PASS, relax Gate3's settled exact-zero accounting or ignore provider terms.

**No after-the-fact invented tolerance:** No numeric global fraction (e.g. 1%, 3%, 10%) was approved in f.8 as the Gate05 unique-flight label / semantic minimum. The current descriptive ratios use their true units, cannot be treated as iid physical-leg samples, and cannot justify an empirical population confidence interval. The candidate T−6h `within10min=0` is **not** scientific FAIL: all 16 were actually *before* nominal candidate cutoff; stale/fresh eligibility will later use independently validated native T and prospectively frozen `S_max`.

For a future model, target-specific observed examples can be used after the **actual outcome's semantic class is certified**; unknown/estimated actuals are `label_status=missing/pending`, **not zero minutes** and not proof of ground truth. Distinct scientifically honest auxiliary work can use *provider-reported schedule drift* or *published departure-time deviation* with a prominently different name, a nonvalidated semantic/measurement error indicator, and explicit versioned owner approval **before** any new inference/training; it must not be called exact `actual_wheels_off - scheduled_wheels_off` or treated as a silent f.8 target replacement. Retain all lawful source metadata/provenance and do not backfill a T−24h history from eventual outcomes.

**Why this is mathematically pragmatic:** If some physical flights have unavailable runway labels, the estimable quantity conditional on observed labels is `E[Y | label_observed=1]`, which in general differs from the airport population mean `E[Y]`. Report `N_eligible`, `N_label_observed` and coverage `N_label_observed/N_eligible` **only once independently verifiable physical-flight denominators exist**. Missingness and resulting selection bias can be addressed with prespecified strata, uncertainty/sensitivity analyses or explicit no-population-claim restriction; without a verified outcome definition, increasing sample size cannot resolve systematic semantic bias. For genuine future cross-source clock error, distinguish `estimate` from `actual` at the *record level* and do not collapse them.

## Immediate and finite next actions, no provider reply needed

1. **Today** document this qualified Gate05 diagnostic closeout in Plan-aligned Implementation Log / Phase3 README; link actual source receipt and four CI results for PR197–199. Preserve Gate3 and NEXT4 actual successful microtrials; do not repeat spent scopes, no production publish/secret changes or new REST calls. Any provider email remains optional and never blocks the offline YSSY investigation.
2. **Immediately start YSSY P25 forensic work** on **Oct13 Sydney**, as the owner requests: 58 observed HTTP 2xx and 58 original envelopes, 229 received item credit claims vs 231 provider-billed credit units, difference `2/231 = 0.8658008658%` *of billed units*, **NOT a measured loss rate of distinct flights or attempts**. Distinguish 6+6 bounded receiver-health observations from provider SEND attempts. Search already retained metadata/older report, classify sender proof absence and decide limited future monitoring. No revival of legally expired original raw or silent new paid YSSY reprobe.
3. The **Oct28 8PM PDT issue #173 checkpoint** remains the outer written evidence decision deadline, but no longer blocks beginning YSSY diagnostics today. Issue #200 describes optional AeroDataBox semantics proof. If provider clarification never arrives, record `EXTERNAL_SOURCE_SEMANTICS_UNPROVEN`; do not spend weeks polishing it or claim original f.8 PASS.
4. For final actual paid Phase4/6 release, freeze a genuinely constructible source-backed selected T/primary target (or obtain explicit formal scientific amendment with redefined estimand and tests), valid physical-leg population denominator, frozen sampling minima/cadence/grace and budget/exposure safety, and separate owner financial authorization. This is a later release gate, not a reason to hold *read-only* YSSY forensic work.

**Continuity source:** this checkpoint supplements [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173), exact [Gate05f owner-source receipt](https://github.com/HKcode22/ReplitTranvr/issues/173#issuecomment-6457322182), [PR197](https://github.com/HKcode22/ReplitTranvr/pull/197), [PR198](https://github.com/HKcode22/ReplitTranvr/pull/198), [PR199](https://github.com/HKcode22/ReplitTranvr/pull/199), [issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200) and frozen f.8. The optional support draft was prepared but **not sent**. No Cloudflare, no Replit AI Agent, GitHub main source of truth, Replit Shell only.
