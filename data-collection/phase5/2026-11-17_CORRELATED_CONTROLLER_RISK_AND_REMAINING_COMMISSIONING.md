# Nov17 — correlated controller creation gaps and the remaining commissioning decision (REVIEW ONLY)

No new gate, architecture, migration, role, provider expenditure, production mutation, final AUTH or paid activation. Keep canonical f.8 and A/B/C/D1/D2/E, the selected legacy account, 31-day source calendar and 41,960-unit planning reserve. Production main independently read as de15816bccb867dc17dcd396f8bedec66960e115 at the start of this review. PR #859 merged; exact verify-only run 44060075864/job 133959368916 success. PR #861 was closed unmerged after actual stable-main compiler run 44061622792; candidate manifest 88977798241abdefa3531384a38a341897b062746147c3841743996a75b99c78. These are review identities, not final AUTH. Do not repeat installations, re-pin or earlier owner commands.

## 1. New measured common scheduling gaps

Repository-wide GET Actions schedule query returned 258 unique records across 100/100/58 rows, through 2026-11-17T08:59:57Z; the latest actual scheduled primary expiry observed remains 44042985387 (old f53a36a main, successful). Post-merge 44060075864 is manual VERIFY, not recurrence. No claim of a newly scheduled run on current main. Workflow-specific listing not available through the connection; repository-wide filtered query succeeded.

[Exact selected public run IDs/timestamps and results](evidence/2026-11-17_correlated_controller_creation_gap_REVIEW_ONLY.json) preserve one preceding, three in-window and one succeeding creation per eight lanes. Window 2026-11-16 00:00Z inclusive to Nov17 00:00Z exclusive, one sample per minute. All six core lanes (SOURCE parent, PRE, T24, watchdog, daily preparation, enrollment) were STOP-default skipped; skipped runs count as creation events only, not operational success. Supplemental heartbeat and retention sentinel are included in the eight-lane comparison, not interchangeable workers.

| Age threshold | All six stale / 1440 | All eight stale / 1440 | Longest continuous six-lane staleness |
|---|---:|---:|---:|
| 60 min | 826 | 743 | 3h42m58s |
| 90 min | 646 | 559 | 3h12m58s |
| 120 min | 466 | 397 | 2h42m58s |
| 240 min | 43 | 36 | 42m58s |

The longest in-window pooled creation gap is 4h42m58s between T24 43859089488 at 11:35:29Z and PRE 43906024996 at 16:18:27Z. All six stale at the 90-min threshold is 44.86% of minute samples. Independent interval-union arithmetic reproduced all eight grid counts, and exact continuous-time union yielded 38,793 seconds of six-lane age >90min (10h46m33s). The date is UTC, not a complete Pacific day. This is an actual one-day common-inactivity observation, not a statistical independence test, live execution delay, hard future maximum, flight loss or causal diagnosis.

Reproducible method (the evidence JSON has all boundary rows):
```python
import json
from datetime import datetime, timedelta
with open("2026-11-17_correlated_controller_creation_gap_REVIEW_ONLY.json") as f:
    d = json.load(f)
parse = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
start = parse(d["windowStartUtc"])
for keys, expected in [(d["primaryLanes"],d["six"]),(list(d["runRecords"]),d["eight"])]:
    for r in expected:
        threshold = timedelta(minutes=r["thresholdMinutes"])
        times = {k: sorted(parse(x["created"]) for x in d["runRecords"][k]) for k in keys}
        stale = sum(all(t-max(x for x in times[k] if x<=t)>threshold for k in keys)
                    for t in (start+timedelta(minutes=i) for i in range(1440)))
        assert stale == r["allStaleSamples"] == r["independentUnionSamples"]
```
The actual calculation used JS grid scan and independent union of inclusive integer sample intervals; this equivalent Python snippet is supplied for reproducibility, not claimed as separately executed.

## 2. Operational acceptance versus retention

For collection, missing a signed source/PRE cutoff means preserve the denominator and reason (not backdate or catch up with a paid late request). The original 90-minute prearm window, bounded eight submissions/tick and 24 in-flight, actual 3-hop handoff experiment, and C+D durable queue remain useful. But the one-day pooled gap indicates parallel cron redundancy alone is not an independent availability guarantee. Keep the existing optional rolling root OFF unless its distinct prerequisites/operational choice are actually accepted; no new scheduler or automatic increase of caps. No need to repeat the prior successful three-hop experiment just for another receipt.

For retention, a missed physical-content deletion deadline is different from a missed flight observation. Existing V0103 SQL admits primary cleanup at min(raw persisted +24h, source_expires_at_utc); the scheduled workflow has 9min timeout and exact main pin. Existing JS limits one execution to 32 originals per batch times 8, at most 256, not 256 flight rows or a measured sustained rate. Existing separate blob sentinel's maximum historical creation gap of 634m47s is only an illustrative stress input for this primary lane, which has one observed scheduled execution. Under ideal prompt processing and matched raw/source origin clocks, a hypothetical 12h access deadline plus 10h34m47s gap plus 9min execution budget is 22h43m47s, leaving 1h16m13s against 24h. A hypothetical 14h access deadline overruns by 43m47s. These are arithmetic scenarios not deletion guarantees: source expiry can be based on another clock, there can be runner startup, lock/commit and retry delays, and observed gap is not a maximum. Existing 23h access limit and T24 linkage incompatibility remain unchanged. No TTL change proposed as approved.

