# Phase 6 G12 — protected POST SHA shadow, narrow recovery (NO PAID GO)

UTC checkpoint: 2026-11-23 06:35Z. Scope: existing G12 only. Do not reopen Gates 1–8 or repeat 17-secret installer.

## Evidence from original production checks

- Main `c8e065d665ccacb6d2575070e94c5500b7583044` remains pinned and live as checked after 06:34Z. Relay main `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed` is the existing release pin.
- G12 installed repository 31-value signed policy readback run [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) completed SUCCESS. The `repository-secret-readback` job passed the exact canonical 31-values and paid-OFF step.
- Main-only protected POST actor preflight [45123332394](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123332394) FAILED at initial `Verify exact disarmed POST actor admission`. Reviewer, publisher and storage steps were skipped. Secondary cleanup failed because `npm ci` had not run; this is not the initial admission failure.
- Original main workflow `.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml` blob `348db0b7934b79c90cfb14c7db9d26ff80f0df3e`, with `environment: phase6-protected-runtime`, tests effective `PROCESS_ARMED=0`, `OWNER_APPROVED=0`, `POST_APPROVED_CODE_SHA=GITHUB_SHA`, and checkout SHA. The workflow has a unique `ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER` dispatch path that cannot satisfy its distinct paid POST input token.
- Owner inventory reported repo `V39_P5_POST_APPROVED_CODE_SHA` updated 2026-11-23T05:03:43Z, protected environment same secret updated 2026-11-22T12:05:36Z, while both paid STOP names in both scopes were updated at 06:18Z. GitHub secret values are write-only; timestamps alone do not reveal contents.
- Original one-use G12 installer blob `c67e2bcba2c5c8bf0b8ebe4f34e2c072e2db822b` writes 17 *repository-only* metadata/policy approvals and reasserts paid STOP 0 at repo and environment scopes. It does NOT update the protected environment copy of `V39_P5_POST_APPROVED_CODE_SHA`. Hence stale environment shadow is the leading, directly supported cause, but final confirmation requires protected preflight success.
- A subsequent nonpaid full retention backstop child [45125014043](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125014043) completed SUCCESS; this does not substitute for POST actor proof or provider receipt.

## Only remaining pre-GO recovery

1. Before Monday 2026-11-23T21:50Z, authenticated owner verifies current main, original G12 repository 31-value SUCCESS, and unchanged original workflow blob. Never rerun `g12-install-once.started` or write 17 policy secrets.
2. Fail closed: reassert `V39_PHASE6_PROCESS_ARMED=0` and `V39_PHASE6_OWNER_APPROVED=0` at BOTH repo and `phase6-protected-runtime` scopes.
3. Update ONLY the environment-scoped `V39_P5_POST_APPROVED_CODE_SHA` to the exact current production main `c8e065d665ccacb6d2575070e94c5500b7583044`. Keep repo's installed 31-day signed canonical policy and rights/budget/airport/schedule fields unchanged.
4. Dispatch the EXISTING main workflow with `frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY`, `private_transport=checkout`, `confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER`; no provider calls. Do not rerun the failed job, which requires `github.run_attempt==1`.
5. Verify a NEW run has status `completed/success`, original main SHA, and exact protected job `exact-main-post-actors-only` with all FOUR required steps SUCCESS. If any fail, G12 remains HOLD; investigate that step rather than allowing paid GO. If successful, record new run ID in master issue #413 and launch runbook.
6. Initial Gate13 paid GO remains separate; only during original signed Monday window 21:50Z to strictly before 23:10Z and after freshly proven rights, budget, expiry, STOP and protected checks. Gate9 DIRECT_TICK only after actual GO at/after 23:45Z. First paid SOURCE run must produce an authentic receipt, not inferred from a green clock job.

## Non-negotiables

NO new science contract; NO policy regeneration, code commit to main, migration, provider/DB mutation, new cron, extra gate, repeated G12 installer, or early paid authorization. Current result: **G12 protected POST HOLD; Gate13 paid NO GO** until exact protected evidence is PASS.