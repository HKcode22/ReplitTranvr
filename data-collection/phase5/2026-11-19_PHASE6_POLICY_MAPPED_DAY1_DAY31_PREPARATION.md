# Phase 6 Policy-Mapped Day 1–Day 31 Preparation

**Status:** Engineering preparation completed as a fail-closed proposal.  
**Date:** 2026-11-19  
**Repository:** `HKcode22/ReplitTranvr`  
**Run target:** paid Phase 6 collection, Day 1 through Day 31, only after the separate paid GO gate passes.

## 1. Decision in plain language

The project does **not** have to wait for another AeroDataBox email to finish its engineering preparation.

The second packet is useful and is being implemented as a **narrow, model-ready derived-release lane**. It is not a second collector, a duplicate raw archive, a backup bypass, or a way to manufacture permission. It protects the study by defining what may remain after provider-shaped source custody expires:

- model features represented as coarse bins or aggregate statistics;
- target labels represented as coarse bins;
- horizon, split, missingness, censoring, and quality state;
- aggregate model, calibration, and parity metrics;
- lineage/control references kept outside the long-lived model packet.

The second packet does **not** by itself establish that every per-flight row is a Derived Work. Under AeroDataBox's published terms, copies, extracts, reformattings, and compilations remain Contents, while Derived Work requires non-trivial independent processing and must not allow a recipient to reconstruct a specific provider record. Therefore the packet is a concrete engineering candidate, but its field-level rights status remains `REVIEW_REQUIRED` until the account-specific plan/entitlement and the exact representation are evidenced.

No paid provider call, source enable, scheduler arm, or Day 1 collection is activated by this document.

## 2. Three separate data lanes

| Lane | Purpose | Allowed lifetime | Long-term packet? | Gate |
|---|---|---:|---|---|
| **A. Source custody** | Temporary provider-shaped observations needed to build PRE/POST features and labels | The shortest applicable provider/account/policy TTL; default remains conservative until plan proof | No | Account-specific source-use/retention evidence |
| **B. Phase 7 derived release** | Model-ready representation that preserves predictive signal without source identity, exact time, raw response, or record linkage | Only after field-level review confirms non-reconstructability and permitted use | Yes, narrowly | Reviewed transformation profile with approval evidence |
| **C. Model/control artifacts** | Model parameters, aggregate metrics, calibration summaries, parity results, deletion receipts, and release hashes | Retain only what is not a provider record and cannot reconstruct one | Yes, with no raw rows | Offline QA and provenance review |

The existing source-custody package is not replaced or copied. The Phase 6 operational packet remains the full-fidelity study lane, including the identities and timestamps required for PRE/POST linkage. The second packet is a separate representation produced from a reviewed transformation boundary. Source-shaped records stay in Lane A unless an explicit field-level decision permits a field to continue in Lane B.

## 3. Day 0 through Day 31 operating shape

A paid run is one bounded authorization for the declared Day 1–Day 31 collection window, with an independent fail-closed control check for each day. It is not thirty-one silent approvals and it is not permission to continue indefinitely.

### Day 0: preflight, no paid call

1. Confirm the exact main SHA and workflow pins.
2. Confirm the account-specific source-use and retention evidence.
3. Confirm plan retention, Cache-Control behavior, and backup/PITR/incidental-copy treatment.
4. Freeze the reviewed field dictionary and transformation profile.
5. Confirm source-enable/readback evidence and the expected account/role.
6. Repin the relay and worker manifests to the exact reviewed commit.
7. Run the zero-provider rehearsal and verify that it makes zero provider HTTP calls and zero paid writes.
8. Record the separate paid GO decision with the bounded dates, daily budget, stop conditions, and rollback owner.

### Days 1–31: bounded execution

Each day produces separate evidence for:

- source request budget and provider response accounting;
- PRE cutoff-safe observations;
- POST/outcome observations and the Amendment E gate-out-delay target;
- derived packet counts and schema hash;
- missingness, censoring, not-due, and quality summaries;
- model/parity health summaries;
- deletion/expiry receipt for the source-custody lane;
- a fail-closed decision for the next day.

The source lane must not be copied into backups or long-lived artifacts beyond the applicable permission. If a daily rights, budget, schema, integrity, or deletion gate fails, the next paid collection window stops. The derived packet is not a reason to continue after a failed source or rights gate.

### Day 31 close

- stop new paid collection;
- finalize source expiry/deletion evidence;
- retain only the reviewed derived packet and non-reconstructive model/control artifacts;
- seal the final schema, transformation, and metric hashes;
- do not reopen the collector without a new bounded GO.

## 4. Concrete candidate field dictionary

This is the **engineering dictionary** for review. It is intentionally marked `PROPOSED_REVIEW_REQUIRED`, not `approvedForUse`. The production adapter must refuse this dictionary until a signed/reviewed profile supplies the rights evidence, field decisions, and transformation hashes.

