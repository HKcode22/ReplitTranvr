# Phase 6 launch incident postmortem and testing contract — 2026-11-23 PST / 2026-11-24 UTC

Status: actual failed launch; normal paid parents/rolling paused following H. No completed paid acquisition receipt. Not a new gate register, no scope expansion. Owner and future AI agents must read this before proposing another activation. Source of truth: frozen main c8e065d665ccacb6d2575070e94c5500b7583044, relay c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed, original signed calendar and manifest. Do not repeat owner commands A–H.

## Actual event chronology (PST)
| Local time | Evidence | Actual disposition |
|---|---|---|
| Nov23 3:08–3:15 PM | original first-day draw deadline | Day1 draw absent; no retrospective selection |
| 3:58 PM | [45293307564](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564) | Direct admission failed, before POST, no artifacts |
| 4:15 PM | [45295746205](https://github.com/HKcode22/ReplitTranvr/actions/runs/45295746205) | Day2 real four-site early draw committed, no provider |
| 4:35 PM | [45298328334](https://github.com/HKcode22/ReplitTranvr/actions/runs/45298328334) | Nonpaid prep no eligible future day, no write |
| 4:58 PM | [45301377341](https://github.com/HKcode22/ReplitTranvr/actions/runs/45301377341) | Actual PRE actor-only readiness success; F checker misread masked PG***6 step text |
| 5:00:52 PM | [owner restart](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7118665193) | Configuration enabled, NOT collection proof |
| 5:08 PM | [45302763595](https://github.com/HKcode22/ReplitTranvr/actions/runs/45302763595) | Direct admission failed before POST, zero artifacts |
| 5:45 PM / 5:47 PM | [45307333953](https://github.com/HKcode22/ReplitTranvr/actions/runs/45307333953), [45307652365](https://github.com/HKcode22/ReplitTranvr/actions/runs/45307652365) | T24/later PRE initial admission failed before DB/dependencies |
| 7:03 PM | [45316823576](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45316823576) | Audit older 046d SHA; one identity HOLD, 11 ACK-only; actual PRIMARY pulse on c5 passed, lease current |
| 7:28 PM | [45319734667](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45319734667) | Green relay DEFER_DIRECT_PRIOR_ATTEMPT_REVIEW_NO_REPLAY, not a dispatch |
| 7:43 PM | [45321496617](https://github.com/HKcode22/ReplitTranvr/actions/runs/45321496617) | G PRE_STOP-only repair insufficient; second T24 gate failure; paid pause attempted |
| 8:00:25 PM | H owner DB receipt | actual primary PG16 read-only auth=1 cost=1 SOURCE=0 REST=0 STOP=0 D1=0 D2=4 D2 index=0; V0108 no due/STOP |
| 8:00:29–45 PM | H owner receipt | 16 known protected literal settings written; no reissue needed |
| 8:01 PM | [45323393757](https://github.com/HKcode22/ReplitTranvr/actions/runs/45323393757/job/138207021880) | actual T24 shell admission PASS, npm PASS, runtime fails HOLD_P6_CURRENT_T24_REDACTED_NO_REPLAY; all later H steps not executed, paid pause attempted |
| latest observed | [retention 45322139110](https://github.com/HKcode22/ReplitTranvr/actions/runs/45322139110) | retention success; rolling skipped 45323108854 before H |

Do not infer H's runtime error is a stale secret, TLS or code pin: original worker catches every exception and discards specific code. Candidate possibilities: protected resolver policy/role/TLS, executable lineage, current scope, trust policy, T24 lane bound, restricted reader/witness URLs or DB read. Need actual sanitized predicate evidence. No provider in this job by design; do not claim zero post-H DB writes without fresh readback.

## Why tests did not catch this (evidence, not blame)
1. Unit/CI fixture values were manufactured to satisfy admission. Actual secret presence census was incorrectly treated as value equality. The 31 canonical value readback checked selected policy/code material and global STOP defaults, not every actual worker's effective environment.
2. PRE actor-only workflow tested role/readiness, not the T24 current scheduler's full workflow env, exact CLI entrypoint and signed calendar. Existing T24 worker tests explicitly expect incomplete fixture admission to reject (PROTECTED_CUSTODY_AND_ENROLLMENT), not a fully commissioned positive startup. See tests/phase6_private_current_t24_worker_v39.test.mjs.
3. No end-to-end activation test with actual effective configuration and nonpaid current scheduler before paid enable. G13 and F success markers were configuration acknowledgments, not live root execution. Root admission happens before its terminal receipt try/catch.
4. Over-redacted logs: generic direct admission OR condition; T24 shell test exits without predicate; outer T24 catch discards reason. GitHub masks short values, including parts of step names (PG16 -> PG***6); exact rendered log name comparison caused false HOLD.
5. Global negative-history scan in direct controller and global plan hold: any failed route can poison all rolling lanes; relay returns green DEFER. Native schedule gaps can coexist with successful external clock. Failure domains were not isolated.
6. Old audit SHA 046d vs actual relay c5: clock audit config drift after exact code transition. It did not stop actual PRIMARY pulses.

## Required regression improvements (not additional release gates)
- Positive full startup fixture through actual workflow environment + worker admission + current empty signed registry/no-due path. Add mutation matrix for every required literal, code pin, role, TLS URL mode, signed policy and missing/expired day.
- Test real YAML shell blocks, not a duplicate simplified function. Include scheduled vs manual event, all expected effective scopes, named failure checks. No real secret values in CI.
- Run actual protected no-provider preflight for the same T24, later, enrollment, watchdog, daily prep, SOURCE/POST parent admission in advance of first acquisition; require executed job+actual meaningful receipt, not just green status. Distinct role preflight remains complementary. Preflight must be read-only or existing bounded nonpaid action; no synthetic provider response or DB insert.
- Report bounded code-owned diagnostic tokens, no URLs/secret values/payloads. Stage marker before each potentially failing action. Accept exact metadata identities and known masking aliases. Test errors with injected sensitive strings.
- Controller tests: pre-POST known-safe admission failure, no-side-effect nonpaid failure, real unknown dispatch, lost ACK, duplicate, delayed native schedule, expired horizon, missing Day1, Day2 index independent, partial wave. Allow bounded recovery of independent nonpaid lane; keep quarantine for paid/unknown/retention or unresolved DB STOP. Do not auto-advance epoch to forget a failure.
- One owner authorization for existing immutable policy; reconcile only known literal settings together while paid parents paused; no repeated owner scripts if already successful. Test effective values in runner before enabling. Prefer one operational dashboard/checkpoint from actual receipts.
- CI green means regression tests passed, not actual protected-runtime readiness. Distinguish workflow runtime red from PR CI. #966 revision 3d5a78f had 11/11 green; #965 revision 891823b4 6/6 green. Neither deployed.

## Relaxed operational policy within existing science
Use actual signed due calendar and bounded per-lane scheduling. Do not require missing earlier query placeholders to satisfy budget: actual V0093 COST_UPPER_BOUND confirmed. Preserve full planned denominator and honest missingness. Prepare Day2 independently now if eligible, otherwise defer until actual policy lookahead. Retention, early selection, daily preparation must not depend on unrelated T24 runtime health. Nonpaid missed opportunities may be skipped without globally stopping unrelated nonpaid work. Implement lane isolation in reviewed successor, not uncontrolled ignoring of errors. Keep 1900 physical UTC daily cap, 36740 study approval, 1000 Alert floor, real acquisition cutoffs, same source/witness separation, signed bytes, actual label provenance and retention. Do not authorize new missing-T24 protocol merely by setting a flag. No fake observation, backdating, speculative site replacement, duplicate paid replay, silent epoch reset or new DB/cron service.

## Calendar loss and next priorities
Frozen source-day-01.json: 64 T24 templates Nov23 15:45–19:30 PST; all elapsed, no actual original attempt observed. This is missing acquisition opportunities, not count of flights. 64 T6 templates Nov24 09:45–13:30 PST and 64 T90 14:15–18:00 PST remain prospective at this checkpoint, but Day1 late-draw authorization and V0079 admission still require separate reviewed implementation. Draft #965 tested candidate only; standalone later without T24 not signed. Do not imply T6/T90 safe. Day2 source-day-02.json: 64 T24 templates Nov24 19:45–23:30 PST; conservative preparation check by 16:45 PST; Day2 draw four sites already committed, index absent at H. Day2 T6 Wed Nov25 13:45–17:30, T90 18:15–22:00 PST. Protect Day2 independently. Do not reopen gates 1–8. No paid restart until actual worker/controller readiness or a separately approved scoped plan with evidenced safe lane isolation. 
