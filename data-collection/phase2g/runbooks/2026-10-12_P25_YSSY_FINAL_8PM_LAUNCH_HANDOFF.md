# P25 YSSY final launch handoff — Monday 12 October 2026, 20:00 PDT

**Read this before launching. Status as of last independent checks: all early technical gates PASS; actual paid owner has NOT been dispatched. Do not confuse prep approval with provider subscription permission. No Replit AI Agent.**

## Frozen exact identifiers (never substitute a Replit local child for GitHub main)

- Reviewed GitHub `main` AND public published Autoscale source git_head: `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.
- Local Replit workspace `release/p25-reviewed-publish-20261012` points to empty publication child `65e1c8718a23b4e447aaceb2fcb58a38c2101b64`; it is **not** GitHub paid workflow execution SHA. All source content/tree remains identical to f5.
- Protected `server scripts migrations tests .github/workflows` tree SHA256: `5eed390ac062a58482ddb5883c0fd8f72e0f0127a3bd46f89f1c9e9ec21ffe9c`.
- YSSY, budget `P2G-S1-20261013-03`, AUTH `AUTH-20261013-P2G25`, single 120min experiment.
- AUTH file `SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json`, SHA256 `4a27a43d26fa2e257ea5ddf92afb2d05efe7213c07c0ec3def41ac4da8ab10e0`.
- Runtime `artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json`, SHA256 `101c9ab8ade5978194fc22c4e2f64660ee74dbe5d0b8efcfab87b798e4df333f`.
- Preprobe `artifacts/preprobe-reference-freeze-record.json`, file SHA256 `b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870`.
- Older passed safety smoke `artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json`.
- Older smoke runtime `artifacts/phase2f-smoke-runtime-20260915T095554Z.json`, file SHA256 `58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232`.
- Genuine published signed nonempty callback receipt **only local to Replit workspace**: `artifacts/phase2g-live-callback-verification-20261012T133643Z.json`, SHA256 `573f7dd36c63e13cfdf1b46a128c334088dfcf1f97c129c6a713ca1a46e80069`, generated `2026-10-12T13:36:43Z`; receipt age must be <=24h at GitHub paid preflight. Test included 404 wrong secret, 200 correct, 1332.591ms admission, persisted one session/delivery/item/blob-ref, exact deleted cleanup, zero provider calls, zero Alert credits.
- Published callback origin `https://replit-tranvr--hk84164.replit.app`; `callback_mode=published`; never use a Replit dev URL for paid owner.
- **Start not before** `2026-10-13T03:00:00Z` (Mon Oct12 20:00 PDT), safe latest allowed start `03:20:00Z` (20:20 PDT; allow GitHub queue time), **Auth expires** `05:25:00Z`; target 120 min + buffer. 450 anticipated +50 margin, 500 max, protected minimum 1000. Last actual provider balance canary: 2287/2287/2287; 0 active billable subscriptions; must recheck LIVE at start. Provider delivery retries remain 0; health watchdog 6+6 at 15s, maximum 180sec cumulative, max2 outage episodes, full scientific reconciliation requires zero unexplained billed/received gap.

## Evidence already proved

