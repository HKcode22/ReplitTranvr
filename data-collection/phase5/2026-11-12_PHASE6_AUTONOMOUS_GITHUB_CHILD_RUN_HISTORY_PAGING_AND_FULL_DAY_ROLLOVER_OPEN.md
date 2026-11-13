# 2026-11-12 PST / 2026-11-13 UTC — Phase 6 autonomous SOURCE → PRE → POST dispatch: complete GitHub history and remaining 31-day rollover

**Source-of-truth main before patch:** `7439edf70ff1a549d54fe3be0cf3427680339a8e` (#620). **This is a new nonpaid code/test candidate**, not the real Phase6 GO, source acquisition or an observed live first flight. Owner Shell READ ONLY `neondb_owner` output confirms **0** in actual `adb_phase6_calendar_day`, `adb_phase6_authorization`, `phase5_fids_seven_rest_release_v39`, `phase5_fids_allowed_query_v39`, and **neither** of the two proposed restricted staging LOGINs exists yet. Reinstalling V0079–V0093 is unnecessary and prohibited.

## The specific real code safety/capacity issue

Four **existing** GitHub controllers before this patch each requested `per_page=100` workflow runs for the relevant 3-hour recent window:
- `scripts/v39_phase5_github_due_source_batch_child_dispatcher_v39.ts`: SOURCE signed day batch GET (paid only by separate exact child, not parent).
- `scripts/v39_phase5_t24_github_child_dispatcher_v39.ts`: T−24h original-bound PRE/V0081 witness.
- `scripts/v39_phase5_later_pre_signed_day_batch_dispatcher_v39.ts`: T−6h/T−90m reviewed signed day batch.
- `scripts/v39_phase5_future_post_github_child_dispatcher_v39.ts`: one V0083 separately approved POST one-shot REST GET.

Their independent planner guards rightly refuse histories above 100, rather than silently inventing an absence of a prior child run or replaying a possibly started paid request/PRE/POST. That guarantees safety but **a busy 31-day collector can stall when 101+ existing workflow runs occur within the lookback**. No evidence says 101 real Phase6 tasks exist today; this is a deterministic code-level capacity risk.

## New reused common pagination reader

[`phase5GithubCompleteWorkflowHistory_v39.ts`](../../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39.ts) replaces all four first-page-only GETs. The function:
1. Allows only the four exact existing workflow names on `api.github.com` for this exact repository, `workflow_dispatch` event, exactly `per_page=100`, and canonical UTC range of **24h maximum**. No other host, query, manual page override or unreviewed endpoint.
2. Fetches **up to five complete pages, at most 500 run IDs**, in order and verifies the API's `total_count` remains stable. Fail closed on missing/truncated page, duplicates, changed totals, malformed run status/name/timestamp, GitHub GET failure or 501+ runs. The 500 cap is an **operational conservative limit**, not a count of valid flights, provider calls or owner permissions; do not silently skip excess runs.
3. Preserves existing distinct GitHub child planners, signed registry, true restricted PostgreSQL due/roster checks, V0080 paid prearm and V0082/V0093 physical UTC spending ledgers. The parent still has **no AeroDataBox key**, SQL writes or provider calls, and never treats GitHub dispatch ACK as PRE/POST COMMIT.
4. Tests zero/one/150/500/501 runs, duplicate run IDs, changed page totals, partial pages, malformed fields and network failure with **pure mocked GitHub GET**. Existing dispatcher/POST/T24 tests must also stay green.

This is **not** an increased worker concurrency limit or 500 new paid requests. It simply avoids losing knowledge of older attempts when GitHub history spans more than one page. GitHub API visibility and eventual consistency remain concerns; PostgreSQL's irreversible reservation/queue guards are still the authoritative duplicate defense. No ambiguous HTTP POST retry is authorized.

## Complete 31-day unattended operation — still open, do not overclaim

The existing 31-parent-day B0062 calendar is unstaged. Per-day/source/later-PRE runners presently consume immutable **one-day** pinned `P5_SOURCE_BATCH_REGISTRY_FILE` + `P5_SOURCE_BATCH_RUN_DAY_INDEX`, `P5_LATER_PRE_BATCH_REGISTRY_FILE` + `P5_LATER_PRE_DAY_INDEX`, and POST currently **one** `P5_POST_FROZEN_PACKET_FILE`. None of the approved code can create genuine **future post-selection flight original/operating identities** before the actual prospective signed source GET. An operator cannot safely prewrite 31 days of per-flight source/POST packets because the 21 ordinary MID/REGIONAL sites are intentionally unknown until the approved early adaptive draw.

A true GO-ready unattended system therefore must separately demonstrate:
- Real 31 future B0062 calendar/treatment seeds and full actual physical UTC cost/Alert budget with independent rights review and disabled auth poststage readback; two distinct restricted writers must be owner-commissioned first, not guessed from code.
- Signed prospective day-index/registry **rollover** driven by DB-clock and already-frozen day/treatment, without silently swapping source/airport, including 10 paired/21 ordinary airport identities, genuine provider-original persistence, day-specific source packets and per-flight queue registration from V0091.
- Both T−24h independent V0081 witness + T−6h/T−90m (when eligible), bounded GitHub Actions capacity, no deadline guarantee, real missed/censored counters; multiple signed shards per day instead of treating 96 as the entire population.
- POST/receiver/unknown-ACK/STOP and legal source-rights checks automatically monitored, provenance-locked; actual monetary credits and Alert subscriptions have **separate** bounds. No automatic alternate paid provider or backfill.
- An end-to-end **disposable PG16** integration test for at least two day transitions and a real future one-flight canary **only after paid Phase6 GO**, with logged source original, source→queue, PRE witness, POST or honest missingness, budget, role and watchdog evidence. Do not demand paid PRE as a prerequisite for pre-GO approval.

## BTS clarification and later Phase7 durable storage

The **608,389-row official U.S. BTS Aug2026 historical-only** dataset **was not inserted into Neon** and must not contaminate the 31-day AeroDataBox prospective primary population. It was verified and saved as two GitHub Actions artifacts following [actual successful manual run #43370699269](https://github.com/HKcode22/ReplitTranvr/actions/runs/43370699269): source artifact `14012392021` and normalized `14012143096`, both expire `2027-02-11T05:14:20Z`. Underlying official ZIP SHA `203509350f574f81728ca51175a17360d0413aa990512f8e0c8f1342f5baf23a`, normalized gzip CSV SHA `406587471b44794ea1f574fad2400fc0bafdd85f6898faa8f41b6706294a4614`, preserved, and check step successful. The archive is a **90-day temporary copy**; Phase7 durable storage means a distinct persistent, access-controlled, backed-up object/file dataset and provenance manifest (e.g. user-chosen private object store), not forcing old BTS data into V0079 source-original/flight_snapshots. Any ADB derived/original retention must independently satisfy provider rights.

**Verdict:** safer, scalable bounded GH duplicate-history checks can be proven now. Phase5 scientific FREEZE **HOLD**, Phase6 paid GO **NO**; not yet fully unattended 31-day dataflow.
