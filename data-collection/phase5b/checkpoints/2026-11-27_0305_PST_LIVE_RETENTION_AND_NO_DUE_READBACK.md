# 2026-11-27 03:05 PST — current retention and no-due acquisition audit

Evidence snapshot: 2026-11-27T11:05:28Z. This is a read-only production/runtime and exact-CI review. It does not promote candidate fixes to production or widen scientific scope.

## Repository instructions and prior decisions

The current owner instructions were reread from `AGENTS.md` and `replit.md`: Replit AI Agent remains prohibited; use owner-operated Shell only when needed; preserve active processes; do not perform paid provider actions, production database mutations or Git ref changes except where specifically authorized. Preserve the existing local branch and user-created untracked Phase7 work.

Earlier related chats and current issue #413 already established these decisions; this checkpoint does not reopen them:
- The second exact #980 owner helper run held `QUIET_AND_GAP / ACTIVE_NO_CANCEL`; do not run it again while source work is active.
- Day2's 52 expired originals and 4,902 member observations are historical acquisition metadata, not recoverable flight-level training data. No backfill or retention extension.
- Acknowledged/green no-due work is not positive PRE, Packet B, POST or physical-label evidence.
- Keep the signed scope, identity, cutoff, source-rights, budget/STOP, Amendment E, C+D, Packet A/B and Plan f.8/V3.9 boundaries unchanged.

## Exact main, PRs and CI

- Production main remains `2b9cb404da863aede54d9069e440ff32bcf6d00e`; relay main remains `2d96b22345908aa4334335aa899aec71b2fec2cb`.
- #980 remains open/draft at `c4408c621a84a2549355d935cca7333c5527d3c2`; its 26 required workflow paths passed. Diagnostics list 52 check runs: 32 success and 20 skipped, with no failed check. No deployment or merge occurred.
- #981 is an open/draft stack at `462054186d795d538e0d73f01e1d6d4a26956b70`. Exact run `45985616917` passed both jobs: fixed-metadata-only (`140460343998`) and restricted conditional-query PG16 (`140460343586`). This verifies I121-I123 / T115-T117 candidate and register tests on that exact head. This checkpoint changes docs only; its resulting head requires its own exact CI.
- Current latest heads do not show failing PR CI. The recorded relay audit failure `45970968669` remains the already-documented F034 monitoring distinction; subsequent primary/rolling relay wakes succeeded, and that audit is not reopened here.

## Latest primary retention and relay evidence

Current-main target run `45987416536` completed both jobs successfully:
- FIDS/private job `140466490165`: 64 live originals before and after, zero eligible or hard-due originals, zero unbound originals, no unresolved deletion STOP, zero provider calls, zero database writes and `databaseWritesPossible=false`. Private expiry had zero due packets, indexes, expired heads, foreign due records or due operational metadata.
- Phase7 job `140466490583`: zero live/due links, bundles or fragments, zero deletions, `writerActorVerified=true`, and zero provider calls.
- `backupOrPitrVerified=false`; `completeRetentionDeploymentVerified=false`. The 64-live count is global operational inventory, not study attribution or a positive PRE.

Primary relay run `45987383815` dispatched target `45987416536` and verified its run identity while target status was still `queued`; the target later completed successfully. Relay evidence does not certify collection.

Rolling relay `45986537891` completed its independent wake job and acknowledged six safe lanes with zero provider calls and zero database writes. It reports `INDEPENDENT_WAKE_COMPLETE_NOT_COLLECTION_PROOF`.

## Latest scheduled data path results

All runs below are on current production main `2b9cb404da863aede54d9069e440ff32bcf6d00e` and completed successfully without a positive study write:

| Lane | Run | Actual result |
|---|---:|---|
| Daily preparation | 45986569418 | `NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE`; no eligible/missed/late day; next Day5 draw count 0, genesis absent |
| Native T24 | 45986565826 | `NO_DUE_CURRENT_PRIVATE_T24_PACKETS` |
| PRE tick | 45986566001 | `NO_DUE_CURRENT_PRIVATE_LATER_SHARDS` |
| Source queue | 45986562468 | `NO_DUE_SOURCE_NO_DISPATCH`; 56 queries; parent made no paid GET or database write; this response does not certify full calendar coverage |
| Enrollment | 45986562492 | `NO_PROSPECTIVE_CURRENT_SIGNED_LATER_PACKETS` and `NO_DUE_T24_STUDY_DAYS` |
| Native POST | 45986562468 | `NO_PROSPECTIVE_NATIVE_POST_WINDOW` |

The 11:05Z Actions snapshot showed 12 active P5 SOURCE children, four each from the 10:19Z, 10:39Z and 10:49Z waves. Do not interrupt or replay them. The 09:07Z owner inventory still distinguishes 100 timely bindings, 52 expired Day2 originals / 4,902 observations, 48 live Day3 originals / 2,000 observations, zero cutoff-safe/linked PRE rows, and zero global durable Phase7 fragments/bundles/links (one policy). No positive PRE, Packet B, POST or same-leg physical label has since been established.

## Failure and component accounting

The binary family counts are unchanged: 12 narrowly evidenced families CLOSED, 45 NOT_CLOSED (10 exact-CI candidate fixes pending production, 33 partial/open, 2 historical losses). F009 remains closed only for its documented heartbeat/retention criterion; F035 remains closed only for its relay fixture/wake criterion. F022 remains closed. No IDs or existing closure labels changed.

All ten completion components remain not fully closed:

| Component | Current status |
|---|---|
| C001 Conditional PRE commissioning | Partial; candidate CI passed, but no protected actual commissioning or positive PRE |
| C002 Durable Packet B | Partial; no durable linked PRE/Packet B |
| C003 Actual POST outcome collection | Open; no positive actual POST |
| C004 Independent physical outcome verification | Open; no certified same-leg physical label |
| C005 Restricted database task execution | Partial; migrations/ACL verified, positive restricted production task not demonstrated |
| C006 SOURCE acquisition effectiveness | Open; active child runs do not establish positive bound acquisition |
| C007 Coordinated deployment | Existing #979 is live; #980 follow-on cutover and capture remain pending |
| C008 Coverage/leakage assessment | Partial; current study inventory has zero linked PRE/cutoff-safe rows |
| C009 Runtime reliability | Open; end-to-end reliability not demonstrated |
| C010 Scheduling/retention | Partial; current no-due checks succeeded, but full backup/PITR and complete retention deployment remain unverified |

## Safe next step

Day4 T24 begins at 11:45Z and runs through 15:30Z. Keep autonomous schedules, retention, all admitted work and pins unchanged. The existing #980 helper is usable only after natural drain and its fresh STOP, task, quiet and full 130-minute guard all pass. No new owner command, worker cancellation, paid replay, provider call, database write, merge, deployment or science-scope change occurred for this checkpoint.
