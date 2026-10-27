# Gate 0.5 source health — WSSS and YSSY FREE feed-status PASS

**Recorded:** Monday October 26, 2026 ~23:59 PDT (Tuesday October 27 ~06:59 UTC). **Evidence:** user-provided Replit terminal output, reviewed source `scripts/v39_gate05_free_airport_feed_coverage_v39.mjs`, released from GitHub main `a83720935487c48a1801c87fe463b9c8899da83e` after [PR #177](https://github.com/HKcode22/ReplitTranvr/pull/177). This is a new observed FREE feed/coverage check, **NOT** paid FIDS science or confirmation of actual wheels-off timestamps. Full issue checkpoint [#173](https://github.com/HKcode22/ReplitTranvr/issues/173#issuecomment-6435838500).

## Observed result

| Metric | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| RapidAPI API units remaining | 59,996 | 59,996 | No incremental API units deducted across four GETs |
| AeroDataBox Alert credits remaining | 1,981 | 1,981 | No Alert credits deducted |
| Provider FIDS REST requests | 0 | 0 | No paid FIDS attempt, no old permit reuse |
| Provider Alert CREATE / DELETE | 0 | 0 | No new subscription |
| Retries | 0 | 0 | None |

| ICAO | Scheduled feed | Live update feed | ADS-B feed | Availability present |
| --- | --- | --- | --- | --- |
| WSSS (Singapore) | `OK` | `OK` | `OKPartial` | true |
| YSSY (Sydney) | `OK` | `OK` | `OKPartial` | true |

**Exact command status:** `FREE_FEED_READBACK_QUOTA_STABLE`, `providerMethods:["GET"]`, two balance GETs and two free airport-feed GETs, `noRetries:true`, `timestampActualityProven:false`, `scheduledWheelsOffSourceProven:false`, `gate05FullScientificLabelPass:false`, `paidGate05Authorized:false`.

Source-defined `OKPartial` means the ADS-B service itself is operating normally but **updates are not available for all or may be available only for relatively few flights**; do not interpret it as complete runway timestamp coverage, a specific percentage, or provider failure. See [official AeroDataBox OpenAPI 1.15.4.0](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json), `FeedServiceStatus` and `FeedServiceEnum` schemas. A successfully received record is not thereby certified as an observed *actual* wheels-off event, and `scheduledTime` is not thereby certified a separate *scheduled wheels-off* baseline.

## Prior failed diagnostic and actual correction

Earlier free diagnostic source `b5e3d15417686fda834fa82a5939c7c6308c8816` returned `GATE05_FREE_FEED_HTTP_429` from an airport-feed GET after the first successful balance GET. It lacked inter-request pacing and did not emit the airport or sanitized rate-limit headers. A rate-limit burst is a leading plausible cause, **not proven**, because the old response headers were not retained. [PR #177](https://github.com/HKcode22/ReplitTranvr/pull/177) added >=2.5s spacing between successive GET starts, safe stage/airport/429/Retry-After logging and **no automatic retry**. Four GitHub offline checks passed for that exact review head, and the first user-run corrected probe completed successfully. This is a fixed defect in the new read-only diagnostic, **not** a failure of the separate October 26 NEXT4 paid callback system or historical YSSY two-unit item discrepancy.

## Gate0.5 status and immediate next action

- **DONE:** prior Gate0.5 paid REST feasibility (2 queries, 30+30 objects, 4 units), with original STOP settled; local nested-field instrumentation omission repaired under [PR #174](https://github.com/HKcode22/ReplitTranvr/pull/174); free WSSS/YSSY feed status + exact quota readback under [PR #177](https://github.com/HKcode22/ReplitTranvr/pull/177), zero incremental cost.
- **NOT YET PROVEN:** the original exact outcome `actual_wheels_off - scheduled_wheels_off`, since published FIDS `runwayTime` can be actual OR estimated, `scheduledTime` is a general scheduled departure, and ADS-B is `OKPartial`. Also no per-flight `as of T` evidence, operating-leg denominator or actual-scheduled runway reference. No indication that the provider returned all these fields in the **original** aggregate-only pilot; missing nested information was our pilot-instrumentation design omission.
- **NEXT IN PARALLEL:** identify source-backed actual versus estimated takeoff and a separate scheduled wheels-off baseline or formally adopt a clearly named different target with scientifically assessed bias. Investigate YSSY provider-sender delivery attempts/billed credits; do not equate healthy 6+6 callback monitoring with 100% sender coverage. The offline sustained-gap warning is merged [PR #175](https://github.com/HKcode22/ReplitTranvr/pull/175), **not production deployed**. A future *small paid FIDS coverage retest* might be informative for what fraction of WSSS response records has nested fields after the local fix, but by itself cannot prove timestamp semantics; it needs an explicitly new, reviewed, bounded scope and owner's separate financial authorization. Existing WSSS12 paid scope is spent. No costly retry to reproduce identical ambiguous queries.
- **TIMEBOX:** [Issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173) requires an evidence-based result and blockers checkpoint by **Wednesday October 28 at 8:00 PM PDT**; this is an outer deadline, not a reason to wait. Phase4 offline GO, Phase4 large paid NO GO until labels/receiver mismatch policies/cost guards validated.

No credential, raw paid flight payload, full response body, flight identity or live production configuration is copied into this report.
