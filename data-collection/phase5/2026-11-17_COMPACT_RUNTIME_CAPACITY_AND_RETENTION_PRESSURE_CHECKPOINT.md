# November 17 — actual runtime capacity and compact calendar retention pressure

**Review only; no new gate, no production mutation, no provider call.** Exact current production main at review: `345f642e0df3266853a1f9d5e3f12fa262ddf1ee`. Keep existing calendar, seed, 31 parents, original A/B/C/D1/D2 and canonical E, subscription and retention policy. The additional test-only PR #863 may remain a review branch; merging it just to create another exact-main repin is not necessary.

## Completed engineering verification

Actual #863 head `b418f8f0e0bc0c04e2a26ea6b22d459d5b16aeab`: [focused 44096828041](https://github.com/HKcode22/ReplitTranvr/actions/runs/44096828041) 15/15, all 31 metadata plan digests; [full offline safety 44096828863](https://github.com/HKcode22/ReplitTranvr/actions/runs/44096828863), job 134086044954, 4,333 passed, 221 skipped (624 passing files, 42 skipped), typecheck, lint, build, registry, migration boot/restart and safety steps all success. All six exact-head workflows green. Repeated Full/Offline runs are not two disjoint test populations. No real DB stage or provider action inferred.

Independent new clock audit: directly fetched all 31 exact-main committed SOURCE day-plan JSON files, compared each sorted multiset of horizon, slot and nominal request UTC against an independent enumeration of active segments from the exact compact receipt (15-min refresh, 15-min GET lead, horizon offsets 24h/6h/90m, four slots). 31/31 matches, 6,144 templates, 2,048 per horizon; 29 days with 192 templates and two with 288. First Nov19 23:45Z, last Dec24 02:00Z. This is clock/slot parity, not a second cryptographic verification of the full byte structure or authenticated provider observations.

## Current profile, rather than historical model

Current main `server/lib/disruption/phase6PrivateSourceDayEpochDueParentReview_v39.ts` defines `P6_STORED_SOURCE_CAPACITY={perTickCap:8,inFlightCap:24,maxLeadMinutes:90}`, imported by the existing stored SOURCE dispatcher. Its existing queue permits at least 15 min prearm; standalone parent nominal cadence is 10 min. The budget proposal's historical "CANDIDATE" comparison continues to model a 35-min lead: useful for its originally recorded comparison, but not the actual current maximum. Do not retrospectively overwrite the old evidence or alter runtime limits on the basis of a model.

[Exact review script](review-tools/p5_compact_runtime_capacity_review.cjs) and [numeric evidence](evidence/2026-11-17_compact_runtime_capacity_REVIEW_ONLY.json), independently evaluated using the actual compact receipt and regenerated original start times. Core calculation executed in JS; standalone Node wrapper validates receipt Git blob ee17a694594356e2b0c772545c490c198db11b42. Wrapper is review-only and was not separately run under native Node in this review. The algorithm counts modeled dispatch eligibility, not data capture. It assumes exact ticks, earliest scheduled request priority, identical child completion tail measured from *nominal GET*, and immediate history/slot availability; does not model queue admission, signing, DB latency, quota, provider response, real workflow duration, retries or stochastic gaps. Phase offsets enumerated at integer minutes. Compact's peak of eight simultaneous nominal templates already includes multiple horizons/days; not four globally. Both candidates have at most two distinct parent days in the current 15–90min due interval and at most 48 eligible-looking template entries before admission, consistent geometrically with the existing two-day reader and 700-row bounded scan. Existing per-tick cap remains eight, not 48.

| Ideal 10-minute ticks; assumed child tail after nominal GET | Original worst missed / 6144 | Compact worst missed / 6144 |
| --- | ---: | ---: |
| 0 min | 0 | 0 |
| 5 min | 0 | 0 |
| 15 min | 0 | 0 |
| 25 min | 16 | 136 |
| 35 min | 16 | 136 |
| 60 min | 80 | 352 |

