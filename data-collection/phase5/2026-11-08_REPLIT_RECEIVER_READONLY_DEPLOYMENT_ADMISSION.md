# Phase5 — Published receiver **deployment admission**, read-only, no Replit Agent, no provider

## Concrete release blocker already independently measured

On 2026-11-08 08:45:50Z, an existing [GitHub Actions public GET](https://github.com/HKcode22/ReplitTranvr/actions/runs/42464295510) to the real user app `https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime` returned HTTP 200, Autoscale, `prepaid_source_custody_ready=true` and **claimed published Git SHA `84b7f1565d0402facc8c3b9aacedc599eb6e2af1`**. This is an OLD source release, NOT the reviewed Phase5 callback source PIN `1ca938bece03b90ab952f1bb762f25aedb5ede18`. [Issue #413 source-provenance finding](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-6719511725). The connected Replit app is published and responding, but no signed nonempty external POST→raw original→2xx durability evidence is certified. Therefore receiver READY **HOLD**.

[Prior deployment-candidate analysis](2026-11-07_REPLIT_PUBLISHED_RECEIVER_REVIEWED_SOURCE_RELEASE_CANDIDATE.md) already established the workspace had a **local-only `b44b1e2813a6e1d9895b35ec806f1c7e60f9852a` commit**, while the GitHub repo had moved on; preserve this local work and any unknown untracked files rather than issuing `git reset --hard`, `git clean`, blindly pulling or republishing. A merged reviewed `.replit` and `scripts/v39_phase5_reviewed_source_build_v39.sh` build wrapper already exists. It pins the independently verified Phase5 callback-only executable to `1ca938...` and refuses changed app sources/config/dirty executables. It is not itself a published deployment.

## Real owner readback 2026-11-08T09:56Z: safe source preparation, not another root-cause search

The exact two-tool owner run on live Replit **completed** and identified `workspaceHead=7e34c6fdbec2e1fb488497e1bf47582755015206` on branch `phase5/reviewed-callback-20261107`, 0 tracked modifications and 1 untracked file. **Correction to earlier notes:** this local HEAD **does exist on GitHub** (independently verified); main `2b58e3d...` is **50 commits ahead, 0 behind**, so the local branch is an old known source, not a mystery unpushed commit. The current V2 reviewed source commit `6c187d58...` is naturally absent from that old checkout. Existing `.replit` is V1; we must not Publish as-is.

The first owner probe separately proved the B0062 active frame is **present**, with 4,346 active rows, 1,125 dual-eligible records, 0 hash mismatches, source `MrAirspace aircraft-flight-schedules + OurAirports`. [Scientific conflict remains](../phase2/V3.9_PHASE2_REFERENCE_FREEZE.md): the original Phase2 reference file records MrAirspace's observational source as a *candidate* blocked by the unmodified f.8 source/freshness contract. A real DB row does not waive that.

The direct public GET from Replit Shell returned HTTP **404**; independent GitHub-hosted public GET around 09:42Z returned HTTP **200** with still-stale `84b7f156...` published source. **Do not conclude the receiver is down solely from the outbound Replit 404**; verify source from a second independent public network and Replit deployment status.

[Safe V2 local checkout owner procedure](../../scripts/phase5_replit_v2_local_preserve_fastforward_owner_once.sh) is separately CI-reviewed. It validates the exact observed local HEAD and branch; exact GitHub main + green safety, true 50-commit fast-forward ancestry, unchanged protected code from V2 source PIN and exact V2 `.replit` configuration. It saves the original Git history in a private local bundle and separately archives **all** untracked paths before attempting `git merge --ff-only FETCH_HEAD`. It never removes untracked files, resets, cleans, rebases, publishes, runs paid provider calls, writes the DB or activates Phase6. On success, it runs **V2 build `--verify-only`**; it is *source preparation*, not an actual live Replit deployment. If a collision/changed checkout is detected, it fails CLOSED for a targeted inspection—not a forced retry.

**After successful V2 source preparation:** controlled standalone callback-only Replit Publish (not Agent), independently read the *published V2 source PIN*, then demonstrate signed nonempty external POST → original-before-2xx durable readback/STOP. An HTTP 200 or local `--verify-only` alone is not a scientific receiver PASS.

## What this new verified code does

`scripts/v39_phase5_replit_receiver_deployment_readonly_once.mjs` is a **standard Node20 read-only metadata check**, not an app updater. It:
- consults live GitHub main and whether the **existing Replit local HEAD** is a separately known GitHub commit; prints only SHA, branch, and counts of tracked/untracked changes, not file names or secrets;
- reads `.replit` to verify the exact reviewed callback build line and checks existence/ancestry of frozen source PIN `1ca938...` and whether protected executable paths differ between it and the Replit HEAD;
- issues **one free GET** to the real app public `/__v39/workspace-runtime`, reads only published version and boolean custody flags, never logs the full response/headers;
- reports **actionable HOLD reasons** for local-only history, dirty files, unpublished source mismatch, stale public receiver, and the still-untested signed POST/STOP obligations.

The script makes **no** `git fetch/pull/reset/checkout/clean/push`, no Replit Publish, no app/code changes, no database query, no API-key read, no external POST, no AeroDataBox GET/Alert or paid call. For an entirely matching workspace and published source, it can only produce `REVIEWED_SOURCE_CANDIDATE_NOT_DEPLOYMENT_OR_SCIENCE_APPROVAL`, **never** an independent signed callback proof or paid GO.

`scripts/phase5_replit_receiver_provenance_readonly_owner_launcher.sh` is the one-line immutable Git blob handoff once reviewed, exact SHA on main and postmerge `offline-safety=success`. Source code and wrapper are tested with Node20 and Bash syntax, plus refusal tests.

**Owner output marker:** `PHASE5_RECEIVER_PROVENANCE_READONLY_COMPLETE_NO_PUBLISH_NO_PROVIDER`. Even if marker is printed, read the JSON `blockers`. It documents the true current checkout/public source difference without exposing credentials. It does **not** deploy or modify Replit.

## What must happen before actual controlled publish

1. Reconcile the exact current Replit checkout with GitHub main by preserving the actual local-only commit and untracked workspace assets (make a reviewed backup first; don't perform destructive actions from an automated one-liner).
2. Independently review all protected executable changes since `1ca938...` and the build pin; if legitimately changed app sources exist, **version a new reviewed callback build PIN**, do not override the old source pin. Keep paid source/worker operations GitHub-only. Avoid accidentally starting paid collect under Replit.
3. Check for live paid sessions and receiver storage/database parity; publish only an independently reviewed callback-only artifact with a clear rollback/STOP path and permission. A successful build is not proof a Replit Published deployment is actually updated.
4. Re-check real HTTP published git head, signed nonempty no-provider synthetic external POST with durable original-before-2xx readback and restart safety (appropriately authorized); reconcile provider callback secret/STOP/orphans before any paid Alert SEND.

## What is *not* a release blocker caused by the script

V0079–V0083 and seven NOLOGIN groups were already installed/owner verified. Nov8 production snapshot had 16/16 Phase5 tables with zero release/source/calendar/POST rows, correctly not launched. Airport sampling-frame status is being checked separately in [active-frame checkpoint](2026-11-08_ACTIVE_FRAME_CALENDAR_REAL_ELIGIBILITY_READONLY.md). Existing grandfathered AeroDataBox Team Ultra/dated quota and unresolved Contents ML-purpose/TTL rights are recorded in [#300](https://github.com/HKcode22/ReplitTranvr/issues/300), **not to be re-asked from scratch**. The original f.8 physical Gate5 remains HOLD and proposed first-cycle schedule-revision Amendment D is **not independently adopted**.

**Scientific/operational verdict:** Phase5 FREEZE **HOLD**, Phase6 paid GO **NO**. This closes only the missing local/public receiver deployment-provenance evidence *tooling*, not the actual production receiver mismatch, licence, scientific calendar or three-horizon source→PRE→POST proof.
