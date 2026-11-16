# November 16 — final commissioning ordering, first-seed BTS overlap and observed cadence risk

**Actual code milestone:** #841 6/6 exact-head workflows PASS, including [real disposable PG16 13/13](https://github.com/HKcode22/ReplitTranvr/actions/runs/43842771650) and [comprehensive offline safety](https://github.com/HKcode22/ReplitTranvr/actions/runs/43842772068). Squash merged `4dfbc758c8fb1596d6650f4ca071c607006605d5`. Compared both PR branches and merged main against common bases: #840 three changed files match exact blob identities, #841 four changed files match exact blob identities, and current main matched 4dfbc758 at the observation. No production stage, no provider call, no new runtime or role/migration.

## Actual first-seed review preparation, not approval

Downloaded actual prior CI artifact 14212961986, ZIP SHA256 `53ad64037ab06194e6f4d4e2f40e91e07e0d42cb0acc44ffabdc545c576a8ff5`; inner review-only.json SHA256 `a4f9229ea4454ca17301f2f2a518dfba1eda2c86f1c8bc55ceede13f8e70ca48`. Recomputed original four content hashes and full 2165-file source inventory digest. Exact base64 Git blob reads for the three #841 changed executable-scope paths independently hashed; old hashes matched original CI inventory. The #841 checkpoint doc is outside the executable manifest scope and not one of the manifest's binding documents. Updating the same 2165 rows (only three content hashes) gives review-only executable inventory SHA256 `1cf810022676e38c88d6964ee5aff8b046bbccf4397ab43a933866774259707d` and updated manifest content candidate SHA256 `20356b350b965373b2e5c8db072c6c2c81f07cd8f91fc34242b4ff007bceb66c`. This is a verified delta over actual prior inventory, not a complete new checkout re-enumeration/tree readback. Final existing compiler must independently rederive from actual stable main.

| Review field | Candidate scope |
|---|---|
| Calendar | Original 31 rows, seed, 20/5/6 day split unchanged; SHA256 45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c |
| Config | Prior candidate unchanged; SHA256 e348f15d824364361929ce4a9184eec469df4df34ecf8960f76c55f46af5c665 |
| Range evidence | Prior candidate unchanged; SHA256 cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3 |
| Timing evidence | Prior candidate unchanged; SHA256 88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5 |
| Proposed economics | 41,960 REST reserved across 47 dates/329 category rows, 3,000 possible future refill / 3,680 hypothetical Alert run ceiling, 46,468 net REST ceiling, 3,508 REST flexibility after floor; refill limit and actual exposure not proved |
| Still unset | Actual final authorization ID and reviewed predecessor set; separate human/scientific review, scope and rights approvals, no approved stage hash |

The private review package (supplied in chat, not committed to repo as a stage packet) is candidate metadata only and leaves both AUTH and predecessor fields NULL. No approved stage or AUTH bytes. Do not upload it as stage input. Exact main binding will be refreshed after any documentation/ledger merge.

**Critical ordering correction:** The existing exact-owner activation verifier is bound to a stage code SHA matching exact main; its authorization content hash excludes only codeSha40 to accommodate a final approval-ledger commit. A calendar insert binds code_sha to the original reviewed stage. Do not insert on current main and subsequently commit the independently approved AUTH token or change code, since the staged authority would then be pinned to stale main. Complete actual scoped review, resolve the immutable-ledger authorization conflict below through an independently reviewed Phase-6-only approval location, pin the genuinely approved exact AUTH bytes in the accepted location, commit prospective reviewed metadata day-plan files if required, then pin final stable main and compile canonical stage with that final code SHA. Calendar stage -> independent calendar-only readback -> independently approved V0093 stage -> exact full readback -> separate enable and paid dispatch. #841 is a verification/recovery path, not permission to pre-stage the wrong identity. No rewrite of already staged rows or dummy authorization. No new migration or approval gate added.

## Immutable historical ledger conflict — actual CI finding

