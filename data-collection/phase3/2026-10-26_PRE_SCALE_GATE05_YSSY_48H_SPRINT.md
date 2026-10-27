# Oct 26–28, 2026 — Gate 0.5 / YSSY pre-scale 48-hour sprint

**Started:** Mon Oct 26, 2026 22:53 Pacific; **deadline:** Wed Oct 28, 2026 **20:00 Pacific** (2026-10-29T03:00:00Z). **Live authoritative tracker:** [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173). **PR:** linked from issue when reviewed. This sprint does not resurrect the already-completed WSSS08 prepaid, WSSS12 FIDS, or NEXT4 paid authorizations. No provider call, subscription, raw blob restoration, production DB write, or deployment is authorized by creating this file.

## Why we are doing this before scale

The owner wants a causal explanation where possible, strengthened code, and a correctly instrumented prospective Gate0.5 recheck **before committing significant money or a large collection campaign**. Start offline now, investigate sender visibility using historical evidence, then make a deadline-bound **evidence-based GO/NO-GO** for a *new*, separately budgeted paid FIDS measurement only if its label semantics can be resolved. A Wednesday deadline is a commitment to complete the local work and publish a scientifically honest decision, not a promise that AeroDataBox can produce historical attempt logs or a valid scheduled wheels-off target on demand.

### Fact pattern

