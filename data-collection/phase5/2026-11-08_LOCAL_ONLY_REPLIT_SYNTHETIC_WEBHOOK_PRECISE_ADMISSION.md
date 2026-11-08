# 2026-11-08 — local-only Replit HEAD and bounded synthetic signed webhook verification

## Observed, not inferred
The owner ran merged immutable READ-ONLY launcher `cc43df176833a672c929ae7e14fe3bcb0a679b73`. It reported:

- Local Replit HEAD `a2d75104cfa4c74d6936da4bc06bf15939671cc0`; public GitHub main then `071bf8dcdd212c0eaf931724e130843f061955c9`.
- Historical PR #485 backup-and-FF pin `29544c30e3c9833fd85035e75999ccf2d2e021f6` IS an ancestor of local.
- Protected executable source unchanged since that pin; protected tracked working tree clean; test script local and main exact blob `cbcc4783690e6e2c9acec392ac4e644392f3ac82`.
- `LOCAL_COMMIT_IS_GITHUB_MAIN_ANCESTOR` HOLD. GitHub fetch_commit(`a2d751...`) returns 422 / no commit found; compare endpoints return 404. This is **consistent with local-only/unpushed Git history**, not proof a specific set of local files changed. Never force-reset this commit or blindly re-run the historical PR #485 backup/fast-forward.
- Older read-only preflight also passed 8/9 env/secret/storage/tsx checks. Crucially, no actual signed POST, raw-original-before-2xx receipt, synthetic blob cleanup or STOP proof followed from either preflight.

## Narrow reviewed test on this exact local commit
`scripts/phase5_synthetic_signed_webhook_local_only_head_owner_once.sh` (and offline test) admits **only the exact observed local HEAD** and requires old reviewed pin to be its ancestor, unmodified protected imported code/tsconfig and worktree, no untracked protected sources, pinned existing TypeScript script locally and live on GitHub, presence of existing webhook secret/DB/blob-store config, local tsx and no armed Phase6 environment. Does not fetch, reset, merge, switch Replit Git, recreate schemas or touch the provider.

Only after all guards pass, an atomic local once-marker is placed. The previously reviewed TypeScript script `v39_phase2g_verify_live_callback_v39.ts` then verifies hosted published V2 PIN `6c187d58e2b1339aace71079e27767523d8ca3ce`, performs wrong-secret negative POST 404, creates a 1-hour **fictitious local synthetic** `phase2_safety_smoke` session, sends one signed 0-credit flight POST, checks 8-second ACK and exactly 1 session/1 delivery/1 item/1 blob original readback, then removes the synthetic scope and confirms 1 original tombstone. A historical incident 30 may be tolerated **only** in the existing narrowly reviewed synthetic path; paid release is still blocked. This does **write the disposable local synthetic PostgreSQL/object-storage scope** after all guards pass, not a read-only check.

The once marker is intentionally preserved even on failure, because a failed HTTP POST or cleanup could be ambiguous. **Never rerun blindly**: inspect sanitized output and scoped rows/receipt first. A test script exit success is only receiver technical evidence and does not certify an external AeroDataBox SEND, nonempty paid cohort, actual physical movement, 31-day calendar, source-use/ML retention, scientific FREEZE or Phase6 GO.

## Phase5 priorities are unchanged
Active B0062 reference 4346 / 1125 dual-eligible and 18/18 frozen cross-check verified. V0079–V0083 inert schemas installed; published receiver source HTTP200 exact V2 PIN independently seen in PR #486. Remain: lawful bounded source/expiry policy and prospective target, independent five-anchor or explicitly approved narrower experimental sampling scope, 31 signed batch-days and seven REST+Alert category budget rows, GitHub-only automatic early draw→SOURCE→T24/T6/T90 PRE/witness→POST/STOP/daily QA, one independent Phase5 FREEZE and separate Phase6 GO. Neither an optional AeroDataBox email reply nor repetition of V0079–V0083 or the old FIDS-only pilot is a project-wide engineering prerequisite.

**Decision:** continue nonpaid Phase5 engineering. Signed synthetic receiver result PENDING. Scientific FREEZE HOLD, paid Phase6 GO NO.