Peak modeled active children 24 in every row. Worst alignment over ten one-minute phase offsets, not a measured probability of missing flights. With a 15-min tail and *regular* tick intervals, compact misses range 0 at intervals 5/10/15min, 100–136 at 20min, 252–280 at 30min, 2624–2932 at 60min. These regular hypothetical intervals are not the actual sporadic GitHub history. A longer 90min prearm window does not eliminate in-flight saturation. Do not change caps, cutoff or budget to chase an ideal simulation; review actual data quality and record all misses. Source requests are not individual flight counts.

### One hypothetical blackout (not regular slow cadence)

At phase-zero 10-min ticks, 15-min assumed child completion tail, baseline 6,144/6,144 modeled submissions. Simulate each possible start tick across baseline; omit starts in [outage start, resume), keep already submitted children, resume on original grid, use exact saved baseline state and reconcile after recovery. No full-day paid rehearsal or source records.

| Skipped parent-tick window | Worst missed templates | Relevant parent days |
| --- | ---: | --- |
| 60 min | 32 | 6,7 |
| 90 min | 48 | 12,13 |
| 120 min | 64 | 12,13 |
| 240 min | 108 | 6,7 |
| 350 min | 136 | 6,7 |
| 490 min | 172 | 6,7 |

Worst 490min starts Nov27 14:10Z and resumes Nov27 22:20Z; 100 day6 and 72 day7 requests. Not a forecast, flight count, or proof that an active rolling root would avoid all losses. Reuse the existing bounded queue, watchdog, independent notification watch; preserve late-PRE refusal and approved missingness reporting. This is an operational tradeoff of finishing sooner and should be visible in the exact independent release review, not a new numerical launch prerequisite invented here.

## Retention backlog pressure (different from SOURCE dispatch)

Same nominal clocks; translate by a fixed age for hypothetical source-original expiry. One successfully persisted original per nominal template, no retry, POST original, response delays, write failures or actual population-row volume. Use half-open rolling intervals.

| Interval | Original max nominal originals | Compact max nominal originals |
| --- | ---: | ---: |
| 1h | 32 | 32 |
| 2h | 56 | 64 |
| 4h | 88 | 120 |
| 6h | 128 | 152 |
| 8h | 160 | 184 |
| 532min | 176 | 200 |
| 12h | 224 | 248 |
| 24h | 256 | 320 |

Peak compact calendar-date SOURCE requests 280 (several dates), compared with original 256. Maximum rolling 24h 320 is different from the UTC-date peak. Existing primary FIDS runtime permits 32 parents per batch, at most eight batches (256 parents per invocation); a nominal 24h backlog can exceed it by 64 even before other actual activity. 532-min sensitivity gives 200, within that *count* bound but not a timing/processing guarantee. Compact's 12h 248 is just eight below the count bound. There is no claim of an observed deletion backlog or proof all 256 rows can finish within the job's 9-min timeout. V0079 source bridge's 23h upper-bound access deadline and 24h hard primary cap remain. Scheduling only after data reaches eligibility can miss the hard limit; a zero-work receipt cannot establish compliance. Existing V0104 reservation guard is distinct from deadline assurance. Do not raise TTL or limits, infer backup/PITR compliance, turn off the current cleanup, or create another service just from the model. Need actual independent operational acceptance compatible with provider rights and current source expiry. The 15-min cron is a desired cadence, not a guarantee; observed long GitHub gaps are material. Current monitor/STOP/no replay policies remain intact.

## Final disposition

No additional production change or owner shell action from this review. Exact compact candidate unchanged, 37388-unit total reserve, 49,468 net ceiling candidate and 1,000 floor unchanged. All 31 plans and actual runtime geometry checked. Real source-specific corpus rights, conditional gate-out/label disposition, operational acceptance, actual account/STOP and final scoped AUTH remain unresolved. No repeat mailbox search, new subscription, false approval, staged packet or source activation; maintain existing primary retention repin. Do not merge docs/test-only review branches just to produce a new SHA. Full scientific FREEZE HOLD / Phase6 paid NO-GO.