- **WSSS Gate05:** two real REST FIDS GETs returned 30 departure response objects each (overlap not established), cost four provider REST units, independent STOP successful. The signed paid dispatcher [`v39_gate05_scoped_fids_feasibility_operator_v39.ts`](../../scripts/v39_gate05_scoped_fids_feasibility_operator_v39.ts) deliberately persisted only aggregate counts/top-level keys and retained **no nested runway timestamps, identifiers, observed-as-of T**. Our software/instrument design was insufficient for the **scientific label question**, even though technical retrieval succeeded.
- **External semantics risk:** the FIDS JSON `runwayTime` is documented actual **or estimated**, `scheduledTime` not demonstrably a separate scheduled **wheels-off** benchmark. Do not calculate `actual_wheels_off - scheduled_wheels_off` from those two fields without independently source-validated meanings. `quality=Live` alone is not proof. See merged [Gate05 source review](2026-10-23_GATE05_SCIENCE_DISPOSITION_AND_OFFLINE_AGGREGATE_HARNESS.md).
- **YSSY Phase2 P25:** 231 provider billed flight-item units, 229 preserved flight-item claims, **2-unit billing-to-retained-source gap** (2/231=0.8658%, not two confirmed missing POSTs or distinct flights); 58 received HTTP2xx webhook envelopes and earlier original SHA readbacks; 6+6 sustained local health-outage monitor did not fire. Provider SEND attempt ledger was not independently available. Historic licensed provider original objects expired and were deleted under scoped retention; do not recreate them. See [Oct13 P25 historical report](../phase2g/reports/2026-10-13_P25_YSSY_120MIN_COMPLETED_PROTOCOL_FAIL_RESEARCH_CANDIDATE.md) and [Oct26 forensic decision](2026-10-26_GATE05_YSSY_FORENSICS_AND_PHASE4_RISK_DECISION.md).
- **NEXT3 vs YSSY:** Oct25 observed 422 before raw retention DID lead to raw-first NEXT4 code repair and successful 5/5 genuine source-bound Alert microtrial. It does **not** prove the two missing YSSY units had the same failure cause.
- **6+6:** 6 primary + 6 contingent **receiver-health checks**, not 12 AeroDataBox redeliveries or sender-side receipts. Default Alert retries are zero and failed SEND is still billed: [AeroDataBox credit billing guide, Jan 31 2026](https://aerodatabox.com/flight-alert-api-2026/).

## New historical-log forensics completed now (no provider requests)

Reviewed existing actual GitHub Actions [P25 run #38339669348](https://github.com/HKcode22/ReplitTranvr/actions/runs/38339669348), especially the **safety-watchdog job #115107790655** JSON snapshot log (232 `WATCHING` observations), plus owner job #115107790678. For the existing bounded observed original baseline **2287 credits**, define *snapshot gap* `G(t)=2287 - provider_balance_last_seen(t) - internal_credits(t)`. This is only a comparison of periodically sampled, potentially **asynchronous** balance readings—not a provider SEND-attempt trace. Replaying source-log summaries offline reveals:

- 2026-10-13 **04:12:58.879Z → 04:20:44.777Z**: `G=0` for 16 snapshots (both counters aligned at each sample).
- **04:21:16.832Z** first sampled `G=+2`, but initial near-event snapshots varied as credits posted/ingest advanced; do **not** treat this instant as proven origin.
- **04:23:21.227Z → 04:31:38.993Z**: `G=+2` for **17 consecutive snapshots (~8m18s)**, start provider balance 2142 (145 externally debited) and 143 internally credited. Callback processing failures remained 0.
- **04:33:43.484Z → 04:39:57.047Z**: `G=+2` for **13 consecutive snapshots (~6m14s)**, with balance 2119 (168 externally debited) and 166 internal. This is much earlier than the owner STOP/cleanup race at **05:02:47Z**.
- **04:44:06.425Z → 04:50:50.587Z**: `G=+2` for **14 consecutive snapshots (~6m44s)**; **04:52:24.274Z → 05:01:44.408Z** another **19 consecutive (~9m20s)** positive-gap snapshots. Other short-lived **negative** `G` samples occurred when received internal items moved ahead of a stale provider balance snapshot. E.g. final watchdog `05:02:15.290Z` internal229 but last seen external debit224, so `G=-5` at that moment; do not wrongly call it final reconciliation. Actual persisted **final** original P25 reconciliation later established **231 external vs 229 received = +2**.

**New, narrower root-cause conclusion:** the positive two-unit **accounting discrepancy existed during the live window and was observed for multiple minutes before** the end-of-window watchdog `provider_subscription_isolation_lost`/cleanup race; that cleanup incident therefore **cannot on its own explain when the original first accounting divergence was observed**. The exact two missing billed item units still cannot be attributed to any specific AeroDataBox SEND notification, lost HTTP attempt, field/schema failure or receiver routing event without independent provider-attempt evidence. Watchdog's `callback_failures=0` and no postmaster restart prove only what arrived at/was monitored by our process. The repeated `G=+2` observations motivate a prospective **monotonic sustained gap warning after a proper settle grace**, not a one-sample fail-closed STOP (because negative/transient counter drift also appears in this same run).

Evidence: owner P25 final `REFUSED_STAGE1_PROBE_FAILED: YSSY external_internal_delivery_gap`, `callback_watchdog_triggered=false` in [run #38339669348](https://github.com/HKcode22/ReplitTranvr/actions/runs/38339669348). No new paid probes or historic raw payload access made for this analysis.

## Active offline implementation in this PR

1. `phase2gProviderReceiveGapAudit_v39.ts`: pure gap math with explicit billing-vs-source denominators, terminal-vs-interim balance, untrusted-vs-independently-authenticated SEND-attempt metadata, optional study-specific warning threshold, **no automatic STOP**, no false 6+6 sender attribution, zero provider/database I/O; test historical YSSY 231/229 and counterexamples.
2. `gate05ProspectiveLabelSourceReview_v39.ts`: pure label-source admission checklist for actual wheels-off, separately scheduled wheels-off, feature-as-of cutoff T, operating-leg identity and real field presence; candidate source refs are explicitly **not auto-authenticated**. Even all assertions give only `READY_FOR_HUMAN_SOURCE_REVIEW`, never scientific PASS or paid GO; test against `quality=Live`, absent nested fields, ambiguity and correct reviews.
3. **Actual Gate05 prospective measurement-code repair:** the existing *future-only* `scripts/v39_gate05_scoped_fids_feasibility_operator_v39.ts` now computes `nestedTimePresence` **in memory** for each authorized FIDS response via `summarizeGate05NestedTimePresenceV39`, before serializing the small private scoped receipt. Counters distinguish scheduled/revised/runway timestamp-field **presence**, without writing flight identifiers, locations, raw event timestamps or provider payloads; `actualWheelsOffProven=false`, `scheduledWheelsOffProven=false` and `eventAsOfTProven=false` remain explicit. The old WSSS12 historical receipt is unchanged, and this source update **does not run the expired paid scope**. It prepares meaningful aggregate evidence for a **new separately authorized** measurement only after provider/label-source semantics are reviewed. Fixture tests verify the two-field nested response, null/empty cases and nonretention of raw identifiers.\n4. Existing in-memory `gate05FidsAggregateEvidence_v39.ts` remains the no-provider response-level aggregate; it was merged in [PR #112](https://github.com/HKcode22/ReplitTranvr/pull/112). No old payload recovery from time-expired source is attempted.

## Schedule and exit criteria

| Pacific time | Owner-facing acceptance evidence |
| --- | --- |
| **Tue Oct 27, 14:00** | Reviewed Gate05 code-level omission and source proof gap; schema-safe offline field/identity/T fixture QA runs green, no unsupported actual-runway label |
| **Tue Oct 27, 20:00** | YSSY incident/timestamps/watchdog/operator audit matrix; decide whether historical sanitized AeroDataBox SEND attempts or returned HTTP statuses are obtainable (unknown unless provider confirms) |
| **Wed Oct 28, 12:00** | Offline gap-classifier source and test CI, 6+6 blind-spot simulation, receiver source/ACK and STOP read-only crosscheck; build source-billed gap warning policy proposal, no automatic provider mutations |
| **Wed Oct 28, 17:00** | Gate05 **retake GO/NO-GO**: if actual wheels-off, scheduled runway baseline, capture as-of T, operating-leg identity and retention legality can be **source-validated**, propose one narrow new FIDS pilot with reviewed budget/STOP and request separate exact paid authorization. If not, record external semantic blocker and alternate source/target options, not fake "success" |
| **Wed Oct 28, 20:00** | Published dated exact-source checkpoint in [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173) and [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38), CI state, precise resolved/undetermined causes, lessons and Phase4 gate. Can enter **Phase4 offline engineering earlier** if ready; no Phase4 paid exposure without separate approval |

**Must-pass for large-scale paid progression:** scientifically identifiable *actual* runway outcome and valid scheduled runway reference **or a deliberately renamed and approved proxy**, logged feature cutoff T with independent as-of observation rules, population/identity and codeshare policy, exact provider-positive ID linking, durable raw evidence and SHA-before-ACK, safe accounting for SEND-vs-received unit drift, bounded missingness/stop escalation policy, independent STOP and credit floor, prospective budget + fresh owner approval. Scope-specific past gates stay closed with their original historical caveats; don't re-run prior paid windows as a substitute for these prerequisites.

## Provider support question, if existing public docs cannot resolve it

Ask AeroDataBox, without sending keys or flight payloads: whether an **October 13, 2026 YSSY Flight Alert window** can be audited via a sanitized per-attempt send ledger: provider timestamp, notification count, attempted HTTP response class/timing, flight-item credit units, retry count, and unique (hashed) notification IDs. Clarify whether charged items can differ from saved receiver item claims despite 58 2xx callbacks. Separately ask whether the FIDS departure `runwayTime` field or another endpoint exposes unequivocal **actual wheels-off**, and whether an authoritative **scheduled wheels-off** baseline and source-as-of time exist. Provider's public documented list/get subscription endpoints do **not** by themselves provide a known full historic attempt-log API; do not invent one. See [contact page](https://aerodatabox.com/contact/). This sprint does **not** claim an inquiry was sent or a support reply was received.

## Final disposition handling

Possible report statuses:
- `GATE05_OFFLINE_MEASUREMENT_PREPARED` + `LABEL_SOURCE_READY_FOR_HUMAN_REVIEW` or `SEMANTICS_UNPROVEN`;
- `YSSY_CAUSAL_ROOT_CONFIRMED_WITH_PROVIDER_LOGS` only on independently authenticated attempts matched to scope/time/count **and** determinative error, otherwise `YSSY_CAUSAL_ROOT_UNDETERMINED`;
- `PRE_SCALE_SOURCE_MONITORING_CI_PASS` when exact test suite passed, **not** a claim production alarm is deployed;
- `PHASE4_OFFLINE_GO` and `PHASE4_PAID_NO_GO` until separate material quality, financial and source protections.

Do not silently substitute a green PR for a live sender-side observation or future paid permission.

## Oct 27 independent Gate05b and YSSY checkpoint (pre-deadline, no-provider)

This section records **new direct GitHub Actions log verification**, rather than substituting an assumption about missing provider SEND attempts. Read alongside the earlier historical forensic section and [postpaid Gate05b parser review](2026-10-27_GATE05B_POSTPAID_UTC_FORMAT_AUDIT_AND_FIX.md). It does not replace P25's frozen failed/DELIVERY_GAP protocol.

### Gate05b actual paid trial — source and account finalized

The owner's Oct 27 07:23:13.778Z one-off WSSS FIDS trial at [PR #179 source/main ee6aa23](https://github.com/HKcode22/ReplitTranvr/pull/179) **already executed**: exactly two 200 GETs, 15 departures per withLocation variant, 5 operator and 10 marketing codeshares each, all 15 Live, **4 API units spent** (59,996 to 59,992), **0 Alert credits spent** (1,981 unchanged). The reported 0/0/0 parsed nested UTC values were **PARSER_UNVERIFIED** because the original T-only parser excluded a vendor-documented space-delimited UTC format; since raw flight responses were never retained, no historical field values can be inferred. [PR #180](https://github.com/HKcode22/ReplitTranvr/pull/180) merged parser/shape/field-presence regression repair to **main 1425c475f9136fe802cb5dd3635d7ed19f9a078d**, 4/4 no-provider CI checks successful. Do **not** replay the consumed one-shot private intent. The exact requested `actual_wheels_off - scheduled_wheels_off` remains unproven: provider FIDS runwayTime may be actual/estimated, scheduledTime does not prove a scheduled wheels-off baseline, and no source-as-of T/operating-leg certificate exists.

### Direct replay of original YSSY P25 Oct 13 signed Actions logs

Re-read original [P25 run #38339669348](https://github.com/HKcode22/ReplitTranvr/actions/runs/38339669348) watchdog job **115107790655** (its actual text log) and owner job **115107790678**, without any provider calls or raw-flight access. Parsed 232 `v39.phase2g-github-safety-watchdog.v1` `WATCHING` JSON observations between **03:02:25.180Z and 05:02:15.290Z**. The live observational difference `G(t)=2287 - provider_balance_last_seen(t) - internal_credits(t)` is **not** a fresh provider SEND-attempt ledger. Its signs/counts over those 232 snapshots: **67 positive, 127 zero, 38 negative**. First sampled positive gap: **04:21:16.832Z (+2)**.

| Sustained +2 run UTC | Observations | Duration | Recorded callback failures |
| --- | ---: | ---: | ---: |
| 04:23:21.227–04:31:38.993 | 17 | 497.766 s | 0 |
| 04:33:43.484–04:39:57.047 | 13 | 373.563 s | 0 |
| 04:44:06.425–04:50:50.587 | 14 | 404.162 s | 0 |
| 04:52:24.274–05:01:44.408 | 19 | 560.134 s | 0 |

The **last WATCHING** row (05:02:15.290Z) showed 229 internal items, 58 callback requests, provider balance **last seen** 2063 and hence *interim* `G=-5`, demonstrating asynchronous balance/receiver snapshots. This is **not** the terminal account reconciliation. Owner job then explicitly failed **05:04:21.626Z**: `REFUSED_STAGE1_PROBE_FAILED: YSSY external_internal_delivery_gap`, with `callback_watchdog_triggered=false`. The separately reconciled **terminal** ledger remains **231 billed item units vs 229 received item claims (gap +2)**, as in the authoritative incident report. Watchdog reported `provider_subscription_isolation_lost` at **05:02:47.455Z**, **after** all four sustained sampled positive-gap runs. A late cleanup race **cannot alone account for the earlier observed divergence**, but this timing does not identify the original missing or extra SEND, response, retry, routing, or billing attribution.

### Tuesday matrix and finite remaining dependencies

| Layer | Independently evidenced | Still missing / decision |
| --- | --- | --- |
| Provider debit | Terminal 231 external item credits, plus several sustained *interim* +2 observations | No authenticated notification-level SEND attempt IDs, sent timestamps, per-attempt HTTP status, or flight-item counts |
| Receiver ingest | 58 observed 2xx envelopes, 229 committed item claims, zero observed callback-processing failures | Nothing proves receipt of *every provider SEND*; do not map +2 billed item units to two missing POSTs |
| Receiver health and STOP | 6+6 did not trigger; no observed sustained receiver outage; late independent watchdog cleanup race occurred | A clean heartbeat is not a provider SEND receipt; end-of-window race is a distinct operational incident |
| Raw/historical custody | Original 58/58 verified when retained; scoped Oct22 TTL deletion/tombstone reported in project custody record | Historical raw objects must not be reconstructed or reimported |
| Gate05 source / Phase4 | Parser defect fixed/tested and technical FIDS/billing PASS; NEXT4 5/5 separate microtrial remains accepted | Original runway label remains NOT_PROVEN, and P25 sender cause remains UNDETERMINED; Phase4 **offline GO**, Phase4 **new large paid NO-GO** |

**Tuesday 8PM PDT forensic-matrix checkpoint is substantively completed early from retained GitHub evidence.** Remaining *external* fact is whether AeroDataBox can provide a sanitized scope-matched Oct13 YSSY attempt ledger, including provider send timestamp, per-attempt billed flight-item units, HTTP response class, retry sequence and pseudonymous delivery ID. Public documentation does **not** establish the existence/retention of such a ledger; [official billing guide](https://aerodatabox.com/flight-alert-api-2026/) confirms billed on SEND, including failed delivery, and per flight item. No provider support request has been sent by this checkpoint. If unavailable by the Wednesday 8PM PDT decision, record `CAUSE_NOT_IDENTIFIABLE_WITH_AVAILABLE_SOURCES` as finite unresolved external evidence, **not** a forced new paid retry.

Next **offline implementation review by Wednesday noon PDT**: verify advisory `phase2gProviderReceiveGapAudit_v39.ts` / `phase2gSustainedCreditGapSignal_v39.ts` tests cover freshness, signed terminal settlement, transient negative lag and sustained +2 warning; confirm raw-before-2xx/quarantine in released NEXT4; design but do not silently deploy a warning-only, prospectively specified per-window accounting monitor. Require independent cost/STOP and human approval for any future paid scope. GitHub remains source of truth; no Cloudflare, Replit AI Agent, provider retries, schema changes, downloads of expired originals or published app changes were involved in this checkpoint.
