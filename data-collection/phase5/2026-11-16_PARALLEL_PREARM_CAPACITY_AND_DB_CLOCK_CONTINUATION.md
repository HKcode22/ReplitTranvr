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
