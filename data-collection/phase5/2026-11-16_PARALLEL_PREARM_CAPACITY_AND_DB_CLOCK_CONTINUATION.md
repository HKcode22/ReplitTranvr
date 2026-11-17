# Phase 5 — parallelism, prearming and bounded polling comparison (November 16 Pacific)

## Status and source of truth

Continuation of existing integrated draft #848, prior exact head b22ce956acafb023dfb15f35896a16d6f1dc0803. Both previous scheduling executable head ce33441f260f67a44629468ab33f571ab9313609 and metadata-only b22ce956a head independently read back **12/12 CI successful**, including full Offline Safety 44032171117 and 44032832730. No earlier production action repeated. Current main 6cb6c28a1508a2aaf3ebe5551bf41444dbb6622e; stop/freeze and source rights unresolved. User asks compare/test parallelism and early-running jobs, not another architecture. Preserve all original amendments, C+D, 31 day plans, budget, signed query UTCs and retention guards.

## Three levels of concurrency, not one number

1. SOURCE: parent checks exact signed planned queries and dispatches at most 8 single-GET children per tick, at most 24 acknowledged nonterminal SOURCE children. The API POSTs for child dispatch are deliberately sequential to know exact acknowledgement and stop on an uncertain POST; the resulting jobs may run concurrently. 24 includes waiting or queued children and is an application upper bound, not 24 guaranteed simultaneously executing jobs or 24 SQL writers. It does not count PRE, POST or CI jobs. No concurrent blind dispatch retries. GitHub official limits list 6h per standard hosted **job**, and total concurrent standard hosted jobs depends on account plan (Free 20, Pro 40, Team 60; see https://docs.github.com/en/actions/reference/limits). We do not know the user's exact GitHub plan or actual available concurrency; do not conflate ChatGPT or RapidAPI plans. Prior actual two-wave rehearsal eight concurrent workers is the existing empirical baseline, not 24 guaranteed.
2. Later PRE: current protected script scripts/v39_phase6_private_current_later_pre_schedule_v39.ts already starts up to four independently authenticated roster shards via Promise.allSettled; uses an eight-connection pool, exact V0092 scoped claims, two tasks per per-shard tick, up to four separately approved microburst ticks. Each two-task tick currently commits sequentially; this is intentional bounded work, not all sequential across the four shards. It stops additional ticks after uncertainty, not retrospective replays. T24 remains its own independent witness lane; do not combine away scientific witness. The current 15-minute PRE job and 8-minute cutoff lookahead are different from 150-minute single-GET SOURCE job and 120-minute V0080 wait. No six-hour live job is required for each flight.
3. Existing rolling parent: up to 30m per session, max four chained sessions/120m in separate reviewed custody mode; 32m job timeout, bounded 450 GH requests per session. This is not 4 concurrent copies of the same controller; successor proves predecessor and carries ownership across time. A multi-hour running horizon coordinator (e.g. early start + 4h service + buffer <6h) could reduce cold starts, but current four-session implementation does not silently provide it. Do not extend protected scope/enable V0102 by inference; need actual custody, settlement and API-rate evidence. No external scheduler added. GitHub scheduled triggers remain best-effort (https://docs.github.com/en/actions/how-tos/troubleshoot-workflows#scheduled-workflows-running-at-unexpected-times).

## Reused actual independent benchmark, including failure evidence

Prior exact real Stage14 disposable PG16 run https://github.com/HKcode22/ReplitTranvr/actions/runs/43035248228 job 130572236210, 2026-11-11, commit ff5de38cbb751752df47fe7bb6f2e3a95427e69b. Actual eight distinct synthetic tasks per lane setting, 32 distinct verified PRE in total; real PostgreSQL16 transactions and postcommit readback. Test-specific queue and confirmed abort-only retry adapter, not live V0092 production throughput. Actual logs:

| Parallel workers | Completed | Total ms | Max write+readback ms | Confirmed 40001 retries |
|---:|---:|---:|---:|---:|
| 1 | 8/8 | 95 | 21 | 0 |
| 2 | 8/8 | 105 | 87 | 1 |
| 4 | 8/8 | 106 | 100 | 3 |
| 8 | 8/8 | 142 | 134 | 6 |

Earlier attempt 43034440534/job 130569456638 failed at 4-worker test after serial and two-lane passes; do not discard as if parallelism is free. This small fixed-order synthetic experiment cannot establish general fastest live worker count. It demonstrates real serialization contention and why increasing in-flight workers does not automatically improve PRE throughput. The production runtime does not blindly retry unknown writes. Keep existing 4 shard max/2 sequential claims per tick (not approve new 8/16 SQL write concurrency). Prefer actual deadline/queue distribution and same-denominator benchmark before expansion. Do not rerun already successful historical experiment just to pad test counts. Current independent measured live Neon/provider throughput not available.

Actual prearm clock run 43832469501: eight workers, two 4-slot waves 15m apart, all 8 ready before target. Setup dispatch-to-db-ready 38,114–70,132ms; release slip 3–7ms with disposable local PG16. Actual nonpaid rolling rehearsal 43786384018, 43786433226, 43786491970: three sequential hops total ~110s, six planning waves, no collection dispatch. Neither certifies live Neon, half-day outages or sustained paid collection. Reuse historical Oct31 2.350s paid prearm measurement, no new paid calls.

## Capacity-aware scenario comparison, exact day 1

Read original committed day-one plan blob 74b153f0f9f9c860196d9622aaa48b93048bb95f (192 nominal queries, 64 each horizon). Model actual proposed offset :05/:15/... every 10 minutes, earliest signed target first, 15m minimum lead, fixed 8 child submissions/tick + 24 active, assumed every signed packet ready, immediate known ACK, job occupies a slot from admission through target+3 minutes (sensitivity +15m), no extra setup/parent delay. No provider or actual DB. Iterate each possible tick-aligned single interruption and take worst modeled misses. This is a *different*, capacity-aware model from the earlier whole-calendar fully enclosed opportunity calculation; not actual losses or probabilities. Actual calendar first day only; attempted full 31-day re-read exceeded connector batch-call limit, so do not claim this specific new capacity-aware calculation covers the full study. Prior full-calendar blackout geometry remains separate and unchanged.

| Max preparation lead | Nominal missed /192 | Peak active | Mean prep minutes | Worst 60m outage | Worst 120m outage |
|---:|---:|---:|---:|---:|---:|
| 35m | 0 | 12 | 32.50 | 12 | 28 |
| 60m | 0 | 20 | 57.50 | 8 | 24 |
| 90m | 0 | 24 | 84.38 | 0 | 16 |
| 105m | 0 | 24 | 90.00 | 0 | 16 |

All four profiles have zero nominal modeled misses even with +15m occupation; mean advance for 90m then 78.13m, for 105m 83.75m. At 90m/8 tick/24 active, 15 nominal ticks were capacity blocked vs 45 for 105m (tail+15: 45 vs 48). Worst tick-aligned outage for 30/60/90/120/160/350/590 minutes:
- old 35: 4/12/20/28/40/84/128
- 60: 0/8/16/24/32/76/128
- 90: 0/0/8/16/28/68/128
- 105: 0/0/8/16/28/68/128.

Sensitivity at 90m lead caps 8/12/16/20/24, with 4 or 8 submissions per tick: worst 60m outage 16/12/8/4/0 misses respectively, in this specific model. Nominal +15m tail at cap8 misses 48, other caps zero. Cap 24 is not a measured platform capacity or required new paid plan; too few slots reduces resilience, excessive active workers crowd out PRE/POST. 90m is preferred over 105m **under these assumptions**, not proved optimal. Preserve user-authorized 90m candidate and prior staggered schedules. Use 8 per tick as upper bound to allow catch-up without additional request templates; no increasing cap or enabling paid work. Real signed readiness is especially important: future draws/registries may not yet exist when early admission would be ideal.

## Actual engineering improvement: less connection churn in the existing V0080 wait

Existing source worker polls actual DB clock through makeP5Stage28DedicatedRolePool; each query opens a restricted session, verifies exact login/membership/grants and destroys connection on release. Fixed 5-second polls over 90m can produce 1,081 role-checked clock calls per child in exact zero-latency arithmetic, 24 simultaneously waiting = 25,944 over their waits. Not measured DB queries/usage. No need to hold write transaction or provider call while waiting.

Modified only the existing V0080 waiter (server/lib/disruption/phase5V0080GitHubPrearm_v39.ts) and its existing test suite (tests/phase5_github_source_one_query_release_admission_v39.test.ts). New fixed policy: read genuine DB clock on every wake; if >2m remains, sleep no more than 60s and never cross final-2m boundary; from there retain 5s or less and re-read before any release. New explicit backward observed-clock refusal. Same 2h bound, original earliest cutoff, max response margin, real signed planned time, SQL old hard-latest check after wait, no early reserve, unchanged query/GET count or budget. No SQL migration or roles changed. This does not assert live external secret changes propagate into running jobs; actual existing live DB reservation/STOP authority remains separate.

| Exact lead | Prior clock reads | New deterministic test expected |
|---:|---:|---:|
| 35m | 421 | 58 |
| 60m | 721 | 83 |
| 90m | 1081 | 113 |
| 105m | 1261 | 128 |
| 120m | 1441 | 143 |

90m example reduces read calls by about 89.5% in the exact idealized-clock test, not measured Neon latency/cost. Tests verify no sleep across precision boundary or dispatch UTC, exact final 24 5s intervals, correct counts for all five lead settings, backward clock rejection, oversleep beyond latest safe cutoff rejection, fresh actual clock check after missed intermediate poll. The prior wait allows some late release inside existing broad guard; actual worker still separately fails hard-latest after wait, so do not claim exact no-late execution guarantee. No relaxation or change to original paid deadlines. Actual focused disposable PG16 V0080 workflow and full CI required on exact new head. Re-pin helper now allowlists additional two exact reviewed blobs, total 16; no production re-pin or new run dispatched.

## Remaining release dependencies

Latest previously verified primary scheduled history since enable still nine scheduled runs, no primary expiry run observed, main unchanged. No replay manual APPLY; time-based guarantee remains absent. Actual source rights/qualified gate-out scope and operational acceptance, final exact release identity, coordinated merge/re-pin, inert calendar+cost staging and independent readbacks remain. Historic manifest b22ce956a no longer final digest after two executable changes; must refresh compiled identity with exact successor from final stable version. No new mandatory stage, no quota purchase, source-call, live DB writes or paid activation in this continuation. November 20 conditional strict lead still 15:10 PST.


## Follow-up: full calendar capacity, first-wave readiness, tested implementation

The incomplete 31-file connector batch was recovered by using the already-downloaded actual archived exporter result 14212961986 (ZIP and inner SHA independently matched the prior checkpoint). Local Python reproduced 6,144 unique nominal request times/slots from all 34 original segments, 31 days, 15m refresh and 15m physical request lead, exactly 2,048/horizon and reproduced the independent day-one 192-template comparison. Reproducible [review-only script](review-tools/p5_parallel_prearm_capacity_review.py) SHA256 812d11f9811bb416e57ddce68f9bf2fcea24aaa580f614b2aa0b5f56dbb2d192; its full deterministic JSON stdout SHA256 e7928949bc7f070f745b0081b237502ba9fbd7bc2c6f2138e13937b1ccbd8eea. It reads only exact archived metadata, never live services or secrets. Full-cycle 32 scenarios (four lead choices × four capacity caps × two synthetic post-target occupation lengths), plus 20 first-day readiness/blackout profiles. No claim of full fresh owner exporter or execution against real production. Normal tick assumption is optimistic, no actual confirmed paid jobs. In 90-minute profile:

| SOURCE active cap | 3m assumed occupation after target, missed /6144 | 15m assumed occupation, missed /6144 |
|---:|---:|---:|
| 12 | 40 | 72 |
| 16 | 0 | 40 |
| 20 | 0 | 8 |
| 24 | 0 | 0 |

At 24 cap, all four 35/60/90/105 minute leads model 0 nominal misses in both occupation scenarios, but 105 consumes more average waiting and cap blocking than 90. At 90 and 3m, full study mean prearm 83.20m, 506 capacity-blocked ticks; 105 gives 88.83m, 1,393 blocked ticks. At 15m tail these are 76.95m/1393 and 82.58m/1489. These counts include deferred future jobs, not missed flights. 24 is not actual available total GitHub concurrency; PRE/POST/CI need capacity too. Do not switch to 105, or choose a lower cap solely from nominal day-one results. Confirm current account runner limits separately. 

**Readiness is crucial.** Day-one 90m lookahead, 24 cap, 8 submissions per tick; same modeled single worst-aligned 60m blackout. All available early/120m gives zero misses; if that day's signed requests become available 60m before first physical request, 4 missed; 30m gives 12; 20m gives 16. Without blackout zero under these readiness assumptions. Model assumes all day packets become available together, not actual approval/signing timing. Earlier scientific draw window is already up to 72h before service, with >24h45m strict lead, so use the existing legitimate prospective timing; no redraw or new amendment. For first nominal request November20 23:45Z/15:45 PST, the candidate 90m prearm begins 22:15Z/14:15 PST. To obtain full advantage on first wave, aim to finish actual release authorization, existing draw, preparation and signed registry by then; a 2h advance readiness target is 21:45Z/13:45 PST, a planning aim not another mandatory freeze gate. Original strict 15:10 PST cutoff remains; waiting until it leaves only 35 minutes before first request. 4h collection plus ~1h readiness and <1h drain can geometrically fit one 6h job, but 6h collection shapes cannot; present 30m chained sessions are not a 5h deployed coordinator. No additional controller job, cloud service or scope extension introduced.

Actual new executable commit d7a33a19f06bdbcdf0097c0693d77d73342dfde1/tree 66240b3587ce2e3a1aa047e797fa5875191aef89. Focused **real disposable PG16 run 44034686480/job 133874607250, 28/28 tests:** 18 release admission/regression, 5 prearm clock, 5 real V0080 DB tests. Separate source guard 44034686431/job 133874607225 18/18 (overlapping suite; not added as separate unique tests). 13/14 workflow checks green at this read; V3.9 Offline Safety 44034686514. No actual paid or production DB calls. Current scope re-pin helper blob 8152b518575bcb7bb0946deae9cae4ef304158b5, SHA256 ce00c9588e3caa65bc3a8ec0f265359f2409f1e20bec0c9996d51cc3954fa8b1, existing test blob unchanged; no updated helper native rerun in this continuation. Rights inbox narrowly read-only searched after Nov14, no matching new inbound response; no email sent or modified. No provider account change, actual scheduled primary run still not observed.

Reconstructed updated source inventory from verified archived 2,165 rows and the existing 34+9 changed-file deltas, reproducing both prior source inventory digests exactly, then independently computed Git blob and raw SHA256 for two new exact files. [Two-file delta](review-tools/2026-11-16_parallel_prearm_source_delta_REVIEW_ONLY.txt) SHA256 c198e66225fe2c20390563cf0eb78920931843c86218e73dbdfe397ba6f70e3a. New 2,176-row source inventory SHA256 f49137b75935234f8b44ed3ae8085e1bdb6838f635bf52c2886d321bfe9be3a0. [Unsigned review manifest](planning/2026-11-16_parallel_prearm_release_manifest_REVIEW_ONLY.json) SHA256 3bdbd05ad23309c54e5ded68c85e084b10d0284e6befe2b5f1491fd4583d1fd1, exact Git blob b2c2409231655f4e6173845bb5f63b2131befa5b. Config/calendar/seed unchanged. Final exact main exporter, genuine scientific/rights disposition and signed AUTH still required; no pretend approval or new stage. 
