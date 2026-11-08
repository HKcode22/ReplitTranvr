# 2026-11-08 — reviewed callback-only V2 release candidate, still NOT published

## Why this is necessary

The already-published Replit Autoscale receiver was independently observed HTTP 200 on 2026-11-08T08:45:50Z but reported **old deployed callback source `84b7f1565d0402facc8c3b9aacedc599eb6e2af1`**. See [real workflow GET evidence](https://github.com/HKcode22/ReplitTranvr/actions/runs/42464295510) and [issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-6719511725). A `published=success` status means the old app is live, not that it matches a newly reviewed release.

The existing Phase5 callback-only build had `PIN=1ca938bece03b90ab952f1bb762f25aedb5ede18`. A direct GitHub compare with later main showed **47 commits and 23 changed protected server source files**. Its fail-closed `git diff --quiet "$PIN" HEAD -- client server shared ...` was designed to refuse such a publish, including if the host user runs an ordinary `git pull`. **Do not bypass that guard or overwrite the Replit local-only `b44b1e...` commit.**

## New versioned build route (GitHub release-candidate only)

The new `scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh` pins the independently tested **2026-11-08 GitHub main source** `6c187d58e2b1339aace71079e27767523d8ca3ce` (PR #481 merged with 5/5 exact-head + 2/2 postmerge CI SUCCESS). This is a **new deliberate source version**, **not** an assertion that changed Phase5 server files were identical to the November 7 source. Historical `scripts/v39_gate4_reviewed_source_build_v39.sh` and `scripts/v39_phase5_reviewed_source_build_v39.sh` remain byte-identical and retain their original review hashes.

The new script verifies full history and SHA ancestry, requires every protected app executable/config/dependency path to remain exact versus the **new reviewed PIN**, refuses dirty tracked/staged or untracked executable code, then checks `.replit` equals the prior reviewed PIN configuration with **only the one `[deployment].build` line changed** to the new script. It preserves Autoscale, callback-only run, DB target, dedicated Replit object bucket, secret-based ingress, runtime/STOP flags and port. It builds only `server/phase2gCallbackOnly.ts` through the already reviewed `scripts/build.ts` path, bakes **`V39_BUILD_GIT_HEAD=6c187...`**, and generates an explicit `dist/v39-snapshot-provenance.json` linking current checkout SHA and reviewed-source PIN, with `phase5_freeze_passed=false`, `phase6_paid_launch_authorized=false`. `--verify-only` never builds. The regular build does **not** publish or call provider, read secrets, mutate DB, create/STOP subscriptions, or arm Phase6.

CI independently tests the V2 source pin, exact sole `.replit` change, historical build preservation, incorrect argument refusal, versioned node/runtime isolation, and creates a local callback-only binary with no real secrets or provider connections. The prior V1 builder **should now intentionally refuse** because the active `.replit` line changed; this is preserved as a historical fail-closed assertion, not relabeled as a V1 regression.

## Remaining deployment gate — still real P0

**This PR does NOT publish the Replit app.** Its effect is only to make a *future audited, nonpaid* checkout/build possible. Current app/runtime identity still reports old `84b7...` until separate authorized publish. Actual published SHA, correct PIN-specific private config, source secret, object custody before HTTP 2xx, signed external nonempty POST durability/restart proof and STOP/reconciliation remain OPEN. The Replit workspace previously showed a local-only `b44b1e...` commit not in GitHub; first preserve it and inspect untracked files/foreign live callbacks before any checkout or publish.

The owner has a source-locked **READ ONLY** receiver checkout/public version report in [PR #481](https://github.com/HKcode22/ReplitTranvr/pull/481), alongside the pending active B0062 sampling-frame readback. Their one-line verified Shell commands do not overwrite or publish anything. Those real outputs are needed to choose the exact safe release procedure.

## Other Phase5 scientific gates unaffected

Actual Nov8 PG16 owner snapshot: Phase5 16 release tables present and **all 0 rows**, seven scoped NOLOGIN roles installed, Phase6 authorization disabled; V0079–V0083 installed, no repetition. The strict future 31-batch-day calendar and live seven REST/Alert budget freeze require a genuine active sampling frame and reviewed scientific target, not invented fixtures. Proposed Amendment D schedule revision ≥15m remains **DRAFT**; original strict physical Gate5 **HOLD**. Known grandfathered RapidAPI Ultra identity and dated balance are in [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300); normalized Contents permitted monthly ML use and backup/TTL need independent legal acceptance. No repeated subscription inquiries or paid FIDS-only pilot.

**Release classification:** Code-reviewed, no-provider callback-only build **candidate only**; not published/deployed, no signed ingest proof, Phase5 FREEZE HOLD, separate Phase6 paid GO NO.
