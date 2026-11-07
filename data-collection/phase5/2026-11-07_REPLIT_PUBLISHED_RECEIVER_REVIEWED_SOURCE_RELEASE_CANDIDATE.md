# Phase5 — reviewed callback-only Replit release candidate, not deployed

## 2026-11-07 UTC (2026-11-06 Pacific) grounded live evidence

Owner's Replit Shell readback: local workspace branch `main`, local `HEAD=b44b1e2813a6e1d9895b35ec806f1c7e60f9852a`, 0 tracked modifications via `git status --porcelain -uno` (untracked files not assessed). GitHub main `1ca938bece03b90ab952f1bb762f25aedb5ede18`. Public `GET /__v39/workspace-runtime` reported HTTP 200, `status=PASS`, `published_git_head=84b7f1565d0402facc8c3b9aacedc599eb6e2af1`, `published_deployment=true`, `source_custody_ready=true`, `durability_class=autoscale`. GitHub cannot resolve b44b1e2 as a repository commit (422); the old published SHA exists and GitHub main is 687 commits ahead.

This proves three different revisions, not that the public published runtime is the latest reviewed release or that future signed provider webhooks will be preserved with eligible legal retention.

## Discovered root cause of a naive checkout/republish

The production `.replit` still used `scripts/v39_gate4_reviewed_source_build_v39.sh`. It intentionally pins `PIN=84b7f15...`, rejects changed `server/client/shared` sources, and bakes public git identity `V39_BUILD_GIT_HEAD="$PIN"`. Running a simple git pull or clicking Replit Publish with that old build cannot truthfully deliver reviewed Phase5 code; bypassing the guard is unacceptable. Also preserve the local-only b44 commit before any working-tree reset.

## Proposed GitHub release build (unpaid, not yet published)

This review changes **only** the Replit build-script path in `.replit`, adds `scripts/v39_phase5_reviewed_source_build_v39.sh`, and updates its relevant test/CI contracts. The old historical Gate4 builder remains byte-unchanged for provenance. New build PIN is the **exact previously reviewed Phase5 code** `1ca938bece03b90ab952f1bb762f25aedb5ede18` (full 6/6 PR CI and main push V3.9 safety), not a floating `main`.

The new script refuses source changes in `client/server/shared`, package/dependency, build configuration and compiler; any non-exact `.replit` configuration change; local dirty code; future new source commits; a wrong baked Git SHA; a fake unreviewed command-line argument. It builds only the callback-only binary with fixed public code identity and a separate actual Git snapshot provenance record. It does **not** read AeroDataBox keys or a production DB, install migrations, publish, create a subscription, start Phase6, or claim external signed POST ACK.

GitHub CI checks source-equivalence with full Git history, runs published callback and historical-retention tests, builds the new receiver bundle, and checks baked source SHA and private build provenance using **no provider credentials and no production database URL**. It does not test the actual hosted Replit runtime.

## Gate before live Replit deployment

1. Obtain the exact local b44 full Git history/remote/backup and current untracked count. Safeguard local commits using a backup ref/bundle; **no blind `git reset --hard` or force pull**, and do not overwrite unknown assets.
2. Independently review the new build PR, require full V3.9 + focused callback/build CI PASS, and get the resulting merged GitHub snapshot with reviewed build delta. Check actual Replit checkout against that exact merged snapshot before publishing.
3. Before publishing, verify no currently active paid foreign sessions or callbacks could be interrupted, published receiver database/storage parity and secrets, raw-before-2xx behavior, and rollback/STOP. A public PASS flag is not enough.
4. After deliberately publishing only the reviewed callback-only deployment, check `GET /__v39/workspace-runtime` has intended pinned reviewed source SHA and runtime flags, run independent signed nonempty external POST→durable original→ACK receipt, and re-check STOP/billing incident state **before** any new paid Gate5 one-flight Alert subscription.
5. Account-specific AeroDataBox retention/source-use rights and current independent REST/Alert budgets remain separate from paid owner consent. Phase5 FREEZE and Phase6 paid launch remain NO-GO until their own scientific acceptance. Historical Gate5 full strict f.8 HOLD.

**Caution:** This source-only receiver build is not the actual prospective 31-day source/PRE/POST writer or the Phase5 FREEZE. Do not deploy it on the basis of a green GitHub Actions badge alone. Its `.replit` entry points to a future protected manual publish, not an automatic release.
