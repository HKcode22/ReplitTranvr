# Oct 27 2026 — real Gate05 free-feed audit, WSSS selection and paid-prearm arithmetic

**Most recent owner facts** from live Replit Shell, strict source-pinned GitHub commit `fd001cdade28e5114f9e64ee39b8a38ab5acc535`, script object SHA `6f14b39d5ab33cb3d6cfc5f6b7d22ef481677b0e`:

```json
{
 "status":"FREE_FEED_READBACK_QUOTA_STABLE",
 "quotaApiUnitsBefore":59980,"quotaApiUnitsAfter":59980,
 "alertCreditsBefore":1981,"alertCreditsAfter":1981,
 "providerPaths":{"accountBalance":2,"freeAirportFeeds":2,"fids":0,"subCreates":0,"providerDeletes":0},
 "airports":[
  {"icao":"WSSS","scheduleFeed":"OK","liveFeed":"OK","adsbFeed":"OKPartial"},
  {"icao":"YSSY","scheduleFeed":"OK","liveFeed":"OK","adsbFeed":"OKPartial"}
 ],
 "gate05FullScientificLabelPass":false,"paidGate05Authorized":false
}
```

**Interpretation:** Both feed-health services appear operational; **partially** available ADS-B is neither full airport coverage nor a source-verified actual runway timestamp, scheduled wheels-off baseline, or per-observation actual-versus-estimate truth. No new FIDS/Alert costs occurred in this free audit. Keep source fields `timestampActualityProven=false`, `scheduledWheelsOffSourceProven=false` as actual.

**Pilot site selection:** Choose **WSSS Singapore** for the new single-airport scientific Gate05 attempt because it has the same positive schedule/live and partial ADS-B health as YSSY, yet the prior WSSS Gate3 and NEXT4 raw-first receiver trial succeeded and the normal aviation-study WSSS demand was high. **YSSY Oct13 sender gap remains unexplained**, so do not combine that independent historical incident with the new paid pilot. The site choice does not imply universal runway or trajectory completeness. The actual scheduled/service interval is **NOT YET FROZEN**, since neither a new callback scope nor independent STOP is ready.

## Critical credit-floor mathematics, before making any paid CREATE

Existing protected **NEXT4 trial** used a 1,900-credit balance floor; live shared Alert credits are **1,981**, so headroom against that protected floor is:

```text
1981 - 1900 = 81 Alert item credits
proposed new single-airport pilot budget = 500 Alert credits
500 > 81 ; proposed spend conflicts with preserving old 1900 floor
```

The previous 1,900 floor was particular to NEXT4 and **must be explicitly reviewed when creating a NEW Gate05 budget**; it is not silently re-scoped, nor a permanent assumption that a 500-credit new trial has authority. We cannot claim both 'do not go below 1900' and 'can spend 500 now'. A one-airport subscription at WSSS can bill multiple items per provider SEND and sends may continue during asynchronous STOP, so even a configured soft cap is **not a hard provider guarantee**. Source: https://aerodatabox.com/flight-alert-api-2026/ (2026). Existing 59,980 REST units are a *different* quota pool; they do not automatically replenish the 1,981 separate Alert credits.

**Two mathematically coherent budget choices for a later explicitly approved session:**
- Retain the 1,900 shared balance floor and obtain a **fresh explicit owner-authorized refill** before any trial, with an independently measured buffer for STOP latency and burst. AeroDataBox's source says refill converts **1 REST API unit into 1 Alert credit**, changing the real cost substantially; calculate exact necessary amount and current daily project cap first. **No refill has been attempted or approved.**
- Approve a **new Gate05-specific lower floor** and a bounded soft stop plus buffer under the existing 1,981-credit pool, without touching other active/foreign subscriptions. Requires the owner to understand possible overshoot, 1900 floor relaxation and real shared-account protection. **No new floor/authorization has been accepted.**

The earlier [paid retest design](2026-10-27_GATE05_STRICT_PAID_PILOT_REOPEN_AND_FROZEN_RETEST_DESIGN.md)'s 500 Alert / 12 REST proposal is thus **not dispatch-ready**. Do not programmatically attempt a 500-credit pilot with only 81 headroom unless the previously protected floor is expressly changed or additional balance funded.

## Next single NO-CHARGE operator step

Execute the new source-reviewed `scripts/v39_gate05_wsss_newpaid_prearm_readonly_20261027.mjs` (GitHub object pinned at merge) in Replit Shell, **without changing Replit's release branch**. This performs at most **2 free GET /subscriptions/balance, 1 free GET /subscriptions/webhook, 1 public GET /__v39/workspace-runtime**; 2.6-second spacing for provider requests, no retry, 0 FIDS GET, no Alert CREATE/DELETE/REFILL, no DB writes. It intentionally prints only provider aggregate subscription count (not customer subscription IDs, webhook URLs or secrets), account/floor arithmetic and published-runtime provenance. Malformed account/inventory, altered balance or unknown published source fails closed. Compare before/after quota, don't assume an empty LIST on HTTP/JSON error. A positive prior published NEXT4 receiver **does not prove new Gate05 callback scope exists**, and no independent STOP is currently armed.

### Execution ordering after prearm

1. If `activeSubscriptions > 0`, **HOLD**; inspect exact owner, not auto-delete. If the public runtime differs from the reviewed NEXT4 source **HOLD** and research changed deployment, not silently claim the old source is live. If account balance changes asynchronously, HOLD for manual settlement before new paid.
2. If prearm technically good, use known genuine Gate4 NEXT4 source only as a *pattern* and create one new Gate05 private commission/binding and **independent GitHub Actions safety STOP** with exact provider receipt and separate owner approval. **Do not reuse the old NEXT4 subscription or its spent intent**, cannot extrapolate its webhook acceptance to a new subscription scope.
3. Freeze airport WSSS, one >=60minute source/pilot interval, native T and PRE/post clocks, optional missingness protocol, sample thresholds (initial proposal 100/50/20/30/100/60 from code), STOP, credit budget/soft-floor and bounded FIDS tier2 gets before first financial exposure. Exact first-notification/unique-flight source-count evidence and target actual vs estimated need independent audit. Incomplete positive source is `INSUFFICIENT_SAMPLE`/qualified missingness, not an automatic catastrophe.
4. Seek **one exact new paid authorization** for a source-merged tested operator only after account/floor/STOP and real callback scope validation. This document is **not an authorization**.

**Status now:** `GATE05_STRICT_SCIENTIFIC_PILOT=OPEN_NOT_PASSED`, `WSSS_SELECTED_PENDING_NEW_SCOPE`, `FREE_FEEDS_PASS_PARTIAL_ADSB`, `PROTECTED_FLOOR_CONFLICT_500_VS_81=KNOWN`, `NEW_PAID_SCOPE/STOP/RECEIVER_BINDING=NOT_YET_READY`, `PROVIDER_PAID_GETS=0`, `NEW_ALERT_MUTATIONS=0`, `PRODUCTION_DB_WRITES=0`, `YSSY_HISTORICAL_GAP_TRACK=UNCHANGED`.

**Continuity:** [Issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173), [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38), previous [PR202](https://github.com/HKcode22/ReplitTranvr/pull/202) (4/4 passed). No Cloudflare, no Replit AI Agent, no new provider or email wait.