### 4.1 Candidate model features

| Output field | Source family | Transformation | Proposed values | Status |
|---|---|---|---|---|
| `weather_visibility_bin` | METAR | Coarse numeric bin; retain no exact metres | `missing`, `0-399`, `400-999`, `1000-4999`, `5000+` | PROPOSED_REVIEW_REQUIRED |
| `weather_wind_bin` | METAR | Coarse numeric bin; retain no exact knots | `missing`, `0-4`, `5-9`, `10-19`, `20-29`, `30+` | PROPOSED_REVIEW_REQUIRED |
| `origin_flight_category_bin` | TAF | Broad categorical mapping | `missing`, `VFR`, `MVFR`, `IFR`, `LIFR`, `other` | PROPOSED_REVIEW_REQUIRED |
| `destination_flight_category_bin` | TAF | Broad categorical mapping | `missing`, `VFR`, `MVFR`, `IFR`, `LIFR`, `other` | PROPOSED_REVIEW_REQUIRED |
| `turnaround_bin` | Reviewed historical context | Coarse minutes bin; remove aircraft/flight linkage | `missing`, `0-29`, `30-59`, `60-119`, `120-239`, `240+` | PROPOSED_REVIEW_REQUIRED |
| `prior_adsb_not_ground_bin` | ADSB.LOL | Boolean-to-broad-state mapping | `missing`, `ground`, `not_ground`, `unknown` | PROPOSED_REVIEW_REQUIRED |
| `prior_adsb_age_bin` | ADSB.LOL | Coarse age bin; no exact observation time | `missing`, `0-59`, `60-299`, `300-899`, `900+` | PROPOSED_REVIEW_REQUIRED |
| `route_delay_history_bin` | Aggregated reviewed context | Keep only aggregate value; remove route key | `missing`, `0`, `1-14`, `15-29`, `30-59`, `60+` | PROPOSED_REVIEW_REQUIRED |
| `airport_delay_history_bin` | Aggregated reviewed context | Keep only aggregate value; remove airport key | `missing`, `0`, `1-14`, `15-29`, `30-59`, `60+` | PROPOSED_REVIEW_REQUIRED |
| `congestion_bin` | Aggregated reviewed context | Coarse count/rate bin; remove airport key | `missing`, `0-24`, `25-49`, `50-99`, `100+` | PROPOSED_REVIEW_REQUIRED |
| `schedule_context_bin` | Schedule context | Coarse calendar bucket; never retain exact UTC | `missing`, `00-05`, `06-11`, `12-17`, `18-23` | PROPOSED_REVIEW_REQUIRED |
| `reported_status_bin` | Provider status | Broad state only; hold if it is a direct restatement | `missing`, `normal`, `watch`, `disrupted`, `unknown` | HOLD_FOR_REVIEW |
| `horizon_code` | Study design | Fixed design metadata | `T24`, `T6`, `T90` | PROPOSED_REVIEW_REQUIRED |
| `cohort_split` | Study design | Remove cohort identity; preserve evaluation partition | `train`, `validation`, `test` | PROPOSED_REVIEW_REQUIRED |
| `missingness_profile` | Transformation output | Bitmask of missing model fields | Versioned bitmask only | PROPOSED_REVIEW_REQUIRED |
| `quality_profile` | Transformation output | Versioned quality bitmask | Versioned bitmask only | PROPOSED_REVIEW_REQUIRED |

### 4.2 Candidate targets and state fields

| Output field | Meaning | Required state protection | Status |
|---|---|---|---|
| `gate_out_delay_bin` | Amendment E primary: T−6 continuous actual gate-out delay represented as a coarse target | `not_due`, `censored`, and `missing` are distinct; never convert them to zero | PROPOSED_REVIEW_REQUIRED |
| `gate_out_delay_t90_bin` | T−90 comparator target | Preserve horizon and censoring state | PROPOSED_REVIEW_REQUIRED |
| `gate_out_delay_t24_bin` | T−24 comparator target | Preserve horizon and censoring state | PROPOSED_REVIEW_REQUIRED |
| `arrival_delay_bin` | Separate after-takeoff arrival outcome | Never merge with gate-out delay | PROPOSED_REVIEW_REQUIRED |
| `label_state` | Label availability state | `observed`, `not_due`, `censored`, `missing`, `invalid` | PROPOSED_REVIEW_REQUIRED |
| `observation_quality` | Quality of the evidence used | Versioned quality state; no raw receipt | PROPOSED_REVIEW_REQUIRED |

Exact bin boundaries and category mappings are part of the reviewable transformation profile. The values above are concrete engineering candidates so the implementation and QA can be built now; they are not a claim that AeroDataBox has approved them.

### 4.3 Fields that are required operationally but not automatically long-term

