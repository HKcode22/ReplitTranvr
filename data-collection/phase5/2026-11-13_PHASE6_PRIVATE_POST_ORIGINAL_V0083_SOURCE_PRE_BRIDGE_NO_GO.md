# Phase 6 — private signed POST to original V0083 read-only admission (NO GO)

**Nov 13, 2026 PST / Nov 14 UTC.** New *code-only*, STOP-default bridge, synthetic CI. Not a new provider, new database/table, signed rights approval or paid POST worker.

## Reuse existing components

- #640 merged `phase6PrivateSourcePostReadOnce_v39.mjs` authenticates exactly one Ed25519-reviewed SHA-pinned V0095 `POST_PACKET` from the user's existing Replit-attached `neondb` PG16 using a future separately commissioned restricted **reader** login. It has no paid action, and its verified signature is NOT itself account licensing/independence proof.
- #650 merged V0096 signed-index+private SOURCE/PRE/POST registry router identifies the one reviewed POST shard and its exact signed SOURCE day registry, with PG clock.
- `phase5FuturePostGithubReadonlyRelease_v39.ts` is the already-reviewed source-bound POST parent: `admitP5FuturePostFrozenForReadOnly` checks original signed request/manifest/rights/REST budget/code, while `planP5FuturePostOneChild` requires actual same-flight source-backed PRE and an authentic database clock and rejects late POST.
- `v39_phase5_future_post_github_child_dispatcher_v39.ts` already checks the true GH schedule/main/owner release and narrow source-only readback login; `v39_phase5_one_signed_future_post_outcome_v0083_owner_v39.ts` is the **only existing** expensive V0083 POST worker and irreversible two-unit reservation/original custody path. Do not replace it, dispatch a new one or replay UNKNOWN COMMIT.

## New candidate bridge and what it actually verifies

`server/lib/disruption/phase6PrivatePostExistingV0083ReadOnlyBridge_v39.ts` is a **pure in-memory review step**. It requires signed V0096 current route plus private index registry bytes, V0095 restricted Ed25519 one-POST-packet read receipt, externally pinned POST path/byte SHA, original source registry SHA, actual independent SOURCE-role PRE audit result, and two bounded monotonically advancing restricted PG clocks. It checks exact POST lane/day/shard, signature read flags/byte SHA, signed POST request/rights/budget via **original** `admitP5FuturePostFrozenForReadOnly`, and existing GH scheduled parent through `admitP5FuturePostGithubParent`.

It calls the **original** `planP5FuturePostOneChild` with **history=null**. An eligible result is only `POST_DUE_REQUIRES_GITHUB_HISTORY_CHECK`: the actual child must still independently verify complete authenticated GitHub attempt history, true SOURCE-role PRE evidence, real V0083 REST review/reserve logins and one irreversible physical POST GET. It cannot dispatch or charge here. For a verified PRE audit with 1/3 valid horizons, retain the explicit two observed-missing horizons. For a **missing independent PRE readback**, record unresolved/unknown (not a claim that 0/3 PRE were actually observed), do not infer a negative label and do not dispatch. A separately verified no-PRE outcome can later be classified as censored with an explicit evidence/denominator receipt. Not-yet-due and late events do not yield runnable packet bytes. Actual POST bytes are nonenumerable and returned only for due read-only review, never logged.

`tests/phase6_private_post_existing_v0083_readonly_bridge_v39.test.ts` verifies synthetic due 1-of-3 PRE, missing PRE censor, not due, missed cutoff, wrong POST SHA/SOURCE day/route/flight, role, rights, budget and stale PG clock; companion CI also runs existing original V0083 parent tests. Never claims a real flight or provider observation was read in these tests.

## Still to finish before Phase6 first paid day

- All three lane bridges are **components**, not an unattended linked 31-day GitHub run. Actual restricted PG private reader and GH source/pre/post children need once-only credentials/role permissions and child execution integration, no public frozen packets or artifacts, with independent per-child GO/clock/history/unknown-commit no-retry.
- V0094→V0095→V0096 one-time owner schema installation needs full independent existing `neondb` readback; no earlier migration/role reinstallation, no separate Neon plugin.
- Genuine prospective independently reviewed calendar, physical FIDS SOURCE originals and source-bound native operating legs; allowable contents/normalized/backup/PITR retention and research purpose per AeroDataBox account, REST + Alert budgets, source PRE as-of/POST/receiver/STOP completeness with explicit missingness, realistic throughput test.
- Independent Phase5 science **FREEZE HOLD**, distinct paid Phase6 Day1 **NO-GO** until actual evidence. Conditional Nov 20 readiness target does not waive a gate and does not require provider email before other engineering.

**No provider calls, new role, secrets, SQL write, migration or GH dispatch in this candidate.**
