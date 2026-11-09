# Phase 5 — GitHub can now run one independently signed saved-day source PREPARER (no provider)

**Date:** November 9, 2026. **Scope:** operate the already tested Stage7→Stage8→Stage9 *PREPARED source-query/partition* pipeline under the existing Phase5 GitHub PREPARE database role. This is release engineering, **not an actual flight source GET, Alert subscription, PRE snapshot, or Phase5 scientific FREEZE**.

## What was already built and must NOT be repeated

- Phase2 B0062 frame and actual airport observations; Phase3 authentic Alert subscriptions/webhook controller/STOP; Phase4 Nov6 WSSS true FIDS PRE/POST pilots. These are usable historical *scoped* evidence, not experiments to purchase again.
- **V0079–V0083** installed in live production; seven NOLOGIN role groups commissioned and restricted PREPARE/PRE/T24-WITNESS GitHub secrets already tested, with no need for SQL migrations or new logins. Actual Nov9 13:42 UTC owner snapshot: 16 new scoped preparation ledgers have zero rows, Phase6 disabled; this does not cover historical real Phase2–4 rows.
- [PR #522](https://github.com/HKcode22/ReplitTranvr/pull/522) installed a future six-slot GitHub-selected-airports owner that remains INERT without independent Phase5 freeze and Phase6 GO.
- [PR #523](https://github.com/HKcode22/ReplitTranvr/pull/523) merged the genuine **saved four airports → Stage7 same snapshot → Stage8 exact per-day proposals → Stage9 serializable source query+partition PREPARED ledger** pipeline with 12/12 exact-head checks and actual disposable PG16 96 query/96 partition atomic test.

## What THIS integration adds

A real GitHub-only manual `workflow_dispatch` path for the approved future PREPARE operation, not another fake sampled airport fixture:

1. [One reviewed day packet admission and entrypoint](../../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39.ts): accept exactly one `data-collection/phase5/frozen/<reviewed_name>.json` with strict file name, bytes and size; check **raw exact SHA256 against an independent GitHub secret**, reviewed current main code SHA, manifest/calendar/config/frame pins, real selected day (index 1–31), exact Stage7/Stage9 expected PREPARE role, separate Phase5 FREEZE, Contents-use and Phase6 authorization flags. Refuse a fork, PR, arbitrary branch, scheduled event, second run attempt or missing review. Do not accept a caller's ad hoc file hash in place of the independently set secret.
2. Use the **existing** secret `P5_V39_PREPARE_DATABASE_URL` and dedicated login `phase5_p30_prepare_login_20261107` already commissioned during Phase5 Stage30/31. `phase5Stage28DedicatedRolePool_v39` verifies the real PG16 NOINHERIT/no admin/one-group SET-only membership and separates PREPARE from PRE, T24-WITNESS, SOURCE and app roles. No role installer, credential rotation or shared application DB URL.
3. A `REPEATABLE READ READ ONLY` **Stage7 read** verifies the real signed calendar day, saved four airports and immutable early-draw digest; then releases/destroys that session. Stage8 derives the real exact child/source query timezones, source partitions, physical UTC charge-day budget comparisons and proposal SHA from those **same saved rows**, not copied or fabricated airports. A **new clean session under the same restricted PREPARE group** executes Stage9 `SERIALIZABLE` two-ledger insert-only **only if** the externally signed post-draw proposal and physical seven-category budget hashes match. Stage9 re-reads stored rows, privileges, cycle/category/charge-day caps and refuses partial/duplicate/backfilled day. All original source and flight PRE tables remain untouched.
4. [Actual GitHub main-only workflow](../../.github/workflows/phase5-one-signed-future-day-source-prepared-main-manual.yml) is manual and **does not automatically start on schedule/merge**. A pull request can run only the [no-provider admission tests](../../tests/phase5_one_signed_day_source_prepare_github_owner_v39.test.ts). Live execution requires a manually provided EXACT reviewed packet path+explicit typed confirmation, plus independent Phase5/Phase6/source-use flags and code/packet pins; it removes AeroDataBox credentials from the environment. No shell timing on Replit, no Cloudflare or Replit AI Agent.
5. Results report only **the number of prepared queries and exact partitions** and the approved packet SHA. The job has no AirtDataBox client/credential, cannot create Alert subscriptions, and cannot write original, PRE, witness or POST.

### Critical distinctions — no invented science

The `reviewedPrepareInput.stage9Review.expectedProposalSha256` is from an **external review after the four future airports were genuinely selected**, not a hash that this GitHub runner computes and auto-approves. Because 21 ordinary sample days must select their four airport identities *prospectively*, a packet for one of those days cannot be validly frozen before that specific early draw. The external reviewer may later approve a deterministic authority for automatic subsequent days, but that is **not** implemented or claimed by this manual workflow.

No **current** production attempt can pass the complete gates: the actual 31 parent calendar/treatment and seven-category UTC physical budget must first be independently reviewed/committed; applicable source-use/processing approval remains separate; the disabled Phase6 singleton must have separately passed and been authorized; the future packet SHA and code SHA must be pinned to the reviewed commit. A signed SHA guards exact bytes; **it is not, by itself, proof the supplier permits any proposed retention or model use**.

## What remains before Phase5 can actually be called complete

1. Approved prospective primary endpoint/model/use + actual source Contents handling/expiry.
2. One real 31-parent future UTC date/treatment seed + signed B0062 five crossover pair treatment; 21 ordinary site names left unknown until lawful early selection. Commit calendar and frozen full seven-category physical UTC rest budget.
3. Under release authority, automatic GitHub source **PREPARE** for saved days (this manual reviewer packet is the secure operational stepping stone; not yet autonomous after every early draw).
4. Actual **FIDS source GET/original bind** from an already prepared query under budget/role/clock, source reviewer, T24 flight PRE independent witness, T6/T90 PRE, final POST, published Replit receiver/Flight Alert STOP and observed/missing denominators. Reuse Phase3/4 code, not rerun historical cohorts.
5. One independent final Phase5 scientific FREEZE and separately armed paid Phase6 GO, then actual first-day observability and STOP. Actual Day1 source receipts are **post-GO** quality evidence, not prelaunch prerequisites.

**SCIENCE FREEZE HOLD; paid Phase6 GO NO.** This code change does not authorize spend, create calendar/budget rows, install SQL roles, call a provider or generate an independent signed packet. Future actual packet files do not presently exist in the GitHub Phase5 `frozen/` folder; do not pretend to have signed one. The generic driver's new role-approval and day-packet hash secrets are **not currently established by this commit**. The workflow is therefore inactive for production until appropriate actual review/configuration.

## Recovery

Continue from [Phase5 README](README.md), [new-chat assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), [real Stage7→Stage9 PR #523 checkpoint](2026-11-09_STAGE7_STAGE8_STAGE9_AUTHENTIC_SAVED_DAY_TO_PREPARED_SOURCE_PIPELINE_CHECKPOINT.md) and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). Do not create a duplicate Stage-N loop or another historical paid test.