Independent new full-calendar retention-backlog check was attempted but Code Mode hit its maximum tool-call limit before returning the 31-file result. Do not claim it completed. From the prior verified maximum eight simultaneous templates and 15-min nominal grid alone, a conservative bound in 634m47s inclusive is 43 grid instants * 8 = 344 templates, greater than the 256-original cap; this loose bound does NOT prove an actual overload. The exact full-calendar sliding-window calculation plus other capture modes, expiry clocks and lock/throughput remains a useful targeted check, not another release gate. A second run or bigger batch cannot ensure deletion during platform-wide outage. No production adjustment or additional owner action now.

## 3. Exact final commissioning sequence (reuse)

- Keep current main and already-enabled retention pin stable. Candidate review JSON 80633cef17f8f821d905c5f3619a8d621de00f7ee2c96e76d2f00ff36ba1580a, 2,177 executable inventory files; old review remains actual success.
- Source-use rights and independent actual gate-out qualification are unresolved (#300 and existing scientific decision sheet). A narrow, recent incoming provider-sender check returned no matching new message; not proof there is no response by any route or permission, and do not repeat prior inbox searches or contact vendor without direction. No source rights asserted. Preserve one canonical E: T6 conditional continuous actual gate-out, paired T90, T24 comparator separately not estimable when lawful linkage missing, separate airborne ETA.
- Existing inert calendar workflow has seven stage-specific secret references, cost ten; same existing restricted logins, distinct steps. Calendar admission requires exact protected code, approved review, canonical packet <=48000 bytes, disabled process, no provider credentials. Cost additionally requires separate cost and source-rights approvals. Readback is independent and owner-local. Existing code enforces these conditions; no fake hashes/flags, no stage write using a review-only candidate.
- Actual external decisions, five scoped evidence fields, final manifest/AUTH and stable code binding first; use existing B0062 31 calendar rows, V0093 47 UTC charge dates/329 category rows disabled, independent exact fresh readbacks and stored manifest before separate activation. Existing owner approval of ongoing engineering does not establish third-party rights or actual target qualification.
- Deadline remains Nov20 15:10 Pacific strict lead for original planned first nominal request Nov20 15:45 Pacific. If actual approvals/readbacks cannot fit, shift prospectively using original seed and reviewed procedure rather than backfill.

No main changes, provider calls, production writes, credential/variable updates, dispatch, deletion or final approval in this review. Documentation-only branch; do not merge it just to change the retention pin. Phase5 scientific FREEZE HOLD / Phase6 paid NO-GO.

## 4. Completed superseding full-calendar capacity check

The initially blocked bulk retrieval was recovered with four bounded read batches (8/8/8/7). All 31 exact main day files were actually retrieved, day identity, within-day key uniqueness and single-attempt/two-unit parameters checked; the observed timestamp counts were compressed to day starts and shape and reconstructed at quarter-hour resolution. 6,144 nominal templates, 1,516 distinct timestamps, max8 simultaneously. Independent sliding-window and exhaustive event-pair sums agree for all 13 tested windows. [Full source blob identities, compressed inputs and results](evidence/2026-11-17_primary_expiry_nominal_source_backlog_REVIEW_ONLY.json), committed 7213c02047daf9f30bae2f8dd16b5e6e96c1957f. No source bytes or real provider payloads needed. This supersedes the incomplete retrieval in §2; preserve it as failure history.

| Nominal eligibility accumulation interval (constant shift model) | Maximum source originals if all templates yield one | Slack below one run's 256 limit |
|---|---:|---:|
| 4h42m58s pooled gap | 100 | 156 |
| 9h50m19s SOURCE observed historical maximum gap | 192 | 64 |
| 10h34m47s other sentinel maximum gap | 204 | 52 |
| Same +9min | 204 | 52 |
| 12h | 228 | 28 |
| 15h | 256 | 0 |
| 24h | 256 | 0 |

The heaviest 10h34m47s nominal interval is Nov27 09:45 through 20:15Z. In the simplified single-attempt SOURCE-only model, 256 is sufficient by count for the observed stress interval; no demonstrated reason to enlarge batches or install anything new. This is not a throughput test or guaranteed capacity: extra FIDS originals, retries, varying expiry or persistence times, existing backlog, locks, failed commit/readback, scheduler startup and additional deletion surfaces are excluded. At 15/24h the nominal maximum itself exhausts the count ceiling. Retention time compliance remains unestablished even when counts fit. Do not alter TTLs or limits from this calculation alone.
