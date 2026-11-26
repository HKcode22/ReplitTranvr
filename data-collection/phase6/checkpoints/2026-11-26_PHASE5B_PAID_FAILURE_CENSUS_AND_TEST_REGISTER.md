# 2026-11-26 — paid-launch failure census and permanent T register

Scope: main workflow runs created from 2026-11-23T08:00:00Z (Nov23 Pacific) through live Nov26 snapshot, status=failure, two API pages. 131 failed runs; not 131 paid calls or 131 independent root causes. Groups: SOURCE 104 (9c9cddb1:16, 9fee7360:64, b4c6c283:4, 95e9130f:20), direct recovery 10, heartbeat 9, PRE/T24 5, SOURCE queue/prepare 3. Exact prior 5936e6d focused diagnostics 45802244722 passed, 41/42 success and full offline 45802245277 running at readback. Prior F032/F033 tests passed. No main/relay update, no paid calls, no production mutations.

## Verified job log examples and existing decisions

| Run | Actual job evidence | Disposition |
|---|---|---|
| 45293307564 | Missing budget flag and separate approval/root HOLD | F010/I008; restored flags per existing checkpoint; Day1 loss remains |
| 45339488814 | Parent dispatch ACKs then rolling session ACK readback unavailable | F007/F008; no replay, I006 |
| 45379813331 | predecessor archive download HOLD | F007/F008; I006 |
| 45429790971 | history response incomplete HOLD | F007/I006; no replay |
| 45363863638 | V0082 extra frozen ledger/raw provider privilege rejection | F012/F013 related privilege family; existing actual role tests, verify exact earlier decision; no broader grants |
| 45532068606, 45558508190 | lane preflight before paid GET; opaque local role HOLD | F014; Nov24 checkpoint identifies stale immutable policy SHA versus executable SHA and missing detached allowlist; sampled earliest/latest of 64-run group, not every job inspected |
| 45527297282, 45435367814 | generic outer SOURCE child HOLD | F003/F017; exact inner cause unavailable in these logs |
| 45563423973 | HTTP_OK then generic hold | F017; exact HTTP/body or persistence cause unproved |
| 45693817491, 45725595482 | HTTP_OK plus FIDS_BODY_UNAVAILABLE | F017; old HTTP_OK includes 204/205, no valid body and no fabricated empty list |
| 45711844783 | generic final HOLD; earlier checkpoint identifies HTTP_RATE_LIMIT | F016/I012; do not infer replay or actual billing |
| 45573408013, 45562151833, 45559684020 | heartbeat NEED_ATTENTION, stale EARLY_DRAW observation | F007/F009; distinguish cadence warning from actual missing data |
| 45527223819, 45521771797 | native POST producer redacted HOLD | F011/F013 or F021 diagnostic family; exact underlying cause unknown from these logs, no replay |
| 45744508970 | heartbeat read-only history step exit 2 | F009; exact current branch pause handling prior repair |
| 45762925573 | later PRE redacted NO_REPLAY | F021; precise historical exception unavailable; new stage/category diagnostics on branch |

Reviewed 20 representative failed-run job logs (5+5+5+5), plus prior dated root-cause checkpoints; census enumerates all 131 runs but not exhaustive log-by-log inspection. Historical source body/rate incident checkpoint Nov25 15:49 documents 9 body + 4 rate at that time. No inference that all 20 failed 95e9130f runs share one cause. A preflight fail is not necessarily a provider call; reservation is not billing. Original cutoff losses are irreversible.

## Bulk changes

- Added T001–T024 stable test scenarios with F/I/C links, real test/workflow paths and explicit incomplete end-to-end acceptance. Extended register validation to T IDs, all F coverage and actual path checks. AGENTS requires exact evidence before closure.
- I030: existing private SOURCE wrapper discarded detailed stage on every failure. Added fixed, redacted stage/SQL-category metadata for initial admission, restricted reader connect/role, signed index/route/query, close, existing child admission/subprocess and cleanup; preserves all existing holds, no replay, no raw strings or provider payload. Regression tests added. Not proof of historical root cause; future production failure evidence becomes more precise.
- I029 independent conditional reader focused CI passed on prior exact SHA, but live authority/issuer and POST/preservation integration remain open. No policy/retention/calendar changes or closed gate reopening. New exact CI required before merge review.
