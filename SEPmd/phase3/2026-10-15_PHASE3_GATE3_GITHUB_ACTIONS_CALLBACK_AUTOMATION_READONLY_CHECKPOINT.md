# 2026-10-15 (PDT) — Phase 3 Gate3 GitHub Actions ↔ Replit callback architecture + manual READ-ONLY admission checkpoint

**START HERE IF CHAT LOST.** [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) branch `phase2g-pragmatic-science-and-checkpoints-20261012` DRAFT/NOT DEPLOYED. [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) is the active execution/milestone board. [START_HERE](START_HERE.md), [controlling roadmap](2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md), `SEPmd/V3.9_DataCollectPlan_f.8.md` §16/17 steps13–16 and `SEPmd/V3.9_IMPLEMENTATION_LOG.md` §1.8 determine required Phase3 Gate3→Gate0.5→Gate4, not historical Phase2 Stage1 instructions.

## Answer to owner's question: are we using GitHub Actions + callback domain? YES, with precise separation

**Existing Phase2G architecture reused, not redeveloped:** GitHub Actions *authorized job* starts/supervises and independently watches the account and receiver; provider AeroDataBox Flight Alerts sends webhook notifications to `https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId`; published Replit callback persists original source before HTTP 2xx, plus PostgreSQL receipt and Object Storage source bytes. GitHub Actions collects code, approvals/evidence receipts, **NOT** the webhook data-plane receiver. Replit Autoscale was accepted under later 6 primary +6 contingency 15s *receiver-health* policy (cumulative 180s,max2 episodes); this does NOT create 12 AeroDataBox delivery retries; `maxDeliveryRetries=0`. Phase2G qualified pilot is closed, no redoing YSSY or old Reserved-VM-only check.

**Automation nuance:** Gate3 is **one manual `workflow_dispatch` with explicit run-specific AUTH**, not `cron`, no unattended daily or weekday paid collection. Once independently authorized, GitHub Actions should supervise ONE short paid canary and watchdog; Replit remains always the receiver. The *31 parent batch days* are later Phase6; they're not what we're automating now.

## Verified baseline at start of this Oct15 session