- [Independent final GitHub 2h synthetic reliability run 38282767515](https://github.com/HKcode22/ReplitTranvr/actions/runs/38282767515): complete **SUCCESS**. 7200.186s actual wall-clock synthetic; 120/120 timely202; 120 originals verified/replayed; 2 backend injected 180s outages; saved original JSON and log in [artifact 11767997965](https://github.com/HKcode22/ReplitTranvr/actions/runs/38282767515/artifacts/11767997965). **Localhost synthetic, NOT production Autoscale exact replica or AeroDataBox upstream attempted-SEND witness**. Original prior run 38247064249 CI failed due to postrun `find /tmp` permission error despite PASS_LOCAL_ONLY simulation: preserve both outcomes honestly.
- [GitHub/Replit webhook secret + DB binding 38257369821](https://github.com/HKcode22/ReplitTranvr/actions/runs/38257369821) SUCCESS; [GitHub/Replit cleanup control HMAC 38257372967](https://github.com/HKcode22/ReplitTranvr/actions/runs/38257372967) SUCCESS (including wrong-HMAC / unsigned denial).
- Earlier GitHub PR35 reviewed offline 1108 passed, P25 focused 172 passed, disposable PostgreSQL16 11 passed, read-only reported public source before later actual republish. All five live V0064/evidence/settling/counter guards true.
- Exact early **read-only** P25 paid preflight on f5 in detached worktree returned `BLOCKED` only for `auth_not_started_seconds=47381`; **zero other blockers**, `auth_approved_in_ledger=true`, `compact6_validated=true`, `scientific_next_candidate=YSSY`, `callback_exact_contract=true`, three stable balance reads 2287, 0 incidents, 0 active/settling, 0 open budget days, 0 P25 budget probe rows; no paid mutation. Do not call this `PASS_READY_FOR_PAID_STAGE1`, which can only happen on or after 03:00Z.

## Rules at the launch window

1. Freeze GitHub main/published callback `f5b...`, webhook secret, DB binding, configured source-custody flags, bucket and approved scientific definitions. **Do not republish or create a new source commit; that invalidates SHA binding.**
2. Reconfirm source/public GET and exact receipt file SHA. Read-only checks; do not accidentally reuse a disposed test session or remove retained P2G24 30 original blobs.
3. The **actual paid GitHub Action** `phase2g-paid-stage1.yml` requires its `gate` job to perform live GitHub-origin runtime-source/DB/webhook-secret/cleanup-key challenges, complete fresh strict provider balance & subscription list (including three-read stability canary), exact schema/budget/incident/protocol/source/receipt authorization checks, and return `PASS_READY_FOR_PAID_STAGE1`. On any other result: **NO provider start**, no manual bypass or redundant dispatch.
4. **Important:** The workflow's `gate` and owner are both conditional on `confirm == RUN_PAID_STAGE1_ONCE`. Therefore any valid workflow dispatch with this confirmation is a **paid-start authorization**, not merely a dry run; a successful gate automatically proceeds to real provider subscription. The only safe early preflight is the separate `scripts/v39_phase2g_stage1_paid_preflight_v39.ts` read-only command previously run (it may return `PASS_WAIT_FOR_AUTH_START` within 30 minutes before 03:00Z). **Do not dispatch paid workflow until owner explicitly and separately authorizes it.**
5. **Single execution only.** If owner approves one-shot paid start after correct window, use `gh workflow run phase2g-paid-stage1.yml --repo HKcode22/ReplitTranvr --ref main` with the following exact workflow_dispatch inputs in a single invocation. This is a FIELD MANIFEST ONLY, **not an executable launch command**:
```text
confirm: RUN_PAID_STAGE1_ONCE  (requires separate owner approval at execution)
auth_id: AUTH-20261013-P2G25
auth_file: SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json
auth_sha: 4a27a43d26fa2e257ea5ddf92afb2d05efe7213c07c0ec3def41ac4da8ab10e0
runtime_file: artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json
runtime_sha: 101c9ab8ade5978194fc22c4e2f64660ee74dbe5d0b8efcfab87b798e4df333f
preprobe_file: artifacts/preprobe-reference-freeze-record.json
preprobe_sha: b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870
smoke_file: artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json
smoke_runtime_file: artifacts/phase2f-smoke-runtime-20260915T095554Z.json
smoke_runtime_sha: 58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232
expected_head: f5b1347b7b9aebd6830302394ea2cc5775aedbf4
budget_day: P2G-S1-20261013-03
expected_icao: YSSY
callback_base: https://replit-tranvr--hk84164.replit.app
callback_mode: published
callback_verification_file: (empty)
callback_verification_b64: exact base64 of verified local receipt bytes (single-line, not committed to main)
callback_verification_sha: 573f7dd36c63e13cfdf1b46a128c334088dfcf1f97c129c6a713ca1a46e80069
callback_contingency_file: (empty)
callback_contingency_sha: (empty)
```
6. Once dispatched, watch gate first. If gate fails/blocked or workflow errors before owner, **no paid GO**; record run ID and stop. If gate actually passes and owner starts, monitor `owner` plus `safety-watchdog` jobs; preserve heartbeat and original-source data; never cancel/force-redeploy in lieu of approved fail-closed provider deletion. Existing workflow `owner` performs reviewed exact deferred cleanup and saves scientific evidence; **a GitHub Actions success alone is not scientific PASS**, which separately requires full 120min uncensored correct YSSY matched time class, valid physical-v2 flight instances, settled external vs internal exact match, and object-custody review. The historical P2G24 failures remain failed/censored.
7. The one-shot consent does not authorize **any second trial** on failure, and expiry/latest start limits remain hard. Do not automatically rerun a paid workflow.

## Plain-language status

The code review, GitHub CI, actual published nonempty synthetic HTTPS POST, DB/source/secret/HMAC bindings, strict early preflight and corrected 120-minute independent synthetic rehearsal have all produced positive evidence. **Remaining operational gate is actual authorized-time GitHub owner preflight and explicit one-shot start consent**, with fresh account/state rechecks. No guarantee AeroDataBox never bills a failed delivery or that published Autoscale can't restart. If GO is withheld, keep evidence and request new independent authorization; never falsify early/failed receipts.

Last report: [full P25 checkpoint](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-pragmatic-science-and-checkpoints-20261012/SEPmd/phase2g/reports/2026-10-12_YSSY_P25_CHECKPOINT_GO_PLAN_AND_DEADLINES.md).
