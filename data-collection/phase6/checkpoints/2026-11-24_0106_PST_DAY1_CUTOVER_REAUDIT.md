# Day 1 cutover reaudit — 2026-11-24 01:06 PST

This supersedes the stale draft/unrecovered-policy statements. Keep the production main SHA unchanged for evidence-only documentation.

| Item | Evidence | Disposition |
|---|---|---|
| Recovery merge | PR #965 merged 09:00:56Z; main 9c9cddb1aaeb04934d94af2937ee158e6d991f6c | Closed; no remerge |
| Policy recovery | 45360772942, encrypted artifact 14903973500, owner decrypt receipt comment 7126834015 | Closed; no replay |
| Repository effective configuration | 45361485190 job 138332375708: P6_DAY1_REPOSITORY_31_CANONICAL_AND_POST_LINKS_VERIFIED_PAID_OFF | Closed for repo; protected context distinct |
| Retention | Last child 45359509520 on old main; relay 45361694485 job 138333095092 yielded HOLD_EXTERNAL_CLOCK_TARGET_MAIN_DRIFT with zero dispatches | Repin and new-main dual-job APPLY baseline needed; preserve existing retention configuration |
| Rolling | 45360764789 skipped | Not restored |
| V0109/V0110 | Owner 08:37Z census binder=false exception=false; no newer receipt found | Fresh verify then guarded owner APPLY once, with coordinated disarm |
| Day 1 | 08:37Z census d1=0 d1queries=0 | Prepare only prospective fixed T6/T90 after install; require actual signed 128-query receipt before cutoff |
| Day 2 | 4 draws, one 384-unit parent budget | Do not repeat |

Existing installer 076500129390dc1b6cc5eb464521c12ec41b05ff: VERIFY_ONLY / APPLY_AFTER_COORDINATED_DISARM_NO_PROVIDER. Apply requires rolling relay paused, nonpaid schedule paused, exact owner, unchanged live history, deadline and transactional migration/ACL readback. Repository readback alone is not protected readback. No new research gates.

Retention relay source at c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed explicitly requires a current-main full-retention APPLY baseline (not a VERIFY receipt). Existing target workflow phase5-primary-fids-expiry-no-provider.yml requires P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA and P7_EXPIRY_APPROVED_MAIN_SHA matching new main; relay requires TRAVNR_APPROVED_TARGET_MAIN_SHA. Preserve existing approval modes and verify two actual successful jobs, primary-fids-expiry and phase7-expiry, before asserting restoration.

Existing manual recovery workflow phase6-nonpaid-source-day-prepare-publish.yml accepts run_day_index=1 and RECOVER_EXACT_DAY1_T6_T90_NO_PROVIDER. Preserve T24 missingness, original denominator 192. Deadline Nov24 09:25 PST; T6 09:45–13:30, T90 14:15–18:00, Day2 T24 19:45–23:30. No provider calls or production mutation were performed by this audit.

Related: https://github.com/HKcode22/ReplitTranvr/pull/965#issuecomment-7127010048