The first #842 head appended two nonauthorizing RUN evidence entries to the relocated historical ledger. [Full safety run 43844951546](https://github.com/HKcode22/ReplitTranvr/actions/runs/43844951546) failed four tests, all caused by exact historical blob identity drift (459/460 original matches). 4,271 tests passed; four failed; 210 skipped. Restored the exact original ledger blob `d859a2794d423ec21542afe304d22344b7fccc14` from main, without altering the verifier, historical source catalog, or protection tests. New observations remain in the standalone evidence files in this PR. Corrected-head CI is required before merge.

This exposes a separate genuine prelaunch blocker: exact-main `scripts/v39_paid_guard_v39.ts` reads both predecessor IDs and approved AUTH artifact hashes only from that same immutable historical ledger. The Phase 6 enable owner calls `verifyAuthFile(authPath, "Phase 6 (separate authorization)")`. A fresh approval cannot simply be appended to that file without violating historical preservation. Design requirement for the next narrowly scoped code correction: preserve the original historical blob; recognize a reviewed Phase-6-only append location with strict exact-artifact approval and predecessor checks, without widening older paid gates, accepting arbitrary files, or creating approval tokens. Test fail-closed absent/invalid/foreign-phase approval and exact positive fixture offline; no actual approval is supplied by this evidence PR. Do not stage under a candidate code pin until this is implemented, reviewed, and final release authorization has been bound. A later code change will require rederivation of the executable manifest candidate, so the after-841 review package and helper remain historical preparation only.

## Actual BTS reference overlap

Downloaded preserved historical BTS artifact 14198898471, outer SHA256 `5440085391a80db26e44b060472ab4e69b63263549a8b38af0252dba670d37a0` (41,376,820 bytes), normalized gzip SHA256 `406587471b44794ea1f574fad2400fc0bafdd85f6898faa8f41b6706294a4614`. Scanned all 608,389 actual August 2026 records; 11,313 canceled, 597,734 reported signed gate delay including canceled. Original official ZIP was not downloaded/reverified. All historical availability markers remain October 27; no retrospective PRE or ADB link. [Aggregate exact bytes](evidence/2026-11-16_bts_first_seed_reference_overlap_14198898471.json), SHA256 `6dd4706e0cd105255fc7f6cb15993bc5fd70fa31b43ee8d3dd1badd88cd59ab8`. Reproducible local Python audit script SHA256 `419756d3afe2e92c880aaec50e9c2d31939fabdf47c728bc738802b306b59e4f`, supplied with aggregate in chat. No individual flight keys exported.

| Fixed ICAO | BTS IATA | August scheduled rows | Noncanceled clock-consistent signed gate-delay candidate labels | Historical key collision groups |
|---|---|---:|---:|---:|
| KDEC | DEC | 53 | 51 | 0 |
| KBUF | BUF | 1867 | 1802 | 0 |
| TJSJ | SJU | 3005 | 2940 | 0 |
| Total | | 4925 | 4793 | 0 |

A historical key requires service date, reporting airline, numeric flight number, origin/destination IATA, valid scheduled gate HHmm. Check collisions against ALL rows including canceled, not only label subset. Label requires noncancelled, signed gate delay, valid scheduled/actual gate clocks, modulo-day consistency; excludes 2400 rather than guessing its date. In this selected historical subset, exact candidate key uniqueness does not imply an independently matched AeroDataBox physical operated leg or operating/reporting airline alias. Preserve unknown for unmatched or multiple candidates. A later BTS publication could furnish a delayed independent label ONLY for an eligible prospectively linked US reporting-carrier subset, subject to lawful linked custody until availability. Cannot replace global actual gate-out label.

Actual calendar geometry: 124 airport-day slots across 512 airport-slot-hours (128 active parent hours × four), 40 paired slots / 176 hours, 84 ordinary slots / 336 hours. The three fixed potential BTS sites occupy six airport-day slots / 24 hours (4.6875% of total slot-hours, NOT flight coverage). Ten as-yet-unselected ordinary North America slots occupy 40 hours. A conditional scenario if all ten are BTS-eligible gives 16 slots / 64 hours (12.5% of exposure); not a guarantee, not a global upper bound on unknown sites outside North America, and reporting-carrier domestic scope is narrower than airport coverage.

Use prospective local weekday and wall-clock analogs for actual August calendar windows (IANA America/Chicago, America/New_York, America/Puerto_Rico), including inactive split gaps and no incomplete month windows. No conversion of historical flight labels to UTC or assumption August traffic predicts November:

