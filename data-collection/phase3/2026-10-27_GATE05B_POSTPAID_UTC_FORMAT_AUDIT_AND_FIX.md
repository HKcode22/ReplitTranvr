# Gate 0.5b postpaid retrospective: valid transport and billed receipt; timestamp parser defect

**Evidence receipt generated 2026-10-27T07:23:13.778Z** from owner-run published source pinned to GitHub `ee6aa23ff1d2e17f78072c095260f7580c1401b7`. Source URL [paid microtrial released PR #179](https://github.com/HKcode22/ReplitTranvr/pull/179); [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173); durable project checkpoint [#38](https://github.com/HKcode22/ReplitTranvr/issues/38).

## Observed actual paid outcome, do not revise

| Attribute | withLocation false | withLocation true |
| --- | ---: | ---: |
| HTTP 200 departure objects | 15 | 15 |
| Malformed rows | 0 | 0 |
| `quality Live` rows | 15 | 15 |
| Codeshare operating | 5 | 5 |
| Codeshare marketing | 10 | 10 |
| Scheduled/revised/runway `validTime` parsed values | 0/0/0 | 0/0/0 |
| Provisional distinct operating keys | 0 | 0 |

**Paid requests=2; account API units spent=4, remaining=59,992; Alert credits spent=0, remaining=1,981.** Runner reported `GATE05B_TWO_PAID_FIDS_GETS_AGGREGATE_MEASUREMENT_PASS`, `no raw provider data retained`. Interpret that status precisely as a transport and billing/source-procedure PASS, **NOT a trustworthy validation that the provider supplied no nested timestamps**. No flight-level rows or timestamps were persisted in the operator's file, as intended by limited retention; we cannot retroactively reprocess original provider JSON.

## Subsequent source audit: reproducible local timestamp parser defect

Original standalone paid runner `scripts/v39_gate05b_wsss_two_fids_gets_once_20261027.mjs` used:

```js
/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,9})?)?(?:Z|\+00:00)$/
```

This **rejects a valid provider-documented UTC timestamp shape** using a SPACE before clock time, such as `utc: "2023-10-04 18:01Z"`, despite a valid date and actual time string. Those input values would be incorrectly counted as zero scheduled/revised/runway field coverage and cause operating leg keys to remain unmatchable. Separately [AeroDataBox OpenAPI 1.15.4.0, AirportFlightContract](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json) documents alternative `movement` object (without withLeg) and `departure`/`arrival` objects (withLeg). Our two paid requests set withLeg=true, so `departure` is expected, but instrument must support both contract shapes.

**What IS confirmed:** code-level T-only mismatch exists and can be replicated with synthetic `utc` values; no provider charge needed to fix this.
**What IS NOT confirmed:** whether the paid 15/15 returned records actually used space timestamps, had any scheduled/revised/runway fields at all, or could establish actual takeoff. As the previous user-run code stored only aggregate counts, those details are unknown and **cannot** be recovered from the expired process.
**What is still external ambiguity:** even a populated `runwayTime` is actual OR estimated and `scheduledTime` is NOT independently scheduled wheels-off. `quality=Live` is not per-field actuality. Current FREE WSSS/YSSY ADS-B feed status `OKPartial` is incomplete coverage, not guaranteed per-flight labels.

## No-provider correction PR

- Correct both core offline Gate05 aggregate helper and future standalone runner to count timestamp values that use RFC3339 T **or** documented SPACE, explicit Z or +00:00 only; still reject invalid dates/nonzero offsets.
- Count **nonempty** UTC fields distinctly from **validly parseable** fields. Use `movement` vs `departure` appropriately; `movement.airport` for a FIDS departures row indicates *destination*, NOT independently confirmed origin.
- Extend pure test suite with documented SPACE, movement-only, T, fractional seconds, malformed dates, codeshare and privacy/actuality-fail-closed examples. No paid call, JSON response-body logging or production database schema change.
- Mark historical 0/0/0 as `PARSER_UNVERIFIED`, never treat as `FIELD_ABSENT`, and keep original signed test and actual 4-unit spend receipts unchanged. Don't remove/reset the one-use private intent.
- Prior original Gate05b one-off paid authorization was **spent**, and future paid retest requires separately scoped user consent. **No additional paid GET is justified solely to repair a parser.** Proceed directly with existing YSSY no-provider sender-gap/monitoring work.

## Updated scope decisions

```text
GATE05B_TWO_PAID_GETS_HTTP_AND_ACCOUNTING=PASS
GATE05B_ORIGINAL_TIMESTAMP_COVERAGE=INDETERMINATE_PARSER_ERROR
GATE05B_LOCAL_PARSER_CONTRACT=REPRODUCIBLE_FAIL_THEN_OFFLINE_FIX
GATE05B_ORIGINAL_RUNWAY_DELAY_LABEL=NOT_PROVEN
GATE05B_ALLOW_AUTOMATIC_PAID_RERUN=NO
YSSY_P25_231_VS_229_ACCOUNTING_DIFFERENCE=CONFIRMED
YSSY_P25_EXACT_PROVIDER_SEND_CAUSE=UNKNOWN
PHASE4_OFFLINE_ENGINEERING=GO
PHASE4_LARGE_PAID_COLLECTION=NO_GO_PENDING_LABEL_AND_MONITORING
```