The following fields are **required in the private Phase 6 operational/source-custody packet** and are not being removed from the study:

- origin, destination, operating carrier, marketing carrier, tail/callsign where needed for identity;
- flight/service and operating-leg identifiers;
- route, segment, codeshare, and source-to-population relationships;
- exact scheduled, revised, observation, request, gate-out, airborne, arrival, and webhook timestamps;
- source query, physical-attempt, original-response, normalized-population, PRE, POST, and outcome bindings.

They are separated from the Phase 7 derived-release packet because a long-lived row containing these values may remain a provider Contents record or permit reconstruction of a specific record. That is a classification question, not a statement that the study does not need them.

The following are excluded from the long-lived derived packet unless separately approved:

- raw or complete provider response bodies;
- provider request URLs, query parameters, credentials, account identifiers, or rate-limit state;
- direct source-to-output linkage and source-shaped response metadata;
- a normalized row that merely reformats or renames one provider record;
- any field or combination that lets a recipient identify, reconstruct, or determine the value of one provider Contents record.

Before operational fields expire, the pipeline must run a full-to-derived parity check. If removing an airport, carrier, flight, route, leg, or exact-time field materially changes the model study, mark that field `LONG_TERM_RIGHTS_REQUIRED` and do not silently claim the derived packet is equivalent.

## 5. Model-preservation safeguards

The study must not lose the information needed for Phase 7 or later evaluation merely because source-shaped rows expire. Before source deletion, the pipeline should produce and retain:

- versioned feature/label schema and transformation hashes;
- class counts, horizon counts, missingness and censoring rates;
- calibration curves summarized into aggregate bins;
- discrimination and decision-threshold metrics;
- parity comparison between the source-authorized shadow evaluation and the derived packet;
- drift baselines and daily aggregate monitoring values;
- model parameters/checkpoints only when they do not contain recoverable source records;
- deletion and expiry receipts.

The parity test is a release gate, not a license substitute. If a safe derived representation materially changes the study result, the run must stop and the field must be held for rights review rather than silently dropping the feature.

## 6. Required activation chain

The repository should move through these gates in order:

1. **Field dictionary review:** freeze the exact output names, bins, categories, null state, and label/censoring semantics.
2. **Account-specific rights evidence:** capture the current plan/entitlement, retention allowance, paid-use status, Cache-Control behavior, and any written exception.
3. **Backup/PITR review:** document whether backups, logs, replicas, and incidental copies are covered by the same permission.
4. **Activation ledger approval:** add evidence-backed approvals; the current ledger remains empty until this occurs.
5. **Source enable/readback:** enable only the scoped source path and verify the expected account, role, plan, and cap.
6. **Relay repin:** pin relay, worker, adapter, schema, and workflow to the reviewed main commit.
7. **Zero-provider rehearsal:** prove no provider HTTP calls, no paid writes, correct deletion behavior, and correct fail-closed behavior.
8. **Separate paid GO:** authorize the bounded Day 1–Day 31 run with cap, dates, stop conditions, and owner.
9. **Day 1 execution:** run the first day and require its evidence package to pass before Day 2.
10. **Days 2–31:** continue only while the daily rights, budget, schema, quality, and deletion gates pass.
11. **Closeout:** stop, delete/expire source custody, seal derived/control artifacts, and retain the final audit evidence.

The current implementation has already recorded the account identity/quota evidence and can complete the field-classification, source-readback preparation, relay preparation, and zero-provider steps without a provider reply. The remaining rights question is the long-term treatment of the linked operational fields and backup/PITR surfaces, not account discovery. Steps requiring live source/runtime authorization and the separate paid GO must not be represented as complete early.

## 7. Published-policy mapping used for this preparation

This preparation was checked against AeroDataBox's currently published materials retrieved on 2026-11-19:

- Pricing/FAQ: https://aerodatabox.com/pricing
- Terms update: https://aerodatabox.com/2026-09-terms-update
- Full Terms of Use: https://aerodatabox.com/terms-of-use

The implementation interpretation is conservative:

- a normalized per-flight row is not automatically derived merely because it is renamed or reformatted;
- a derived packet must add non-trivial processing and prevent reconstruction of an individual source record;
- plan-specific retention and any written account exception must be evidenced separately;
- no silence from the provider is treated as approval;
- no paid GO is implied by this document.

## 8. Current conclusion

This packet removes the engineering ambiguity that caused the project to appear blocked. It gives the team a concrete Day 1–Day 31 shape and a field-level model-preservation design while keeping the legal/rights gates honest.

The correct statement is:

> The project can finish Phase 6 preparation and the offline safeguards today. A paid Day 1–Day 31 run may proceed only after the account-specific rights evidence, activation ledger, source readback, zero-provider rehearsal, and separate paid GO pass. The provider's unanswered email is not an engineering blocker, but it is not permission.