| Day | Site | Historical analogs | Eligible historical gate labels across analogs |
|---:|---|---:|---:|
| 1 | KDEC | 5 | 5 |
| 2 | TJSJ | 5 | 23 |
| 3 | KBUF | 4 | 47 |
| 7 | KDEC | 4 | 4 |
| 8 | TJSJ | 5 | 16 |
| 9 | KBUF | 4 | 46 |

KDEC comparable local windows have only one historical record per analog. Note pair 1 local weekday class differs at KDEC (Saturday Nov21 vs Friday Dec4) even though both parent UTC starts are weekend class under the original solver. Do not silently claim local weekday balance, redraw or change treatment based on this historical analysis; preserve original UTC design, report airport-local weekday as context/confounder, cluster by parent day/pair and disclose limited comparison. No new amendment. No prospective matches or actual prospective gate-out labels.

## Observed cadence and exact-calendar blackout sensitivity

Actual [read-only heartbeat 43821884521](https://github.com/HKcode22/ReplitTranvr/actions/runs/43821884521), job 133146603674, observed Nov16 07:10:22.639Z. All 14 sampled SOURCE arrival gaps exceeded expected max; median 349.9 min, maximum 492 min, all latest 15 SOURCE jobs skipped under gated STOP. These are observed workflow-run history gaps, not measured paid worker timing or missing source flights. Existing stored parent admission verified in exact main: 15–35 min before nominal planned request, 8 submissions per tick/24 in-flight.

Independent sensitivity uses all exact 6,144 nominal request timestamps from original calendar and four slots/horizon, with 192 on day 1. One open hypothetical parent-start blackout; endpoints are available, no other parent starts inside. Count templates whose complete 20-minute admissible parent-start interval falls inside it. Enumerate worst alignment; no capacity saturation, already-submitted children, signer readiness or provider latency model. [Exact result](evidence/2026-11-16_actual_first_seed_source_gap_sensitivity.json), SHA256 `976a19fd07d618e27586d6c71b663118f3e26013b3b43a4c4c575d914086d2f2`. Local script SHA256 `a7eb60164474339d846aa74e134870fe4e6b1a753fbe4bc488e829bb4da674cf`.

| Hypothetical single gap | Max completely uncovered templates anywhere | Day 1 max completely uncovered |
|---:|---:|---:|
| 10 / 20 min | 0 | 0 |
| 30 min | 8 | 4 |
| 60 min | 24 | 12 |
| 120 min | 52 | 28 |
| 349.9 min (observed median length) | 112 | 80 |
| 492 min (observed max length) | 160 | 120 |

A worst-aligned 492-minute gap on day 1 could fully remove all 64 T6 planned requests and 56 T90 requests, i.e. 120 of 192 request templates. This is a deterministic vulnerability illustration, not a forecast of actual missing observations. No new model of GH failure probabilities. Zero completely uncovered at <=20 min alone does not prove successful dispatch or PRE. Keep late PRE forbidden. The actual eight-runner clock and three-hop nonpaid rehearsal passed; do not repeat them. They do not demonstrate continuous parent-start coverage during a full 4–6h horizon stream. Before unattended paid collection, the existing rolling controller path must show continuity and actual approved bounded custody/settlement (not native cron alone), or explicitly restrict launch scope and report missed/censored requests. No new optional controller architecture or automatic secret change here. This is a substantive operational risk, independent of legal scope.

## Release position

Preserve A/B/C/D1/D2/E, C+D, original dates/seed, existing database and restricted roles, 31/47/329 geometry. No email searches, repeat quota check, new paid requests, actual DB writes, refill, deletion, key changes, or new production workflow dispatch. No new gate-out claim; rights for a long-lived linked corpus still unresolved. User's broad approval acknowledged, but does not substitute for the explicitly separately reviewed actual release artifact or provider rights. Final authorizing review and production staging remain HOLD; Phase6 paid NO-GO. November20 first T24 planned Friday 15:45 Pacific; first early draw deadline Friday 15:15 Pacific. Do not silently shift past cutoffs.