- Latest source commit `6ddbf6e0a7708be2cacbcddc591d57f746005d2c`: four no-provider CI **COMPLETED SUCCESS**: V3.9 full [#38685966765](https://github.com/HKcode22/ReplitTranvr/actions/runs/38685966765), focused [#38685966725](https://github.com/HKcode22/ReplitTranvr/actions/runs/38685966725), real disposable PG [#38685968807](https://github.com/HKcode22/ReplitTranvr/actions/runs/38685968807), receiver public identity read-only [#38685966879](https://github.com/HKcode22/ReplitTranvr/actions/runs/38685966879).
- `npm run v39:gate3:owner:read-only` exists as code/test and checks ledger-pinned exact AUTH and matching LOGGED+UNLOGGED PREPARED via SQL READ ONLY; a match **never** authorizes paid provider calls.
- `runPrepaidLiveWindowV39` supports `phase3_credit_canary` PREARMED selection but **hard throws `GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY` before provider GET/CREATE**. Exact true paid Gate3 execution owner NOT connected; this is a real engineering blocker, not an unavailable weekday slot or a status waiting for YSSY.
- `V0065` prospective Gate3 owner migration exists in draft GitHub but is **not** applied to production; reviewed callback+PG+blob source custody specific to a prepared Gate3 UUID not yet demonstrated.
- Old `npm run v39:gate3:canary` is deliberately direct NO-GO (legacy wrong receiver/ledger) even with signed AUTH. GitHub Actions `phase2g-paid-stage1.yml` is for Phase2G Gate2 only; **must not** be reused as a Gate3 paid job without a versioned, reviewed Gate3 scope. The immutable YSSY 231 externally charged versus229 received claims and 58/58 SHA-saved originals remain qualified historical evidence; no paid repeat. Old five-anchor Gate2 strict NOT_PASSED, prospectively amended four-HUB research scope requires documented/approved Phase3 predecessor treatment, never invent a Gate2 PASS.

## This session's concrete engineering: first GitHub Actions Gate3 admission stage, NOT paid

**Added, DRAFT only** `.github/workflows/phase3-gate3-owner-readonly.yml`. This is a **manual-only `workflow_dispatch`**, no `push`/`pull_request`/`schedule` paid trigger, guarded `confirm=READ_ONLY_GATE3_NO_PROVIDER`, exact `main` source ref + 40-hex `expected_head=GITHUB_SHA`, `permissions:contents:read`, serialized `phase3-gate3-readonly-admission` concurrency and future `phase3-readonly` environment. It loads **only V39_DATABASE_RUNTIME_URL**, NEVER `AERODATABOX_API_KEY`, and requires one tracked reviewed `SEPmd/...json` exact AUTH artifact path, same ID/UUID/ICAO/max1–100/duration1–3600/window. It invokes the existing `v39:gate3:owner:read-only` script and prints explicit **NOT PAID GO**. SQL runs in `BEGIN TRANSACTION READ ONLY`; it neither creates PREPARED owner, applies schema migration, POSTs signed webhook, calls provider, triggers subscription or deletes originals. Missing AUTH/owner/schema => HOLD. As a `workflow_dispatch` addition, it will be available for actual manual GitHub launch **only after its reviewed code is on default branch and operator authorizes its environment and secrets**. DO NOT try to run it on draft PR36 or expect any new production Gate3 owner from just a green CI check.
- New source-contract test `tests/phase3_gate3_manual_readonly_workflow_v39.test.ts` checks no unattended/push/PR paid triggers, exact main/SHA/manual confirmation, no AeroDataBox secret/provider spawn and read-only declaration. One source+tests+checkpoint Git commit to minimize CI churn; check the exact new executable SHA and all four workflows. Update final status on issue38, not another docs-only commit.

**We are NOT claiming a paid execution-owner integration with this workflow.** The next actual code milestone MUST be the reviewed new short **Gate3 paid owner** wired to existing prepaid runner, proper real host/account readback and immutable terminal SQL; don't stack endless independent helpers while leaving hard STOP unresolved. Keeping the stop is required until account/provider/host evidence is verifiable.

## Real blockers, explicit next actions and deadlines

| Requirement | Status Oct15 | Owner / step |
| --- | --- | --- |
| Phase2G qualified closeout | DONE / original strict Gate2 NOT_PASSED | Preserve historically; no YSSY rerun |
| Gate3 no-provider source/tests and manual GitHub Actions admission | Draft source; pending exact new CI | GitHub PR36 review, then reviewed release |
| Gate3 *actual* provider-capable execution owner | **MISSING** | Wire one exact signed owner to `runPrepaidLiveWindowV39`, no fabricated PASS flags |
| Live Gate3 PostgreSQL forward-only migration `V0065` | **NOT APPLIED** | Explicit scoped production migration/release approval |
| Actual signed no-provider callback POST + SQL/Blob source SHA readback | **NOT PERFORMED** | Separately approved one bounded controlled hosted test after reviewed release |
| Current actual AeroDataBox balance, foreign billable subscriptions, protected floor | **NOT REFRESHED FOR G3** | Provider read-only check only with proper operator-approved scope |
| Gate3 tiny *paid* canary | **NOT AUTHORIZED/NOT PASSED** | Fresh **separate** signed AUTH one ICAO, bounded exact UTC start/end, small fixed credit ceiling, cleanup, at least **3 equal stable** provider balance reads, >0 items, tol0 exact financial reconciliation |
| Gate0.5 native T/actual departure target/FIDS cadence | **NOT PASSED** | Distinct prospectively sampled one-airport pilot; may require Alert/REST units |
| Gate4 SEND-aware cap reliability + tiny live second-start | **NOT PASSED** | Offline cap100/margin10 + distinct authorized live check |
| Phase3 end | **Oct20 target / Oct22 fallback at risk** | Must PASS Gate3, 0.5, 4, never dates alone |
| Phase4/5/6 | Gate5 Oct22/24, 4-HUB FREEZE Oct25/28, first Phase6 parent day Oct26–29 conditional | No Phase6 paid main run yet |

**User question "do I need to do something?"** No new shell repeat or provider payment TODAY. The first upcoming choice is review/approve exact new-release+forward migration and scoped no-provider signed callback/PG/Blob handshake. A DIFFERENT later approval is required for paid one-subscription canary; select single airport and precise UTC time/duration/credits at that point. Do not create GitHub `workflow_dispatch` paid actions, turn on cron, refill, publish Replit, run production SQL, or hit AeroDataBox from generic "continue" now. Existing GitHub/replit secret environment binding must be reviewed before any launch.

**Retention priority**: P2G24 existing 30 originals first expire Thu Oct15 ~21:02 PDT; YSSY P25 58 originals begin Mon Oct19 ~20:06 PDT. Source-rights and incident31 review separate; no blind deletion, silent 168h TTL extension or raw source export into GitHub.

**Exact recovery step if chat lost**: inspect PR36 head, 4 new SHA-bound no-provider CI conclusions, manual GitHub Actions workflow files and `v39:gate3:owner:read-only`; then focus on real paid owner and authorized host tests with explicit scopes. Post CI final results in [issue38](https://github.com/HKcode22/ReplitTranvr/issues/38) rather than repeatedly committing status docs.
